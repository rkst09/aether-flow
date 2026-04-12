import uuid as uuid_lib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_supabase
from services.openai_client import chat_json
from services.prd_extractor import fetch_prd_text

router = APIRouter()


class PhaseRequest(BaseModel):
    project_id: str
    re_run: bool = False


@router.post("")
async def run_backlog(req: PhaseRequest):
    db = get_supabase()

    res = db.table("projects").select("*").eq("id", req.project_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Project not found")
    project = res.data

    personas = db.table("personas").select("*").eq("project_id", req.project_id).execute().data or []
    journeys = db.table("journey_maps").select("*").eq("project_id", req.project_id).execute().data or []

    if not personas:
        raise HTTPException(400, "Run Phase 01 personas first")

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
        for row in (cached.data or []):
            rich = row.get("output_json", {}).get("backlog_rich")
            if rich:
                return {"backlog_rich": rich, "cached": True}

    run = db.table("agent_runs").insert({
        "project_id": req.project_id,
        "phase": 1,
        "status": "running",
        "input_json": {"step": "backlog"},
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

        persona_id_to_name = {p["id"]: p["name"] for p in personas}

        journey_summary = ""
        for jm in journeys:
            pname = persona_id_to_name.get(jm.get("persona_id"), "Unknown")
            stages = jm.get("stages", [])
            for s in stages:
                pps = "; ".join(s.get("painPoints", []))
                opps = "; ".join(o.get("text", "") for o in s.get("opportunities", []))
                journey_summary += f"  [{pname} — {s.get('title', 'Stage')}] pain: {pps} | opp: {opps}\n"

        system = (
            "You are a senior UX strategist and product designer. "
            "You produce precise, actionable design backlogs used directly by product and design teams. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        user = f"""Create a structured design backlog for project '{project['name']}' grouped into logical feature modules.

PERSONAS:
{personas_summary}

JOURNEY INSIGHTS:
{journey_summary}

PRD:
{prd_text[:8000]}

Return a JSON object with this EXACT structure:
{{
  "modules": [
    {{
      "name": "string — feature module name (e.g. 'Onboarding System', 'Core Workflow', 'Collaboration')",
      "description": "string — 1-sentence scope of this module",
      "items": [
        {{
          "featureName": "string — specific, actionable feature name",
          "problemStatement": "string — 1-2 sentences: what user problem this solves and why it matters",
          "personaNames": ["string — persona names that benefit from this feature"],
          "journeyStage": "string — which journey stage this addresses",
          "opportunityDirection": "string — 1-2 sentences: how to solve the problem and what the design should enable",
          "priority": "High" | "Medium" | "Low",
          "effort": "High" | "Medium" | "Low",
          "impact": ["Retention" | "Conversion" | "Experience" | "Performance"],
          "dependencies": ["string — other features or systems this depends on"],
          "edgeCases": ["string — specific edge cases the design must handle"],
          "warning": "string | null — flag if there is a risk, gap, or unanswered question for this feature"
        }}
      ]
    }}
  ]
}}

Rules:
- Generate 4–6 modules that logically group the feature scope
- Each module must have 3–5 items (total 15–25 items across all modules)
- priority: High = core journey blocker, Medium = important enhancement, Low = edge case or nice-to-have
- effort: High = complex multi-screen flow, Medium = 2–3 screens, Low = single component or copy change
- impact: choose 1–2 from the allowed values that best match
- Base everything strictly on the PRD, personas, and journey data
- personaNames must match actual persona names exactly
- Do NOT invent features unrelated to the PRD
"""

        result = await chat_json(system, user)
        modules_data = result.get("modules", [])

        if not modules_data:
            raise ValueError("OpenAI returned no backlog modules")

        persona_name_to_id = {p["name"]: p["id"] for p in personas}

        # ── Delete old backlog items ───────────────────────────────────────────
        db.table("backlog_items").delete().eq("project_id", req.project_id).execute()

        backlog_rich = []
        sort_order = 0

        for mod in modules_data:
            module_id = f"m-{str(uuid_lib.uuid4())[:8]}"
            rich_items = []

            for item in mod.get("items", []):
                item_id = f"i-{str(uuid_lib.uuid4())[:8]}"
                persona_names = item.get("personaNames", [])
                priority_raw = item.get("priority", "Medium")
                priority_db = priority_raw.lower() if priority_raw else "medium"

                # Save flat record to backlog_items table
                row = db.table("backlog_items").insert({
                    "project_id": req.project_id,
                    "persona_id": persona_name_to_id.get(persona_names[0]) if persona_names else None,
                    "task_name": item.get("featureName", "Untitled"),
                    "priority": priority_db,
                    "type": "screen",
                    "sort_order": sort_order,
                }).execute()
                sort_order += 1

                rich_items.append({
                    "id": item_id,
                    "featureName": item.get("featureName", "Untitled"),
                    "problemStatement": item.get("problemStatement", ""),
                    "personaNames": persona_names,
                    "journeyStage": item.get("journeyStage", ""),
                    "opportunityDirection": item.get("opportunityDirection", ""),
                    "priority": priority_raw,
                    "effort": item.get("effort", "Medium"),
                    "impact": item.get("impact", ["Experience"]),
                    "dependencies": item.get("dependencies", []),
                    "edgeCases": item.get("edgeCases", []),
                    "warning": item.get("warning") or None,
                })

            backlog_rich.append({
                "id": module_id,
                "name": mod.get("name", "Module"),
                "description": mod.get("description", ""),
                "items": rich_items,
            })

        # Advance project to phase 2
        db.table("projects").update({"current_phase": 2}).eq("id", req.project_id).execute()

        db.table("agent_runs").update({
            "status": "completed",
            "output_json": {
                "backlog_rich": backlog_rich,
                "module_count": len(backlog_rich),
                "item_count": sort_order,
            },
        }).eq("id", run_id).execute()

        return {"backlog_rich": backlog_rich, "cached": False}

    except Exception as e:
        db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise HTTPException(500, str(e))
