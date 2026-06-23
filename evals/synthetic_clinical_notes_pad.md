# Synthetic Clinical Notes — PAD Peripheral Stenting (AuthFlow AI demo)

> SYNTHETIC. No real patients. These three notes drive the three demo branches
> against `pad_peripheral_stenting_policy.md` (MHP-VASC-2041). Each note is what
> the Clinical Evidence Agent reads; the CriteriaMatch Agent maps it to the
> policy and emits the routing branch.

---

## CASE 1 — Clean approval  →  expected branch: `ready`

**Vascular Surgery Clinic Note**
Patient: synthetic — 64M. Occupation: postal carrier (on feet most of the day).

CC: Right calf pain with walking, worsening over 10 months.

HPI: Reproducible right calf cramping after ~1 block, resolves with rest;
now limiting his ability to complete his mail route. Denies rest pain, no
ulceration or tissue loss.

Vascular: Right ABI 0.61, left ABI 0.94. CTA lower extremities: focal 70%
stenosis of the right superficial femoral artery; distal runoff intact;
lesion suitable for endovascular therapy.

Conservative therapy: Completed a 14-week supervised exercise therapy program
(vascular rehab, 3×/week) with only minimal symptomatic improvement; remains
unable to complete his route. On aspirin 81 mg daily and atorvastatin 40 mg
daily for 8 months. Former smoker — quit 6 months ago following cessation
counseling at this clinic.

Assessment/Plan: Lifestyle-limiting right SFA claudication refractory to
guideline-directed conservative therapy. Request prior authorization for right
SFA angioplasty with stent.

<!-- Mapping: C1 met (ABI 0.61), C2 met (limits occupation), C3a met (14-wk
     supervised program), C3b met (ASA+statin), C3c met (cessation done),
     C4 met (persistent despite therapy), C5 met (CTA, suitable). → ready -->

---

## CASE 2 — Missing / ambiguous documentation  →  expected branch: `missing_docs`
### *** This is the demo centerpiece — keep it ambiguous, do not "fix" it ***

**Vascular Clinic Note**
Patient: synthetic — 65F. Retired; describes herself as active, enjoys gardening
and daily neighborhood walks.

CC: Left calf tightness when walking.

HPI: Left calf claudication that has been interfering with her gardening and her
usual daily walks for several months. No rest pain, no wounds.

Vascular: Left ABI 0.68. Duplex: left SFA stenosis approximately 60%, single-
vessel runoff preserved. Lesion appears amenable to endovascular treatment.

Medications/therapy: Aspirin 81 mg daily and rosuvastatin 20 mg daily. Lifelong
non-smoker. "Patient counseled on the importance of walking exercise and has
been trying to walk more at home; reports her symptoms are ongoing."

Assessment/Plan: Symptomatic left SFA PAD. Discussed options; request prior
authorization for left SFA angioplasty ± stent.

<!-- Mapping: C1 met (ABI 0.68), C2 met (limits daily activities), C3b met
     (ASA+statin), C3c N/A (non-smoker), C5 met (duplex, suitable).
     BUT C3a is AMBIGUOUS: "trying to walk more at home" is NOT a documented
     structured/supervised program for >=3 months — and the policy explicitly
     says informal advice to walk does not meet 3a. C4 cannot be confirmed
     without a documented trial. → criterion 3a = UNCERTAIN/MISSING → missing_docs.
     Staff task should ask: confirm whether a structured/supervised exercise
     program of >=3 months was completed; upload documentation if available. -->

---

## CASE 3 — Guideline-discordant  →  expected branch: `escalate`

**Clinic Note**
Patient: synthetic — 58M. Occupation: software engineer (desk-based). Avid
recreational runner.

CC: Calf discomfort when running longer distances.

HPI: Notes some left calf discomfort after roughly half a mile of running; able
to walk without limitation and works without difficulty. Primary goal stated as
returning to his prior running distance "faster." No rest pain, no wounds.

Vascular: ABI 0.91 (borderline). Duplex: mild left SFA irregularity, < 50%
stenosis, no focal high-grade lesion.

Medications/therapy: No antiplatelet, no statin. Current smoker (~1/2 pack/day);
no cessation counseling documented. No structured exercise program undertaken.

Assessment/Plan: Patient requests stenting to accelerate return to recreational
running. Request prior authorization for left lower-extremity angioplasty/stent.

<!-- Mapping: C1 borderline/not-met (ABI 0.91, <50% stenosis), C2 NOT met
     (recreational, not occupational/essential ADL), C3 NOT met (no antiplatelet/
     statin, active smoker w/o counseling, no structured program), C5 weak.
     Guideline-discordant request — policy says refer to Medical Director,
     NOT auto-deny. → escalate -->
