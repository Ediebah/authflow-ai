import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/ratelimit";
import { parseBody, tooMany } from "@/lib/api-guard";
import { feedbackSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit("feedback", user.id);
  if (!limit.ok) return tooMany();

  const parsed = await parseBody(req, feedbackSchema);
  if (!parsed.ok) return parsed.response;
  const { document_id, helpful } = parsed.data;

  // Ownership check: RLS already scopes reads to the user, so a foreign id returns null.
  const { data: owned } = await supabase
    .from("documents")
    .select("id")
    .eq("id", document_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase.from("feedback").insert({ document_id, user_id: user.id, helpful });
  if (error) return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
