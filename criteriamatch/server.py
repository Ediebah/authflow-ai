"""
server.py — the HTTP endpoint UiPath Maestro calls.

Wire this to BPMN task #7 (CriteriaMatch) as a Service task using either
"Start and wait for external agent" or "Start and wait for API workflow".

  POST /criteriamatch
    body: { request_id, payer, policy_id, service_requested,
            clinical_record, policy_text?, therapeutic_area? }
    returns: CriteriaMatchOutput (conforms to criteriamatch_output.schema.json)
             -> Maestro reads routing.branch to drive the gateway.

If policy_text is omitted, the server retrieves the payer policy from the existing
Qdrant KB (the same one Clinica AI uses). For the demo/eval you can pass policy_text
directly so nothing depends on Qdrant being up.

ASYNC NOTE (verify before wiring): an LLM+RAG call can exceed a synchronous HTTP
timeout. This endpoint is synchronous (one model call, usually a few seconds). If
Maestro's API-workflow timeout is shorter than your generation, switch to the
async/callback pattern documented at docs.uipath.com/studio-web/docs/api-workflows.

Run locally:  uvicorn criteriamatch.server:app --reload --port 8088
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .agent import run_criteriamatch
from .schema import CriteriaMatchOutput

app = FastAPI(title="AuthFlow AI — CriteriaMatch agent", version="1.0.0")


class CriteriaMatchRequest(BaseModel):
    request_id: str
    payer: str
    policy_id: str
    service_requested: str
    clinical_record: str
    policy_text: Optional[str] = None
    therapeutic_area: Optional[str] = None


def retrieve_policy_text(payer: str, policy_id: str) -> str:
    """
    Retrieve the payer policy criteria from the existing Qdrant KB.

    Replace this stub with a call into the Clinica AI retriever (src/lib/rag).
    Kept optional so eval and demo can pass policy_text directly.
    """
    raise NotImplementedError(
        "policy_text was not provided and Qdrant retrieval is not wired in this build. "
        "Pass policy_text in the request, or implement retrieve_policy_text() against your KB."
    )


@app.get("/health")
def health():
    return {"ok": True, "model": os.getenv("CRITERIAMATCH_MODEL", "gpt-4o-mini")}


@app.post("/criteriamatch", response_model=CriteriaMatchOutput)
def criteriamatch(req: CriteriaMatchRequest) -> CriteriaMatchOutput:
    policy_text = req.policy_text or retrieve_policy_text(req.payer, req.policy_id)
    try:
        return run_criteriamatch(
            request_id=req.request_id,
            payer=req.payer,
            policy_id=req.policy_id,
            service_requested=req.service_requested,
            policy_text=policy_text,
            clinical_record=req.clinical_record,
            therapeutic_area=req.therapeutic_area,
        )
    except Exception as e:  # surface a clean error to Maestro rather than a 500 stack
        raise HTTPException(status_code=502, detail=f"CriteriaMatch failed: {e}")
