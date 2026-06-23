"""
agent.py — the CriteriaMatch agent.

Pipeline:
  1. LLM (via LangChain, schema-constrained to `LLMAssessment`) judges each criterion.
  2. Code derives overall_determination + routing.branch DETERMINISTICALLY from the
     per-criterion statuses (derive_routing). The Maestro BPMN gateway switches on
     `routing.branch`, so this must be reproducible — not left to the model.
  3. Code assembles the final `CriteriaMatchOutput` (conforms to the JSON schema).

Routing rule (in priority order):
  - any criterion 'not_met'            -> escalate      (guideline-discordant; clinician decides; never auto-deny)
  - else any 'missing' or 'uncertain'  -> missing_docs  (documentation gap; request more evidence; suspend/resume)
  - else (all 'met')                   -> ready         (complete; generate packet + submit)
  - safety net: a 'ready' result whose mean confidence is below READY_CONFIDENCE_FLOOR
    is downgraded to missing_docs (sent to a human) rather than auto-proceeding.
"""

from __future__ import annotations

import os
from statistics import mean
from typing import List

from langchain_openai import ChatOpenAI

from .prompts import SYSTEM_PROMPT, build_user_message
from .schema import (
    Branch,
    CriteriaMatchOutput,
    CriterionResult,
    CriterionStatus,
    Determination,
    LLMAssessment,
    MissingDoc,
    Routing,
)

MODEL = os.getenv("CRITERIAMATCH_MODEL", "gpt-4o-mini")
# Note: gpt-4o-mini is the Clinica AI default. If Case 2 ever resolves to 'ready'
# instead of flagging the conservative-therapy criterion as uncertain, bump this to
# a stronger reasoning model (e.g. set CRITERIAMATCH_MODEL=gpt-4o) and re-run eval.py.
READY_CONFIDENCE_FLOOR = float(os.getenv("READY_CONFIDENCE_FLOOR", "0.6"))


def _llm():
    # temperature=0 for reproducible determinations.
    return ChatOpenAI(model=MODEL, temperature=0).with_structured_output(LLMAssessment)


def assess(
    *, payer: str, policy_id: str, service_requested: str, policy_text: str, clinical_record: str
) -> LLMAssessment:
    """Run the schema-constrained LLM judgment step."""
    messages = [
        ("system", SYSTEM_PROMPT),
        (
            "user",
            build_user_message(
                payer=payer,
                policy_id=policy_id,
                service_requested=service_requested,
                policy_text=policy_text,
                clinical_record=clinical_record,
            ),
        ),
    ]
    return _llm().invoke(messages)


def derive_routing(criteria: List[CriterionResult]) -> tuple[Determination, Routing, float]:
    """Deterministic routing from per-criterion judgments. Returns (determination, routing, confidence)."""
    statuses = [c.status for c in criteria]
    overall_conf = round(mean(c.confidence for c in criteria), 3) if criteria else 0.0

    if any(s == CriterionStatus.not_met for s in statuses):
        return (
            Determination.escalate,
            Routing(
                branch=Branch.escalate,
                reason="One or more criteria are not met; request appears guideline-discordant. "
                "Referred to a clinician — not auto-denied.",
            ),
            overall_conf,
        )

    if any(s in (CriterionStatus.missing, CriterionStatus.uncertain) for s in statuses):
        return (
            Determination.missing,
            Routing(
                branch=Branch.missing_docs,
                reason="Required documentation is incomplete or ambiguous; additional evidence requested.",
            ),
            overall_conf,
        )

    # All criteria met. Apply the confidence floor before allowing the auto path.
    if overall_conf < READY_CONFIDENCE_FLOOR:
        return (
            Determination.missing,
            Routing(
                branch=Branch.missing_docs,
                reason=f"All criteria appear met but overall confidence ({overall_conf}) is below the "
                f"auto-submission floor ({READY_CONFIDENCE_FLOOR}); routed to human review.",
            ),
            overall_conf,
        )

    return (
        Determination.ready,
        Routing(branch=Branch.ready, reason="All criteria met with complete documentation."),
        overall_conf,
    )


def _missing_docs(criteria: List[CriterionResult]) -> List[MissingDoc]:
    out: List[MissingDoc] = []
    for c in criteria:
        if c.status in (CriterionStatus.missing, CriterionStatus.uncertain):
            out.append(
                MissingDoc(
                    criterion_id=c.criterion_id,
                    needed=c.needed_if_gap or f"Provide documentation for criterion {c.criterion_id}.",
                    blocking=True,
                )
            )
    return out


def run_criteriamatch(
    *,
    request_id: str,
    payer: str,
    policy_id: str,
    service_requested: str,
    policy_text: str,
    clinical_record: str,
    therapeutic_area: str | None = None,
) -> CriteriaMatchOutput:
    """End-to-end: judge -> derive routing -> assemble the gateway-ready output."""
    a = assess(
        payer=payer,
        policy_id=policy_id,
        service_requested=service_requested,
        policy_text=policy_text,
        clinical_record=clinical_record,
    )
    determination, routing, confidence = derive_routing(a.criteria)
    return CriteriaMatchOutput(
        request_id=request_id,
        payer=payer,
        policy_id=policy_id,
        service_requested=service_requested,
        therapeutic_area=therapeutic_area,
        criteria=a.criteria,
        missing_documentation=_missing_docs(a.criteria),
        overall_determination=determination,
        routing=routing,
        confidence=confidence,
        safety_flags=a.safety_flags,
        citations=a.citations,
    )
