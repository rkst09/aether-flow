import json
import logging
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger("aether.telemetry")


class TelemetryEvent(BaseModel):
    level: Literal["info", "warning", "error"] = "info"
    type: str = Field(default="client_event", max_length=120)
    message: str = Field(max_length=2000)
    metadata: dict[str, Any] = Field(default_factory=dict)
    path: str = Field(default="", max_length=500)
    online: bool = True
    user_id: str | None = Field(default=None, max_length=120)
    timestamp: str = Field(default="", max_length=80)


@router.post("")
async def ingest_telemetry(event: TelemetryEvent):
    payload = event.model_dump()
    log_method = {
        "info": logger.info,
        "warning": logger.warning,
        "error": logger.error,
    }[event.level]
    log_method(json.dumps(payload, ensure_ascii=True))
    return {"ok": True}
