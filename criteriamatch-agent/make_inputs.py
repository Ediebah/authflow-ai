#!/usr/bin/env python3
"""
make_inputs.py — generate per-case input JSONs for the UiPath coded agent.

Run from the criteriamatch-agent/ directory (so ../data and ../evals resolve),
or adjust POLICY_PATH below. Produces input_case1.json, input_case2.json,
input_case3.json — each with the REAL clinical note for that case.

Then run, e.g.:
    uipath run agent --file input_case1.json 2>&1 | tee ../docs/evidence_case1_ready.txt
    uipath run agent --file input_case2.json 2>&1 | tee ../docs/evidence_case2_missing_docs.txt
    uipath run agent --file input_case3.json 2>&1 | tee ../docs/evidence_case3_escalate.txt
"""
import json
import pathlib

POLICY_PATH = pathlib.Path("../data/policies/pad_peripheral_stenting_policy.md")
policy = POLICY_PATH.read_text()

COMMON = dict(
    payer="Meridian Health Plan",
    policy_id="MHP-VASC-2041",
    policy_text=policy,
    therapeutic_area="peripheral_arterial_disease",
)

CASE_1 = (
    "64M, postal carrier (on feet most of the day). CC: right calf pain with walking, "
    "worsening over 10 months. Reproducible right calf cramping after ~1 block, resolves "
    "with rest; now limiting his ability to complete his mail route. No rest pain, no "
    "ulceration. Right ABI 0.61, left ABI 0.94. CTA: focal 70% stenosis of the right SFA; "
    "distal runoff intact; lesion suitable for endovascular therapy. Completed a 14-week "
    "supervised exercise therapy program (vascular rehab, 3x/week) with only minimal "
    "improvement; remains unable to complete his route. On aspirin 81mg daily and "
    "atorvastatin 40mg daily for 8 months. Former smoker — quit 6 months ago following "
    "cessation counseling at this clinic. Request prior authorization for right SFA "
    "angioplasty with stent."
)

CASE_2 = (
    "65F, retired, active gardener. Left calf tightness when walking, interfering with "
    "gardening and daily walks for several months. No rest pain, no wounds. Left ABI 0.68. "
    "Duplex: left SFA stenosis ~60%, single-vessel runoff preserved; lesion amenable to "
    "endovascular treatment. Aspirin 81mg daily and rosuvastatin 20mg daily. Lifelong "
    "non-smoker. Patient counseled on the importance of walking exercise and has been "
    "trying to walk more at home; reports symptoms are ongoing. Request prior "
    "authorization for left SFA angioplasty +/- stent."
)

CASE_3 = (
    "58M, software engineer (desk-based), avid recreational runner. CC: calf discomfort "
    "when running longer distances — some left calf discomfort after roughly half a mile "
    "of running; able to walk without limitation and works without difficulty. Stated goal: "
    "returning to prior running distance faster. No rest pain, no wounds. ABI 0.91 "
    "(borderline). Duplex: mild left SFA irregularity, <50% stenosis, no focal high-grade "
    "lesion. No antiplatelet, no statin. Current smoker (~1/2 pack/day); no cessation "
    "counseling documented. No structured exercise program undertaken. Patient requests "
    "stenting to accelerate return to recreational running. Request prior authorization "
    "for left lower-extremity angioplasty/stent."
)

CASES = {
    "input_case1.json": dict(request_id="pad_case_1",
        service_requested="Right SFA angioplasty with stent for intermittent claudication",
        clinical_record=CASE_1, **COMMON),
    "input_case2.json": dict(request_id="pad_case_2",
        service_requested="Left SFA angioplasty +/- stent for intermittent claudication",
        clinical_record=CASE_2, **COMMON),
    "input_case3.json": dict(request_id="pad_case_3",
        service_requested="Left lower-extremity angioplasty/stent for recreational running",
        clinical_record=CASE_3, **COMMON),
}

for fname, payload in CASES.items():
    pathlib.Path(fname).write_text(json.dumps(payload, indent=2))
    print(f"wrote {fname}  (request_id={payload['request_id']})")

print(f"\npolicy: {len(policy)} chars from {POLICY_PATH}")
print("expected branches: case1 -> ready | case2 -> missing_docs | case3 -> escalate")
