from datetime import datetime, timezone
from typing import Any, Literal


ReviewStatus = Literal["reviewed", "handoff_ready"]


def build_review_output(
    output_json: dict[str, Any] | None,
    *,
    user_id: str,
    summary: str,
    metrics: dict[str, Any] | None = None,
    status: ReviewStatus = "reviewed",
    confirmed_at: str | None = None,
) -> dict[str, Any]:
    payload = dict(output_json or {})
    existing_review = payload.get("review")
    review_dict = existing_review if isinstance(existing_review, dict) else {}

    payload["review"] = {
        **review_dict,
        "status": status,
        "summary": summary,
        "metrics": dict(metrics or {}),
        "confirmed_at": confirmed_at or datetime.now(timezone.utc).isoformat(),
        "confirmed_by": user_id,
    }
    return payload
