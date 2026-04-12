from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH


def _heading(doc: Document, text: str, level: int):
    p = doc.add_heading(text, level=level)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return p


def _bullet(doc: Document, text: str):
    doc.add_paragraph(text, style="List Bullet")


def _label(doc: Document, label: str, value: str):
    p = doc.add_paragraph()
    run = p.add_run(f"{label}: ")
    run.bold = True
    p.add_run(value or "—")


def generate_ba_docx(
    doc_data: dict,
    audit_data: dict,
    copy_suggestions: list,
    output_path: str,
):
    doc = Document()

    # ── Page margins ──────────────────────────────────────────────────────────
    for section in doc.sections:
        section.top_margin    = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin   = Inches(1.2)
        section.right_margin  = Inches(1.2)

    # ── Title page ────────────────────────────────────────────────────────────
    title = doc.add_heading(doc_data.get("project_name", "Untitled Project"), 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph("BA Handoff Document — Design Intelligence Output")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.runs[0].font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    doc.add_paragraph()

    # ── Executive Summary ─────────────────────────────────────────────────────
    _heading(doc, "Executive Summary", 1)
    doc.add_paragraph(doc_data.get("summary", ""))
    doc.add_paragraph()

    # ── Screen Documentation ──────────────────────────────────────────────────
    _heading(doc, "Screen Documentation", 1)

    screens = doc_data.get("screens", [])
    for screen in screens:
        doc.add_paragraph()
        _heading(doc, screen.get("name", "Unnamed Screen"), 2)

        _label(doc, "Type", screen.get("type", ""))
        _label(doc, "Primary Persona", screen.get("persona", ""))
        doc.add_paragraph()

        doc.add_paragraph(screen.get("annotation", ""))
        doc.add_paragraph()

        items = screen.get("interaction_logic", [])
        if items:
            _heading(doc, "Interaction Logic", 3)
            for item in items:
                _bullet(doc, item)

        items = screen.get("edge_cases", [])
        if items:
            _heading(doc, "Edge Cases", 3)
            for item in items:
                _bullet(doc, item)

        items = screen.get("validation_rules", [])
        if items:
            _heading(doc, "Validation Rules", 3)
            for item in items:
                _bullet(doc, item)

        items = screen.get("navigation_flows", [])
        if items:
            _heading(doc, "Navigation Flows", 3)
            for item in items:
                _bullet(doc, item)

    # ── UX Audit Summary ──────────────────────────────────────────────────────
    if audit_data:
        doc.add_page_break()
        _heading(doc, "UX Audit Findings", 1)

        sections_map = {
            "friction_points":    "Friction Points",
            "accessibility_issues": "Accessibility Issues",
            "missing_states":     "Missing States",
            "consistency_issues": "Consistency Issues",
        }

        for key, label in sections_map.items():
            items = audit_data.get(key, [])
            if not items:
                continue
            _heading(doc, label, 2)
            for item in items:
                p = doc.add_paragraph()
                run = p.add_run(f"[{item.get('priority', 'medium').upper()}] {item.get('title', '')}")
                run.bold = True
                doc.add_paragraph(item.get("description", ""))
                screen_ref = item.get("screen_affected") or ", ".join(item.get("screens_affected", []))
                if screen_ref:
                    _label(doc, "Screen", screen_ref)
                doc.add_paragraph()

    # ── Copy Review Summary ───────────────────────────────────────────────────
    if copy_suggestions:
        doc.add_page_break()
        _heading(doc, "UX Copywriting Review", 1)

        current_screen = None
        for item in copy_suggestions:
            screen = item.get("screen", "")
            if screen != current_screen:
                current_screen = screen
                _heading(doc, screen, 2)

            p = doc.add_paragraph()
            run = p.add_run(f"[{item.get('category', '').replace('_', ' ').title()}]")
            run.bold = True
            run.font.color.rgb = RGBColor(0x63, 0x66, 0xF1)

            _label(doc, "Before", item.get("original", ""))
            _label(doc, "After", item.get("suggested", ""))
            _label(doc, "Why", item.get("rationale", ""))
            doc.add_paragraph()

    doc.save(output_path)
