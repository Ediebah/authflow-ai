import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabaseServer";
import { isAdmin } from "@/lib/admin";
import { rateLimit } from "@/lib/ratelimit";
import { tooMany } from "@/lib/api-guard";

export const maxDuration = 300;
export const runtime = "nodejs";
import { callLLMJson } from "@/lib/llm";
import {
  PRIOR_AUTH_PACKET_SYSTEM_PROMPT,
  buildPriorAuthPacketPrompt,
  type PriorAuthPacket,
} from "@/lib/prompts";
import { scoreWithJudge, computeWeightedScore, isOverallPass } from "@/lib/assurance/judge";
import { detectFailureModes } from "@/lib/assurance/failure-modes";
import { tagSubgroups, analyzeSubgroups, wilsonCI, meanCI } from "@/lib/assurance/subgroups";
import type {
  EvalCase,
  EvalResult,
  EvalRun,
  RunSummary,
  RubricCriteria,
} from "@/lib/assurance/types";

const BATCH_SIZE = 3;
const CRITERIA_KEYS: (keyof RubricCriteria)[] = [
  "medical_necessity",
  "policy_criteria_addressed",
  "clinical_elements_complete",
  "factual_groundedness",
  "scope_appropriate",
];

async function runCase(evalCase: EvalCase): Promise<EvalResult> {
  const userPrompt = buildPriorAuthPacketPrompt({
    diagnosis: evalCase.input.diagnosis,
    treatment: evalCase.input.treatment,
    clinicalHistory: evalCase.input.clinicalHistory,
    pastTreatments: evalCase.input.pastTreatments,
    payer: evalCase.input.payer,
    denialReason: evalCase.input.denialReason,
    policyContext: "",
    guidelineContext: "",
  });

  let packet: PriorAuthPacket;
  try {
    packet = await callLLMJson<PriorAuthPacket>(PRIOR_AUTH_PACKET_SYSTEM_PROMPT, userPrompt);
  } catch {
    packet = { checklist: [], missing_docs: [], letter: "", citations: [] };
  }
  const output = packet.letter ?? "";

  const [{ scores, reasoning }, failureModes] = await Promise.all([
    scoreWithJudge(evalCase.input, output),
    detectFailureModes(evalCase.input, output),
  ]);

  const weightedScore = computeWeightedScore(scores);
  const overallPass = isOverallPass(
    scores,
    weightedScore,
    failureModes.hallucination,
    failureModes.scope_violation,
  );

  return {
    case_id: evalCase.id,
    description: evalCase.description,
    input: evalCase.input,
    output,
    judge_scores: scores,
    judge_reasoning: reasoning,
    failure_modes: failureModes,
    subgroup_tags: tagSubgroups(evalCase.input),
    weighted_score: weightedScore,
    overall_pass: overallPass,
  };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = await rateLimit("eval", user.id);
  if (!limit.ok) return tooMany();

  // Load eval cases from filesystem (bundled with the app)
  let cases: EvalCase[];
  try {
    const casesPath = path.join(process.cwd(), "evals", "prior-auth-assurance-cases.json");
    cases = JSON.parse(fs.readFileSync(casesPath, "utf-8"));
  } catch {
    return NextResponse.json({ error: "Eval case file missing or invalid" }, { status: 500 });
  }
  if (!Array.isArray(cases) || cases.length === 0) {
    return NextResponse.json({ error: "No eval cases to run" }, { status: 400 });
  }

  // Process in batches to avoid overwhelming the API
  const results: EvalResult[] = [];
  for (let i = 0; i < cases.length; i += BATCH_SIZE) {
    const batch = cases.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(runCase));
    results.push(...batchResults);
  }

  // Compute summary
  const total = results.length;
  const passCount = results.filter((r) => r.overall_pass).length;
  const [ciLower, ciUpper] = wilsonCI(passCount, total);

  const weightedScores = results.map((r) => r.weighted_score);
  const meanWeightedScore = weightedScores.reduce((a, b) => a + b, 0) / total;
  const [scoreCiLower, scoreCiUpper] = meanCI(weightedScores, { min: 0, max: 1 });

  const criteria_means = {} as RunSummary["criteria_means"];
  for (const key of CRITERIA_KEYS) {
    const vals = results.map((r) => r.judge_scores[key]); // raw 1–5 scale
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const [lo, hi] = meanCI(vals, { min: 1, max: 5 });
    criteria_means[key] = { mean, ci_lower: lo, ci_upper: hi };
  }

  const failure_mode_rates = {
    hallucination: results.filter((r) => r.failure_modes.hallucination).length / total,
    critical_omission: results.filter((r) => r.failure_modes.critical_omission).length / total,
    scope_violation: results.filter((r) => r.failure_modes.scope_violation).length / total,
  };

  const summary: RunSummary = {
    pass_rate: passCount / total,
    pass_count: passCount,
    total,
    ci_lower: ciLower,
    ci_upper: ciUpper,
    mean_weighted_score: meanWeightedScore,
    score_ci_lower: scoreCiLower,
    score_ci_upper: scoreCiUpper,
    criteria_means,
    failure_mode_rates,
    subgroup_analysis: analyzeSubgroups(results),
  };

  const run: EvalRun = {
    run_id: crypto.randomUUID(),
    run_at: new Date().toISOString(),
    model_version: "gpt-4o-mini",
    task_type: "prior_auth",
    results,
    summary,
  };

  return NextResponse.json(run);
}
