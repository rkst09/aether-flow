import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import personas, journey, backlog, screens, prompts, audit, copy_review, docs, telemetry, review

app = FastAPI(title="Aether Design Intelligence API", version="1.0.0")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 01 - Design Intake
app.include_router(personas.router, prefix="/api/phase/01/personas", tags=["phase-01"])
# /save sub-route is registered on the same router at /api/phase/01/personas/save
app.include_router(journey.router, prefix="/api/phase/01/journey", tags=["phase-01"])
app.include_router(backlog.router, prefix="/api/phase/01/backlog", tags=["phase-01"])

# Phase 02 - Screen Derivation
app.include_router(screens.router, prefix="/api/phase/02/screens", tags=["phase-02"])

# Phase 03 - Prototype Prompts
app.include_router(prompts.router, prefix="/api/phase/03/prompts", tags=["phase-03"])

# Phase 04 - UX Audit
app.include_router(audit.router, prefix="/api/phase/04/audit", tags=["phase-04"])

# Phase 05 - UX Copy Review
app.include_router(copy_review.router, prefix="/api/phase/05/copy", tags=["phase-05"])

# Phase 06 - Documentation
app.include_router(docs.router, prefix="/api/phase/06/docs", tags=["phase-06"])
app.include_router(review.router, prefix="/api/phase", tags=["phase-review"])
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["telemetry"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "aether-backend"}
