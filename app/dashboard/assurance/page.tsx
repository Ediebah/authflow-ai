"use client";

import { useState } from "react";
import { generateEvidencePackage } from "@/lib/assurance/evidence-package";
import { downloadPdf } from "@/lib/pdf";
import type { EvalRun, RubricCriteria } from "@/lib/assurance/types";

// Bundled historical runs — shown before any new run is triggered
import run1 from "../../../../evals/runs/run-2026-05-23T16-56.json";
import run2 from "../../../../evals/runs/run-2026-05-23T16-42.json";

const HISTORICAL: EvalRun[] = [run1 as EvalRun, run2 as EvalRun];

const CRITERIA_LABELS: Record<keyof RubricCriteria, string> = {
  medical_necessity: "Medical Necessity",
  policy_criteria_addressed: "Policy Criteria",
  clinical_elements_complete: "Clinical Completeness",
  factual_groundedness: "Factual Groundedness",
  scope_appropriate: "Scope Appropriate",
};

const THRESHOLDS = {
  pass_rate: 0.70,
  mean_weighted_score: 0.65,
  hallucination: 0.15,
  critical_omission: 0.10,
  scope_violation: 0.05,
};

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function score5(n: number) {
  return n.toFixed(2);
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${pass ? "bg-teal-500/15 text-teal-400 border border-teal-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
      {pass ? "✓ PASSED" : "✗ FAILED"}
    </span>
  );
}

function StatCard({ label, value, sublabel, pass }: { label: string; value: string; sublabel?: string; pass?: boolean }) {
  const borderColor = pass === true ? "border-teal-500/20" : pass === false ? "border-red-500/20" : "border-white/8";
  return (
    <div className={`rounded-2xl border ${borderColor} bg-white/[0.03] p-5`}>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-400">{label}</div>
      {sublabel && <div className="mt-0.5 text-xs text-slate-600">{sublabel}</div>}
    </div>
  );
}

function CriteriaBar({ label, mean, max = 5 }: { label: string; mean: number; max?: number }) {
  const pct = (mean / max) * 100;
  const color = pct >= 70 ? "bg-teal-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-semibold text-white">{mean.toFixed(2)} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RunView({ run }: { run: EvalRun }) {
  const s = run.summary;
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const passedThresholds = {
    pass_rate: s.pass_rate >= THRESHOLDS.pass_rate,
    mean_weighted_score: s.mean_weighted_score >= THRESHOLDS.mean_weighted_score,
    hallucination: s.failure_mode_rates.hallucination <= THRESHOLDS.hallucination,
    critical_omission: s.failure_mode_rates.critical_omission <= THRESHOLDS.critical_omission,
    scope_violation: s.failure_mode_rates.scope_violation <= THRESHOLDS.scope_violation,
  };
  const overallPass = Object.values(passedThresholds).every(Boolean);

  function handleDownload() {
    const pkg = generateEvidencePackage(run);
    const blob = new Blob([pkg], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinica-evidence-package-${run.run_at.slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Run header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-6 py-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <PassBadge pass={overallPass} />
            <span className="text-xs text-slate-500">{new Date(run.run_at).toLocaleString()}</span>
          </div>
          <div className="text-xs text-slate-600">Run {run.run_id.slice(0, 8)} · model {run.model_version} · {s.total} cases</div>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Evidence Package (.md)
        </button>
      </div>

      {/* Key stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pass Rate"
          value={`${s.pass_count}/${s.total} (${pct(s.pass_rate)})`}
          sublabel={`95% CI: ${pct(s.ci_lower)}–${pct(s.ci_upper)}`}
          pass={passedThresholds.pass_rate}
        />
        <StatCard
          label="Mean Weighted Score"
          value={s.mean_weighted_score.toFixed(3)}
          sublabel={`CI: ${s.score_ci_lower.toFixed(2)}–${s.score_ci_upper.toFixed(2)}`}
          pass={passedThresholds.mean_weighted_score}
        />
        <StatCard
          label="Hallucination Rate"
          value={pct(s.failure_mode_rates.hallucination)}
          sublabel={`Threshold ≤ ${pct(THRESHOLDS.hallucination)}`}
          pass={passedThresholds.hallucination}
        />
        <StatCard
          label="Scope Violations"
          value={pct(s.failure_mode_rates.scope_violation)}
          sublabel={`Threshold ≤ ${pct(THRESHOLDS.scope_violation)}`}
          pass={passedThresholds.scope_violation}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Criteria scores */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">Rubric Criteria (1–5 scale)</h3>
          <div className="space-y-4">
            {(Object.keys(CRITERIA_LABELS) as (keyof RubricCriteria)[]).map((key) => (
              <CriteriaBar
                key={key}
                label={CRITERIA_LABELS[key]}
                mean={s.criteria_means[key].mean}
              />
            ))}
          </div>
        </div>

        {/* Failure mode + subgroup */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Failure Modes</h3>
            <div className="space-y-3">
              {[
                { label: "Hallucination", rate: s.failure_mode_rates.hallucination, threshold: THRESHOLDS.hallucination, desc: "Claims not in source input" },
                { label: "Critical Omission", rate: s.failure_mode_rates.critical_omission, threshold: THRESHOLDS.critical_omission, desc: "Missing diagnosis, treatment, or payer" },
                { label: "Scope Violation", rate: s.failure_mode_rates.scope_violation, threshold: THRESHOLDS.scope_violation, desc: "Inappropriate clinical recommendations" },
              ].map(({ label, rate, threshold, desc }) => {
                const ok = rate <= threshold;
                return (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-300">{label}</div>
                      <div className="text-xs text-slate-600">{desc}</div>
                    </div>
                    <span className={`text-sm font-bold ${ok ? "text-teal-400" : "text-red-400"}`}>{pct(rate)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Subgroup Pass Rates</h3>
            <div className="space-y-2">
              {s.subgroup_analysis
                .filter((sg) => sg.n >= 2)
                .sort((a, b) => a.pass_rate - b.pass_rate)
                .map((sg) => (
                  <div key={`${sg.subgroup_key}-${sg.subgroup_value}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-600 uppercase tracking-wider">{sg.subgroup_key}</span>
                      <div className="text-sm text-slate-300 truncate">{sg.subgroup_value}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${sg.pass_rate >= 0.5 ? "text-teal-400" : "text-amber-400"}`}>{pct(sg.pass_rate)}</div>
                      <div className="text-[10px] text-slate-600">n={sg.n}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-case results */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center gap-2 bg-white/[0.02] px-6 py-3 border-b border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Case Results</span>
        </div>
        <div className="divide-y divide-white/5">
          {run.results.map((result) => {
            const isOpen = expandedCase === result.case_id;
            return (
              <div key={result.case_id}>
                <button
                  onClick={() => setExpandedCase(isOpen ? null : result.case_id)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 text-xs font-bold font-mono px-2 py-0.5 rounded ${result.overall_pass ? "bg-teal-500/15 text-teal-400" : "bg-red-500/15 text-red-400"}`}>
                      {result.case_id}
                    </span>
                    <span className="text-sm text-slate-300 truncate">{result.description}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-slate-500">{result.weighted_score.toFixed(3)}</span>
                    <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 space-y-4 bg-white/[0.01]">
                    {/* Scores */}
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.keys(CRITERIA_LABELS) as (keyof RubricCriteria)[]).map((key) => (
                        <div key={key} className="rounded-xl bg-white/[0.04] p-3 text-center">
                          <div className="text-lg font-bold text-white">{result.judge_scores[key]}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{CRITERIA_LABELS[key]}</div>
                          <div className="text-[10px] text-slate-600 mt-1 text-left">{result.judge_reasoning[key]}</div>
                        </div>
                      ))}
                    </div>

                    {/* Failure modes */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {result.failure_modes.hallucination && (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-medium">⚠ Hallucination</span>
                      )}
                      {result.failure_modes.critical_omission && (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-medium">⚠ Critical Omission</span>
                      )}
                      {result.failure_modes.scope_violation && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">⚠ Scope Violation</span>
                      )}
                      {result.failure_modes.unsupported_claims.length > 0 && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                          {result.failure_modes.unsupported_claims.length} unsupported claim{result.failure_modes.unsupported_claims.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {!result.failure_modes.hallucination && !result.failure_modes.critical_omission && !result.failure_modes.scope_violation && (
                        <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full font-medium">No failure modes detected</span>
                      )}
                    </div>

                    {/* Letter preview */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Generated Letter</p>
                      <pre className="text-xs text-slate-400 bg-[#0B1020] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-5 max-h-60 overflow-y-auto">
                        {result.output || "No output generated."}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AssurancePage() {
  const [runs, setRuns] = useState<EvalRun[]>(HISTORICAL);
  const [activeRunId, setActiveRunId] = useState(HISTORICAL[0]?.run_id ?? null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const activeRun = runs.find((r) => r.run_id === activeRunId) ?? runs[0];

  async function handleRun() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/eval/prior-auth", { method: "POST" });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Evaluation failed.");
        return;
      }
      const run: EvalRun = await res.json();
      setRuns((prev) => [run, ...prev]);
      setActiveRunId(run.run_id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">AI Assurance</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
              Prior Auth · LLM-as-Judge
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Runs the 10-case assurance suite against the live model. GPT-4o judges each letter on 5 criteria.
            Takes ~60 seconds.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running evaluation…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              Run Evaluation
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {running && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-6 py-10 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Generating 10 prior auth letters and scoring with GPT-4o judge…</p>
          <p className="text-slate-500 text-sm mt-1">This takes about 60 seconds. Do not close the tab.</p>
        </div>
      )}

      {/* Run selector tabs */}
      {!running && runs.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap">
            {runs.map((run) => (
              <button
                key={run.run_id}
                onClick={() => setActiveRunId(run.run_id)}
                className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all ${
                  activeRunId === run.run_id
                    ? "bg-blue-600/15 text-blue-400 border-blue-500/30"
                    : "bg-white/[0.03] text-slate-400 border-white/8 hover:bg-white/[0.06]"
                }`}
              >
                {new Date(run.run_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" "}
                <span className={run.summary.pass_rate >= THRESHOLDS.pass_rate ? "text-teal-400" : "text-red-400"}>
                  {pct(run.summary.pass_rate)}
                </span>
              </button>
            ))}
          </div>

          {activeRun && <RunView run={activeRun} />}
        </>
      )}
    </div>
  );
}
