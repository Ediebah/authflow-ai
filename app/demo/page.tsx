"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  Download,
  FileCheck2,
  FileText,
  HeartPulse,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wand2,
} from "lucide-react";

// ─── Sample data ─────────────────────────────────────────────────────────────

const samplePriorAuth = {
  diagnosis: "Rheumatoid arthritis",
  treatment: "Adalimumab",
  clinicalHistory:
    "Patient has persistent joint pain, swelling, and morning stiffness despite prior therapy. Symptoms continue to affect daily activities.",
  pastTreatments:
    "Methotrexate was tried with inadequate response. NSAIDs provided partial symptom relief only.",
  payer: "Sample Health Plan",
  denialReason: "",
};

const sampleAppeal = {
  ...samplePriorAuth,
  denialReason:
    "Denied because documentation did not clearly demonstrate inadequate response to first-line therapy.",
};

const samplePatientNote = {
  note: "Patient seen for follow-up of hypertension. Blood pressure improved compared with prior visit. Continue current medication as prescribed. Patient advised to reduce salt intake, increase walking as tolerated, and follow up in 3 months. Call clinic for chest pain, shortness of breath, severe headache, dizziness, or swelling.",
  emphasis: "Keep language simple and include when to call the doctor.",
};

// ─── Local generation (no API in demo) ───────────────────────────────────────

type PriorAuthForm = typeof samplePriorAuth;
type PatientForm = typeof samplePatientNote;

function generatePriorAuth(form: PriorAuthForm): string {
  const isAppeal = Boolean(form.denialReason?.trim());
  const payer = form.payer || "Payer / Medical Review Team";
  const treatment = form.treatment || "requested treatment";
  const diagnosis = form.diagnosis || "Not provided";
  const history = form.clinicalHistory || "Not provided in the source information.";
  const prior = form.pastTreatments || "Not provided in the source information.";
  const denialSection = isAppeal
    ? `\nResponse to Denial Reason:\nThe denial stated: "${form.denialReason}". Based on the documented clinical history, the patient has already tried prior therapy and continues to have symptoms that support medical necessity for the requested treatment.`
    : "";

  return [
    isAppeal ? "Denial Appeal Letter" : "Prior Authorization Letter",
    "",
    `To: ${payer}`,
    "",
    `Re: Request for ${treatment}`,
    `Diagnosis: ${diagnosis}`,
    "",
    "1. Introduction",
    `I am requesting coverage approval for ${treatment} for a patient with ${diagnosis}.`,
    "",
    "2. Medical Necessity",
    history,
    "",
    "3. Prior Treatments Tried",
    prior,
    "",
    "4. Clinical Rationale",
    "The requested therapy is clinically reasonable based on persistent symptoms and inadequate response to prior therapy documented above. This draft should be reviewed and finalized by the treating clinician or authorized staff before submission.",
    "",
    "5. Policy Alignment",
    "Retrieved payer policy and guideline sections should be inserted here once the RAG layer is connected. For this demo, no external policy text is being used.",
    denialSection,
    "",
    "6. Conclusion",
    `Please approve coverage for ${treatment} based on the documented medical necessity.`,
    "",
    "Important: This is an AI-generated draft and must be reviewed before use.",
  ].join("\n");
}

function generatePatientInstructions(form: PatientForm): string {
  const note = form.note || "Not provided in the source information.";
  return [
    "Patient-Friendly Visit Instructions",
    "",
    "1. What We Discussed",
    note,
    "",
    "2. What This Means",
    "Your care team reviewed your current health concern and plan. This summary uses simpler language to help you remember the key points from the visit.",
    "",
    "3. Your Medications",
    "Continue medications exactly as your clinician prescribed. This draft does not add, stop, or change any medication instructions.",
    "",
    "4. How to Take Care of Yourself",
    "Follow the plan discussed during the visit. Keep track of symptoms and follow up as instructed.",
    "",
    "5. When to Call Your Doctor",
    "Call your doctor or clinic if symptoms get worse, if you have new concerning symptoms, or if you are unsure about your care plan.",
    "",
    "6. Frequently Asked Questions",
    "Q: Can I change my medication?",
    "A: No. Do not change medication unless your clinician tells you to.",
    "",
    "Q: What should I do if I feel worse?",
    "A: Contact your clinician or seek urgent care if symptoms are severe.",
    "",
    "Important: These instructions summarize the visit and do not replace medical advice from your clinician.",
  ].join("\n");
}

function detectSafetyFlags(output: string): string[] {
  const rules: [RegExp, string][] = [
    [/increase.*dose/i, "Possible dosing increase detected"],
    [/decrease.*dose/i, "Possible dosing decrease detected"],
    [/stop taking/i, "Possible medication stop instruction detected"],
    [/start.*new medication/i, "Possible new medication recommendation detected"],
    [/diagnosed with/i, "Possible new diagnosis language detected"],
  ];
  return rules.filter(([re]) => re.test(output)).map(([, label]) => label);
}

// ─── Demo self-tests ──────────────────────────────────────────────────────────

const demoTests = [
  { name: "Prior auth contains diagnosis and treatment", run: () => { const o = generatePriorAuth(samplePriorAuth); return o.includes("Rheumatoid arthritis") && o.includes("Adalimumab"); } },
  { name: "Appeal output includes denial section", run: () => generatePriorAuth(sampleAppeal).includes("Response to Denial Reason") },
  { name: "Patient instructions include call doctor section", run: () => generatePatientInstructions(samplePatientNote).includes("When to Call Your Doctor") },
  { name: "Safety detector catches dosing language", run: () => detectSafetyFlags("Please increase the dose tomorrow.").length > 0 },
  { name: "Safety detector catches medication stop language", run: () => detectSafetyFlags("Patient should stop taking medication today.").length > 0 },
  { name: "Safety detector stays quiet for neutral text", run: () => detectSafetyFlags("Continue the documented plan and follow up as instructed.").length === 0 },
  { name: "Fallback text appears when diagnosis is missing", run: () => generatePriorAuth({ ...samplePriorAuth, diagnosis: "" }).includes("Not provided") },
  { name: "Empty patient note uses fallback text", run: () => generatePatientInstructions({ note: "", emphasis: "" }).includes("Not provided") },
  { name: "Generated appeal includes treatment name", run: () => generatePriorAuth(sampleAppeal).includes("Adalimumab") },
];

function runDemoTests() {
  return demoTests.map((t) => ({ name: t.name, passed: Boolean(t.run()) }));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...values: (string | false | undefined | null)[]) {
  return values.filter(Boolean).join(" ");
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text || "");
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text || ""], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doc {
  id: string;
  type: "prior_auth" | "appeal" | "patient_instructions";
  title: string;
  input: Record<string, string>;
  output: string;
  flags: string[];
  status: "draft" | "needs_review" | "reviewed";
  createdAt: string;
}

type ActiveView = "overview" | "prior" | "patient" | "documents" | "settings";

// ─── Primitives ───────────────────────────────────────────────────────────────

function GlassCard({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn("rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-blue-950/30 backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", className = "", onClick, disabled }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "light"; className?: string; onClick?: () => void; disabled?: boolean;
}) {
  const styles = {
    primary: "bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400",
    secondary: "border border-white/15 bg-white/10 text-white hover:bg-white/15",
    light: "bg-white text-slate-950 hover:bg-cyan-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-50", styles[variant], className)}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multiline = false, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number;
}) {
  const cls = "w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50";
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cn(cls, "resize-none")} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      }
    </label>
  );
}

function SafetyBanner({ flags }: { flags: string[] }) {
  if (!flags || flags.length === 0) {
    return (
      <div className="rounded-2xl border border-green-300/20 bg-green-300/10 p-4 text-sm text-green-100">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} /> No safety flags detected</div>
        <p className="mt-1 text-green-100/80">Human review is still required before use.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
      <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> Needs review</div>
      <ul className="mt-2 list-disc pl-5">{flags.map((f) => <li key={f}>{f}</li>)}</ul>
    </div>
  );
}

function DocumentRow({ doc }: { doc: Doc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{doc.title}</div>
          <div className="mt-1 text-xs text-slate-400">{doc.type.split("_").join(" ")} · {doc.createdAt}</div>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs", doc.status === "needs_review" ? "bg-amber-300/10 text-amber-100" : doc.status === "reviewed" ? "bg-green-300/10 text-green-100" : "bg-slate-300/10 text-slate-300")}>
          {doc.status.split("_").join(" ")}
        </span>
      </div>
    </div>
  );
}

function DraftActionBar({ text, filename, onSave }: { text: string; filename: string; onSave: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => copyText(text)}><Copy className="mr-2" size={16} /> Copy</Button>
      <Button variant="secondary" onClick={() => downloadText(filename, text)}><Download className="mr-2" size={16} /> TXT</Button>
      <Button onClick={onSave}><Save className="mr-2" size={16} /> Save</Button>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <GlassCard className="p-6 transition hover:-translate-y-1 hover:border-cyan-300/30">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300 text-white"><Icon size={24} /></div>
      <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
      <p className="leading-7 text-slate-300">{text}</p>
    </GlassCard>
  );
}

function WorkflowStep({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200"><Icon size={21} /></div>
      <h4 className="mb-2 font-semibold text-white">{title}</h4>
      <p className="text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function MockStat({ value, label, color }: { value: string; label: string; color: string }) {
  return <div className={cn("rounded-2xl p-4", color)}><div className="text-3xl font-bold text-white">{value}</div><div className="text-sm text-slate-300">{label}</div></div>;
}

function DashboardMockup() {
  return (
    <GlassCard className="overflow-hidden p-4">
      <div className="rounded-2xl border border-white/10 bg-slate-950/80">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="rounded-full bg-white/10 px-4 py-1 text-xs text-slate-300">clinica.ai/dashboard</div>
        </div>
        <div className="grid gap-0 md:grid-cols-[210px_1fr]">
          <aside className="hidden border-r border-white/10 bg-white/[0.03] p-5 md:block">
            <div className="mb-6 text-sm font-bold text-white">Clinica AI</div>
            {["Dashboard", "Prior Auth", "Appeals", "Patient Instructions", "Documents"].map((item, i) => (
              <div key={item} className={cn("mb-3 rounded-xl px-3 py-2 text-sm", i === 1 ? "bg-blue-500 text-white" : "text-slate-400")}>{item}</div>
            ))}
          </aside>
          <main className="p-5">
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <MockStat value="42" label="Letters generated" color="bg-blue-500/15" />
              <MockStat value="18" label="Patient summaries" color="bg-cyan-400/15" />
              <MockStat value="91%" label="Draft completeness" color="bg-purple-400/15" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold text-white">Prior Auth Copilot</h4>
                  <span className="rounded-full bg-green-400/15 px-3 py-1 text-xs text-green-200">Ready</span>
                </div>
                <div className="space-y-3">
                  <div className="h-10 rounded-xl bg-white/10" />
                  <div className="h-20 rounded-xl bg-white/10" />
                  <button className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white">Generate Draft</button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold text-white">Generated Draft</h4>
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-200">Review</span>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="h-3 w-full rounded bg-white/20" />
                  <div className="h-3 w-10/12 rounded bg-white/20" />
                  <div className="h-3 w-11/12 rounded bg-white/20" />
                  <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">Safety review required before use.</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  return (
    <main className="relative z-10">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-24 text-center md:pb-24 md:pt-32">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Pill><ShieldCheck className="mr-2" size={16} /> Secure · Human-reviewed · Built for healthcare teams</Pill>
          <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            AI Copilot for{" "}
            <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-purple-300 bg-clip-text text-transparent">
              Healthcare Documentation
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
            Generate prior authorization letters, denial appeals, and patient-friendly visit instructions in seconds, with safety checks and human review built in.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={onEnterApp}>Launch Demo App <ArrowRight className="ml-2" size={18} /></Button>
            <Button variant="secondary" onClick={() => document.getElementById("solution")?.scrollIntoView({ behavior: "smooth" })}>
              Explore Solution
            </Button>
          </div>
        </motion.div>
        <motion.div className="mt-16" initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}>
          <DashboardMockup />
        </motion.div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center text-sm text-slate-300 md:grid-cols-4">
          <div>Built for clinicians</div>
          <div>Prior auth specialists</div>
          <div>Small practices</div>
          <div>Telehealth teams</div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 max-w-3xl">
          <Pill><FileText className="mr-2" size={16} /> What Clinica AI does</Pill>
          <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">Three workflows. One documentation engine.</h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">Clinica AI turns clinical input into structured, editable drafts your team can review, approve, and export.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard icon={ClipboardCheck} title="Prior Authorization Copilot" text="Create payer-ready prior auth letters with medical necessity, clinical rationale, and policy alignment." />
          <FeatureCard icon={FileText} title="Denial Appeal Generator" text="Generate evidence-based appeal drafts that respond to payer denial language." />
          <FeatureCard icon={HeartPulse} title="Patient-Friendly Instructions" text="Convert clinical notes into clear, patient-friendly instructions and FAQs." />
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <Pill><Brain className="mr-2" size={16} /> AI-native workflow</Pill>
            <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">From clinical text to reviewed documentation.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">Retrieve context, generate a draft, check safety, review, then export.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <WorkflowStep icon={Database} title="Retrieve" text="Search payer policies, guidelines, and patient education content." />
            <WorkflowStep icon={Brain} title="Generate" text="Use workflow-specific prompts for letters and patient instructions." />
            <WorkflowStep icon={ShieldCheck} title="Safety Check" text="Flag unsupported dosing, invented diagnoses, or risky recommendations." />
            <WorkflowStep icon={UserCheck} title="Review + Export" text="Edit, approve, copy, or download." />
          </div>
        </div>
      </section>

      {/* Why it works + Security */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard className="p-8">
            <h3 className="mb-5 text-2xl font-bold">Why it works</h3>
            <div className="space-y-4 text-slate-300">
              {["Domain-aware RAG roadmap", "Safety-first prompts", "Human review before use", "Fast export"].map((item) => (
                <div key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-cyan-300" size={20} /><span>{item}</span></div>
              ))}
            </div>
          </GlassCard>
          <GlassCard id="security" className="p-8">
            <h3 className="mb-5 text-2xl font-bold">Security &amp; privacy roadmap</h3>
            <div className="space-y-4 text-slate-300">
              {["No PHI required for pilot testing", "De-identified workflows", "Encrypted transmission", "HIPAA-aligned enterprise deployment planned"].map((item) => (
                <div key={item} className="flex gap-3"><Lock className="mt-0.5 shrink-0 text-green-300" size={20} /><span>{item}</span></div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="mx-auto max-w-7xl px-6 py-24">
        <GlassCard className="p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <Pill><LayoutDashboard className="mr-2" size={16} /> Roadmap</Pill>
              <h2 className="mt-6 text-4xl font-bold">What comes next</h2>
              <p className="mt-4 text-slate-300">After private alpha, Clinica AI expands into workflow integrations and enterprise readiness.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {["EHR integrations", "Multi-language instructions", "Custom templates", "Automated guideline updates", "HIPAA enterprise edition", "Team workspaces"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-200">{item}</div>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="text-4xl font-bold tracking-tight md:text-6xl">Stop wasting hours on documentation.</h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">Focus on patients. Let Clinica AI handle first-draft generation.</p>
        <Button variant="light" className="mt-10" onClick={onEnterApp}>
          Request Early Access <ArrowRight className="ml-2" size={18} />
        </Button>
      </section>
    </main>
  );
}

// ─── App shell components ─────────────────────────────────────────────────────

function Sidebar({ active, setActive, onLanding }: { active: ActiveView; setActive: (v: ActiveView) => void; onLanding: () => void }) {
  const items: [ActiveView, React.ElementType, string][] = [
    ["overview", Home, "Overview"],
    ["prior", ClipboardCheck, "Prior Auth"],
    ["patient", HeartPulse, "Patient Instructions"],
    ["documents", FileText, "Documents"],
    ["settings", Settings, "Settings"],
  ];
  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/60 p-5 backdrop-blur-xl lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300">
          <Sparkles size={22} />
        </div>
        <div>
          <div className="text-lg font-bold">Clinica AI</div>
          <div className="text-xs text-slate-400">Pilot Workspace</div>
        </div>
      </div>
      <nav className="space-y-2">
        {items.map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition", active === id ? "bg-blue-500 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white")}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
      <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
        <div className="mb-1 font-semibold">Pilot mode</div>
        Use synthetic or de-identified data only.
      </div>
      <button onClick={onLanding} className="mt-6 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <LogOut size={16} /> Back to landing
      </button>
    </aside>
  );
}

function Topbar({ active, setActive }: { active: ActiveView; setActive: (v: ActiveView) => void }) {
  const titles: Record<ActiveView, string> = {
    overview: "Overview",
    prior: "Prior Auth",
    patient: "Patient Instructions",
    documents: "Documents",
    settings: "Settings",
  };
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Clinica AI</div>
          <h1 className="text-xl font-bold">{titles[active]}</h1>
        </div>
        <div className="hidden items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 md:flex">
          <Search className="mr-2" size={16} /> Search documents
        </div>
        <Button onClick={() => setActive("prior")}><Plus className="mr-2" size={16} /> New Draft</Button>
      </div>
    </header>
  );
}

// ─── App views ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold">{value}</div>
          <div className="mt-1 text-sm text-slate-400">{label}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
          <Icon size={22} />
        </div>
      </div>
    </GlassCard>
  );
}

function Overview({ documents, setActive }: { documents: Doc[]; setActive: (v: ActiveView) => void }) {
  const priorCount = documents.filter((d) => d.type === "prior_auth" || d.type === "appeal").length;
  const patientCount = documents.filter((d) => d.type === "patient_instructions").length;
  const needsReview = documents.filter((d) => d.status === "needs_review").length;
  return (
    <div className="space-y-8 p-5 lg:p-8">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Auth / appeal drafts" value={priorCount} icon={ClipboardCheck} />
        <StatCard label="Patient instructions" value={patientCount} icon={HeartPulse} />
        <StatCard label="Needs review" value={needsReview} icon={AlertTriangle} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold">Generate documentation</h2>
          <p className="mt-2 text-slate-400">Choose a workflow and create a structured draft in seconds.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button onClick={() => setActive("prior")} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:bg-white/10">
              <ClipboardCheck className="mb-4 text-cyan-300" />
              <div className="font-semibold">Prior Auth / Appeal</div>
              <div className="mt-2 text-sm text-slate-400">Generate payer-ready letters.</div>
            </button>
            <button onClick={() => setActive("patient")} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:bg-white/10">
              <HeartPulse className="mb-4 text-green-300" />
              <div className="font-semibold">Patient Instructions</div>
              <div className="mt-2 text-sm text-slate-400">Simplify clinical notes.</div>
            </button>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold">Recent activity</h2>
          <div className="mt-5 space-y-3">
            {documents.slice(0, 5).map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
            {documents.length === 0 && <p className="text-slate-400">No documents yet. Generate your first draft.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function TwoColumnLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">{left}{right}</div>;
}

function OutputPanel({ title, subtitle, output, setOutput, flags, filename, onSave, mono = false }: {
  title: string; subtitle: string; output: string; setOutput: (v: string) => void;
  flags: string[]; filename: string; onSave: () => void; mono?: boolean;
}) {
  return (
    <GlassCard className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <DraftActionBar text={output} filename={filename} onSave={onSave} />
      </div>
      <div className="mb-4"><SafetyBanner flags={flags} /></div>
      <textarea
        value={output}
        onChange={(e) => setOutput(e.target.value)}
        placeholder="Generated output will appear here."
        rows={22}
        className={cn("w-full resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/40", mono ? "font-mono" : "")}
      />
    </GlassCard>
  );
}

function PriorAuth({ onSave }: { onSave: (doc: Omit<Doc, "id" | "createdAt">) => void }) {
  const [form, setForm] = useState(samplePriorAuth);
  const [output, setOutput] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const update = (key: keyof typeof samplePriorAuth, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const generate = () => { const draft = generatePriorAuth(form); setOutput(draft); setFlags(detectSafetyFlags(draft)); };
  const save = () => {
    if (!output.trim()) return;
    const isAppeal = Boolean(form.denialReason?.trim());
    onSave({ type: isAppeal ? "appeal" : "prior_auth", title: `${isAppeal ? "Appeal" : "Prior Auth"}: ${form.treatment || "Requested Treatment"}`, input: form, output, flags, status: flags.length ? "needs_review" : "draft" });
  };
  return (
    <TwoColumnLayout
      left={
        <GlassCard className="p-6">
          <div className="mb-6"><h2 className="text-2xl font-bold">Prior Auth / Appeal</h2><p className="mt-1 text-sm text-slate-400">Create a structured payer-ready draft.</p></div>
          <div className="mb-5 flex gap-2">
            <Button variant="secondary" onClick={() => setForm(samplePriorAuth)}>Sample PA</Button>
            <Button variant="secondary" onClick={() => setForm(sampleAppeal)}>Sample Appeal</Button>
          </div>
          <div className="space-y-5">
            <Field label="Diagnosis" value={form.diagnosis} onChange={(v) => update("diagnosis", v)} />
            <Field label="Requested medication / procedure" value={form.treatment} onChange={(v) => update("treatment", v)} />
            <Field label="Payer" value={form.payer} onChange={(v) => update("payer", v)} />
            <Field label="Clinical history" value={form.clinicalHistory} onChange={(v) => update("clinicalHistory", v)} multiline rows={4} />
            <Field label="Past treatments tried" value={form.pastTreatments} onChange={(v) => update("pastTreatments", v)} multiline rows={4} />
            <Field label="Denial reason (optional — for appeals)" value={form.denialReason} onChange={(v) => update("denialReason", v)} multiline rows={3} />
            <Button onClick={generate} className="w-full"><Wand2 className="mr-2" size={17} /> Generate Draft</Button>
          </div>
        </GlassCard>
      }
      right={<OutputPanel title="Generated draft" subtitle="Edit, save, copy, or export." output={output} setOutput={setOutput} flags={flags} filename="clinica-prior-auth.txt" onSave={save} mono />}
    />
  );
}

function PatientInstructions({ onSave }: { onSave: (doc: Omit<Doc, "id" | "createdAt">) => void }) {
  const [form, setForm] = useState(samplePatientNote);
  const [output, setOutput] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const update = (key: keyof typeof samplePatientNote, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const generate = () => { const draft = generatePatientInstructions(form); setOutput(draft); setFlags(detectSafetyFlags(draft)); };
  const save = () => {
    if (!output.trim()) return;
    onSave({ type: "patient_instructions", title: "Patient Instructions", input: form, output, flags, status: flags.length ? "needs_review" : "draft" });
  };
  return (
    <TwoColumnLayout
      left={
        <GlassCard className="p-6">
          <div className="mb-6"><h2 className="text-2xl font-bold">Patient Instructions</h2><p className="mt-1 text-sm text-slate-400">Convert clinical notes into patient-friendly language.</p></div>
          <div className="mb-5"><Button variant="secondary" onClick={() => setForm(samplePatientNote)}>Sample Note</Button></div>
          <div className="space-y-5">
            <Field label="Clinical note" value={form.note} onChange={(v) => update("note", v)} multiline rows={12} />
            <Field label="Key points to emphasize" value={form.emphasis} onChange={(v) => update("emphasis", v)} multiline rows={3} />
            <Button onClick={generate} className="w-full"><Wand2 className="mr-2" size={17} /> Generate Instructions</Button>
          </div>
        </GlassCard>
      }
      right={<OutputPanel title="Patient handout" subtitle="Review before sharing with a patient." output={output} setOutput={setOutput} flags={flags} filename="clinica-patient-instructions.txt" onSave={save} />}
    />
  );
}

function Documents({ documents, setDocuments }: { documents: Doc[]; setDocuments: React.Dispatch<React.SetStateAction<Doc[]>> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = documents.find((d) => d.id === selectedId) ?? documents[0];

  if (!documents.length) {
    return (
      <div className="p-5 lg:p-8">
        <GlassCard className="p-10 text-center">
          <FileText className="mx-auto mb-4 text-slate-400" size={42} />
          <h2 className="text-2xl font-bold">No documents yet</h2>
          <p className="mt-2 text-slate-400">Generate and save a draft to see it here.</p>
        </GlassCard>
      </div>
    );
  }

  const updateSelected = (value: string) =>
    setDocuments((prev) => prev.map((d) => (d.id === selected.id ? { ...d, output: value } : d)));
  const markReviewed = () =>
    setDocuments((prev) => prev.map((d) => (d.id === selected.id ? { ...d, status: "reviewed" as const, flags: [] } : d)));

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr] lg:p-8">
      <div className="space-y-3">
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setSelectedId(doc.id)}
            className={cn("w-full text-left transition rounded-2xl", (selectedId === doc.id || (!selectedId && doc === documents[0])) && "ring-1 ring-blue-500 ring-offset-2 ring-offset-[#080D1A]")}
          >
            <DocumentRow doc={doc} />
          </button>
        ))}
      </div>
      {selected && (
        <GlassCard className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{selected.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{selected.type.split("_").join(" ")} · {selected.createdAt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={markReviewed}><FileCheck2 className="mr-2" size={16} /> Mark Reviewed</Button>
              <Button variant="secondary" onClick={() => copyText(selected.output)}><Copy className="mr-2" size={16} /> Copy</Button>
              <Button variant="secondary" onClick={() => downloadText(`clinica-${selected.type}.txt`, selected.output)}><Download className="mr-2" size={16} /> TXT</Button>
            </div>
          </div>
          <SafetyBanner flags={selected.flags} />
          <textarea
            value={selected.output}
            onChange={(e) => updateSelected(e.target.value)}
            rows={20}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-cyan-300/40"
          />
        </GlassCard>
      )}
    </div>
  );
}

function SettingsView() {
  const tests = useMemo(() => runDemoTests(), []);
  return (
    <div className="space-y-6 p-5 lg:p-8">
      <GlassCard className="p-6">
        <h2 className="mb-2 text-2xl font-bold">Settings</h2>
        <p className="text-slate-400">Pilot workspace configuration.</p>
        <div className="mt-6 space-y-4">
          {[
            { label: "Workspace mode", value: "Pilot — synthetic / de-identified data only", valueClass: "text-amber-300" },
            { label: "RAG layer", value: "Not connected in demo. Policy context is placeholder text.", valueClass: "text-slate-400" },
            { label: "LLM generation", value: "Demo uses local template generation. Production uses OpenAI / Anthropic APIs.", valueClass: "text-slate-400" },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-semibold text-white mb-1">{label}</div>
              <div className={cn("text-sm", valueClass)}>{value}</div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-6">
        <h2 className="mb-4 text-xl font-bold">Demo self-tests</h2>
        <div className="space-y-3">
          {tests.map((t) => (
            <div key={t.name} className="flex items-center gap-3">
              {t.passed
                ? <CheckCircle2 className="shrink-0 text-green-400" size={18} />
                : <AlertTriangle className="shrink-0 text-red-400" size={18} />
              }
              <span className={cn("text-sm", t.passed ? "text-slate-300" : "text-red-300")}>{t.name}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ClinicaAIDemo() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [active, setActive] = useState<ActiveView>("overview");
  const [documents, setDocuments] = useState<Doc[]>([]);

  const saveDocument = (doc: Omit<Doc, "id" | "createdAt">) => {
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setDocuments((prev) => [{ ...doc, id: createId(), createdAt: now }, ...prev]);
    setActive("documents");
  };

  const enterApp = () => { setView("app"); setActive("overview"); };

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-[#080D1A] text-white">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-[-12rem] top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute right-[-8rem] top-[10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-[-16rem] left-[35%] h-[36rem] w-[36rem] rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>
        {/* Nav */}
        <header className="relative z-10 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300"><Sparkles size={21} /></div>
              <span className="text-xl font-bold tracking-tight">Clinica AI</span>
            </div>
            <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
              <a href="#solution" className="hover:text-white transition-colors">Solution</a>
              <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
              <a href="#security" className="hover:text-white transition-colors">Security</a>
              <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
            </nav>
            <button onClick={enterApp} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-100 transition-colors">
              Launch Demo
            </button>
          </div>
        </header>
        <LandingPage onEnterApp={enterApp} />
        <footer className="relative z-10 border-t border-white/10 px-6 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
            <span className="font-bold text-white tracking-tight">Clinica AI</span>
            <p className="text-xs">© 2026 Clinica AI · AI-generated drafts must be reviewed before use.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080D1A] text-white">
      <Sidebar active={active} setActive={setActive} onLanding={() => setView("landing")} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar active={active} setActive={setActive} />
        <div className="flex-1 overflow-y-auto">
          {active === "overview" && <Overview documents={documents} setActive={setActive} />}
          {active === "prior" && <PriorAuth onSave={saveDocument} />}
          {active === "patient" && <PatientInstructions onSave={saveDocument} />}
          {active === "documents" && <Documents documents={documents} setDocuments={setDocuments} />}
          {active === "settings" && <SettingsView />}
        </div>
      </div>
    </div>
  );
}
