"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { downloadPdf } from "@/lib/pdf";
import { useToast } from "@/components/ToastContext";
import { createClient } from "@/lib/supabaseClient";
import type { PriorAuthPacket } from "@/lib/prompts";

const DRAFT_KEY = "clinica:draft:prior-auth";

interface FormData {
  patientName: string;
  patientDob: string;
  patientMemberId: string;
  diagnosis: string;
  treatment: string;
  clinicalHistory: string;
  pastTreatments: string;
  payer: string;
  denialReason: string;
}

const EMPTY_FORM: FormData = {
  patientName: "", patientDob: "", patientMemberId: "",
  diagnosis: "", treatment: "", clinicalHistory: "",
  pastTreatments: "", payer: "", denialReason: "",
};

export default function PriorAuthPage() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [draft, setDraft] = useState("");
  const [packet, setPacket] = useState<PriorAuthPacket | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [unsupportedClaims, setUnsupportedClaims] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { showToast } = useToast();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setForm(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appealDocId = params.get("appeal");
    if (!appealDocId) return;
    async function prefill() {
      const supabase = createClient();
      const { data } = await supabase.from("documents").select("input_payload").eq("id", appealDocId).single();
      if (!data) return;
      const p = data.input_payload as Record<string, string>;
      setForm({
        patientName: p.patientName ?? "", patientDob: p.patientDob ?? "",
        patientMemberId: p.patientMemberId ?? "", diagnosis: p.diagnosis ?? "",
        treatment: p.treatment ?? "", clinicalHistory: p.clinicalHistory ?? "",
        pastTreatments: p.pastTreatments ?? "", payer: p.payer ?? "",
        denialReason: "Paste the insurer's denial reason here",
      });
    }
    prefill();
  }, []);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
    }, 500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) { e.preventDefault(); submitForm(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, form]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const submitForm = useCallback(async () => {
    if (loading) return;
    setLoading(true); setDraft(""); setPacket(null); setDocumentId(null); setFlagged(false); setUnsupportedClaims([]); setFeedbackSent(false);
    try {
      const res = await fetch("/api/generate/prior-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, patient: { name: form.patientName || undefined, dob: form.patientDob || undefined, memberId: form.patientMemberId || undefined } }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "Generation failed.", "error"); return; }
      setDraft(json.draft); setPacket(json.packet ?? null); setDocumentId(json.document_id ?? null); setFlagged(json.flagged ?? false); setUnsupportedClaims(json.unsupported_claims ?? []);
      if (json.saved === false) showToast("Draft generated, but it couldn't be saved to history.", "error");
    } catch { showToast("Network error. Please try again.", "error"); }
    finally { setLoading(false); }
  }, [loading, form, showToast]);

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); submitForm(); }
  async function handleCopy() { await navigator.clipboard.writeText(draft); showToast("Copied to clipboard"); }
  async function handleDownloadPdf() {
    if (!packet) return;
    const sections: string[] = [];
    sections.push(`PRIOR AUTHORIZATION EVIDENCE PACKET`);
    sections.push(`Payer: ${form.payer}  |  Generated: ${new Date().toLocaleDateString()}\n`);
    if (packet.checklist.length > 0) { sections.push(`PAYER REQUIREMENTS CHECKLIST`); sections.push(packet.checklist.map(c => `${c.met ? "[MET]" : "[MISSING]"} ${c.item}`).join("\n")); }
    if (packet.missing_docs.length > 0) { sections.push(`\nMISSING DOCUMENTATION`); sections.push(packet.missing_docs.map(d => `• ${d}`).join("\n")); }
    sections.push(`\n${"─".repeat(60)}\n`); sections.push(draft);
    if (packet.citations.length > 0) { sections.push(`\n${"─".repeat(60)}\nREFERENCES`); sections.push(packet.citations.map((c, i) => `${i + 1}. ${c}`).join("\n")); }
    const date = new Date().toISOString().slice(0, 10);
    await downloadPdf(sections.join("\n"), `${form.denialReason ? "appeal" : "prior-auth"}-${date}.pdf`);
    try { localStorage.setItem("clinica:onboarding:pdf-downloaded", "1"); } catch { /* ignore */ }
  }
  function handleEmailDraft() {
    const subject = form.denialReason ? "Prior Authorization Appeal" : "Prior Authorization Request";
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
  }
  async function handleFeedback(helpful: boolean) {
    if (!documentId || feedbackSent) return;
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: documentId, helpful }) });
      if (!res.ok) { showToast("Couldn’t save feedback. Try again.", "error"); return; }
      setFeedbackSent(true);
      showToast("Thanks for your feedback!");
    } catch {
      showToast("Network error saving feedback.", "error");
    }
  }

  const metCount = packet?.checklist.filter(c => c.met).length ?? 0;
  const totalCount = packet?.checklist.length ?? 0;
  const isAppeal = Boolean(form.denialReason);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {isAppeal ? "Denial Appeal Generator" : "Prior Authorization Copilot"}
            </h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${isAppeal ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
              {isAppeal ? "Appeal mode" : "Prior auth mode"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {isAppeal
              ? "Fill in denial reason to generate a policy-backed appeal letter."
              : "Fill in case details. Clinica AI retrieves payer policies and generates a compliance-ready packet."}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
          <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono">⌘</kbd>
          <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono">↵</kbd>
          <span>to generate</span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">

        {/* LEFT: Input form */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-white">Case Details</span>
            <span className="text-xs text-slate-600 ml-auto">Auto-saved</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 overflow-y-auto flex-1">
            {/* Patient info */}
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Patient Info <span className="font-normal normal-case text-slate-600">(optional)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Patient Name">
                  <input name="patientName" value={form.patientName} onChange={handleChange} className={inputCls} placeholder="Jane Doe" />
                </Field>
                <Field label="Date of Birth">
                  <input name="patientDob" value={form.patientDob} onChange={handleChange} className={inputCls} placeholder="Jan 5, 1978" />
                </Field>
                <Field label="Member ID">
                  <input name="patientMemberId" value={form.patientMemberId} onChange={handleChange} className={inputCls} placeholder="ABC123456" />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Diagnosis / ICD Code" required>
                <input name="diagnosis" value={form.diagnosis} onChange={handleChange} required className={inputCls} placeholder="e.g. Rheumatoid Arthritis (M05.9)" />
              </Field>
              <Field label="Treatment / Medication" required>
                <input name="treatment" value={form.treatment} onChange={handleChange} required className={inputCls} placeholder="e.g. adalimumab 40mg SC q2w" />
              </Field>
            </div>

            <Field label="Payer / Insurance" required>
              <input name="payer" value={form.payer} onChange={handleChange} required className={inputCls} placeholder="e.g. Humana, UnitedHealthcare, Aetna" />
            </Field>

            <Field label="Relevant Clinical History">
              <textarea name="clinicalHistory" value={form.clinicalHistory} onChange={handleChange} rows={3} className={`${inputCls} resize-y`} placeholder="Diagnoses, comorbidities, lab results, disease activity scores…" />
            </Field>

            <Field label="Prior Treatments Attempted">
              <textarea name="pastTreatments" value={form.pastTreatments} onChange={handleChange} rows={2} className={`${inputCls} resize-y`} placeholder="DMARDs tried, doses, durations, reasons for stopping…" />
            </Field>

            <Field label="Denial Reason" description="Fill to generate an appeal instead of a new request">
              <textarea name="denialReason" value={form.denialReason} onChange={handleChange} rows={2} className={`${inputCls} resize-y`} placeholder="Paste the insurer's denial reason here…" />
            </Field>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Generating…
                  </>
                ) : (
                  isAppeal ? "Generate Appeal Packet" : "Generate Prior Auth Packet"
                )}
              </button>
              {draft && (
                <button type="button" onClick={submitForm} disabled={loading} className="border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm">
                  Regenerate
                </button>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT: Output panel */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <div className={`w-2 h-2 rounded-full ${draft ? "bg-teal-400" : "bg-slate-600"}`} />
            <span className="text-sm font-semibold text-white">Generated Output</span>
            {packet && totalCount > 0 && (
              <span className="ml-auto text-xs text-slate-500">
                {metCount}/{totalCount} requirements met
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {!draft && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">AI output will appear here</p>
                <p className="text-slate-600 text-xs mt-1">Fill the form and click Generate</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                <p className="text-slate-400 text-sm">Retrieving payer policies and generating packet…</p>
              </div>
            )}

            {draft && (
              <>
                {/* Action bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                    Copy letter
                  </button>
                  <button onClick={handleDownloadPdf} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Download PDF
                  </button>
                  <button onClick={handleEmailDraft} className="inline-flex items-center gap-1.5 text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                    Email draft
                  </button>
                </div>

                {/* Safety flag */}
                {flagged && (
                  <div className="flex flex-col gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium px-4 py-3 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                      {unsupportedClaims.length > 0
                        ? "Safety flag: the claims below were not found in your input. Verify each before submitting."
                        : "Safety flag: this draft may contain suggestions not in your input. Review carefully before submitting."}
                    </div>
                    {unsupportedClaims.length > 0 && (
                      <ul className="ml-7 list-disc flex flex-col gap-0.5">
                        {unsupportedClaims.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {/* Checklist */}
                {packet && packet.checklist.length > 0 && (
                  <div className="rounded-xl border border-white/8 overflow-hidden">
                    <div className="flex items-center gap-2 bg-white/[0.03] px-4 py-2.5 border-b border-white/5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{form.payer} Requirements</span>
                      <span className={`ml-auto text-xs font-bold ${metCount === totalCount ? "text-teal-400" : "text-amber-400"}`}>
                        {metCount}/{totalCount} met
                      </span>
                    </div>
                    <ul className="divide-y divide-white/5">
                      {packet.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                          <span className={`mt-0.5 flex-shrink-0 font-bold text-sm ${item.met ? "text-teal-400" : "text-red-400"}`}>{item.met ? "✓" : "✗"}</span>
                          <span className={`text-sm ${item.met ? "text-slate-300" : "text-slate-500"}`}>{item.item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing docs */}
                {packet && packet.missing_docs.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Missing Documentation</p>
                    <ul className="flex flex-col gap-1">
                      {packet.missing_docs.map((doc, i) => (
                        <li key={i} className="text-sm text-red-300 flex items-start gap-2"><span className="flex-shrink-0">•</span>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Letter */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Medical Necessity Letter</p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={18}
                    className="w-full rounded-xl bg-[#0B1020] border border-white/8 px-4 py-4 text-sm font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                  />
                </div>

                {/* Citations */}
                {packet && packet.citations.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">References</p>
                    <ol className="flex flex-col gap-1">
                      {packet.citations.map((cite, i) => (
                        <li key={i} className="text-xs text-slate-500">{i + 1}. {cite}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Feedback */}
                <div className="flex items-center gap-3 pt-1">
                  {feedbackSent ? (
                    <span className="text-teal-400 font-medium text-xs">Thanks for your feedback!</span>
                  ) : (
                    <>
                      <span className="text-xs text-slate-600">Was this packet helpful?</span>
                      <button type="button" onClick={() => handleFeedback(true)} className="text-lg hover:scale-110 transition-transform">👍</button>
                      <button type="button" onClick={() => handleFeedback(false)} className="text-lg hover:scale-110 transition-transform">👎</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, description, children }: { label: string; required?: boolean; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {description && <span className="text-slate-600 font-normal ml-1.5 text-xs">— {description}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "bg-[#0B1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500/50 transition-colors";
