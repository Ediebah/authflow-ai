"""
schema.py — typed models for the CriteriaMatch agent.

Two layers:
  1. The LLM returns ONLY its judgment: per-criterion statuses + rationale +
     safety flags + citations (`LLMAssessment`). It does NOT decide routing.
  2. Code derives overall_determination + routing.branch deterministically from
     those statuses (see agent.derive_routing). This keeps the field the Maestro
     gateway switches on reproducible and auditable.

The final assembled object (`CriteriaMatchOutput`) conforms to
criteriamatch_output.schema.json.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class CriterionStatus(str, Enum):
    met = "met"
    not_met = "not_met"
    missing = "missing"
    uncertain = "uncertain"


class Determination(str, Enum):
    ready = "ready_for_submission"
    missing = "missing_documentation"
    escalate = "escalate"


class Branch(str, Enum):
    ready = "ready"
    missing_docs = "missing_docs"
    escalate = "escalate"


class SafetyFlagType(str, Enum):
    ai_introduced_medication = "ai_introduced_medication"
    ai_introduced_dosage_change = "ai_introduced_dosage_change"
    ai_introduced_directive = "ai_introduced_directive"
    other = "other"


class CriterionResult(BaseModel):
    criterion_id: str = Field(description="Policy criterion ID, e.g. 'C1', 'C3a'.")
    description: str = Field(description="Plain-language restatement of the criterion.")
    status: CriterionStatus
    evidence: Optional[str] = Field(
        default=None, description="Chart text supporting the status; null if none found."
    )
    evidence_source: Optional[str] = Field(
        default=None, description="Where in the record the evidence came from."
    )
    rationale: str = Field(description="Why this status was assigned.")
    confidence: float = Field(ge=0.0, le=1.0)
    needed_if_gap: Optional[str] = Field(
        default=None,
        description="If status is 'missing' or 'uncertain', what documentation is "
        "needed, phrased for clinic staff. Null otherwise.",
    )


class SafetyFlag(BaseModel):
    type: SafetyFlagType
    detail: str


class Citation(BaseModel):
    source: str = Field(description="e.g. 'MHP-VASC-2041 Criterion 3a'.")
    snippet: Optional[str] = Field(default=None, description="Short paraphrased excerpt.")


# ---- What the LLM is constrained to return (judgment only) ------------------
class LLMAssessment(BaseModel):
    """Schema-constrained structured output from the model. No routing here."""

    criteria: List[CriterionResult]
    safety_flags: List[SafetyFlag] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)


# ---- Final assembled output (code fills determination/routing/confidence) ----
class MissingDoc(BaseModel):
    criterion_id: str
    needed: str
    blocking: bool


class Routing(BaseModel):
    branch: Branch
    reason: str


class CriteriaMatchOutput(BaseModel):
    request_id: str
    payer: str
    policy_id: str
    service_requested: str
    therapeutic_area: Optional[str] = None
    criteria: List[CriterionResult]
    missing_documentation: List[MissingDoc] = Field(default_factory=list)
    overall_determination: Determination
    routing: Routing
    confidence: float = Field(ge=0.0, le=1.0)
    safety_flags: List[SafetyFlag] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
