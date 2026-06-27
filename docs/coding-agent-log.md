# AuthFlow AI — Coding-Agent Log

**Coding agent used:** Claude (via Claude Code, run against the UiPath CLI for
UiPath-facing work). Used throughout as a pair-engineer for design, implementation, and
live platform debugging.

**Why this log exists:** the AgentHack rules award bonus points (within Platform Usage)
for documenting (a) which coding agent was used, (b) how it contributed, and (c)
verifiable evidence. This file is the record. The dated **session log** below is the
real engineering trail; per-case execution evidence is in `docs/`
(`evidence_case1_ready.txt`, `evidence_case2_missing_docs.txt`,
`evidence_case3_escalate.txt`) and the public commit history corroborates it.

---

## Planned scope vs. what was built and validated  (read this first)

This document has two parts, and they describe different things:

- The **Prompt Library** (Phases 0–3 below) captures the *full planned scope* used to
  drive the build — including components that were explored but are **not** part of the
  final validated submission (e.g. low-code Agent Builder triage agents, Document
  Understanding, an Appeal Draft Agent, and external API-workflow endpoints).
- The **Session Log** (dated entries) records *what was actually built and validated*.

**What the final submission actually is:** the **CriteriaMatch coded agent** (LangChain
via `uipath-langchain`, running natively on UiPath through the LLM Gateway with no API
key), orchestrated by a **Maestro BPMN** process with an exclusive gateway and
**Action Center** human tasks, validated end to end for all three branches (ready,
missing_docs with suspend/resume, escalate) on UiPath Automation Cloud.

Per the June 11 session, the native **Coded-agent import was in preview**, and the design
settled on publishing CriteriaMatch as a coded agent to the Tenant Processes Feed and
binding it to the Agentic task — this is the path that was validated. Planned-but-not-
shipped components above are retained in the prompt library for transparency about how the
project was scoped, not as claims about the delivered system. The README's **Agent Type**
(Coded Agent) and **UiPath Components** (Maestro, Action Center, Coded Agents, LLM Gateway,
Orchestrator) are the authoritative statement of what was delivered.

---

## Open items before final submission

- [ ] Optional bonus evidence: a couple of terminal screenshots of Claude Code via the
      UiPath CLI, and a few seconds of coding-agent usage shown in the demo video.

---

## Prompt Library (planning — full scoped build)

> The prompts below were the working library used to drive the build. They reflect the
> full *planned* scope (see the note above); the dated session log records what shipped.

### Phase 0 — Setup

**P0.1 — Initialize and trim project memory**
> Run /init to scan this repo. Then propose a CLAUDE.md that keeps ONLY corrections —
> things you would otherwise get wrong on this codebase — and deletes anything that
> merely confirms what you already do right. Target under 150 lines. Show me the diff
> against the existing CLAUDE.md before writing; I will approve deletions.

**P0.2 — Verify the UiPath CLI is wired**
> Using the UiPath CLI, confirm I am authenticated to the Automation Cloud tenant and
> list the commands relevant to publishing an external agent. Summarize the minimal
> command sequence to publish a coded agent so Maestro can call it. Show commands first;
> do not run anything destructive.

### Phase 1 — Intelligence layer

**P1.2 — Build the CriteriaMatch LangChain agent**
> Implement a CriteriaMatch agent under `criteriamatch/` using LangChain. Constrain the
> model output to the `LLMAssessment` Pydantic model (criteria + safety_flags +
> citations) — the model judges each criterion, it must NOT decide routing. Then derive
> overall_determination and routing.branch deterministically from the per-criterion
> statuses, in priority order: any 'not_met' -> escalate; else any 'missing'/'uncertain'
> -> missing_docs; else all 'met' -> ready; and downgrade a 'ready' whose mean confidence
> is below a configurable floor to missing_docs. Temperature 0. Verify the assembled
> object validates against `criteriamatch_output.schema.json`.

**P1.3 — Wire the eval and confirm the centerpiece**
> Write `criteriamatch/eval.py` that runs the three synthetic PAD records and asserts:
> Case 1 -> 'ready'; Case 2 -> 'missing_docs' AND C3a uncertain/missing AND C3a in
> missing_documentation; Case 3 -> 'escalate' and NOT auto-denied. If Case 2 returns
> 'ready', diagnose prompt-vs-model and recommend the smallest fix — do not weaken the
> assertion.

**P1.5 — Cold review (two-Claude pattern)**
> [Fresh session, no prior context] Review the last commit as a harsh staff engineer.
> Focus on the routing logic and schema validation: can routing.branch ever disagree with
> the per-criterion statuses? Can the agent emit an invalid object? Report
> MUST FIX / SHOULD FIX / CONSIDER with file:line and a concrete fix.

### Phase 2 — UiPath orchestration

**P2.1 — Scaffold the Maestro BPMN process**
> Scaffold a BPMN process "AuthFlow": Start -> Ingest -> Extract -> Triage ->
> CriteriaMatch -> Route by branch -> Generate packet -> Submit -> End. Create the case
> record variables first. Stub each task with the correct BPMN type (Service vs User).

**P2.2 — Bind the CriteriaMatch task**
> Configure the CriteriaMatch task to invoke the published coded agent, map the clinical
> evidence and policy into the request, and write the response into `criteriamatch_result`
> and `routing_branch`. Confirm the gateway switches on `routing_branch`.

**P2.3 — Build the missing-docs suspend/resume loop**
> Configure the missing_docs User task to create an Action Center task from
> `criteriamatch_result.missing_documentation`. The process must PAUSE and resume only on
> completion, then loop back to re-evaluate. Verify with Case 2 that it suspends, shows the
> staff task, and resumes to submission.

**P2.4 — Build the Medical Director escalation**
> Configure the escalate User task assigned to a medical director, carrying the full
> evidence packet. Confirm nothing auto-denies.

### Phase 3 — Delivery

**P3.1 — README (rules-compliant)**
> Write README.md with the required sections: Project Description, UiPath Components,
> Agent Type (explicit), Setup Instructions, and a Coding-Agent section (tool, how it
> contributed, link to this log). Add an MIT LICENSE. Do NOT commit credentials or .env.

**P3.4 — Final cold review before submit**
> [Fresh session] You are a hackathon judge scoring Platform Usage, Technical Execution,
> and Completeness. Read the repo cold. Where is UiPath usage shallow or where would you
> dock points? Be specific and harsh; I submit soon.

### Subagents (from claude-init.sh)

- `code-reviewer` — after each feature, on the current diff
- `security-auditor` — before merging anything touching secrets
- `test-writer` — to cover the CriteriaMatch routing edge cases

---

## Session Log (what was actually built and validated)

### 2026-06-09 — Phase 1: CriteriaMatch agent validation & prompt debugging

**Tool:** Claude Code (agent design, eval wiring, prompt iteration)

**Architecture decision (agent-assisted):** CriteriaMatch built as a LangChain agent with
a two-layer design — the LLM is schema-constrained to emit per-criterion *judgments only*
(met / not_met / missing / uncertain); routing is then derived **deterministically in
code** from those statuses (`derive_routing`). The Maestro gateway field `routing.branch`
is therefore reproducible, not left to the model. Added a confidence floor that downgrades
a low-confidence `ready` to human review.

**Debug cycle:**

1. First eval run: Case 1 ✅, Case 3 ✅, Case 2 routed to `missing_docs` ✅ — but two
   assertions failed (`C3a` reported at parent `C3` granularity).
2. Root cause: a formatting mismatch (parent vs. sub-element id), not a reasoning error.
3. Fix 1 (eval): made ID matching parent-aware without weakening the substantive checks.
4. Fix 2 (prompt): hardened the criterion-ID instruction (explicit ID list; C3 must split
   into C3a/C3b/C3c; a WRONG-vs-RIGHT example).
5. Also caught a schema contract bug (`needed_if_gap` rejected by
   `additionalProperties: false`) and added the field so every output validates.

**Result:** all three cases pass; Case 2 reads the deliberately ambiguous note ("trying to
walk more at home"), withholds approval on the conservative-therapy criterion, and routes
to `missing_docs` — the trigger for the suspend/resume demo.

### 2026-06-09 — Phase 2 Day 1: tenant access + BPMN skeleton

**Tool:** UiPath Studio Web (Maestro), tenant `hackathon26_570`

- Created an Agentic Process (Maestro BPMN), named AuthFlow; modeled the case record in
  Data Manager (String / File / JSON variables); laid the happy-path skeleton
  (Start -> Ingest -> Extract -> Triage -> CriteriaMatch -> Route by branch -> Generate
  packet -> Submit -> End).
- **Platform finding:** the native **Coded-agent import was in preview / not available** in
  this tenant at the time. Decision recorded to publish CriteriaMatch as a coded agent and
  bind it, preserving the validated LangChain logic. (This is the path that was ultimately
  validated.)

### 2026-06-11 — Phase 2: CriteriaMatch published as a native UiPath coded agent

**Tool:** Claude Code + UiPath CLI (`uipath-langchain` SDK)

**Done:** scaffolded a uipath-langchain coded agent; ported the validated logic
(schema/prompts/agent) into the LangGraph scaffold; swapped ChatOpenAI ->
**UiPathAzureChatOpenAI(gpt-4.1-mini)** so the LLM call runs through the **UiPath LLM
Gateway with no API key**. Ran locally via `uipath run agent --file input.json` against
the staging tenant.

**Problems hit and solved:**

1. `uv` not installed -> installed via astral.sh.
2. `uipath auth` defaulted to production; hackathon tenant is on staging ->
   `uipath auth --staging` (DefaultTenant on staging.uipath.com).
3. Stock scaffold defaulted to an Anthropic Bedrock model (missing extra) -> switched to
   UiPathAzureChatOpenAI(gpt-4.1-mini), which needs no extra.
4. **Routing bug:** gpt-4.1-mini marked C3c (smoking cessation) `not_met` for a non-smoker
   ("not applicable"), and `derive_routing` escalated on ANY not_met -> Case 2 wrongly
   escalated. Fixed with a two-layer guard: a prompt instruction (inapplicable -> met)
   plus a deterministic `_is_inapplicable` check so routing ignores inapplicable not_met.
   Verified Case 3's *genuine* not_met still escalates.

**Outcome (real model calls):** case1 -> ready (1.0), case2 -> missing_docs (0.929),
case3 -> escalate (0.95). Agent published and confirmed running as a remote job.
Raw logs in `docs/evidence_case*.txt`.

**Known items (non-blocking):** LangGraph "unregistered type" checkpoint warnings (custom
enums); `_is_inapplicable` is a keyword heuristic (cleaner fix = a dedicated
`not_applicable` status, deferred under deadline). (Note: the `pyproject.toml` author was
later set to the real name, Divine Ediebah.)

### 2026-06-11 — MILESTONE: happy-path BPMN spine runs end to end on UiPath

**Status:** Succeeded.

The full happy path ran on the platform: Start -> Ingest -> Extract -> Triage ->
**criteriamatch** (coded agent via the LLM Gateway, no API key) -> Gateway evaluated
`vars.routing.branch == "ready"` -> Generate packet -> Submit -> End. Case 1 -> ready.

**Issues resolved:**

1. Payer input had a stray test expression -> fixed to `=vars.payer`.
2. Agent input type mismatches -> created String process variables
   (`clinical_record_var`, `policy_note`, `payer_var`, `policy_id_var`,
   `service_requested_var`, `therapeutic_area_var`) and mapped each agent input to its
   `_var` variable. (These are the same start-event input names used at run time.)
3. Gateway condition: single `=` raised `monaco_assignment_not_allowed` -> fixed to
   `vars.routing.branch == "ready"` (comparison).
4. Process couldn't download the agent package ("orchestrator unknown", feedId mismatch)
   -> republished the agent to the **Tenant Processes Feed** (not just my-workspace).
5. Pack failed ("entry-points.json not found") from accumulated phantom Agent 1–6 bindings
   -> **deleting the phantom agent bindings fixed the build**, and the run succeeded.

### 2026-06-12 — missing_docs branch + suspend/resume loop built

Added gateway edge `vars.routing.branch == "missing_docs"` -> Human task "Documentation
required" (assigned self). On completion, the edge loops back to CriteriaMatch — the
suspend/resume centerpiece. Noted: the loop needs the clinical input to change on resume
or it re-routes to missing_docs (infinite loop) — so staff completion must update
`clinical_record_var` to a complete note.

### 2026-06-13 — escalate branch + loop-back resolution: full process built

- Escalate branch: gateway edge `== "escalate"` -> "Medical Director review" Human task ->
  End (terminal, no loop-back).
- Loop-back resolution: the missing_docs Human task's **Update variables** sets
  `clinical_record_var` to a COMPLETE Case 2 note on completion, so suspend -> staff
  completes -> resume -> re-evaluate -> ready. All three branches structurally complete.

### 2026-06-15 — three-case testing: routing proven; Action Center runtime blocked

- Case 1 (ready): end-to-end, Succeeded. ✅
- Case 2 (missing_docs): correctly routes and reaches the human-task creation step, but
  task creation fails: `AppTasks request failed with status NotFound`. Escalated to
  organizers. **Routing logic proven; blocker is platform deployment, not design.**

### 2026-06-21 — suspend/resume loop working end to end + screenshot captured

Fixed `AppTasks NotFound`: the **Actions** service was not provisioned. Self-served as org
admin: Admin -> Tenant -> Add Services -> enabled **Actions**; Licenses -> assigned a Pro
license (incl. Action Center). Also re-added the human task's **Update variables** entry
(`clinical_record_var` <- complete note) that had been wiped in an earlier app re-bind.
Full Case 2 cycle now runs: missing_docs -> suspend -> complete in Action Center -> resume
-> re-evaluate -> ready -> End. Execution-trail screenshot saved for the submission.

### 2026-06-22 — Case 3 (escalate) validated end to end

Ran Case 3 (guideline-discordant runner): CriteriaMatch -> escalate -> Medical Director
review (Action Center) -> End (terminal). Instance succeeded. **All three branches now
proven end to end on the platform: ready, missing_docs (suspend/resume), escalate.**

### 2026-06-26 — submission packaging + run-path debugging

- Public GitHub repo published; `.env` excluded via `.gitignore` (no token leak); nested
  git repo flattened. README made requirement-compliant (explicit Agent Type + UiPath
  Components). BPMN exported to the repo; architecture diagram produced.
- **Studio Web Debug error:** `Failed to pack from snapshot: Solution pack failed: No
  solution tool factory is registered` — a pre-run solution rebuild failing in Studio
  Web's build tooling, not the agent/process. Generic Studio Desktop / .NET / NuGet advice
  was rejected as wrong-stack (this is Studio Web + a Python coded agent on macOS).
  **Workaround:** run the already-published process via Orchestrator -> Processes ->
  AuthFlow -> **Start Job** (no rebuild). All three cases run cleanly on that path.
- **Start Job input field-name mismatch root-caused via the execution trace:** a case that
  should auto-approve routed to escalate; the trace showed the agent had received a
  *different* case's record. Root cause: Start Job input uses the **process start-event
  variable names** (`request_id`, `request_service_var`, `clinical_record_var`,
  `payer_var`, `policy_id_var`, `policy_note`, `therapeutic_area_var`), not the agent's
  flat field names. Re-keyed all three case inputs; cleared the input box before pasting.
  Result: Case 1 -> ready, Case 2 -> missing_docs (suspend/resume), Case 3 -> escalate,
  each confirmed against its trace.

---

## Verifiable evidence

- Public repo + commit history (the build is reconstructable from the commits).
- Per-case execution evidence: `docs/evidence_case1_ready.txt`,
  `docs/evidence_case2_missing_docs.txt`, `docs/evidence_case3_escalate.txt`, plus the
  Orchestrator job traces and the saved suspend/resume execution-trail screenshot.
- The README Coding-Agent section names the tool (Claude), the contribution, and links here.
