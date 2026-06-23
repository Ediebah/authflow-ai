# Project: AuthFlow AI

<!--
  Loaded into EVERY Claude Code session. Keep tight (~under 150 lines).
  Rule: if Claude would NOT make a mistake without a line, delete it.
  Document corrections, not confirmations. Most of the value here is the
  UiPath section — Claude has little/no training data on our orchestration.
-->

## What this is
AuthFlow AI is a governed, long-running **prior-authorization workflow
orchestrated by UiPath Maestro BPMN**. It is **not** a document generator. The
existing Clinica AI intelligence (RAG + criteria matching + letter generation)
is the *agent logic*; UiPath is the *orchestration and governance layer* that
coordinates RPA bots, agents, APIs, and human clinicians from intake through
submission, missing-document resolution, and denial escalation.

- **Headline demo scenario:** elective peripheral stenting for intermittent
  claudication (PAD). See `pad_peripheral_stenting_policy.md` + the synthetic notes.
- **Secondary scenario (generalization):** RA biologics (adalimumab) — already
  built in Clinica AI (`data/policies/*_ra_biologics.txt`). Same pipeline, no code change.

See @README.md for the Clinica AI architecture and request flow.
See @package.json for dependencies and scripts.

## Stack
- Intelligence/app: Next.js 16 (App Router, Turbopack), TypeScript 5, Tailwind v4
- Auth + DB: Supabase (SSR cookies, Row Level Security)
- LLM: OpenAI gpt-4o-mini (JSON mode); embeddings text-embedding-3-small (1536-dim)
- Vector DB: Qdrant Cloud · Hosting: Vercel
- **Orchestration (new): UiPath Maestro BPMN on UiPath Automation Cloud**
- **UiPath build tooling: `@uipath/cli` (UiPath for Coding Agents)**
- **CriteriaMatch: LangChain external/coded agent (cross-platform integration award)**

## Why (context for good micro-decisions)
- **Therapeutic area is DATA, not architecture.** Payer policies are files in
  `data/policies/`, embedded via `npm run ingest`. Adding a specialty = adding a
  policy file. This generalization is a judged feature — never hardcode a scenario.
- **The CriteriaMatch output is the orchestration contract.** Its `routing.branch`
  field is what the Maestro gateway switches on. Schema: `criteriamatch_output.schema.json`.
  Keep it stable; changing it changes the BPMN wiring.
- **Humans own clinical decisions.** Agents output pass/fail/missing/uncertain +
  a recommendation. Agents never auto-approve or auto-deny anything but a fully-clean case.

## How to work here (Clinica AI app)
- Install: `npm install` · Dev: `npm run dev` (http://localhost:3000)
- Ingest KB: `npm run ingest` (requires QDRANT_URL)
- Evals: `npm run eval` · `npm run assurance`
- Typecheck/lint: `npm run typecheck` · `npm run lint`

## UiPath conventions — Claude has NO training data on our setup; get these right
- Maestro invokes our agents from a **Service task**: action **"Start and wait for
  API workflow"** (our Next.js endpoints) or **"Start and wait for external agent"**
  (the LangChain CriteriaMatch agent). Maestro blocks until the endpoint responds.
- **LLM+RAG calls can exceed a synchronous HTTP timeout.** Do NOT design an endpoint
  that holds one sync request open for the full generation. Assume an async/callback
  pattern is needed and VERIFY the API Workflow timeout/callback contract before wiring
  (open question — confirm against docs / June 17 webinar).
- **Human-in-the-loop = a BPMN User task.** It PAUSES the process and resumes only
  when the assignee completes the task in Action Center. The **missing-docs loop**
  and the **Medical Director escalation** are both User tasks — not API calls.
- **The gateway switches on `routing.branch`:** `ready` -> Auth Packet Agent + submit;
  `missing_docs` -> staff User task (suspend/resume); `escalate` -> Medical Director User task.
- Maestro passes data **by reference** via Data Fabric / process variables. Model the
  case object in Data Fabric early; tasks read/write it — don't pass large blobs inline.
- **SLA / turnaround clock = a boundary event** on the User task (auto-escalate on timeout).

## Things to get RIGHT (corrections)
- NEVER auto-approve or auto-deny a clinical determination. Auto-path is allowed
  ONLY for the fully-met `ready` branch; everything else goes to a human.
- The safety filter (`src/lib/safety.ts`) MUST flag any AI-introduced medication or
  dosage change not present in the input. Surface it in `safety_flags`.
- **Synthetic data ONLY. No real PHI.** Mock policies are clearly-fictional composites.
- **Case 2 (the ambiguous PAD note) must resolve to `uncertain`/`missing` on the
  conservative-therapy criterion (C3a)** and route to `missing_docs`. That ambiguity
  IS the centerpiece demo — do not "fix" it into a clean pass.

## Repo / confidentiality (public MIT repo)
- Do NOT commit UiPath Labs credentials, proprietary UiPath training material, or
  sandbox screenshots exposing internal config — hackathon confidentiality applies.
- Do NOT commit `.env`, Supabase service-role keys, or OpenAI/Qdrant keys.

## Git workflow
- Never commit to main directly. Branches: `feat/` `fix/` `chore/`. Conventional commits.

## When compacting context
Preserve: modified files, current test/eval status, the CriteriaMatch schema
contract, and any UiPath wiring decisions still in flight.
