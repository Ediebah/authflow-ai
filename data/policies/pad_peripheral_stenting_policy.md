# Meridian Health Plan — Medical Coverage Policy

**Policy:** Elective Endovascular Revascularization (Angioplasty / Stenting) of
Lower-Extremity Arteries for Intermittent Claudication
**Policy ID:** MHP-VASC-2041
**Effective:** 2026-01-01 · **Review cycle:** Annual

> SYNTHETIC / MOCK POLICY. Meridian Health Plan is fictional. The criteria below
> are a realistic composite of medical-necessity requirements commonly found in
> commercial payer coverage policies for elective peripheral revascularization.
> This file exists for the AuthFlow AI hackathon demo. To use a real payer's
> rules, drop their published policy text into `data/policies/` and re-ingest.

---

## Scope

This policy governs **prior authorization** for **elective** endovascular
revascularization — percutaneous transluminal angioplasty (PTA) and/or stent
placement — of the **iliac and femoropopliteal** segments for **intermittent
claudication** (Rutherford category 2–3 / Fontaine stage IIb).

This policy does **not** apply to critical limb-threatening ischemia (rest pain,
ulceration, gangrene — Rutherford 4–6), which is reviewed under the urgent
revascularization policy (MHP-VASC-2055) and is **not** subject to elective
prior authorization.

---

## Medical Necessity Criteria

Endovascular revascularization for intermittent claudication is considered
medically necessary when **ALL** of the following are met and documented:

**Criterion 1 — Confirmed PAD with objective evidence.**
A diagnosis of peripheral arterial disease supported by at least one objective
measure:
- Resting ankle-brachial index (ABI) ≤ 0.90 in the symptomatic limb; **or**
- Toe-brachial index (TBI) ≤ 0.70 when vessels are non-compressible (ABI > 1.40); **or**
- Imaging (duplex ultrasound, CTA, or MRA) demonstrating ≥ 50% stenosis in the
  arterial segment corresponding to the patient's symptoms.

**Criterion 2 — Lifestyle-limiting claudication.**
Intermittent claudication (Rutherford 2–3 / Fontaine IIb) that interferes with
the patient's **occupation or essential activities of daily living**, documented
in the clinical record. Symptoms limiting only recreational or discretionary
activity do **not** by themselves satisfy this criterion.

**Criterion 3 — Completed trial of conservative therapy (≥ 3 months).**
A documented trial of conservative management of **at least 3 months** prior to
the request, comprising **all** of:
- **3a.** A **structured or supervised exercise program** (e.g., a supervised
  exercise therapy program, or a documented structured walking program with
  defined frequency/duration). Informal advice to "walk more" does **not** meet
  this element.
- **3b.** Optimal medical therapy: an **antiplatelet agent** and a **statin**
  (unless contraindicated or documented intolerance).
- **3c.** **Smoking-cessation counseling** for current smokers.

**Criterion 4 — Persistence despite conservative therapy.**
Documented persistence or progression of lifestyle-limiting symptoms despite the
Criterion 3 trial.

**Criterion 5 — Anatomic suitability.**
Imaging (duplex, CTA, or MRA) identifying the target lesion(s) and confirming
suitability for endovascular treatment.

---

## Not Medically Necessary

A request is **not** medically necessary, and is **not** to be auto-denied but
**referred to a Medical Director / peer-to-peer review**, when it is
guideline-discordant — for example:
- Asymptomatic PAD, or claudication that is **not** lifestyle-limiting.
- **No documented ≥ 3-month conservative therapy trial** (Criterion 3 absent).
- Intervention requested to accelerate return to recreational activity in the
  absence of occupational or essential-ADL limitation.

---

## Utilization-Management Routing (for AuthFlow demo mapping)

| Documentation state | Determination | BPMN branch |
|---|---|---|
| Criteria 1–5 all met, complete | Approvable | `ready` → packet + submit |
| One or more required elements **absent or ambiguous** | Pend for documentation | `missing_docs` → staff User task |
| Guideline-discordant (see above) | Refer for clinical review | `escalate` → Medical Director User task |

---

## References (illustrative, synthetic policy)

1. Society for Vascular Surgery / TASC II — practice guidance on claudication management (conservative therapy first).
2. ACC/AHA guideline on the management of lower-extremity PAD.
3. Meridian Health Plan internal UM criteria MHP-VASC-2041 (fictional).
