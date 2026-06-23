"""
eval.py — assert the three PAD cases route correctly.

Run:  python -m criteriamatch.eval
(requires OPENAI_API_KEY; loads the PAD policy from the file next to this package)

The decisive check is CASE 2: criterion C3a must be 'uncertain' or 'missing' and the
branch must be 'missing_docs'. If Case 2 returns 'ready', the demo centerpiece is broken.

The three clinical records below mirror synthetic_clinical_notes_pad.md. Keeping them
inline makes this eval runnable standalone; keep them in sync with that file.
"""

from __future__ import annotations

import sys
from pathlib import Path

from .agent import run_criteriamatch
from .schema import Branch, CriterionStatus

# Locate the mock policy — searched in order (repo layout first, then fallbacks).
def _find_policy() -> Path:
    here = Path(__file__).resolve().parent
    candidates = [
        here.parent / "data" / "policies" / "pad_peripheral_stenting_policy.md",  # repo layout
        here.parent / "pad_peripheral_stenting_policy.md",                        # flat layout
        here / "pad_peripheral_stenting_policy.md",
        Path.cwd() / "data" / "policies" / "pad_peripheral_stenting_policy.md",
        Path.cwd() / "pad_peripheral_stenting_policy.md",
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError(
        "pad_peripheral_stenting_policy.md not found. Looked in: "
        + "; ".join(str(c) for c in candidates)
    )

POLICY_PATH = _find_policy()

CASE_1 = """\
64M, postal carrier. Right calf cramping after ~1 block, now limiting his mail route.
No rest pain, no tissue loss. Right ABI 0.61, left ABI 0.94. CTA: focal 70% stenosis
right superficial femoral artery, runoff intact, suitable for endovascular therapy.
Completed a 14-week supervised exercise therapy program (3x/week) with minimal
improvement; remains unable to complete his route. Aspirin 81 mg daily and
atorvastatin 40 mg daily for 8 months. Former smoker, quit 6 months ago after
cessation counseling. Request: right SFA angioplasty with stent."""

CASE_2 = """\
65F, retired, active gardener. Left calf tightness when walking, interfering with
gardening and daily walks for several months. No rest pain, no wounds. Left ABI 0.68.
Duplex: left SFA stenosis ~60%, runoff preserved, amenable to endovascular treatment.
Aspirin 81 mg daily and rosuvastatin 20 mg daily. Lifelong non-smoker. Patient
counseled on the importance of walking exercise and has been trying to walk more at
home; reports ongoing symptoms. Request: left SFA angioplasty +/- stent."""

CASE_3 = """\
58M, software engineer (desk job), avid recreational runner. Left calf discomfort
after ~1/2 mile of running; walks and works without limitation. Goal: return to prior
running distance faster. No rest pain, no wounds. ABI 0.91 (borderline). Duplex: mild
left SFA irregularity, <50% stenosis, no focal high-grade lesion. No antiplatelet, no
statin. Current smoker (~1/2 pack/day), no cessation counseling. No structured exercise
program. Request: left lower-extremity angioplasty/stent."""

PAYER = "Meridian Health Plan"
POLICY_ID = "MHP-VASC-2041"
SERVICE = "Lower-extremity angioplasty/stent for intermittent claudication"


def _norm_id(s: str) -> str:
    """Normalize 'Criterion 3a' / 'C3a' / '3a' -> 'c3a' so assertions don't fail on formatting."""
    s = s.strip().lower().replace("criterion", "").replace(" ", "").replace(".", "")
    return s if s.startswith("c") else f"c{s}"


def _status_of(result, criterion_id: str):
    """Match a criterion by normalized ID. Accepts the parent as a match for a
    sub-element (e.g. asking for 'C3a' also matches a model that reported 'C3'),
    since a gap on the conservative-therapy criterion is valid at either granularity."""
    want = _norm_id(criterion_id)
    parent = want[:2] if len(want) > 2 and want[1].isdigit() else want  # 'c3a' -> 'c3'
    for c in result.criteria:
        cid = _norm_id(c.criterion_id)
        if cid == want or cid == parent or (cid.startswith(want[:2]) and cid[1:2].isdigit()):
            return c.status
    return None


def _doc_matches(items, criterion_id: str) -> bool:
    """True if any missing_documentation entry covers the criterion (parent or sub-element)."""
    want = _norm_id(criterion_id)
    parent = want[:2] if len(want) > 2 else want
    return any(_norm_id(m.criterion_id) in (want, parent) or _norm_id(m.criterion_id).startswith(parent)
               for m in items)


def run():
    policy_text = POLICY_PATH.read_text(encoding="utf-8")
    failures: list[str] = []

    def check(name, cond, detail):
        mark = "PASS" if cond else "FAIL"
        print(f"  [{mark}] {name}: {detail}")
        if not cond:
            failures.append(f"{name}: {detail}")

    # CASE 1 — clean -> ready
    print("CASE 1 (clean approval):")
    r1 = run_criteriamatch(
        request_id="pad_case_1", payer=PAYER, policy_id=POLICY_ID, service_requested=SERVICE,
        policy_text=policy_text, clinical_record=CASE_1, therapeutic_area="peripheral_arterial_disease",
    )
    check("branch", r1.routing.branch == Branch.ready, f"got {r1.routing.branch.value}")
    check("no missing docs", len(r1.missing_documentation) == 0, f"{len(r1.missing_documentation)} items")

    # CASE 2 — ambiguous -> missing_docs (THE CENTERPIECE)
    print("CASE 2 (missing/ambiguous — centerpiece):")
    r2 = run_criteriamatch(
        request_id="pad_case_2", payer=PAYER, policy_id=POLICY_ID, service_requested=SERVICE,
        policy_text=policy_text, clinical_record=CASE_2, therapeutic_area="peripheral_arterial_disease",
    )
    c3a = _status_of(r2, "C3a")
    check("branch", r2.routing.branch == Branch.missing_docs, f"got {r2.routing.branch.value}")
    check("conservative-therapy gap flagged (C3 or C3a)",
          c3a in (CriterionStatus.uncertain, CriterionStatus.missing),
          f"got {c3a.value if c3a else 'not found'}")
    check("conservative-therapy gap in missing_documentation",
          _doc_matches(r2.missing_documentation, "C3a"),
          f"items: {[m.criterion_id for m in r2.missing_documentation]}")
    # Diagnostic (not a hard failure): did the firmer prompt produce the sub-element breakout?
    ids = {_norm_id(c.criterion_id) for c in r2.criteria}
    broke_out = {"c3a", "c3b", "c3c"}.issubset(ids)
    print(f"  [INFO] sub-element breakout C3a/C3b/C3c present: {broke_out}  (ids: {sorted(ids)})")

    # CASE 3 — discordant -> escalate (NOT auto-denied)
    print("CASE 3 (guideline-discordant — escalate):")
    r3 = run_criteriamatch(
        request_id="pad_case_3", payer=PAYER, policy_id=POLICY_ID, service_requested=SERVICE,
        policy_text=policy_text, clinical_record=CASE_3, therapeutic_area="peripheral_arterial_disease",
    )
    check("branch", r3.routing.branch == Branch.escalate, f"got {r3.routing.branch.value}")
    check("not auto-denied",
          r3.overall_determination.value != "denied",
          f"determination={r3.overall_determination.value}")

    print()
    if failures:
        print(f"{len(failures)} assertion(s) FAILED:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("All CriteriaMatch eval assertions passed.")


if __name__ == "__main__":
    run()