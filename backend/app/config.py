"""
Application Configuration.
Manages scope ranges, timezone definitions, default cutoffs, and snapshot data paths.
"""

import os
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Scope Configuration
# "decision_month": decisions made 2026-01-01..2026-01-31 -> delivery 2026-01-02..2026-02-01
# "delivery_month": delivery 2026-01-01..2026-01-31 -> decisions 2025-12-31..2026-01-30
SCOPE_MODE = os.getenv("SCOPE_MODE", "decision_month")

if SCOPE_MODE == "delivery_month":
    SCOPE_DELIVERY_START = "2026-01-01"
    SCOPE_DELIVERY_END = "2026-01-31"
    SCOPE_DECISION_START = "2025-12-31"
    SCOPE_DECISION_END = "2026-01-30"
else:
    # Default reading: decisions made in January 2026
    SCOPE_DELIVERY_START = "2026-01-02"
    SCOPE_DELIVERY_END = "2026-02-01"
    SCOPE_DECISION_START = "2026-01-01"
    SCOPE_DECISION_END = "2026-01-31"

# Timezone definition (UK Local Time with BST support)
TZ_LONDON = ZoneInfo("Europe/London")
TZ_UTC = ZoneInfo("UTC")

# Cutoff Presets
CUTOFF_DEFAULT = "09:20"
CUTOFF_PRESETS = {
    "09:20": "EPEX SPOT GB Hourly Gate Closure (09:20 Europe/London)",
    "09:50": "Nord Pool N2EX Day-Ahead Gate Closure (09:50 Europe/London)",
}

# Empirical Horizon Buckets (in hours)
HORIZON_BUCKETS = [
    {"label": "0-6h", "min": 0.0, "max": 6.0},
    {"label": "6-12h", "min": 6.0, "max": 12.0},
    {"label": "12-24h", "min": 12.0, "max": 24.0},
    {"label": "24-36h", "min": 24.0, "max": 36.0},
    {"label": "36-48h", "min": 36.0, "max": 48.0},
    {"label": "48h+", "min": 48.0, "max": 1000.0},
]

ATTRIBUTION = "Contains BMRS data © Elexon Limited copyright and database right 2026."
