import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user, get_project_for_user
from database import get_supabase
from services.openai_client import chat_json
from services.pipeline_normalizers import normalize_journeys
from services.prd_extractor import fetch_prd_text

router = APIRouter()


class PhaseRequest(BaseModel):
    project_id: str
    re_run: bool = False


@router.post("")
async def run_journey(req: PhaseRequest, user=Depends(get_current_user)):
    db = get_supabase()

    project = get_project_for_user(db, req.project_id, user["id"])

    personas_res = db.table("personas").select("*").eq("project_id", req.project_id).execute()
    if not personas_res.data:
        raise HTTPException(400, "Run Phase 01 personas first")
    personas = personas_res.data

    # ── Return cached rich result ─────────────────────────────────────────────
    if not req.re_run:
        cached = (
            db.table("agent_runs")
            .select("output_json")
            .eq("project_id", req.project_id)
            .eq("phase", 1)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .execute()
        )
        # Find the journey step in agent_runs
        persona_ids = {p["id"] for p in personas}
        for row in (cached.data or []):
            rich = row.get("output_json", {}).get("journeys_rich")
            rich_persona_ids = {jm.get("persona_id") for jm in rich or [] if jm.get("persona_id")}
            if rich and rich_persona_ids & persona_ids:
                return {"journeys_rich": rich, "cached": True}

    run = db.table("agent_runs").insert({
        "project_id": req.project_id,
        "phase": 1,
        "status": "running",
        "input_json": {"step": "journey"},
    }).execute()
    run_id = run.data[0]["id"]

    try:
        prd_text = ""
        if project.get("prd_url") and project.get("prd_filename"):
            prd_text = fetch_prd_text(project["prd_url"], project["prd_filename"])

        personas_summary = "\n".join(
            f"- {p['name']} ({p['role']}): goals={p['goals']}, pain_points={p['pain_points']}"
            for p in personas
        )

        system = (
            "You are a principal UX researcher specialising in customer journey mapping. "
            "You produce deep, evidence-based journey maps that design teams use directly. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        user = f"""Create one journey map per persona for project '{project['name']}'.

PERSONAS:
{personas_summary}

PRD TEXT:
{prd_text[:10000]}

Return a JSON object with this EXACT structure — every field is required:
{{
  "journey_maps": [
    {{
      "persona_name": "string — must match a persona name exactly",
      "stages": [
        {{
          "title": "string — stage name (e.g. 'Discovery', 'Onboarding', 'Daily Use', 'Review', 'Sign-off')",
          "emotionScore": integer 1–5,
          "actions": ["string — 2–4 specific actions the user takes at this stage"],
          "thoughts": ["string — 2–3 internal monologue or questions the user has"],
          "painPoints": ["string — 2–3 specific friction points at this stage"],
          "systemGaps": ["string — 1–2 product gaps that cause friction here"],
          "opportunities": [
            {{
              "text": "string — specific, actionable design opportunity",
              "impact": "High" | "Medium" | "Low",
              "effort": "High" | "Medium" | "Low"
            }}
          ]
        }}
      ]
    }}
  ]
}}

Scoring guide for emotionScore:
5 = Delighted (peak positive experience)
4 = Positive (smooth, easy, working well)
3 = Neutral (functional, no strong feeling)
2 = Frustrated (clear friction, minor blocker)
1 = Struggling (significant pain, risk of drop-off)

Rules:
- Each journey must have 4–6 stages in logical user-flow order
- emotionScore must reflect the ACTUAL experience at that stage — not aspirational
- painPoints and systemGaps must be product-specific, not generic
- Each stage must have 1–2 opportunities with impact/effort ratings
- Base everything on the PRD and personas — do not invent unrelated scenarios
"""

        persona_name_to_id = {p["name"]: p["id"] for p in personas}
        result = await chat_json(system, user)
        maps_data = normalize_journeys(result, set(persona_name_to_id.keys()))

        if not maps_data:
            raise ValueError("OpenAI returned no journey maps")

        # ── Delete old journey maps ───────────────────────────────────────────
        db.table("journey_maps").delete().eq("project_id", req.project_id).execute()

        journeys_rich = []
        for jm in maps_data:
            persona_id = persona_name_to_id.get(jm.get("persona_name"))
            persona_name = jm.get("persona_name", "Unknown")

            # Enrich stages with stable IDs and opportunity IDs
            stages_with_ids = []
            for i, stage in enumerate(jm.get("stages", [])):
                stage_id = f"s-{str(uuid_lib.uuid4())[:8]}"
                ops_with_ids = [
                    {"id": f"o-{str(uuid_lib.uuid4())[:8]}", **op}
                    for op in stage.get("opportunities", [])
                ]
                stages_with_ids.append({
                    "id": stage_id,
                    "title": stage.get("title", f"Stage {i + 1}"),
                    "emotionScore": max(1, min(5, int(stage.get("emotionScore", 3)))),
                    "actions": stage.get("actions", []),
                    "thoughts": stage.get("thoughts", []),
                    "painPoints": stage.get("painPoints", []),
                    "systemGaps": stage.get("systemGaps", []),
                    "opportunities": ops_with_ids,
                })

            # Save to journey_maps table (normalized)
            row = db.table("journey_maps").insert({
                "project_id": req.project_id,
                "persona_id": persona_id,
                "stages": stages_with_ids,
            }).execute()
            db_id = row.data[0]["id"]

            journeys_rich.append({
                "db_id": db_id,
                "persona_id": persona_id,
                "persona_name": persona_name,
                "stages": stages_with_ids,
            })

        # ── Save to agent_runs ────────────────────────────────────────────────
        db.table("agent_runs").update({
            "status": "completed",
            "output_json": {
                "journeys_rich": journeys_rich,
                "journey_count": len(journeys_rich),
            },
        }).eq("id", run_id).execute()

        return {"journeys_rich": journeys_rich, "cached": False}

    except Exception as e:
        db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise HTTPException(500, str(e))


@router.post("/save")
async def save_journeys(req: dict, user=Depends(get_current_user)):
    """Persist designer edits to journey maps back to Supabase."""
    db = get_supabase()
    project_id = req.get("project_id")
    journeys_rich = req.get("journeys_rich", [])

    if not project_id or not journeys_rich:
        raise HTTPException(400, "project_id and journeys_rich required")

    get_project_for_user(db, project_id, user["id"])

    for jm in journeys_rich:
        db_id = jm.get("db_id")
        if not db_id:
            continue
        db.table("journey_maps").update({
            "stages": jm.get("stages", []),
        }).eq("id", db_id).eq("project_id", project_id).execute()

    # Update cached agent_run
    cached = (
        db.table("agent_runs")
        .select("id", "output_json")
        .eq("project_id", project_id)
        .eq("phase", 1)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .execute()
    )
    for row in (cached.data or []):
        if row.get("output_json", {}).get("journeys_rich"):
            db.table("agent_runs").update({
                "output_json": {**row["output_json"], "journeys_rich": journeys_rich}
            }).eq("id", row["id"]).execute()
            break

    return {"saved": True}
