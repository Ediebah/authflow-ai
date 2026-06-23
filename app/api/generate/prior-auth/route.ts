import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { callLLMJson } from "@/lib/llm";
import {
  PRIOR_AUTH_PACKET_SYSTEM_PROMPT,
  buildPriorAuthPacketPrompt,
  type PriorAuthPacket,
} from "@/lib/prompts";
import { detectUnsafeOutput, computeFlagged } from "@/lib/safety";
import { checkGroundedness } from "@/lib/safety/groundedness";
import { rateLimit } from "@/lib/ratelimit";
import { parseBody, tooMany } from "@/lib/api-guard";
import { priorAuthSchema } from "@/lib/validation";

export const maxDuration = 60;

async function tryRetrieve(query: string, type: "policy" | "guideline" | "patient_ed"): Promise<string> {
  if (!process.env.QDRANT_URL) return "";
  try {
    const { retrieveContext } = await import("@/lib/rag/retrieve");
    return await retrieveContext(query, type);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit("generate", user.id);
  if (!limit.ok) return tooMany();

  const parsed = await parseBody(req, priorAuthSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const { diagnosis, treatment, clinicalHistory, pastTreatments, payer, denialReason, patient } = body;

  const ragQuery = `${payer} ${diagnosis} ${treatment} prior authorization`;
  const [policyContext, guidelineContext] = await Promise.all([
    tryRetrieve(ragQuery, "policy"),
    tryRetrieve(`${diagnosis} ${treatment}`, "guideline"),
  ]);

  const userPrompt = buildPriorAuthPacketPrompt({
    diagnosis,
    treatment,
    clinicalHistory: clinicalHistory ?? "",
    pastTreatments: pastTreatments ?? "",
    payer,
    denialReason,
    policyContext,
    guidelineContext,
    patient,
  });

  let packet: PriorAuthPacket;
  try {
    packet = await callLLMJson<PriorAuthPacket>(PRIOR_AUTH_PACKET_SYSTEM_PROMPT, userPrompt);
  } catch {
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }

  // Ensure all fields exist with safe defaults
  packet.checklist = packet.checklist ?? [];
  packet.missing_docs = packet.missing_docs ?? [];
  packet.letter = packet.letter ?? "";
  packet.citations = packet.citations ?? [];

  const { isSafe, flags } = detectUnsafeOutput(packet.letter);

  const source = [
    `Diagnosis: ${diagnosis}`,
    `Requested Treatment: ${treatment}`,
    `Clinical History: ${clinicalHistory ?? ""}`,
    `Prior Treatments: ${pastTreatments ?? ""}`,
    `Payer: ${payer}`,
    denialReason ? `Denial Reason: ${denialReason}` : "",
  ].filter(Boolean).join("\n");

  const groundedness = await checkGroundedness(source, packet.letter);
  const flagged = computeFlagged(isSafe, groundedness);
  const grounded = groundedness.checked ? groundedness.grounded : null;

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      type: denialReason ? "appeal" : "prior_auth",
      input_payload: body,
      output_text: packet.letter,
      flagged,
      grounded,
      unsupported_claims: groundedness.unsupported_claims,
      safety_flags: flags,
    })
    .select("id")
    .single();
  if (insertError) console.error("[prior-auth] document insert failed:", insertError.message);

  return NextResponse.json({
    draft: packet.letter,
    packet,
    flagged,
    safety_flags: flags,
    grounded,
    unsupported_claims: groundedness.unsupported_claims,
    document_id: doc?.id ?? null,
    saved: !insertError && Boolean(doc?.id),
  });
}
