"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  FileText,
  ClipboardCheck,
  HeartPulse,
  Lock,
  Sparkles,
  CheckCircle2,
  LayoutDashboard,
  Database,
  Brain,
  UserCheck,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function GlassCard({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-blue-950/30 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
      {children}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <GlassCard className="p-6 transition hover:-translate-y-1 hover:border-cyan-300/30">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300 text-white">
        <Icon size={24} />
      </div>
      <h3 className="mb-3 text-xl font-semibold text-white">{title}</h3>
      <p className="leading-7 text-slate-300">{text}</p>
    </GlassCard>
  );
}

function WorkflowStep({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-slate-950/40 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
        <Icon size={21} />
      </div>
      <h4 className="mb-2 font-semibold text-white">{title}</h4>
      <p className="text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
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
              <div key={item} className={`mb-3 rounded-xl px-3 py-2 text-sm ${i === 1 ? "bg-blue-500 text-white" : "text-slate-400"}`}>
                {item}
              </div>
            ))}
          </aside>
          <main className="p-5">
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-blue-500/15 p-4">
                <div className="text-3xl font-bold text-white">42</div>
                <div className="text-sm text-slate-300">Letters generated</div>
              </div>
              <div className="rounded-2xl bg-cyan-400/15 p-4">
                <div className="text-3xl font-bold text-white">18</div>
                <div className="text-sm text-slate-300">Patient summaries</div>
              </div>
              <div className="rounded-2xl bg-purple-400/15 p-4">
                <div className="text-3xl font-bold text-white">91%</div>
                <div className="text-sm text-slate-300">Draft completeness</div>
              </div>
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
                  <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
                    Safety review required before use.
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </GlassCard>
  );
}

export default function ClinicaAILandingPage() {
  return (
    <div className="min-h-screen bg-[#080D1A] text-white">
      {/* Background blobs + grid */}
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-300">
              <Sparkles size={21} />
            </div>
            <span className="text-xl font-bold tracking-tight">Clinica AI</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#solution" className="hover:text-white transition-colors">Solution</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
            <Link href="/demo" className="hover:text-white transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-slate-400 hover:text-white transition-colors sm:inline">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-100 transition-colors">
              Get Early Access
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-24 text-center md:pb-24 md:pt-32">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Pill><ShieldCheck className="mr-2" size={16} /> Secure · Human-reviewed · Built for healthcare teams</Pill>
            <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              AI Copilot for{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-purple-300 bg-clip-text text-transparent">
                Healthcare Documentation
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
              Generate prior authorization letters, denial appeals, and patient-friendly visit instructions in seconds —
              with domain-aware retrieval, safety checks, and human review built in.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex items-center rounded-2xl bg-blue-500 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-colors"
              >
                Get Early Access <ArrowRight className="ml-2 transition group-hover:translate-x-1" size={18} />
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            <DashboardMockup />
          </motion.div>
        </section>

        {/* Social proof strip */}
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
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Clinica AI turns messy clinical input into structured, editable drafts that your team can review, approve, and export.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={ClipboardCheck}
              title="Prior Authorization Copilot"
              text="Create payer-ready prior auth letters with medical necessity, clinical rationale, guideline references, and policy alignment."
            />
            <FeatureCard
              icon={FileText}
              title="Denial Appeal Generator"
              text="Generate stronger, evidence-based appeal drafts that directly respond to payer denial language and support medical necessity."
            />
            <FeatureCard
              icon={HeartPulse}
              title="Patient-Friendly Instructions"
              text="Convert clinical notes into clear, 5th–6th grade patient instructions, FAQs, and follow-up guidance from the original note."
            />
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Pill><Brain className="mr-2" size={16} /> AI-native workflow</Pill>
              <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
                From clinical text to reviewed documentation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                The system retrieves relevant policy and guideline context, generates a structured draft, checks for safety risks, and keeps the human in control.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <WorkflowStep icon={Database} title="Retrieve" text="Search payer policies, guidelines, and patient education content." />
              <WorkflowStep icon={Brain} title="Generate" text="Use workflow-specific prompts for letters and patient instructions." />
              <WorkflowStep icon={ShieldCheck} title="Safety Check" text="Flag unsupported dosing, invented diagnoses, or risky recommendations." />
              <WorkflowStep icon={UserCheck} title="Review + Export" text="Clinician or billing staff edits, approves, and exports." />
            </div>
          </div>
        </section>

        {/* Why it works + Security */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard className="p-8">
              <h3 className="mb-5 text-2xl font-bold">Why it works</h3>
              <div className="space-y-4 text-slate-300">
                {[
                  "Domain-aware RAG over policies and guidelines",
                  "Safety-first prompts with strict clinical boundaries",
                  "Human-in-the-loop review before any use",
                  "Fast export to PDF or copy into existing workflows",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-cyan-300" size={20} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard id="security" className="p-8">
              <h3 className="mb-5 text-2xl font-bold">Security &amp; privacy roadmap</h3>
              <div className="space-y-4 text-slate-300">
                {[
                  "No PHI required for initial pilot testing",
                  "De-identified workflows supported",
                  "Encrypted data transmission",
                  "HIPAA-aligned enterprise deployment planned",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <Lock className="mt-0.5 shrink-0 text-green-300" size={20} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Pilot program */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <GlassCard className="p-8 md:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex justify-center">
                <Pill><UserCheck className="mr-2" size={16} /> Early pilot program</Pill>
              </div>
              <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">Built for early pilots</h2>
              <p className="mx-auto mt-5 max-w-2xl text-slate-300">
                Clinica AI is in active development with a small group of early users. Start with synthetic or
                de-identified examples and validate the workflow with your clinicians and billing teams — no PHI
                required to begin.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Hands-on access", "Try prior auth letters, patient instructions, and appeal drafts on your own cases."],
                ["Shape the roadmap", "Work directly with the founding team and tell us what to build next."],
                ["Start without PHI", "Begin with synthetic or de-identified data while enterprise compliance is finalized."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="mb-2 font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-2xl bg-white px-8 py-4 font-semibold text-slate-950 transition-colors hover:bg-cyan-100"
              >
                Join the pilot <ArrowRight className="ml-2" size={18} />
              </Link>
            </div>
          </GlassCard>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="mx-auto max-w-7xl px-6 py-24">
          <GlassCard className="p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div>
                <Pill><LayoutDashboard className="mr-2" size={16} /> Roadmap</Pill>
                <h2 className="mt-6 text-4xl font-bold">What comes next</h2>
                <p className="mt-4 text-slate-300">
                  After the private alpha, Clinica AI expands into deeper workflow integrations and enterprise readiness.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {["EHR integrations", "Multi-language instructions", "Custom templates", "Automated guideline updates", "HIPAA enterprise edition", "Team workspaces"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-6 py-28 text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-6xl">Stop wasting hours on documentation.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Focus on patients. Let Clinica AI handle the repetitive structure, policy alignment, and first-draft generation.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex items-center rounded-2xl bg-white px-8 py-4 font-semibold text-slate-950 hover:bg-cyan-100 transition-colors"
          >
            Request Early Access <ArrowRight className="ml-2" size={18} />
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <span className="font-bold text-white tracking-tight">Clinica AI</span>
          <div className="flex items-center gap-6 text-xs">
            <a href="#solution" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#security" className="hover:text-slate-300 transition-colors">Security</a>
            <a href="mailto:ediebahdivine@gmail.com" className="hover:text-slate-300 transition-colors">Contact</a>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Sign in</Link>
          </div>
          <p className="text-xs">© 2026 Clinica AI · AI-generated drafts must be reviewed before use.</p>
        </div>
      </footer>
    </div>
  );
}
