"""
Phase 05 — UX Copy Review
Accepts multipart/form-data with screen images from Phase 04.
Uses GPT-4o Vision + Phase 01 context (personas, PRD) + Phase 04 audit findings.
"""
import uuid as uuid_lib
import base64
import io
from typing import Optional, List

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from database import get_supabase
from services.openai_client import chat_vision, chat_json

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _file_to_block(file: UploadFile) -> dict:
    raw = await file.read()
    name = (file.filename or "screen").rsplit(".", 1)[0]

    if file.content_type == "application/pdf":
        import pdfplumber
        pages = []
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            for i, page in enumerate(pdf.pages[:10]):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append(f"[Page {i + 1}]\n{text}")
        return {"type": "text", "text": "\n\n".join(pages) or "(no text)", "name": name}

    return {
        "type": "image",
        "media_type": file.content_type or "image/png",
        "data": base64.b64encode(raw).decode("utf-8"),
        "name": name,
    }


def _build_prompt(
    project_name: str,
    project_desc: str,
    screen_names: list[str],
    persona_names: list[str],
    audit_summary: str,
) -> tuple[str, str]:

    screens_label = "\n".join(f"  {i + 1}. {n}" for i, n in enumerate(screen_names))
    personas_str  = ", ".join(persona_names) if persona_names else "End User"

    system = (
        "You are a senior UX copywriter and conversion rate optimization expert. "
        "You review actual text visible in UI screenshots using pro-level copywriting principles. "
        "Every finding must reference a specific element visible in the screen. "
        "Return ONLY valid JSON — no markdown fences, no commentary."
    )

    user = f"""Perform a comprehensive UX copy review for '{project_name}'.

PROJECT CONTEXT: {project_desc or project_name}
PERSONAS: {personas_str}

SCREENS TO REVIEW (one entry per screen):
{screens_label}

{audit_summary}

═══════════════════════════════════════════
10 PRO UX COPYWRITING PRINCIPLES — APPLY ALL
═══════════════════════════════════════════

1. CLARITY > CLEVERNESS
   Users reward understanding, not creativity.
   Bad: "Experience the future of intelligent workflows"
   Good: "Automate your daily tasks in minutes — no coding needed"
   Rule: If a 12-year-old can't understand it in 3 seconds, rewrite it.

2. OUTCOME-DRIVEN MESSAGING
   Users don't care about features. They care about results.
   Formula: Feature → Benefit → Outcome
   Bad: "AI-powered automation"
   Good: "Save 10+ hours every week using AI automation"

3. SPECIFICITY BUILDS TRUST
   Vague = low conversion. Specific = high conversion.
   Bad: "Trusted by many users"
   Good: "Trusted by 12,000+ marketers and founders"

4. REDUCE COGNITIVE LOAD
   Every extra word = friction. Think: "Scan, not read."
   Use short sentences, bullets over paragraphs, chunked content.

5. MICROCOPY REMOVES FEAR
   Small text near actions handles objections at the decision moment.
   Examples: "No credit card required" · "Takes less than 2 minutes" · "Cancel anytime"

6. STRONG CTA PSYCHOLOGY
   CTA formula: Action + Benefit + Ownership
   Weak: "Submit"
   Strong: "Get My Free Audit"

7. OBJECTION HANDLING IN COPY
   Answer doubts BEFORE the user thinks them.
   Examples: "No coding needed" · "Works with your existing tools" · "Setup in under 5 minutes"

8. VISUAL + COPY ALIGNMENT
   Copy must match what the user sees.
   Dashboard image → copy talks about control.
   Results image → copy talks about outcomes.
   Mismatch = confusion.

9. FIRST 5 SECONDS RULE (Hero Section)
   User must instantly understand: What is this? / Who is it for? / What do I get?
   If not → bounce.

10. EMOTION + LOGIC COMBO
    People feel → then justify. Use both.
    Example: "Stop wasting hours on manual work. Automate everything in one click."

═══════════════════════════
SECTION-BY-SECTION REVIEW
═══════════════════════════

For each screen evaluate all visible sections:

HERO SECTION: headline clarity, value proposition, CTA, supporting microcopy
FEATURES SECTION: outcome-driven descriptions, benefit clarity, scan-ability
TRUST SECTION: testimonials, social proof, specificity, credibility signals
CTA SECTION: action-orientation, urgency, friction reducers
FORMS: field labels, placeholders, helper text, error messages
NAVIGATION: label clarity, hierarchy, scannability
SUCCESS/ERROR STATES: human language, next-step guidance

SEVERITY:
  High   = blocks task completion (user can't proceed without guessing)
  Medium = causes hesitation, confusion, or drop-off
  Low    = polish — tone inconsistency, missed opportunity

PERSONA ALIGNMENT:
  Match copy tone and vocabulary to the specific persona.
  Technical persona → precise language. Consumer → warm, plain language.

═══════════════════════════════
OUTPUT FORMAT
═══════════════════════════════

Return exactly this JSON — one entry per screen:
{{
  "screen_copy_reviews": [
    {{
      "name": "<screen name matching the list above>",
      "persona": "<most relevant persona from: {personas_str}>",
      "items": [
        {{
          "copyType": "cta" | "error" | "empty" | "instructional" | "form" | "navigation" | "success",
          "original": "<the actual copy visible in the screen — or realistic default a developer would write>",
          "issue": "<1 sentence: what is wrong and why it hurts the user>",
          "issueType": "clarity" | "generic" | "guidance" | "tone" | "cognitive",
          "severity": "High" | "Medium" | "Low",
          "suggested": "<ready-to-use replacement copy — specific, clear, action-oriented>",
          "persona": "<which persona this copy most affects>"
        }}
      ]
    }}
  ]
}}

CopyType definitions:
  cta           — button labels, primary action links
  error         — error messages, validation feedback, failure states
  empty         — empty state headings and descriptions
  instructional — helper text, tooltips, onboarding hints, step descriptions
  form          — field labels, placeholder text, form helpers, hints
  navigation    — menu items, breadcrumbs, page titles, tab labels
  success       — confirmation messages, success toasts, completion states

IssueType definitions:
  clarity   — ambiguous or confusing wording
  generic   — placeholder text ("Click here", "Submit", "Error occurred")
  guidance  — user doesn't know what to do next
  tone      — doesn't match the persona's language / formality level
  cognitive — too much text, jargon, or overwhelming information

Rules:
  - ONE review entry per screen (all {len(screen_names)} screens)
  - 3–5 items per screen covering different copyTypes
  - "original" must be SPECIFIC to what is visible in the screenshot
  - "suggested" must be ready to use — not a description of what to write
  - High severity = task blocker; never use High for cosmetic polish
"""

    return system, user


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("")
async def run_copy_review(
    project_id: str = Form(""),
    re_run: bool = Form(False),
    screens: List[UploadFile] = File(default=[]),
):
    db = get_supabase()

    # ── Load project + Phase 01 context ───────────────────────────────────────
    project = None
    persona_names: list[str] = []
    project_desc = ""

    if project_id:
        res = db.table("projects").select("*").eq("id", project_id).single().execute()
        if res.data:
            project = res.data
            project_desc = project.get("description") or ""
            persona_rows = db.table("personas").select("name").eq("project_id", project_id).execute().data or []
            persona_names = [p["name"] for p in persona_rows]

    project_name = project["name"] if project else "UX Copy Review"

    # ── Load Phase 04 audit findings as context ────────────────────────────────
    audit_summary = ""
    if project_id:
        audit_runs = (
            db.table("agent_runs")
            .select("output_json")
            .eq("project_id", project_id)
            .eq("phase", 4)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        for row in (audit_runs.data or []):
            audit_rich = row.get("output_json", {}).get("audit_rich", [])
            if audit_rich:
                lines = ["PHASE 04 AUDIT CONTEXT (use to inform copy issues):"]
                for s in audit_rich[:5]:  # limit context size
                    high_issues = [
                        i["title"] for c in s.get("categories", [])
                        for i in c.get("issues", []) if i.get("severity") == "High"
                    ]
                    if high_issues:
                        lines.append(f"  {s['name']}: {', '.join(high_issues[:3])}")
                if len(lines) > 1:
                    audit_summary = "\n".join(lines)
                break

    # ── Validate ───────────────────────────────────────────────────────────────
    if not screens:
        raise HTTPException(400, "Upload at least one screen image to run the copy review.")

    # ── Log run ────────────────────────────────────────────────────────────────
    run_id: str | None = None
    if project_id and project:
        run = db.table("agent_runs").insert({
            "project_id": project_id,
            "phase": 5,
            "status": "running",
            "input_json": {"step": "copy_review", "screen_count": len(screens)},
        }).execute()
        run_id = run.data[0]["id"]

    try:
        # ── Process uploads ────────────────────────────────────────────────────
        blocks = [await _file_to_block(f) for f in screens]
        images    = [b for b in blocks if b["type"] == "image"]
        pdf_texts = [b for b in blocks if b["type"] == "text"]
        screen_names = [b["name"] for b in blocks]

        system_prompt, user_prompt = _build_prompt(
            project_name, project_desc, screen_names, persona_names, audit_summary
        )

        if pdf_texts:
            user_prompt += "\n\n" + "\n\n".join(
                f"SCREEN '{b['name']}' (PDF text):\n{b['text']}" for b in pdf_texts
            )

        # ── Call AI ────────────────────────────────────────────────────────────
        if images:
            result = await chat_vision(system_prompt, user_prompt, images)
        else:
            result = await chat_json(system_prompt, user_prompt)

        reviews_data = result.get("screen_copy_reviews", [])
        if not reviews_data:
            raise ValueError("AI returned no copy reviews — check your API key and model access.")

        # ── Normalise ──────────────────────────────────────────────────────────
        copy_rich = []
        for screen in reviews_data:
            items = [
                {
                    "id":        f"ci-{str(uuid_lib.uuid4())[:8]}",
                    "copyType":  item.get("copyType",  "cta"),
                    "original":  item.get("original",  ""),
                    "issue":     item.get("issue",     ""),
                    "issueType": item.get("issueType", "clarity"),
                    "severity":  item.get("severity",  "Medium"),
                    "suggested": item.get("suggested", ""),
                    "persona":   item.get("persona",   persona_names[0] if persona_names else "User"),
                }
                for item in screen.get("items", [])
            ]
            copy_rich.append({
                "id":      f"cr-{str(uuid_lib.uuid4())[:8]}",
                "name":    screen.get("name", "Screen"),
                "persona": screen.get("persona", persona_names[0] if persona_names else "User"),
                "items":   items,
            })

        # ── Persist ────────────────────────────────────────────────────────────
        if project_id and project and run_id:
            db.table("projects").update({"current_phase": 6}).eq("id", project_id).execute()
            db.table("agent_runs").update({
                "status": "completed",
                "output_json": {
                    "copy_rich":    copy_rich,
                    "screen_count": len(copy_rich),
                    "item_count":   sum(len(s["items"]) for s in copy_rich),
                },
            }).eq("id", run_id).execute()

        return {"copy_rich": copy_rich, "cached": False}

    except Exception as e:
        if project_id and run_id:
            try:
                db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
            except Exception:
                pass
        raise HTTPException(500, str(e))
