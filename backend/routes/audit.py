"""
Phase 04 — UX Audit
Accepts multipart/form-data with real screen images.
Analyzes them via GPT-4o Vision using a structured 7-step audit methodology.
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
    """
    Convert an uploaded file into a block understood by the vision pipeline.
    Images  → {"type": "image", "media_type": ..., "data": <base64>, "name": ...}
    PDFs    → {"type": "text",  "text": <extracted text>,            "name": ...}
    """
    raw = await file.read()
    name = (file.filename or "screen").rsplit(".", 1)[0]  # strip extension

    if file.content_type == "application/pdf":
        import pdfplumber
        pages = []
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            for i, page in enumerate(pdf.pages[:10]):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append(f"[Page {i + 1}]\n{text}")
        return {
            "type": "text",
            "text": "\n\n".join(pages) or "(no readable text found in PDF)",
            "name": name,
        }

    media_type = file.content_type or "image/png"
    return {
        "type": "image",
        "media_type": media_type,
        "data": base64.b64encode(raw).decode("utf-8"),
        "name": name,
    }


async def _fetch_url_content(url: str) -> str:
    """Fetch a URL and extract structured visible content for AI analysis."""
    import httpx
    from html.parser import HTMLParser

    class _Extractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self._skip = False
            self._skip_tags = {"script", "style", "noscript", "svg", "meta", "head"}
            self.chunks: list[str] = []

        def handle_starttag(self, tag, attrs):
            if tag in self._skip_tags:
                self._skip = True

        def handle_endtag(self, tag):
            if tag in self._skip_tags:
                self._skip = False

        def handle_data(self, data):
            if not self._skip:
                t = data.strip()
                if t:
                    self.chunks.append(t)

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; AetherBot/1.0)"})
            html = resp.text
        parser = _Extractor()
        parser.feed(html)
        content = " | ".join(parser.chunks[:300])
        return content[:6000]
    except Exception as e:
        return f"(Could not fetch URL: {e})"


def _build_prompt(project_name: str, screen_names: list[str], context: str | None, persona_names: list[str], url_content: str = "") -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for the audit."""

    screens_label = "\n".join(f"  {i + 1}. {n}" for i, n in enumerate(screen_names))

    context_block = ""
    if context:
        context_block += f"\n\nPRODUCT CONTEXT (provided by user):\n{context}"
    if persona_names:
        context_block += f"\n\nKNOWN USER PERSONAS: {', '.join(persona_names)}"
    if url_content:
        context_block += f"\n\nWEBSITE CONTENT (fetched from provided URL):\n{url_content}"

    system = (
        "You are a senior UX auditor and CRO specialist with deep expertise in:\n"
        "- Nielsen's 10 usability heuristics\n"
        "- Cognitive load theory and progressive disclosure\n"
        "- Conversion Rate Optimization (CRO) — connecting UI problems to business impact\n"
        "- WCAG 2.2 accessibility guidelines\n"
        "- Emotional design, trust psychology, and behavioral triggers\n\n"
        "A professional UX audit is NOT subjective. Every finding must be grounded in "
        "user psychology, behavior patterns, or measurable conversion principles.\n\n"
        "Return ONLY valid JSON — no markdown fences, no commentary outside the JSON."
    )

    user = f"""Perform a comprehensive, structured UX audit for '{project_name}'.

SCREENS TO AUDIT (one audit entry per screen):
{screens_label}{context_block}

═══════════════════════════════════════
AUDIT METHODOLOGY — apply to each screen
═══════════════════════════════════════

STEP 1 — Page Objective
Identify the primary page goal (purchase / sign-up / booking / engagement / information)
and user intent level (cold traffic / warm traffic / hot/retargeting).

STEP 2 — User Journey (5 stages)
Evaluate friction at each stage:
  1. First Impression (0–5 seconds): headline clarity, value proposition, emotional hook
  2. Scanning: visual hierarchy, information scent, F/Z pattern compliance
  3. Engagement: content digestibility, interactive affordances, feature discovery
  4. Decision-Making: trust signals, objection handling, social proof, risk reducers
  5. Conversion: CTA visibility, form friction, confirmation clarity

STEP 3 — Heuristic Evaluation (score each principle 1–10)
  1. Clarity — value proposition understood in 3 seconds? messaging direct?
  2. Visual Hierarchy — CTA visually dominant? attention flow logical?
  3. Cognitive Load — interface overloaded? content scannable and chunked?
  4. Trust Signals — testimonials, credentials, social proof, security badges present?
  5. Friction — unnecessary steps? confusing flows? dead ends?

STEP 4 — Section-by-Section
Evaluate applicable sections: Hero, Features, Social Proof, CTA, Navigation, Footer.
For each: what is the problem → why it matters to the user → specific fix.

STEP 5 — UX + UI + CRO Integration
Every issue must state its conversion or usability impact.
WEAK:  "Button color is not good."
STRONG: "CTA lacks sufficient contrast ratio (< 4.5:1) — reduces visibility for 8% of users with color vision deficiency, lowering click-through rate."

STEP 6 — Severity Classification
  High   = directly blocks conversion or creates accessibility barrier
  Medium = usability degradation or user confusion causing drop-off
  Low    = polish, consistency, or minor improvement opportunity

STEP 7 — Recommendations
Tag each recommendation: [Quick Win] (1–3 days) | [Strategic] (1–2 weeks) | [A/B Test]
Recommendations must be specific: "Change CTA copy from 'Submit' to 'Start My Free Trial'" — not "improve CTA".

═══════════════════════════
REQUIRED JSON OUTPUT FORMAT
═══════════════════════════

Return exactly this structure — one object per screen:
{{
  "screen_audits": [
    {{
      "name": "<filename without extension>",
      "score": <integer 40–95 — UX quality score based on visual analysis>,
      "persona": "<most relevant persona — use provided names or infer: 'New Visitor', 'Returning User', etc.>",
      "categories": [
        {{
          "type": "usability" | "cognitive" | "interaction" | "emotional" | "system",
          "issues": [
            {{
              "title": "<concise issue title — max 8 words>",
              "description": "<specific problem grounded in user psychology, behavior, or conversion impact — not vague>",
              "severity": "High" | "Medium" | "Low",
              "recommendation": "<specific, actionable fix tagged [Quick Win] | [Strategic] | [A/B Test]>"
            }}
          ]
        }}
      ]
    }}
  ]
}}

Category definitions:
  usability    — CTA placement, navigation clarity, labelling, visual hierarchy, form design, Nielsen heuristics
  cognitive    — information density, mental model alignment, progressive disclosure, scanning patterns
  interaction  — hover/focus/active states, affordances, keyboard/touch accessibility, microinteractions
  emotional    — trust signals, tone of voice, empty states, onboarding flow, anxiety reducers, social proof
  system       — loading states, error handling, empty states, edge cases, WCAG accessibility violations

Scoring guide:
  40–55  = critical issues blocking core user task
  56–70  = multiple moderate issues degrading experience
  71–85  = good design with targeted improvement opportunities
  86–95  = near-excellent with only polish-level issues

Rules:
  - Produce ONE audit entry per screen listed above
  - Each screen: 3–5 categories with 2–4 issues each
  - Every finding must reference a specific UI element visible in the screen
  - Severity High = conversion blocker; never use High for cosmetic issues
  - If analyzing a real screenshot, reference actual elements (buttons, headlines, forms) you can see
"""

    return system, user


def _normalise_audits(raw_audits: list, persona_names: list[str]) -> list[dict]:
    out = []
    for screen in raw_audits:
        categories = []
        for cat in screen.get("categories", []):
            issues = [
                {
                    "id": f"is-{str(uuid_lib.uuid4())[:8]}",
                    "title": issue.get("title", ""),
                    "description": issue.get("description", ""),
                    "severity": issue.get("severity", "Medium"),
                    "recommendation": issue.get("recommendation", ""),
                }
                for issue in cat.get("issues", [])
            ]
            if issues:
                categories.append({"type": cat.get("type", "usability"), "issues": issues})

        out.append({
            "id": f"sa-{str(uuid_lib.uuid4())[:8]}",
            "name": screen.get("name", "Screen"),
            "score": max(40, min(95, int(screen.get("score", 65)))),
            "persona": screen.get("persona", persona_names[0] if persona_names else "User"),
            "categories": categories,
        })
    return out


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("")
async def run_audit(
    project_id: str = Form(""),
    link: Optional[str] = Form(None),
    context: Optional[str] = Form(None),
    re_run: bool = Form(False),
    screens: List[UploadFile] = File(default=[]),
):
    db = get_supabase()

    # ── Load project & personas (optional) ────────────────────────────────────
    project = None
    persona_names: list[str] = []

    if project_id:
        res = db.table("projects").select("*").eq("id", project_id).single().execute()
        if res.data:
            project = res.data
            persona_rows = db.table("personas").select("name").eq("project_id", project_id).execute().data or []
            persona_names = [p["name"] for p in persona_rows]

    project_name = project["name"] if project else "UX Audit"

    # ── Validate input ─────────────────────────────────────────────────────────
    has_files = bool(screens)
    has_link = bool(link and link.startswith("http"))
    if not has_files and not has_link:
        raise HTTPException(400, "Upload at least one screen image or provide a URL to run the audit.")

    # ── Log run ────────────────────────────────────────────────────────────────
    run_id: str | None = None
    if project_id and project:
        run = db.table("agent_runs").insert({
            "project_id": project_id,
            "phase": 4,
            "status": "running",
            "input_json": {"step": "audit", "screen_count": len(screens), "context": context},
        }).execute()
        run_id = run.data[0]["id"]

    try:
        # ── Process uploads ────────────────────────────────────────────────────
        blocks = [await _file_to_block(f) for f in screens]
        images = [b for b in blocks if b["type"] == "image"]
        pdf_texts = [b for b in blocks if b["type"] == "text"]
        screen_names = [b["name"] for b in blocks]

        # Fetch URL content if provided
        url_content = ""
        if link and link.startswith("http"):
            url_content = await _fetch_url_content(link)

        # If only a link was provided, create a synthetic screen entry for it
        if not screen_names and url_content:
            from urllib.parse import urlparse
            parsed = urlparse(link)
            screen_names = [parsed.netloc or "Website"]

        system_prompt, user_prompt = _build_prompt(project_name, screen_names, context, persona_names, url_content)

        # Append PDF extracted text to user prompt
        if pdf_texts:
            user_prompt += "\n\n" + "\n\n".join(
                f"SCREEN '{b['name']}' (PDF text):\n{b['text']}" for b in pdf_texts
            )

        # ── Call AI ────────────────────────────────────────────────────────────
        if images:
            result = await chat_vision(system_prompt, user_prompt, images)
        else:
            result = await chat_json(system_prompt, user_prompt)

        raw_audits = result.get("screen_audits", [])
        if not raw_audits:
            raise ValueError("AI returned no screen audits — check your API key and model access.")

        audit_rich = _normalise_audits(raw_audits, persona_names)

        # ── Persist ────────────────────────────────────────────────────────────
        if project_id and project and run_id:
            db.table("projects").update({"current_phase": 5}).eq("id", project_id).execute()
            db.table("agent_runs").update({
                "status": "completed",
                "output_json": {
                    "audit_rich": audit_rich,
                    "screen_count": len(audit_rich),
                    "issue_count": sum(len(c["issues"]) for s in audit_rich for c in s["categories"]),
                },
            }).eq("id", run_id).execute()

        return {"audit_rich": audit_rich, "cached": False}

    except Exception as e:
        if project_id and run_id:
            try:
                db.table("agent_runs").update({"status": "failed"}).eq("id", run_id).execute()
            except Exception:
                pass
        raise HTTPException(500, str(e))
