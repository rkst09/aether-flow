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
async def run_personas(req: PhaseRequest):
    db = get_supabase()

    # ── Fetch project ─────────────────────────────────────────────────────────
    res = db.table("projects").select("*").eq("id", req.project_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Project not found")
    project = res.data

    # ── Return cached result if available ────────────────────────────────────
    if not req.re_run:
        cached_run = (
            db.table("agent_runs")
            .select("output_json")
            .eq("project_id", req.project_id)
            .eq("phase", 1)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if cached_run.data:
            rich = cached_run.data[0].get("output_json", {}).get("personas_rich")
            if rich:
                return {"personas_rich": rich, "cached": True}

    # ── Log run ───────────────────────────────────────────────────────────────
    run = db.table("agent_runs").insert({
        "project_id": req.project_id,
        "phase": 1,
        "status": "running",
        "input_json": {"step": "personas"},
    }).execute()
    run_id = run.data[0]["id"]

    try:
        # ── Extract PRD text ──────────────────────────────────────────────────
        prd_text = ""
        if project.get("prd_url") and project.get("prd_filename"):
            prd_text = fetch_prd_text(project["prd_url"], project["prd_filename"])

        context = (
            f"Project: {project['name']}\n"
            f"Description: {project.get('description') or 'N/A'}\n"
            f"Industry: {project.get('domain') or 'N/A'}\n"
            f"Product Type: {project.get('product_type') or 'N/A'}\n"
            f"Market: {project.get('market') or 'N/A'}\n"
        )

        system = (
            "You are a principal UX researcher and product strategist at a top-tier design consultancy. "
            "You analyse product requirement documents and extract deep, research-backed user personas. "
            "Your personas are used directly by design teams — they must be specific, grounded in evidence, "
            "and immediately actionable. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        user = f"""Analyse this PRD and project context. Extract 3 to 5 distinct user personas.

PROJECT CONTEXT:
{context}

PRD TEXT:
{prd_text[:14000]}

Return a JSON object with this EXACT structure — every field is required:
{{
  "personas": [
    {{
      "name": "string — a human name that reflects the archetype (e.g. 'Sarah Chen')",
      "tag": "Primary" | "Secondary" | "Edge" | "Admin",
      "archetype": "string — a 3-5 word archetype label (e.g. 'The Empowered Manager')",
      "confidence": integer 40–99,
      "identity": {{
        "role": "string — specific job title and responsibilities",
        "context": "string — how and where they use this product in their daily workflow",
        "accessLevel": "Full" | "Limited" | "Delegated" | "Admin",
        "device": "Desktop" | "Mobile" | "Hybrid"
      }},
      "goals": {{
        "primary": ["string — 3 items — concrete, measurable outcomes they need"],
        "secondary": ["string — 2 items — nice-to-have outcomes"],
        "emotional": ["string — 2 items — how they want to FEEL using this product"]
      }},
      "painPoints": {{
        "functional": ["string — 3 items — specific workflow blockers they face today"],
        "emotional": ["string — 2 items — frustrations and anxieties they experience"],
        "systemGaps": ["string — 2 items — missing features or capabilities they need"]
      }},
      "behavior": {{
        "frequency": "string — e.g. 'Daily (5-7x per week)'",
        "techProficiency": "Beginner" | "Moderate" | "Advanced" | "Expert",
        "decisionStyle": "string — e.g. 'Data-driven, collaborative'",
        "triggers": ["string — 2-3 items — specific events that bring them to the product"]
      }},
      "psychographics": {{
        "traits": ["string — 3-4 personality traits"],
        "riskTolerance": "string — one sentence describing their risk appetite",
        "trustFactors": ["string — 2-3 items — what builds trust with this persona"],
        "values": ["string — 3 items — core values that drive decisions"]
      }},
      "journey": {{
        "entryPoint": "string — how they first discover or access the product",
        "keyActions": ["string — 3-4 items — critical tasks they perform"],
        "dropOffRisks": ["string — 2-3 items — what would cause them to churn or disengage"],
        "successDefinition": "string — one sentence defining what success looks like for them"
      }},
      "businessValue": {{
        "revenueImpact": "string — High | Medium | Low with brief justification",
        "retentionImportance": "string — Critical | High | Medium | Low with brief justification",
        "priorityScore": integer 1–100
      }},
      "missingData": ["string — data gaps that reduce confidence, empty array if none"],
      "aiRecommendations": ["string — 1-2 actionable design recommendations for this persona"]
    }}
  ]
}}

Grounding rules:
- Every persona must be directly evidenced by the PRD text or project context
- confidence >= 80: strong evidence in PRD; 60-79: implied; 40-59: inferred from domain
- tag "Primary" for personas central to the core use case; max 2 Primary personas
- missingData must reflect ACTUAL gaps in the PRD, not generic statements
- aiRecommendations must be specific to this product, not generic UX advice
"""

        result = await chat_json(system, user)
        raw_personas = result.get("personas", [])

        if not raw_personas:
            raise ValueError("OpenAI returned no personas")

        # ── Delete old personas ───────────────────────────────────────────────
        db.table("personas").delete().eq("project_id", req.project_id).execute()

        # ── Save to personas table + enrich with db_id ────────────────────────
        personas_rich = []
        for p in raw_personas:
            row = db.table("personas").insert({
                "project_id": req.project_id,
                "name": p.get("name", "Unnamed"),
                "role": p.get("identity", {}).get("role", ""),
                "goals": p.get("goals", {}).get("primary", []),
                "pain_points": p.get("painPoints", {}).get("functional", []),
                "confidence_score": p.get("confidence", 75),
            }).execute()
            db_id = row.data[0]["id"]
            personas_rich.append({"db_id": db_id, **p})

        # ── Save rich data to agent_runs ──────────────────────────────────────
        db.table("agent_runs").update({
            "status": "completed",
            "output_json": {
                "personas_rich": personas_rich,
                "persona_count": len(personas_rich),
            },
        }).eq("id", run_id).execute()

        return {"personas_rich": personas_rich, "cached": False}

    except Exception as e:
        db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise HTTPException(500, str(e))


@router.post("/save")
async def save_personas(req: dict):
    """Persist designer edits back to Supabase after review."""
    db = get_supabase()
    project_id = req.get("project_id")
    personas_rich = req.get("personas_rich", [])

    if not project_id or not personas_rich:
        raise HTTPException(400, "project_id and personas_rich required")

    for p in personas_rich:
        db_id = p.get("db_id")
        if not db_id:
            continue
        db.table("personas").update({
            "name": p.get("name"),
            "role": p.get("identity", {}).get("role", ""),
            "goals": p.get("goals", {}).get("primary", []),
            "pain_points": p.get("painPoints", {}).get("functional", []),
            "confidence_score": p.get("confidence", 75),
        }).eq("id", db_id).execute()

    # Update cached agent_run with edited data
    cached_run = (
        db.table("agent_runs")
        .select("id")
        .eq("project_id", project_id)
        .eq("phase", 1)
        .eq("status", "completed")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if cached_run.data:
        db.table("agent_runs").update({
            "output_json": {
                "personas_rich": personas_rich,
                "persona_count": len(personas_rich),
            }
        }).eq("id", cached_run.data[0]["id"]).execute()

    return {"saved": True}
