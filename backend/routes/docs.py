import uuid as uuid_lib
import os
import re
import tempfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi import BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from auth import get_current_user, get_project_for_user
from database import get_supabase
from generators.docx_generator import generate_persona_docs_docx
from services.openai_client import chat_json

router = APIRouter()


class PhaseRequest(BaseModel):
    project_id: str
    re_run: bool = False


def _sanitize_filename(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    return cleaned or "Aether_Design_Documentation"


@router.get("/export")
async def export_docs(project_id: str, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    db = get_supabase()

    project = get_project_for_user(db, project_id, user["id"])

    cached = (
        db.table("agent_runs")
        .select("output_json")
        .eq("project_id", project_id)
        .eq("phase", 6)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    persona_docs = (cached.data or [{}])[0].get("output_json", {}).get("persona_docs")
    if not persona_docs:
        raise HTTPException(404, "No documentation available for export")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    temp_file.close()

    project_name = project.get("name") or "Aether Project"
    generate_persona_docs_docx(persona_docs, temp_file.name, project_name=project_name)

    background_tasks.add_task(os.remove, temp_file.name)

    safe_name = _sanitize_filename(project_name)
    return FileResponse(
        temp_file.name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{safe_name}_Design_Documentation.docx",
    )


@router.post("")
async def run_docs(req: PhaseRequest, user=Depends(get_current_user)):
    db = get_supabase()

    project = get_project_for_user(db, req.project_id, user["id"])

    personas = db.table("personas").select("*").eq("project_id", req.project_id).execute().data or []

    # Rich screens from phase 2
    screens_agent = (
        db.table("agent_runs")
        .select("output_json")
        .eq("project_id", req.project_id)
        .eq("phase", 2)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .execute()
    )
    screens_rich = []
    for row in (screens_agent.data or []):
        sr = row.get("output_json", {}).get("screens_rich")
        if sr:
            screens_rich = sr
            break

    if not screens_rich:
        raise HTTPException(400, "Run Phase 02 screens first")

    # Audit context from phase 4
    audit_agent = (
        db.table("agent_runs")
        .select("output_json")
        .eq("project_id", req.project_id)
        .eq("phase", 4)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .execute()
    )
    audit_rich = []
    for row in (audit_agent.data or []):
        ar = row.get("output_json", {}).get("audit_rich")
        if ar:
            audit_rich = ar
            break

    # Copy context from phase 5
    copy_agent = (
        db.table("agent_runs")
        .select("output_json")
        .eq("project_id", req.project_id)
        .eq("phase", 5)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .execute()
    )
    copy_rich = []
    for row in (copy_agent.data or []):
        cr = row.get("output_json", {}).get("copy_rich")
        if cr:
            copy_rich = cr
            break

    # ── Return cached result ──────────────────────────────────────────────────
    if not req.re_run:
        cached = (
            db.table("agent_runs")
            .select("output_json")
            .eq("project_id", req.project_id)
            .eq("phase", 6)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .execute()
        )
        for row in (cached.data or []):
            rich = row.get("output_json", {}).get("persona_docs")
            if rich:
                return {"persona_docs": rich, "cached": True}

    run = db.table("agent_runs").insert({
        "project_id": req.project_id,
        "phase": 6,
        "status": "running",
        "input_json": {"step": "docs"},
    }).execute()
    run_id = run.data[0]["id"]

    try:
        all_screens = [s for mod in screens_rich for s in mod.get("screens", [])]
        persona_names = [p["name"] for p in personas]

        screens_summary = "\n".join(
            f"- [{s.get('type')}] {s['name']}: {s.get('purpose', '')} "
            f"| personas: {', '.join(s.get('personaNames', []))} "
            f"| components: {', '.join(s.get('componentHints', []))} "
            f"| states: {', '.join(s.get('states', []))} "
            f"| complexity: {s.get('complexity', 'Medium')}"
            for s in all_screens
        )

        audit_summary = ""
        if audit_rich:
            audit_summary = "\n".join(
                f"- {sa['name']}: score={sa.get('score', 70)}, "
                f"issues={sum(len(c.get('issues', [])) for c in sa.get('categories', []))}"
                for sa in audit_rich[:5]
            )

        copy_summary = ""
        if copy_rich:
            copy_summary = "\n".join(
                f"- {cr['name']}: {len(cr.get('items', []))} copy items"
                for cr in copy_rich[:5]
            )

        system = (
            "You are a senior business analyst producing a comprehensive design handoff document. "
            "Be precise, structured, and thorough — this document is used by developers to build the product. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        user = f"""Generate a complete BA design documentation for project '{project['name']}'.

PERSONAS: {', '.join(persona_names)}

SCREENS:
{screens_summary}

{"AUDIT SUMMARY:" + chr(10) + audit_summary if audit_summary else ""}

{"COPY REVIEW SUMMARY:" + chr(10) + copy_summary if copy_summary else ""}

PROJECT CONTEXT: {project.get('description') or project['name']}

Return a JSON object with this EXACT structure:
{{
  "persona_docs": [
    {{
      "id": "string — stable short id like 'pd-1'",
      "name": "string — persona name matching PERSONAS list",
      "role": "string — persona role",
      "initial": "string — 2-letter initials (e.g. 'SC')",
      "context": "string — 1-2 sentence description of this persona's usage context",
      "goals": ["string — 2-3 primary goals for this persona"],
      "modules": [
        {{
          "id": "string — stable short id like 'md-1'",
          "name": "string — functional module name (e.g. 'Dashboard & Analytics')",
          "purpose": "string — 1 sentence module purpose",
          "flows": ["string — key navigation flows: 'Screen A → Screen B when condition'"],
          "screens": [
            {{
              "id": "string — stable short id like 'sd-1'",
              "name": "string — must match a screen name from SCREENS list",
              "screenType": "string — screen archetype (e.g. 'List / Data Table', 'Multi-step Form')",
              "personas": ["string — persona names who use this screen"],
              "completeness": 85,
              "purpose": "string — what this screen does and why it exists",
              "elements": [
                {{
                  "name": "string — UI element name",
                  "elType": "string — component type (e.g. 'Primary Button', 'Data Table', 'Text Input')",
                  "function": "string — what this element does",
                  "conditions": "string — when/how it appears or is enabled (optional)"
                }}
              ],
              "interactions": [
                {{
                  "trigger": "string — user action",
                  "result": "string — system response",
                  "navigation": "string — navigation outcome or 'No navigation'"
                }}
              ],
              "states": [
                {{
                  "state": "string — state name (Default, Loading, Empty, Error, Success, etc.)",
                  "description": "string — what the screen shows in this state"
                }}
              ],
              "validation": [
                {{
                  "field": "string — field name",
                  "required": true,
                  "format": "string — expected format",
                  "constraints": "string — validation constraints",
                  "errorBehavior": "string — error message shown"
                }}
              ],
              "navigation": {{
                "entry": ["string — how users arrive at this screen"],
                "exit": ["string — where users go from this screen"],
                "conditional": ["string — conditional navigation paths (optional)"]
              }},
              "edgeCases": ["string — error conditions, boundary inputs, unusual paths"],
              "copyRefs": [
                {{
                  "text": "string — the actual UI copy",
                  "kind": "static" | "dynamic",
                  "purpose": "string — what this copy does"
                }}
              ],
              "dependencies": ["string — API endpoints, auth requirements, external services"],
              "flags": ["string — quality flags: missing docs, incomplete specs (optional)"]
            }}
          ]
        }}
      ]
    }}
  ]
}}

Rules:
- One PersonaDoc per persona in the PERSONAS list
- Group screens into logical modules (2-4 modules per persona, 2-4 screens per module)
- Each screen must map to a screen from the SCREENS list above
- Share shared screens (appear for multiple personas) under the most relevant persona
- elements: 3-5 per screen
- interactions: 3-5 per screen
- states: 3-5 per screen (always include Default, Loading, Empty/Error)
- validation: include only for forms; omit for display-only screens
- edgeCases: 2-4 realistic cases per screen
- copyRefs: 2-4 key copy pieces per screen
- dependencies: 2-4 per screen (API endpoints, auth, services)
- completeness: 60-95 integer; be honest (flag gaps as "flags")
- flags: add when validation rules are missing, edge cases absent, or states incomplete
"""

        result = await chat_json(system, user)
        persona_docs_raw = result.get("persona_docs", [])

        if not persona_docs_raw:
            raise ValueError("OpenAI returned no persona docs")

        # Enrich with stable IDs
        persona_docs = []
        for p_idx, p in enumerate(persona_docs_raw):
            p_id = f"pd-{str(uuid_lib.uuid4())[:8]}"
            modules = []
            for m_idx, m in enumerate(p.get("modules", [])):
                m_id = f"md-{str(uuid_lib.uuid4())[:8]}"
                screens = []
                for s_idx, s in enumerate(m.get("screens", [])):
                    s_id = f"sd-{str(uuid_lib.uuid4())[:8]}"
                    screens.append({
                        "id": s_id,
                        "name": s.get("name", "Unnamed Screen"),
                        "screenType": s.get("screenType", "Screen"),
                        "personas": s.get("personas", []),
                        "completeness": max(0, min(100, int(s.get("completeness", 70)))),
                        "purpose": s.get("purpose", ""),
                        "elements": s.get("elements", []),
                        "interactions": s.get("interactions", []),
                        "states": s.get("states", []),
                        "validation": s.get("validation") or None,
                        "navigation": s.get("navigation", {"entry": [], "exit": []}),
                        "edgeCases": s.get("edgeCases", []),
                        "copyRefs": s.get("copyRefs", []),
                        "dependencies": s.get("dependencies", []),
                        "flags": s.get("flags") or None,
                    })
                modules.append({
                    "id": m_id,
                    "name": m.get("name", "Unnamed Module"),
                    "purpose": m.get("purpose", ""),
                    "flows": m.get("flows", []),
                    "screens": screens,
                })
            persona_docs.append({
                "id": p_id,
                "name": p.get("name", "Unnamed Persona"),
                "role": p.get("role", ""),
                "initial": (p.get("initial") or p.get("name", "??")[:2]).upper(),
                "context": p.get("context", ""),
                "goals": p.get("goals", []),
                "modules": modules,
            })

        db.table("projects").update({"current_phase": 7, "status": "completed"}).eq("id", req.project_id).execute()

        screen_count = sum(len(m["screens"]) for p in persona_docs for m in p["modules"])

        db.table("agent_runs").update({
            "status": "completed",
            "output_json": {
                "persona_docs": persona_docs,
                "persona_count": len(persona_docs),
                "screen_count": screen_count,
            },
        }).eq("id", run_id).execute()

        return {"persona_docs": persona_docs, "cached": False}

    except Exception as e:
        db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise HTTPException(500, str(e))
