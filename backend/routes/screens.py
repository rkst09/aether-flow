import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user, get_project_for_user
from database import get_supabase
from services.openai_client import chat_json
from services.pipeline_normalizers import normalize_screen_modules

router = APIRouter()


class PhaseRequest(BaseModel):
    project_id: str
    re_run: bool = False


@router.post("")
async def run_screens(req: PhaseRequest, user=Depends(get_current_user)):
    db = get_supabase()

    project = get_project_for_user(db, req.project_id, user["id"])

    personas = db.table("personas").select("*").eq("project_id", req.project_id).execute().data or []

    # Fetch backlog_rich from agent_runs for rich context
    backlog_agent = (
        db.table("agent_runs")
        .select("output_json")
        .eq("project_id", req.project_id)
        .eq("phase", 1)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .execute()
    )
    backlog_rich = []
    for row in (backlog_agent.data or []):
        br = row.get("output_json", {}).get("backlog_rich")
        if br:
            backlog_rich = br
            break

    if not backlog_rich:
        raise HTTPException(400, "Run Phase 01 backlog first")

    # ── Return cached rich result ─────────────────────────────────────────────
    if not req.re_run:
        cached = (
            db.table("agent_runs")
            .select("output_json")
            .eq("project_id", req.project_id)
            .eq("phase", 2)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .execute()
        )
        for row in (cached.data or []):
            rich = row.get("output_json", {}).get("screens_rich")
            if rich:
                return {"screens_rich": rich, "cached": True}

    run = db.table("agent_runs").insert({
        "project_id": req.project_id,
        "phase": 2,
        "status": "running",
        "input_json": {"step": "screens"},
    }).execute()
    run_id = run.data[0]["id"]

    try:
        persona_id_map = {p["name"]: p["id"] for p in personas}

        backlog_summary = ""
        for mod in backlog_rich:
            backlog_summary += f"\nModule: {mod['name']}\n"
            for item in mod.get("items", []):
                backlog_summary += (
                    f"  - {item['featureName']} "
                    f"(priority: {item['priority']}, effort: {item['effort']}, "
                    f"personas: {', '.join(item.get('personaNames', []))}, "
                    f"stage: {item.get('journeyStage', '')})\n"
                )

        persona_names = [p["name"] for p in personas]

        system = (
            "You are a principal product designer. "
            "You derive precise, implementable screen inventories from design backlogs. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        user = f"""Derive a complete screen inventory for project '{project['name']}' grouped by user flow area.

PERSONAS: {', '.join(persona_names)}

DESIGN BACKLOG (feature modules and items):
{backlog_summary}

Return a JSON object with this EXACT structure:
{{
  "screen_modules": [
    {{
      "name": "string — flow area name (e.g. 'Authentication', 'Onboarding', 'Core Workspace', 'Review & Export')",
      "screens": [
        {{
          "name": "string — specific screen name (e.g. 'Sign In', 'Dashboard', 'Project Detail')",
          "type": "Entry" | "Action" | "Detail" | "System" | "Feedback",
          "personaNames": ["string — persona names that use this screen"],
          "purpose": "string — 1 sentence: what the user accomplishes on this screen",
          "journeyStage": "string — which journey stage this screen belongs to",
          "backlogRef": "string — which backlog feature this screen delivers",
          "entryPoints": ["string — how users arrive at this screen (1–3 ways)"],
          "exitPoints": ["string — where users go from this screen (1–3 destinations)"],
          "componentHints": ["string — key UI components needed (3–6, e.g. 'DataTable', 'UploadDropzone', 'ProgressStepper')"],
          "states": ["Loading" | "Empty" | "Error" | "Success"],
          "complexity": "Simple" | "Medium" | "Complex",
          "shared": true | false,
          "warning": "string | null — any design risk or missing spec"
        }}
      ]
    }}
  ]
}}

Type definitions:
- Entry: entry point screen (landing, login, onboarding start)
- Action: user performs the core task (forms, upload, configuration)
- Detail: user reviews content in depth (project detail, persona card)
- System: system-managed screens (error pages, loading, empty states)
- Feedback: confirmation, success, or summary screens

Rules:
- Generate 4–6 screen modules covering all backlog features
- Each module must have 3–6 screens (total 15–25 screens across all modules)
- shared=true if multiple personas use this screen
- All 4 states (Loading, Empty, Error, Success) must be covered on Action/Detail screens
- Simple/Entry screens need fewer states (Loading + Error minimum)
- Do NOT invent screens not supported by the backlog
- personaNames must exactly match: {', '.join(persona_names)}
"""

        result = await chat_json(system, user)
        modules_data = normalize_screen_modules(result, set(persona_id_map.keys()))

        if not modules_data:
            raise ValueError("OpenAI returned no screen modules")

        # ── Delete old screens ─────────────────────────────────────────────────
        db.table("screens").delete().eq("project_id", req.project_id).execute()

        screens_rich = []
        sort_order = 0

        for mod in modules_data:
            module_id = f"sm-{str(uuid_lib.uuid4())[:8]}"
            rich_screens = []

            for s in mod.get("screens", []):
                screen_id = f"sc-{str(uuid_lib.uuid4())[:8]}"
                persona_names_list = s.get("personaNames", [])
                primary_persona = persona_names_list[0] if persona_names_list else None

                row = db.table("screens").insert({
                    "project_id": req.project_id,
                    "persona_id": persona_id_map.get(primary_persona),
                    "name": s.get("name", "Unnamed Screen"),
                    "type": s.get("type", "Action"),
                    "entry_points": s.get("entryPoints", []),
                    "exit_points": s.get("exitPoints", []),
                    "component_hints": s.get("componentHints", []),
                    "sort_order": sort_order,
                }).execute()
                sort_order += 1

                rich_screens.append({
                    "id": screen_id,
                    "name": s.get("name", "Unnamed Screen"),
                    "type": s.get("type", "Action"),
                    "personaNames": persona_names_list,
                    "purpose": s.get("purpose", ""),
                    "journeyStage": s.get("journeyStage", ""),
                    "backlogRef": s.get("backlogRef", ""),
                    "entryPoints": s.get("entryPoints", []),
                    "exitPoints": s.get("exitPoints", []),
                    "componentHints": s.get("componentHints", []),
                    "states": s.get("states", ["Loading", "Error"]),
                    "complexity": s.get("complexity", "Medium"),
                    "shared": bool(s.get("shared", False)),
                    "warning": s.get("warning") or None,
                })

            screens_rich.append({
                "id": module_id,
                "name": mod.get("name", "Module"),
                "screens": rich_screens,
            })

        db.table("projects").update({"current_phase": 3}).eq("id", req.project_id).execute()

        db.table("agent_runs").update({
            "status": "completed",
            "output_json": {
                "screens_rich": screens_rich,
                "module_count": len(screens_rich),
                "screen_count": sort_order,
            },
        }).eq("id", run_id).execute()

        return {"screens_rich": screens_rich, "cached": False}

    except Exception as e:
        db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise HTTPException(500, str(e))
