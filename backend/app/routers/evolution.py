"""
Forecast Evolution router.
Exposes trajectory of all published forecast vintages for a target delivery half-hour,
highlighting the decision cutoff vintage and pre-delivery final vintage.
"""

import re

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from backend.app.config import CUTOFF_DEFAULT
from backend.app.schemas import EvolutionResponse
from backend.app.services.evolution import get_forecast_evolution

router = APIRouter(tags=["Forecast Evolution"])


@router.get("/evolution", response_model=EvolutionResponse)
def get_evolution(
    target_startTime: str = Query(
        ...,
        description="Target settlement start timestamp (ISO-8601 UTC, e.g. 2026-01-02T12:00:00Z)",
    ),
    cutoff: str = Query(CUTOFF_DEFAULT, description="Cutoff time on D-1 (HH:MM Europe/London)"),
) -> EvolutionResponse:
    try:
        pd.to_datetime(target_startTime, utc=True)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Invalid target_startTime format. Expected ISO-8601 UTC."
        )

    if not re.match(r"^\d{2}:\d{2}$", cutoff):
        raise HTTPException(status_code=400, detail="Cutoff must be in HH:MM format")

    try:
        res = get_forecast_evolution(target_startTime, cutoff)
        return EvolutionResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
