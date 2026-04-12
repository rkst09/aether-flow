import uuid as uuid_lib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_supabase
from services.openai_client import chat_json

router = APIRouter()


class PhaseRequest(BaseModel):
    project_id: str
    re_run: bool = False


@router.post("")
async def run_prompts(req: PhaseRequest):
    db = get_supabase()

    res = db.table("projects").select("*").eq("id", req.project_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Project not found")
    project = res.data

    personas = db.table("personas").select("*").eq("project_id", req.project_id).execute().data or []

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

    # ── Return cached result ──────────────────────────────────────────────────
    if not req.re_run:
        cached = (
            db.table("agent_runs")
            .select("output_json")
            .eq("project_id", req.project_id)
            .eq("phase", 3)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .execute()
        )
        for row in (cached.data or []):
            rich = row.get("output_json", {}).get("prompts_rich")
            sys_prompt = row.get("output_json", {}).get("system_prompt")
            if rich and sys_prompt:
                return {"prompts_rich": rich, "system_prompt": sys_prompt, "cached": True}

    run = db.table("agent_runs").insert({
        "project_id": req.project_id,
        "phase": 3,
        "status": "running",
        "input_json": {"step": "prompts"},
    }).execute()
    run_id = run.data[0]["id"]

    try:
        all_screens = []
        persona_screens: dict = {}
        for mod in screens_rich:
            for s in mod.get("screens", []):
                all_screens.append(s)
                for pname in s.get("personaNames", []):
                    persona_screens.setdefault(pname, []).append(s)

        screens_summary = "\n".join(
            f"  - [{s.get('type')}] {s['name']}: {s.get('purpose', '')} | "
            f"components: {', '.join(s.get('componentHints', []))} | "
            f"states: {', '.join(s.get('states', []))}"
            for s in all_screens
        )

        persona_list = "\n".join(
            f"  - {p['name']} ({p['role'] or 'User'}): goals={p['goals']}, pain_points={p['pain_points']}"
            for p in personas
        )

        # ── Step 1: Per-persona prompts ───────────────────────────────────────
        system = (
            "You are an expert Lovable.dev prompt engineer and senior UX designer. "
            "You write precise, copy-paste-ready prototype prompts grouped by persona. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        user = f"""Generate Lovable-ready prototype prompts for project '{project['name']}', one per persona.

PERSONAS:
{persona_list}

ALL SCREENS (grouped in modules):
{screens_summary}

Return a JSON object with this EXACT structure:
{{
  "persona_prompts": [
    {{
      "personaName": "string — must match a persona name exactly",
      "tag": "Primary" | "Secondary" | "Edge",
      "quality": integer 60–100 (reflect completeness and specificity of the prompt),
      "screensCount": integer — how many screens this persona uses,
      "sections": [
        {{
          "id": "context",
          "title": "Context & Goal",
          "content": "string — 3–5 sentences: who this persona is, their primary goal, and what this prototype must prove",
          "hint": "string — tip for improving this section"
        }},
        {{
          "id": "screens",
          "title": "Screens to Build",
          "content": "string — bulleted list of screens for this persona with brief purpose per screen",
          "hint": "string — tip about screen completeness"
        }},
        {{
          "id": "interactions",
          "title": "Key Interactions",
          "content": "string — bulleted list of 5–8 specific user actions and expected system responses",
          "hint": "string — tip about interaction depth"
        }},
        {{
          "id": "components",
          "title": "Component Requirements",
          "content": "string — bulleted list: component name → where it is used, using shadcn/ui names",
          "hint": "string — tip about component selection"
        }},
        {{
          "id": "constraints",
          "title": "Design Constraints",
          "content": "string — bulleted list: layout rules, empty states, loading states, error handling, responsive breakpoints",
          "hint": "string — tip about constraint coverage"
        }}
      ]
    }}
  ]
}}

Rules:
- One entry per persona — do NOT duplicate personas
- All 5 sections are required for every persona
- content must be copy-paste ready — specific, imperative, no placeholders
- quality should reflect how complete and production-ready the prompt is
- screensCount must match the actual number of screens that persona uses
- personaName must match exactly: {', '.join(p['name'] for p in personas)}
"""

        result = await chat_json(system, user)
        prompts_data = result.get("persona_prompts", [])

        if not prompts_data:
            raise ValueError("OpenAI returned no persona prompts")

        prompts_rich = []
        for pp in prompts_data:
            prompt_id = f"pp-{str(uuid_lib.uuid4())[:8]}"
            pname = pp.get("personaName", "Unknown")
            persona_obj = next((p for p in personas if p["name"] == pname), None)
            role = persona_obj.get("role", "User") if persona_obj else "User"
            initials = "".join(w[0] for w in pname.split())[:2].upper()

            prompts_rich.append({
                "id": prompt_id,
                "name": pname,
                "role": role,
                "tag": pp.get("tag", "Primary"),
                "status": "generated",
                "initial": initials,
                "quality": max(0, min(100, int(pp.get("quality", 75)))),
                "screensCount": int(pp.get("screensCount", 0)),
                "sections": [
                    {
                        "id": s.get("id", f"s{i}"),
                        "title": s.get("title", "Section"),
                        "content": s.get("content", ""),
                        "hint": s.get("hint", ""),
                    }
                    for i, s in enumerate(pp.get("sections", []))
                ],
            })

        # ── Step 2: Unified system prompt synthesis (Master Template) ───────────
        platform = project.get("platform", "Web App")
        is_web = "mobile" not in platform.lower()
        platform_rules = (
            "Multi-column layouts allowed. Sidebar navigation. Dense data views. Hover states required."
            if is_web else
            "Bottom navigation / tab bar. Single-column flows. Thumb-friendly actions. Reduced cognitive load per screen."
        )

        persona_prompts_text = ""
        for pp in prompts_rich:
            persona_prompts_text += f"\n### {pp['name']} ({pp['role']})\n"
            for s in pp["sections"]:
                persona_prompts_text += f"**{s['title']}**\n{s['content']}\n\n"

        synthesis_system = (
            "You are a principal product architect and elite Lovable.dev prompt engineer. "
            "You generate complete, production-ready product system prompts that cover every screen "
            "with full detail: purpose, persona mapping, UI structure, interactions, all states, "
            "edge cases, and permissions. "
            "You NEVER summarize. You NEVER skip screens. "
            "Return ONLY valid JSON — no markdown fences, no commentary."
        )

        synthesis_user = f"""You are generating a COMPLETE, PRODUCTION-READY PRODUCT SYSTEM PROMPT for '{project['name']}'.

⚠️ CRITICAL RULES:
- Cover ALL {len(all_screens)} derived screens — do NOT skip or summarize any screen
- For EVERY screen include: purpose, persona mapping, UI structure, interactions, states (default/loading/empty/error/success), edge cases, permissions
- Maintain persona-aware behavior throughout
- Platform: {platform} — {platform_rules}

PERSONAS (MERGED INTELLIGENCE):
{persona_prompts_text}

ALL SCREENS ({len(all_screens)} screens across {len(screens_rich)} modules):
{screens_summary}

Return a JSON object with this EXACT structure. Each section content must be exhaustive — cover every screen fully:
{{
  "system_prompt": {{
    "quality": integer 60-100 (reflect completeness — penalise if any screen is skipped),
    "totalScreens": {len(all_screens)},
    "platform": "{platform}",
    "sections": [
      {{
        "id": "platform_context",
        "title": "Platform & Stack",
        "content": "string — Platform: {platform}. Stack: React + TypeScript + Tailwind CSS + shadcn/ui. {platform_rules} Include: navigation pattern, layout grid, breakpoints, interaction model."
      }},
      {{
        "id": "product_context",
        "title": "Product Goal & Persona Intelligence",
        "content": "string — Product goal (from PRD). Then for each persona: Role | Goal | Access Level | Behavioral traits | Key screens they own."
      }},
      {{
        "id": "system_architecture",
        "title": "System Architecture & Navigation",
        "content": "string — Full module map with screen counts. Navigation structure (sidebar / bottom nav). Entry points per persona. Flow continuity map."
      }},
      {{
        "id": "module_onboarding",
        "title": "Module — Onboarding & Setup",
        "content": "string — For EVERY onboarding screen derived above: SCREEN NAME → Purpose → Persona → UI Structure (header, sections, components) → Interactions → States (default, loading, empty, error, success) → Edge Cases (upload failure, invalid file, no input) → Permissions. Do NOT summarize."
      }},
      {{
        "id": "module_dashboard",
        "title": "Module — Dashboard",
        "content": "string — For EVERY dashboard screen: SCREEN NAME → Purpose → Persona-adaptive behavior → UI Structure → Interactions → States (loading skeleton, empty state with CTA, error recovery, partial data) → Edge Cases → Permissions."
      }},
      {{
        "id": "module_core_workflow",
        "title": "Module — Core Workflow",
        "content": "string — The deepest module. Cover ALL core workflow screens across ALL screen groups derived above. For EVERY screen: SCREEN NAME → Purpose → Persona → UI Structure → Interactions → States → Edge Cases → Permissions. Include: persona selection, journey mapping, screen derivation, prototype generation screens."
      }},
      {{
        "id": "module_collaboration",
        "title": "Module — Collaboration & Team",
        "content": "string — For EVERY collaboration screen: SCREEN NAME → Purpose → Persona → UI → Interactions → States → Edge Cases → Permissions. Include: invite flow, role assignment, comments/feedback, activity log."
      }},
      {{
        "id": "module_audit_copy",
        "title": "Module — UX Audit & Copy Review",
        "content": "string — For EVERY audit/copy screen: SCREEN NAME → Purpose → Persona → UI → Interactions → States → Edge Cases → Permissions. Include: upload interface, processing state, results dashboard, inline copy suggestions, tone improvement."
      }},
      {{
        "id": "module_export",
        "title": "Module — Export & Documentation",
        "content": "string — For EVERY export screen: SCREEN NAME → Purpose → Persona → UI → Interactions → States (generating, ready, error) → Edge Cases → Permissions. Include: export options, doc preview, BA-ready document, download states."
      }},
      {{
        "id": "system_logic",
        "title": "System Logic & Conditional Rendering",
        "content": "string — Role-based UI differences per persona. Conditional rendering rules (what changes dynamically). Flow continuity (how each screen connects to next). Permission matrix (who sees what)."
      }},
      {{
        "id": "design_system",
        "title": "Design System Rules",
        "content": "string — Spacing system (8px base grid). Typography hierarchy (sizes, weights, line heights). Reusable component list with usage context. Accessibility: contrast ratios, ARIA roles, keyboard navigation, focus states."
      }},
      {{
        "id": "interaction_quality",
        "title": "Interaction Quality & Micro-interactions",
        "content": "string — Micro-interaction list per action type. Hover/tap feedback patterns. Transition specs (duration, easing). Loading feedback loops. Error recovery patterns. Success confirmation patterns."
      }}
    ],
    "personaInfluences": [
      {{
        "name": "string — persona name (must match exactly)",
        "role": "string — persona role",
        "tag": "Primary" | "Secondary" | "Edge",
        "initial": "string — 2-letter initials uppercase",
        "keyGoal": "string — 1 sentence primary goal in this system",
        "behaviorTag": "string — one of: Decision Maker, Operator, Executor, Reviewer, Observer",
        "contributions": ["string — 2-3 specific screens, features, or logic patterns this persona introduced"]
      }}
    ]
  }}
}}

MANDATORY RULES:
- ALL {len(all_screens)} screens must appear across the module sections — coverage is graded
- Every screen must have: purpose + persona mapping + UI structure + interactions + all 5 states + edge cases + permissions
- Do NOT write 'See above' or 'Similar to X' — each screen must be self-contained
- personaInfluences must include every persona: {', '.join(p['name'] for p in personas)}
- behaviorTag must be exactly one of: Decision Maker, Operator, Executor, Reviewer, Observer
- Contributions must be concrete (e.g. 'Introduced role-based dashboard visibility', not 'Added features')
"""

        synthesis_result = await chat_json(synthesis_system, synthesis_user)
        system_prompt_raw = synthesis_result.get("system_prompt", {})

        system_prompt = {
            "quality": max(0, min(100, int(system_prompt_raw.get("quality", 80)))),
            "totalScreens": int(system_prompt_raw.get("totalScreens", len(all_screens))),
            "platform": system_prompt_raw.get("platform", platform),
            "sections": [
                {
                    "id": s.get("id", f"s{i}"),
                    "title": s.get("title", "Section"),
                    "content": s.get("content", ""),
                }
                for i, s in enumerate(system_prompt_raw.get("sections", []))
            ],
            "personaInfluences": [
                {
                    "name": pi.get("name", ""),
                    "role": pi.get("role", ""),
                    "tag": pi.get("tag", "Primary"),
                    "initial": pi.get("initial", ""),
                    "keyGoal": pi.get("keyGoal", ""),
                    "behaviorTag": pi.get("behaviorTag", "Operator"),
                    "contributions": pi.get("contributions", []),
                }
                for pi in system_prompt_raw.get("personaInfluences", [])
            ],
        }

        db.table("projects").update({"current_phase": 4}).eq("id", req.project_id).execute()

        db.table("agent_runs").update({
            "status": "completed",
            "output_json": {
                "prompts_rich": prompts_rich,
                "system_prompt": system_prompt,
                "prompt_count": len(prompts_rich),
            },
        }).eq("id", run_id).execute()

        return {"prompts_rich": prompts_rich, "system_prompt": system_prompt, "cached": False}

    except Exception as e:
        db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
        raise HTTPException(500, str(e))
