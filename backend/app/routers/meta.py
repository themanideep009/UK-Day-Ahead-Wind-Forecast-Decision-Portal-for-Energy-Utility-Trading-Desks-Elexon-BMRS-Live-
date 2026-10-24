"""
Metadata router providing scope details, preset cutoffs, attribution,
and data quality summaries.
"""

import pandas as pd
from fastapi import APIRouter

from backend.app.config import (
    ATTRIBUTION,
    CUTOFF_DEFAULT,
    CUTOFF_PRESETS,
    SCOPE_DECISION_END,
    SCOPE_DECISION_START,
    SCOPE_DELIVERY_END,
    SCOPE_DELIVERY_START,
    SCOPE_MODE,
)
from backend.app.data_access import get_data_quality_summary, load_manifest
from backend.app.schemas import MetaResponse, ScopeInfo

router = APIRouter(tags=["Metadata"])


@router.get("/meta", response_model=MetaResponse)
def get_metadata() -> MetaResponse:
    total_days = (
        pd.to_datetime(SCOPE_DELIVERY_END) - pd.to_datetime(SCOPE_DELIVERY_START)
    ).days + 1

    scope_info = ScopeInfo(
        mode=SCOPE_MODE,
        delivery_start=SCOPE_DELIVERY_START,
        delivery_end=SCOPE_DELIVERY_END,
        decision_start=SCOPE_DECISION_START,
        decision_end=SCOPE_DECISION_END,
        total_days=total_days,
    )

    defaults = {
        "delivery_date": SCOPE_DELIVERY_START,
        "cutoff": CUTOFF_DEFAULT,
        "date_from": SCOPE_DELIVERY_START,
        "date_to": SCOPE_DELIVERY_END,
    }

    manifest = load_manifest()
    dq = get_data_quality_summary()

    return MetaResponse(
        scope=scope_info,
        defaults=defaults,
        presets=CUTOFF_PRESETS,
        attribution=ATTRIBUTION,
        data_quality=dq,
        manifest=manifest,
    )
