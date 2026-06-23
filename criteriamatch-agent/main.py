"""
CriteriaMatch — UiPath LangChain coded agent (matched to installed SDK 0.11.x).

Ports the validated CriteriaMatch logic into the uipath-langchain scaffold:
  - LLM judges each criterion (schema-constrained), via UiPath LLM Gateway
  - code derives routing.branch DETERMINISTICALLY from the per-criterion statuses
  - returns CriteriaMatchOutput; the Maestro gateway switches on routing.branch

Matches the scaffold conventions: UiPathAzureChatOpenAI, async node, and
StateGraph(State, output=OutputModel). Entry point exposed to UiPath: `graph`
(see langgraph.json: "agent": "./main.py:graph").

Copy your validated schema.py, prompts.py, agent.py into ./criteriamatch/ so the
imports below resolve.
"""

from __future__ import annotations

from typing import Optional

from langgraph.graph import START, StateGraph, END
from uipath_langchain.chat import UiPathAzureChatOpenAI
from pydantic import BaseModel

# Reuse the validated pieces unchanged.
from criteriamatch.prompts import SYSTEM_PROMPT, build_user_message
from criteriamatch.schema import LLMAssessment, CriteriaMatchOutput
from criteriamatch.agent import derive_routing, _missing_docs


# ---- Graph input (what UiPath passes in) ------------------------------------
class GraphState(BaseModel):
    request_id: str
    payer: str
    policy_id: str
    service_requested: str
    clinical_record: str
    policy_text: str
    therapeutic_area: Optional[str] = None


# ---- The single node: judge -> derive routing -> assemble -------------------
async def criteriamatch(state: GraphState) -> CriteriaMatchOutput:
    # UiPath LLM Gateway model (Azure OpenAI flavor). Model id per the scaffold;
    # swap if your tenant's Gateway exposes a different catalog.
    llm = UiPathAzureChatOpenAI(model="gpt-4.1-mini-2025-04-14", temperature=0)

    # Schema-constrained judgment. If the Gateway model does not support
    # with_structured_output, see the JSON-parse fallback note at the bottom.
    structured = llm.with_structured_output(LLMAssessment)
    assessment: LLMAssessment = await structured.ainvoke(
        [
            ("system", SYSTEM_PROMPT),
            ("user", build_user_message(
                payer=state.payer,
                policy_id=state.policy_id,
                service_requested=state.service_requested,
                policy_text=state.policy_text,
                clinical_record=state.clinical_record,
            )),
        ]
    )

    determination, routing, confidence = derive_routing(assessment.criteria)

    return CriteriaMatchOutput(
        request_id=state.request_id,
        payer=state.payer,
        policy_id=state.policy_id,
        service_requested=state.service_requested,
        therapeutic_area=state.therapeutic_area,
        criteria=assessment.criteria,
        missing_documentation=_missing_docs(assessment.criteria),
        overall_determination=determination,
        routing=routing,
        confidence=confidence,
        safety_flags=assessment.safety_flags,
        citations=assessment.citations,
    )


# ---- Build the graph (matches scaffold: StateGraph(State, output=Output)) ----
builder = StateGraph(GraphState, output=CriteriaMatchOutput)
builder.add_node("criteriamatch", criteriamatch)
builder.add_edge(START, "criteriamatch")
builder.add_edge("criteriamatch", END)
graph = builder.compile()


# ─────────────────────────────────────────────────────────────────────────────
# FALLBACK (only if `with_structured_output` errors against the Gateway model):
# replace the `structured = ...` / `assessment = ...` block with a plain call that
# asks for JSON and parses it:
#
#   import json
#   from langchain_core.messages import SystemMessage, HumanMessage
#   raw = await llm.ainvoke([
#       SystemMessage(SYSTEM_PROMPT + "\n\nReturn ONLY valid JSON matching the "
#                     "LLMAssessment schema: {criteria:[...], safety_flags:[...], citations:[...]}."),
#       HumanMessage(build_user_message(payer=state.payer, policy_id=state.policy_id,
#           service_requested=state.service_requested, policy_text=state.policy_text,
#           clinical_record=state.clinical_record)),
#   ])
#   assessment = LLMAssessment.model_validate_json(raw.content.strip().strip("`").removeprefix("json"))
# ─────────────────────────────────────────────────────────────────────────────