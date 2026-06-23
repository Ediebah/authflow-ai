"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { downloadPdf } from "@/lib/pdf";
import { parsePageParam } from "@/lib/paging";

const PAGE_SIZE = 20;

interface Doc {
  id: string;
  type: "prior_auth" | "appeal" | "patient_instructions";
  input_payload: Record<string, string>;
  output_text: string;
  flagged: boolean;
  created_at: string;
}

const TYPE_LABEL: Record<Doc["type"], string> = {
  prior_auth: "Prior Auth",
  appeal: "Appeal",
  patient_instructions: "Patient Instructions",
};

const TYPE_STYLE: Record<Doc["type"], string> = {
  prior_auth: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  appeal: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  patient_instructions: "bg-teal-500/15 text-teal-400 border border-teal-500/20",
};

type FilterType = "all" | Doc["type"];

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "prior_auth", label: "Prior Auth" },
  { value: "appeal", label: "Appeal" },
  { value: "patient_instructions", label: "Patient Instructions" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFields(doc: Doc): { label: string; value: string }[] {
  const p = doc.input_payload;
  if (doc.type === "prior_auth" || doc.type === "appeal") {
    return [
      { label: "Diagnosis", value: p.diagnosis ?? "" },
      { label: "Medication", value: p.treatment ?? "" },
      { label: "Payer", value: p.payer ?? "" },
    ];
  }
  return [
    { label: "Clinical Note", value: (p.clinicalNote ?? "").length > 60 ? (p.clinicalNote ?? "").slice(0, 60).trimEnd() + "…" : (p.clinicalNote ?? "") },
    ...(p.keyPoints ? [{ label: "Key Points", value: p.keyPoints }] : []),
  ];
}

function getPdfFilename(doc: Doc) {
  return `${doc.type.replace("_", "-")}-${doc.created_at.slice(0, 10)}.pdf`;
}

export default function HistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));

  const [docs, setDocs] = useState<Doc[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(false);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadError(true); setLoading(false); return; }

      const offset = (page - 1) * PAGE_SIZE;
      let query = supabase
        .from("documents")
        .select("id, type, input_payload, output_text, flagged, created_at", { count: "exact" })
        .eq("user_id", user.id) // defense-in-depth in addition to RLS
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (filter !== "all") query = query.eq("type", filter);

      const { data, count, error } = await query;
      if (error) { setLoadError(true); setLoading(false); return; }
      setDocs((data ?? []) as Doc[]);
      setTotalCount(count ?? 0);
      setLoading(false);
    }
    load();
  }, [page, filter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/dashboard/history?${params.toString()}`);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Document History</h1>
          <p className="text-sm text-slate-500">All generated letters and patient instructions · {totalCount} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => { setFilter(f.value); goToPage(1); }}
            className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all ${
              filter === f.value
                ? "bg-blue-600/15 text-blue-400 border-blue-500/30"
                : "bg-white/[0.03] text-slate-400 border-white/8 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-16 text-center">
          <p className="text-red-300 font-semibold text-sm mb-1">Couldn’t load your documents</p>
          <p className="text-slate-500 text-xs">Please refresh the page or sign in again.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm mb-1">No documents yet</p>
          <p className="text-slate-500 text-xs">Generate a prior auth letter or patient instructions to get started.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[140px_1fr_100px_80px] gap-4 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Details</span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</span>
            </div>

            {docs.map((doc, i) => {
              const isExpanded = expanded.has(doc.id);
              const fields = getFields(doc);
              return (
                <div key={doc.id} className={i < docs.length - 1 ? "border-b border-white/5" : ""}>
                  <div className={`grid grid-cols-[140px_1fr_100px_80px] gap-4 items-center px-5 py-3.5 transition-colors ${isExpanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
                    {/* Type */}
                    <div className="flex flex-col gap-1.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start ${TYPE_STYLE[doc.type]}`}>
                        {TYPE_LABEL[doc.type]}
                      </span>
                      {doc.flagged && (
                        <span className="text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full self-start">
                          ⚠ Review
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex gap-5 min-w-0">
                      {fields.map((f) => (
                        <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{f.label}</span>
                          <span className="text-xs text-slate-400 truncate max-w-[180px]">{f.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-slate-500">{formatDate(doc.created_at)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {doc.type === "prior_auth" && (
                        <a href={`/dashboard/prior-auth?appeal=${doc.id}`} className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors" title="Start appeal">Appeal</a>
                      )}
                      <button type="button" onClick={() => downloadPdf(doc.output_text, getPdfFilename(doc))} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">PDF</button>
                      <button type="button" onClick={() => toggleExpand(doc.id)} className="text-slate-600 hover:text-slate-400 transition-colors">
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-white/[0.01]">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Generated Output</p>
                      <textarea
                        readOnly
                        value={doc.output_text}
                        rows={10}
                        className="w-full rounded-xl bg-[#0B1020] border border-white/8 px-4 py-3 text-xs font-mono text-slate-400 focus:outline-none resize-y"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-xs text-slate-500">Page {page} of {totalPages} · {totalCount} documents</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="text-xs font-medium px-4 py-2 border border-white/10 bg-white/[0.03] text-slate-400 rounded-xl hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  ← Prev
                </button>
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="text-xs font-medium px-4 py-2 border border-white/10 bg-white/[0.03] text-slate-400 rounded-xl hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
