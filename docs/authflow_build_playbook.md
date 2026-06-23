# AuthFlow AI — Build & Submission Playbook (UiPath AgentHack, Track 2)

**Deadline:** June 29, 2026, 11:45 pm EDT (submission). Feedback form open through July 2.
**Goal:** Win Best of UiPath Maestro BPMN ($5,000) + one Special Award (Best Cross-Platform
Integration $1,500 is the most reachable), plus the +2 coding-agent bonus.
**Scenario:** Elective peripheral stenting for intermittent claudication (PAD), headline;
RA biologics (adalimumab) as the generalization proof.

> Rule reality check (from the official rules):
> - Project must be NEW, built in UiPath Studio Web, run on UiPath Automation Cloud.
> - Max score 25 (five equal criteria ×5) + up to 2 coding-agent bonus = 27.
> - A project wins at most TWO prizes: one track/overall + one special award.
> - Required deliverables: public GitHub repo (MIT/Apache license visible in About),
>   README (project description, UiPath components, agent type, setup steps),
>   text description (business problem + how it's solved), demo video < 5 min on
>   YouTube/Vimeo/Youku, and a completed presentation deck shared "access to all."
> - Coding-agent bonus REQUIRES documented evidence: prompt log/session export,
>   screenshots, or a dedicated README section. Keep a prompt log from day one.

---

## PART A — The BPMN process, task by task

This is what you assemble in Studio Web (New → Process (Maestro)). Each row is one
BPMN element. "Type" is the BPMN task type; "Implementation" is the action you pick
in the task's config. The gateway switches on the CriteriaMatch `routing.branch` field.

### Process variables (model these in Data Fabric first)
Maestro passes data by reference, so define a case record other tasks read/write:
- `request_id` (string)
- `intake_document_ref` (file/attachment ref)
- `extracted_request` (object: patient, provider, service, diagnosis, payer, urgency)
- `clinical_evidence` (object: the structured chart findings)
- `criteriamatch_result` (object: conforms to criteriamatch_output.schema.json)
- `routing_branch` (string: ready | missing_docs | escalate)  ← gateway reads this
- `packet_ref` (file ref), `submission_status` (string), `audit_log` (array)

### The flow

| # | BPMN element | Type | Implementation / action | Reads → Writes |
|---|---|---|---|---|
| 1 | Start: Auth request received | Start event | Trigger (Data Fabric record created, or manual start for demo) | — → request_id |
| 2 | Ingest request document | Service task | Start and wait for RPA workflow (intake bot: fetch fax/PDF/EHR export) | request_id → intake_document_ref |
| 3 | Extract request fields | Service task | Document Understanding (IDP) extraction | intake_document_ref → extracted_request |
| 4 | Auth triage | Service task | Agent Builder agent (classify + normalize request) | extracted_request → extracted_request(enriched) |
| 5 | Existing-auth / duplicate check | Service task | Start and wait for API workflow (DB lookup) | extracted_request → (continue or short-circuit) |
| 6 | Extract clinical evidence | Service task | Agent Builder agent (reads note → structured evidence) | intake_document_ref → clinical_evidence |
| 7 | **CriteriaMatch** | Service task | **Start and wait for external agent (LangChain)** | clinical_evidence + payer policy → criteriamatch_result, routing_branch |
| 8 | Route by determination | Exclusive gateway (DMN optional) | Switch on `routing_branch` | routing_branch → one of 9/10/11 |
| 9 | — branch READY → Generate packet | Service task | Agent Builder / API workflow (Auth Packet Agent) | criteriamatch_result → packet_ref |
| 9b | Submit to payer | Service task | Start and wait for RPA/API workflow (mock payer portal) | packet_ref → submission_status |
| 9c | Notify clinic/patient | Service task or Send task | API workflow / connector (email) | submission_status → audit_log |
| 10 | — branch MISSING_DOCS → Staff task | **User task** | Create Action app task (assignee: clinic staff) — **PAUSES here** | criteriamatch_result.missing_documentation → updated evidence |
| 10b | Loop back to CriteriaMatch | Sequence flow | Return to #7 after staff completes | updated evidence → re-evaluate |
| 11 | — branch ESCALATE → Medical Director | **User task** | Create Action app task (assignee: medical director) — **PAUSES here** | criteriamatch_result → MD decision |
| 11b | If denied → draft appeal (STUB) | Service task | Agent Builder (Appeal Draft Agent) — one demo branch only | MD decision → packet_ref(appeal) |
| 12 | SLA boundary event | Boundary timer event on #10 and #11 | Auto-escalate on timeout | — → audit_log |
| 13 | End: Case closed | End event | — | audit_log persisted |

### Notes that matter
- **#7 and #10/#11 are the demo.** #7 is the cross-platform LangChain integration
  (the $1,500 award angle). #10 is the suspend/resume centerpiece — it PAUSES the
  process and only resumes when staff complete the Action Center task. #11 keeps the
  human accountable for the clinical decision (never auto-deny).
- **#3 Document Understanding** is optional-but-valuable. If time compresses, the
  triage agent (#4) can parse the document instead — but DU is deliberate platform depth.
- **The async question (#7):** an LLM+RAG call may exceed a synchronous timeout.
  Confirm whether "Start and wait for API workflow / external agent" supports an
  async callback before wiring. Doc: docs.uipath.com/studio-web/docs/api-workflows.
  If sync-only with a short timeout, make the endpoint return fast (precompute) or
  use a callback/polling pattern.

---

## PART B — Pre-access prep (do NOW, before the sandbox arrives)

Everything here needs no UiPath login. Have it done so day one is assembly, not authoring.

- [x] PAD mock policy (`pad_peripheral_stenting_policy.md`) — done
- [x] Three synthetic notes (`synthetic_clinical_notes_pad.md`) — done
- [x] CriteriaMatch schema (`criteriamatch_output.schema.json`) — done
- [x] Eval cases (`synthetic_cases_pad.json`) — done
- [x] CLAUDE.md (filled) — done
- [ ] Run `claude-init.sh` in the repo; trim CLAUDE.md after `/init`
- [ ] Refactor Clinica AI generation into a clean headless endpoint that returns
      JSON conforming to the schema (no UI needed for the orchestrated path)
- [ ] Wrap the CriteriaMatch step as a LangChain agent that emits the schema
- [ ] Run the PAD eval cases against current prompts — CONFIRM case_2 → missing_docs
- [ ] Build mock API endpoints: payer-criteria lookup, duplicate check, payer submit,
      status update (so Maestro has something to call on day one)
- [ ] Start the **prompt log** (`docs/coding-agent-log.md`) — capture real Claude Code
      sessions as you do the above. This is your bonus-points evidence.
- [ ] Read 3 docs: API Workflows, Coded Agents (about-coded-agents), UiPath CLI for
      coding agents. Links in the resources page.
- [ ] Watch for the API-workflows / Maestro webinars (check the Updates tab for dates)
      and bring the async-callback question to office hours.

---

## PART C — Three-week execution plan (anchored to June 29)

### Week 1 (access lands) — the spine, happy path only
Goal: one PAD request goes intake → extract → CriteriaMatch → ready → packet → submit.
- Enable Maestro service; confirm Studio Web access; create the Maestro process.
- Model the Data Fabric case record (the process variables above).
- Wire tasks #1–#5 and #7 and #9/#9b with the `ready` path only.
- Connect CriteriaMatch (#7) to your LangChain endpoint; verify the schema round-trips.
- Smoke-test with PAD Case 1. Commit. Keep logging Claude Code usage.

### Week 2 — the winning complexity (branches + humans)
Goal: all three demo cases run end to end.
- Add the gateway (#8) switching on `routing_branch`.
- Build the missing-docs User task (#10) + the loop back to #7 (suspend/resume).
- Build the Medical Director User task (#11) + appeal stub (#11b).
- Add the SLA boundary timer (#12) and a failed-submission retry path on #9b.
- Add Document Understanding (#3) if the happy path is stable; else defer.
- Add the audit log writes throughout. Test Cases 2 and 3. Commit.

### Week 3 — polish, evidence, submission
Goal: look like a finalist; submit early (aim June 26–27, not the 29th).
- UiPath Insights / dashboard view; SLA + throughput tiles.
- Finalize README (see Part D), prompt log, screenshots.
- Record the < 5-min demo video (script in Part E).
- Fill the presentation deck (Part F) and set sharing to "access to all."
- Submit the Best Product Feedback form (separate $1,500, separate from the project).
- Final dry-run of the repo from a clean clone using only the README. Submit.

---

## PART D — README structure (required content, from the rules)

The rules require these explicitly; missing any costs Completeness-of-Delivery points.
1. **Project Description** — what it does + the prior-auth burden it solves.
2. **UiPath Components** — list: Maestro BPMN, Agent Builder, API Workflows,
   Document Understanding, RPA, (external) LangChain.
3. **Agent Type** — explicit: "Both — low-code Agent Builder agents AND a coded/
   external LangChain agent (CriteriaMatch)."
4. **Setup Instructions** — step-by-step to run for judging (include a mock mode so
   judges can run without your sandbox).
5. **Coding-agent section** — which tool (Claude Code via UiPath CLI), how it
   contributed (scaffolding, schema, mocks, tests, glue), and link the prompt log.
6. License file (MIT or Apache 2.0), visible in the repo About section.
7. Architecture diagram + the three-case explanation.
- **Do NOT commit:** UiPath Labs credentials, proprietary UiPath materials, .env,
  Supabase service-role keys, OpenAI/Qdrant keys. (Confidentiality + secrets.)

---

## PART E — Demo video script (< 5 minutes, hard limit)

Open on the problem, not the tool. Keep clinical language plain.

- **0:00–0:30 — Problem + thesis.** "Prior authorization for an elective peripheral
  stent takes days of staff work. AuthFlow AI is not a document generator — it's a
  governed, long-running workflow where UiPath Maestro coordinates agents, robots,
  and clinicians from intake to submission." Say "elective peripheral stenting for
  intermittent claudication" once, explicitly.
- **0:30–1:15 — Architecture (live in Maestro).** Show the BPMN diagram. Name the
  actors: RPA intake, Document Understanding, Agent Builder agents, the external
  LangChain CriteriaMatch agent, human tasks. "UiPath is the control plane."
- **1:15–2:15 — Case 1 (clean).** Run a complete PAD request. Show it route `ready`,
  generate the packet, submit to the mock payer. Fast.
- **2:15–3:30 — Case 2 (the centerpiece).** Run the ambiguous note. Show CriteriaMatch
  flag the conservative-therapy criterion as uncertain → process PAUSES → staff task
  appears in Action Center → staff supplies the doc → **process resumes** → submits.
  This is the "survives interruptions / humans in the loop" beat. Linger here.
- **3:30–4:15 — Case 3 (escalate).** Guideline-discordant request routes to the
  Medical Director — emphasize the system does NOT auto-deny; a clinician decides.
- **4:15–4:45 — Governance + coding agents.** Dashboard/audit trail + SLA clock.
  Then 15 seconds of real Claude Code via the UiPath CLI building/scaffolding part
  of the solution (this is the on-camera bonus evidence).
- **4:45–5:00 — Impact close.** Generalization: "Same pipeline, RA biologics, a
  different payer — no code change." One line on time saved.

---

## PART F — Presentation deck (share "access to all")

The rules link their own template (bit.ly/3R0MsHU). Drop your content into its slides
following this flow:
1. Title — AuthFlow AI, Track 2, team.
2. Problem — prior-auth burden (the 14-hrs/week stat lands here).
3. Solution thesis — governed orchestration, not a doc generator.
4. Architecture — the BPMN diagram + actor legend.
5. The three cases — clean / missing-docs / escalate.
6. Platform usage — Maestro, Agent Builder, API Workflows, DU, LangChain, Claude Code.
7. Human-in-the-loop + governance — why clinicians stay accountable.
8. Impact + generalization — RA proof, scalability, production path.
9. Coding-agent evidence — how Claude Code was used (mirror the README section).

---

## PART G — Submission checklist (the literal finish line)

- [ ] Public GitHub repo, MIT/Apache license visible in About
- [ ] README with all 5 required sections (Part D)
- [ ] Text description with business problem + solution
- [ ] Demo video < 5 min, public on YouTube/Vimeo/Youku, link in submission form
- [ ] Presentation deck, shared "access to all", link in form
- [ ] Coding-agent evidence documented (prompt log + README section)
- [ ] Track 2 selected on the Devpost submission form
- [ ] (Separate) Best Product Feedback form submitted during the Feedback Period
- [ ] Submit by June 27 to leave buffer; hard deadline June 29 11:45 pm EDT
