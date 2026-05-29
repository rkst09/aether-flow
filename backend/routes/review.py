from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user, get_project_for_user
from database import get_supabase
from services.phase_review import build_review_output

router = APIRouter()


class PhaseReviewRequest(BaseModel):
    project_id: str
    phase: int = Field(ge=3, le=6)
    next_phase: int | None = Field(default=None, ge=4, le=7)
    summary: str = Field(default="", max_length=500)
    metrics: dict[str, Any] = Field(default_factory=dict)
    status: Literal["reviewed", "handoff_ready"] = "reviewed"


@router.post("/confirm")
async def confirm_phase_review(req: PhaseReviewRequest, user=Depends(get_current_user)):
    db = get_supabase()
    project = get_project_for_user(db, req.project_id, user["id"])

    run = (
        db.table("agent_runs")
        .select("id, output_json")
        .eq("project_id", req.project_id)
        .eq("phase", req.phase)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not run.data:
        raise HTTPException(404, f"No completed phase {req.phase:02d} output found to confirm")

    latest_run = run.data[0]
    updated_output = build_review_output(
        latest_run.get("output_json"),
        user_id=user["id"],
        summary=req.summary,
        metrics=req.metrics,
        status=req.status,
    )

    (
        db.table("agent_runs")
        .update({"output_json": updated_output})
        .eq("id", latest_run["id"])
        .execute()
    )

    project_update: dict[str, Any] = {}
    if req.next_phase is not None:
        project_update["current_phase"] = max(project.get("current_phase", 1), req.next_phase)
    if req.phase == 6 and req.status == "handoff_ready":
        project_update["status"] = "completed"

    if project_update:
        db.table("projects").update(project_update).eq("id", req.project_id).execute()

    return {
        "ok": True,
        "phase": req.phase,
        "next_phase": project_update.get("current_phase", project.get("current_phase")),
        "status": req.status,
    }
