"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { downloadPdf } from "@/lib/pdf";
import { useToast } from "@/components/ToastContext";

const DRAFT_KEY = "clinica:draft:patient-instructions";

export default function PatientInstructionsPage() {
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [instructions, setInstructions] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { showToast } = useToast();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        setPatientName(d.patientName ?? ""); setPatientDob(d.patientDob ?? "");
        setClinicalNote(d.clinicalNote ?? ""); setKeyPoints(d.keyPoints ?? "");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ patientName, patientDob, clinicalNote, keyPoints })); } catch { /* ignore */ }
    }, 500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [patientName, patientDob, clinicalNote, keyPoints]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) { e.preventDefault(); submitForm(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, patientName, patientDob, clinicalNote, keyPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitForm = useCallback(async () => {
    if (loading) return;
    setLoading(true); setInstructions(""); setDocumentId(null); setFlagged(false); setFeedbackSent(false);
    try {
      const res = await fetch("/api/generate/patient-instructions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicalNote, keyPoints, patient: { name: patientName || undefined, dob: patientDob || undefined } }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "Generation failed.", "error"); return; }
      setInstructions(json.instructions); setDocumentId(json.document_id ?? null); setFlagged(json.flagged ?? false);
      if (json.saved === false) showToast("Instructions generated, but couldn't be saved to history.", "error");
    } catch { showToast("Network error. Please try again.", "error"); }
    finally { setLoading(false); }
  }, [loading, patientName, patientDob, clinicalNote, keyPoints, showToast]);

  async function handleSubmit(e: React.FormEvent) { e.preventDefault(); submitForm(); }
  async function handleCopy() { await navigator.clipboard.writeText(instructions); showToast("Copied to clipboard"); }
  async function handleDownloadPdf() {
    const date = new Date().toISOString().slice(0, 10);
    await downloadPdf(instructions, `patient-instructions-${date}.pdf`);
    try { localStorage.setItem("clinica:onboarding:pdf-downloaded", "1"); } catch { /* ignore */ }
  }
  function handleEmailDraft() {
    window.location.href = `mailto:?subject=${encodeURIComponent("Patient Instructions")}&body=${encodeURIComponent(instructions)}`;
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

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Patient Instructions</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-teal-500/10 text-teal-400 border-teal-500/20">
              Plain-language
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Paste a clinical note. Get clear, plain-language instructions your patient can follow.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
          <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono">⌘</kbd>
          <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono">↵</kbd>
          <span>to generate</span>
        </div>
      </div>

      {/* Two-panel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">

        {/* LEFT: Input */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-sm font-semibold text-white">Clinical Note</span>
            <span className="text-xs text-slate-600 ml-auto">Auto-saved</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 flex-1">
            {/* Patient info */}
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Patient Info <span className="font-normal normal-case text-slate-600">(optional — personalizes output)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Patient Name</label>
                  <input value={patientName} onChange={(e) => setPatientName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Date of Birth</label>
                  <input value={patientDob} onChange={(e) => setPatientDob(e.target.value)} className={inputCls} placeholder="Jan 5, 1978" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-sm font-medium text-slate-300">
                Clinical Note <span className="text-red-400">*</span>
              </label>
              <textarea
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                required rows={12}
                className={`${inputCls} resize-y flex-1`}
                placeholder="Paste your clinical note, discharge summary, or visit note here…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">
                Key Points to Emphasize <span className="text-slate-600 font-normal">(optional)</span>
              </label>
              <input
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                className={inputCls}
                placeholder="e.g. medication schedule, wound care, follow-up date"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Generating…
                  </>
                ) : "Generate Instructions"}
              </button>
              {instructions && (
                <button type="button" onClick={submitForm} disabled={loading} className="border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm">
                  Regenerate
                </button>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT: Output */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <div className={`w-2 h-2 rounded-full ${instructions ? "bg-teal-400" : "bg-slate-600"}`} />
            <span className="text-sm font-semibold text-white">Patient-Friendly Output</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {!instructions && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-teal-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Plain-language instructions will appear here</p>
                <p className="text-slate-600 text-xs mt-1">Paste a clinical note and click Generate</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
                <p className="text-slate-400 text-sm">Converting clinical note to patient language…</p>
              </div>
            )}

            {instructions && (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                    Copy
                  </button>
                  <button onClick={handleDownloadPdf} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Download PDF
                  </button>
                  <button onClick={handleEmailDraft} className="inline-flex items-center gap-1.5 text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition-all">
                    Email draft
                  </button>
                </div>

                {flagged && (
                  <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium px-4 py-3 rounded-xl">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                    Safety flag: output may contain content not in the original note. Review before sharing with patient.
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Generated Instructions</p>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={20}
                    className="w-full rounded-xl bg-[#0B1020] border border-white/8 px-4 py-4 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-y"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {feedbackSent ? (
                    <span className="text-teal-400 font-medium text-xs">Thanks for your feedback!</span>
                  ) : (
                    <>
                      <span className="text-xs text-slate-600">Was this helpful?</span>
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

const inputCls = "bg-[#0B1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500/50 transition-colors";
