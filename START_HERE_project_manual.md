# AuthFlow AI — START HERE (Master Project Manual)

This is the single entry point. It tells you **what every file is**, **where it goes
in the repo**, **which document to open for what**, and **the exact order to do
everything from zero to a submitted hackathon project**. Read this first; it points
you to the detailed docs for each step rather than repeating them.

---

## 0. What you're building (30-second recap)

**AuthFlow AI** — Track 2 (UiPath Maestro BPMN). A governed, long-running prior-
authorization workflow. UiPath Maestro orchestrates RPA bots, AI agents, APIs, and
human clinicians from intake → evidence/criteria check → risk-based routing →
submission, missing-document resolution, and denial escalation.

- **Headline demo:** elective peripheral stenting for intermittent claudication (PAD).
- **Generalization proof:** RA biologics (adalimumab), already built in Clinica AI.
- **The brain:** your existing Clinica AI app (Next.js + Supabase + Qdrant RAG).
- **The nervous system:** UiPath Maestro (new — this is what's graded).
- **Deadline:** June 29, 2026, 11:45 pm EDT. Aim to submit June 27.

---

## 1. The document map (which file does what)

You now have several documents with **different jobs**. Don't confuse them:

| Document | Role | You... |
|---|---|---|
| **START_HERE_project_manual.md** (this file) | Master index + repo structure + spine | Read first; follow the sequence in §4 |
| **authflow_build_playbook.md** | Detailed execution reference | Open for the BPMN task list (Part A), 3-week plan (Part C), demo script (Part E), submission checklist (Part G) |
| **coding_agent_prompt_library.md** | Claude Code prompts per task + bonus evidence log | Copy prompts from it; rename to `docs/coding-agent-log.md` and append your real sessions |
| **CLAUDE.md** | Project memory Claude Code auto-loads | Don't "read" it — place it at repo root; it works automatically |
| **CLAUDE_CODE_SETUP_GUIDE.md** + **claude-init.sh** | One-time Claude Code tooling setup | Run once to scaffold `.claude/` |
| **Submission_deck.pptx** | The required presentation deck | Fill it (next step), share "access to all" |

**Deliverables that go in the repo** (not docs to read): the `criteriamatch/` code,
`criteriamatch_output.schema.json`, `pad_peripheral_stenting_policy.md`,
`synthetic_clinical_notes_pad.md`, `synthetic_cases_pad.json`.

---

## 2. File inventory — what exists, what it's for, what's left to build

### Already created (in this session)
| File | Purpose | Status |
|---|---|---|
| `CLAUDE.md` | Claude Code project memory (stack + UiPath conventions) | Ready — place at repo root |
| `pad_peripheral_stenting_policy.md` | Mock payer policy (MHP-VASC-2041); CriteriaMatch evaluates against it | Ready |
| `synthetic_clinical_notes_pad.md` | 3 synthetic notes → 3 BPMN branches; Case 2 is the centerpiece | Ready |
| `synthetic_cases_pad.json` | Expected outcomes per case (eval assertions) | Ready |
| `criteriamatch_output.schema.json` | The contract; Maestro gateway switches on `routing.branch` | Ready |
| `criteriamatch/schema.py` | Pydantic models (LLM judgment + final output) | Ready |
| `criteriamatch/prompts.py` | The CriteriaMatch system prompt (the 4-status taxonomy) | Ready |
| `criteriamatch/agent.py` | LLM judgment + deterministic routing + assembly | Ready |
| `criteriamatch/server.py` | FastAPI endpoint Maestro calls (POST /criteriamatch) | Ready |
| `criteriamatch/eval.py` | Asserts all 3 cases route correctly | Ready — run before sandbox |
| `criteriamatch/requirements.txt` | Python deps | Ready |
| `coding_agent_prompt_library.md` | Prompts per task + bonus-evidence log seed | Ready — rename to docs/coding-agent-log.md |
| `authflow_build_playbook.md` | Full execution reference (Parts A–G) | Ready |

### Already yours (uploaded / pre-existing)
| Item | Purpose |
|---|---|
| Clinica AI repo (Next.js/Supabase/Qdrant) | The intelligence layer — becomes `app/` |
| `claude-init.sh` + setup guide | Scaffolds `.claude/` tooling |
| `Submission_deck.pptx` | The deck template to fill |
| RA policy files (humana/uhc/bcbs/aetna `_ra_biologics.txt`) | RA generalization proof |

### Still to build (during the 3 weeks)
| To build | Where | When |
|---|---|---|
| Headless generation endpoint in Clinica AI | `app/src/app/api/criteriamatch/run` | Week 1 (prompt P1.1) |
| Mock external APIs (criteria, dup-check, submit, notify) | `mocks/` | Week 1 (P1.4) |
| Maestro BPMN process | UiPath Studio Web → export to `uipath/maestro/` | Week 1–2 (P2.1–P2.4) |
| Agent Builder agents (triage, evidence, packet, appeal) | UiPath → export to `uipath/agents/` | Week 2 (P2.5) |
| Document Understanding extraction | UiPath | Week 2 (P2.5, optional) |
| README, LICENSE, architecture diagram | repo root + `docs/` | Week 3 (P3.1–P3.2) |
| Demo video + filled deck | external + `docs/` | Week 3 |

---

## 3. Target repository structure (where everything goes)

One public monorepo so a judge sees everything in one place. Rename your Clinica AI
repo to `authflow-ai` (or create new and move the app under `app/`).

```
authflow-ai/                         # PUBLIC GitHub repo (MIT license in About)
├── README.md                        # rules-required front door (build week 3)
├── LICENSE                          # MIT — visible in repo About
├── CLAUDE.md                        # ← place the file you have here
├── .claude/                         # ← from claude-init.sh (settings, agents, hooks)
│   ├── settings.json
│   ├── agents/  (code-reviewer, security-auditor, test-writer)
│   ├── hooks/   (block_dangerous.py, auto_format.sh, session_context.sh)
│   ├── rules/
│   └── commands/ship.md
│
├── app/                             # the Clinica AI Next.js intelligence layer (existing)
│   ├── src/...                      # existing structure (see app README)
│   └── package.json
│
├── criteriamatch/                   # ← the LangChain coded agent (the 6 files you have)
│   ├── __init__.py  schema.py  prompts.py  agent.py  server.py  eval.py
│   └── requirements.txt
│
├── schemas/
│   └── criteriamatch_output.schema.json   # ← place here
│
├── data/
│   └── policies/
│       ├── pad_peripheral_stenting_policy.md   # ← place here (PAD headline)
│       └── *_ra_biologics.txt                  # existing RA policies
│
├── evals/
│   ├── synthetic_cases_pad.json                # ← place here
│   ├── synthetic_clinical_notes_pad.md         # ← place here
│   └── prior-auth-cases.json                   # existing RA cases
│
├── mocks/                           # build week 1 (P1.4): the systems Maestro calls
│   ├── payer_criteria_api.py  duplicate_check_api.py
│   ├── payer_submit_api.py     status_notify_api.py
│
├── uipath/                          # exported from Studio Web during weeks 1–2
│   ├── maestro/                     # the exported BPMN process
│   ├── agents/                      # Agent Builder agent exports
│   └── README.md                    # how to import into the sandbox
│
└── docs/
    ├── authflow_build_playbook.md   # ← place here
    ├── coding-agent-log.md          # ← rename coding_agent_prompt_library.md to this
    ├── architecture.svg             # build week 3
    └── Submission_deck.pptx         # the deck (or store elsewhere; share link)
```

> If keeping the Python agent + Next.js app in one repo feels awkward, a two-folder
> monorepo (`app/` and `criteriamatch/`) is normal and judges read it fine. Do NOT
> split into two repos — the public repo must contain everything to run the solution.

---

## 4. The start-to-end sequence

Each step says **what to do** and **which doc has the detail**. Do them in order.

### STAGE A — Consolidate (today, ~1 hour, no sandbox needed)
1. Create/rename the repo to `authflow-ai`. Put your Clinica AI app under `app/`.
2. Drop every "Ready" file into the paths in §3 above.
3. Add an MIT `LICENSE`.
4. Run `bash claude-init.sh` at the repo root → fill the `CLAUDE.md` brackets are
   already filled, so just confirm paths match your repo. (Setup guide has detail.)
5. Rename `coding_agent_prompt_library.md` → `docs/coding-agent-log.md`. This is now
   your live prompt log. **Start logging from your very first Claude Code session.**

### STAGE B — Prove the intelligence (pre-sandbox, days 1–3)
*Detail: playbook Part B + prompts P1.1–P1.5.*
6. `pip install -r criteriamatch/requirements.txt`; set `OPENAI_API_KEY`.
7. Run `python -m criteriamatch.eval`. **Confirm Case 2 → missing_docs with C3a
   uncertain/missing.** If it returns `ready`, set `CRITERIAMATCH_MODEL=gpt-4o` and
   re-run (do not weaken the assertion).
8. Refactor Clinica AI generation into the headless endpoint (P1.1).
9. Build the 4 mock APIs in `mocks/` (P1.4).
10. Cold-review what you built in a fresh Claude session (P1.5).

### STAGE C — Build the orchestration (sandbox, weeks 1–2)
*Detail: playbook Part A (task-by-task) + Part C + prompts P2.1–P2.6.*
11. Enable Maestro; create the Maestro process; model the Data Fabric case record.
12. Wire the happy path (tasks #1–#7, #9) — PAD Case 1 end to end.
13. **Verify the async/timeout behavior of the CriteriaMatch service task (#7)** against
    docs.uipath.com/studio-web/docs/api-workflows before relying on it. (Open question.)
14. Add the gateway (#8) + the missing-docs suspend/resume User task (#10) — Case 2.
15. Add the Medical Director escalation (#11) + appeal stub — Case 3.
16. Add Agent Builder agents + Document Understanding (#3, #4, #6) (P2.5).
17. Add SLA boundary timer + submission retry + audit log (#12, exceptions) (P2.6).
18. Export the Maestro process and agents into `uipath/`.

### STAGE D — Deliver (week 3)
*Detail: playbook Parts D–G + prompts P3.1–P3.4.*
19. Write `README.md` with the 5 required sections (P3.1) — see playbook Part D.
20. Generate the architecture diagram (P3.2).
21. **Fill `Submission_deck.pptx`** — see playbook Part F for the slide flow.
22. Record the < 5-min demo video — see playbook Part E for the beat-by-beat script.
23. Clean-clone dry run from the README only (P3.3); fix gaps.
24. Final cold review as a judge (P3.4).
25. Submit on Devpost (Track 2) by June 27. Submit the Best Product Feedback form
    separately during the Feedback Period.

---

## 5. Quick-start (the literal first commands)

```bash
# in your repo root after Stage A
bash claude-init.sh                      # scaffold .claude/ (one time)
python -m venv .venv && source .venv/bin/activate
pip install -r criteriamatch/requirements.txt
export OPENAI_API_KEY=sk-...             # your key
python -m criteriamatch.eval             # run from repo root (relative imports)
# Expect: all assertions pass, Case 2 -> missing_docs
```

To run the agent as the service Maestro will call:
```bash
uvicorn criteriamatch.server:app --reload --port 8088
# POST /criteriamatch with { request_id, payer, policy_id, service_requested,
#   clinical_record, policy_text } -> returns the gateway-ready JSON
```

---

## 6. The four things that win this (don't lose sight)

1. **The suspend/resume loop** (Case 2) — the centerpiece; non-negotiable.
2. **Deliberate UiPath depth** — Maestro + Agent Builder + API Workflows + DU, with
   the **external LangChain** CriteriaMatch agent (the cross-platform award angle).
3. **Humans accountable** — escalation never auto-denies; a clinician decides.
4. **Coding-agent evidence** — the `docs/coding-agent-log.md` + README section +
   on-camera Claude Code usage = the +2 bonus. Log from day one.

**Cut list if time runs short** (cut bottom-up): appeal branch → dashboard polish →
Document Understanding (fall back to agent parsing). Never cut: the BPMN spine, the
suspend/resume loop, the human tasks.
