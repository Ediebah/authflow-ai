import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { callLLM } from "@/lib/llm";
import { PATIENT_INSTRUCTIONS_SYSTEM_PROMPT, buildPatientInstructionsPrompt } from "@/lib/prompts";
import { applySafetyFilters, computeFlagged } from "@/lib/safety";
import { checkGroundedness } from "@/lib/safety/groundedness";
import { rateLimit } from "@/lib/ratelimit";
import { parseBody, tooMany } from "@/lib/api-guard";
import { patientInstructionsSchema } from "@/lib/validation";

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

  const parsed = await parseBody(req, patientInstructionsSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const { clinicalNote, keyPoints, patient } = body;

  const patientEdContext = await tryRetrieve(clinicalNote.slice(0, 500), "patient_ed");

  const userPrompt = buildPatientInstructionsPrompt({
    clinicalNote,
    keyPoints,
    patientEdContext,
    patient,
  });

  const raw = await callLLM(PATIENT_INSTRUCTIONS_SYSTEM_PROMPT, userPrompt);
  const { output, flagged: regexFlagged } = applySafetyFilters(raw);

  const source = [clinicalNote, keyPoints ? `Key points: ${keyPoints}` : ""].filter(Boolean).join("\n");
  const groundedness = await checkGroundedness(source, output);
  const flagged = computeFlagged(!regexFlagged, groundedness);
  const grounded = groundedness.checked ? groundedness.grounded : null;

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      type: "patient_instructions",
      input_payload: body,
      output_text: output,
      flagged,
      grounded,
      unsupported_claims: groundedness.unsupported_claims,
    })
    .select("id")
    .single();
  if (insertError) console.error("[patient-instructions] document insert failed:", insertError.message);

  return NextResponse.json({
    instructions: output,
    flagged,
    grounded,
    unsupported_claims: groundedness.unsupported_claims,
    document_id: doc?.id ?? null,
    saved: !insertError && Boolean(doc?.id),
  });
}
