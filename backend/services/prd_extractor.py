import io
import pdfplumber
from docx import Document
from database import get_supabase


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF or DOCX bytes."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n\n".join(text_parts)

    if ext in ("docx", "doc"):
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    # Fallback: try decode as utf-8 text
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def fetch_prd_text(prd_url: str, prd_filename: str) -> str:
    """Download PRD from Supabase Storage and extract text."""
    db = get_supabase()
    file_bytes = db.storage.from_("project-files").download(prd_url)
    return extract_text_from_bytes(file_bytes, prd_filename)
