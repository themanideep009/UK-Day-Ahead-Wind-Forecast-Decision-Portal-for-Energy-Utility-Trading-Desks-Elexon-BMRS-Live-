"""
Health check router.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        snapshot_loaded=True,
    )
