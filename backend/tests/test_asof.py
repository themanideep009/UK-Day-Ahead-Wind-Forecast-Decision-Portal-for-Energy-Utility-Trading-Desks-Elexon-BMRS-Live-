"""
Unit tests for As-Of decision-time forecast engine.
Verifies boundary inclusive selection, no look-ahead bias,
time zone conversion (GMT and BST), and 48 half-hour mapping.
"""

import pandas as pd
import pytest

from backend.app.data_access import parse_uk_local_to_utc
from backend.app.services.asof import compute_asof_forecast, get_delivery_day_range_utc


def test_timezone_conversion_winter_and_summer():
    # Winter date (GMT): 2026-01-15 09:20 London == 09:20 UTC
    ts_winter = parse_uk_local_to_utc("2026-01-15", "09:20")
    assert ts_winter == pd.Timestamp("2026-01-15 09:20:00", tz="UTC")

    # Summer date (BST): 2026-07-15 09:20 London == 08:20 UTC (1 hour ahead of UTC)
    ts_summer = parse_uk_local_to_utc("2026-07-15", "09:20")
    assert ts_summer == pd.Timestamp("2026-07-15 08:20:00", tz="UTC")


def test_delivery_day_range():
    start_utc, end_utc = get_delivery_day_range_utc("2026-01-02")
    assert start_utc == pd.Timestamp("2026-01-02 00:00:00", tz="UTC")
    assert end_utc == pd.Timestamp("2026-01-02 23:30:00", tz="UTC")


def test_no_lookahead_and_cutoff_boundary():
    # Create synthetic wind forecast dataframe
    # Delivery day: 2026-01-02. Decision day: 2026-01-01. Cutoff: 09:20 UTC.
    cutoff_ts = pd.Timestamp("2026-01-01 09:20:00", tz="UTC")
    before_cutoff = pd.Timestamp("2026-01-01 07:30:00", tz="UTC")
    exact_cutoff = pd.Timestamp("2026-01-01 09:20:00", tz="UTC")
    after_cutoff = pd.Timestamp("2026-01-01 09:20:01", tz="UTC")
    later_after = pd.Timestamp("2026-01-01 09:30:00", tz="UTC")

    synthetic_wind = pd.DataFrame(
        [
            # Target hour 12:00
            {
                "publishTime": before_cutoff,
                "startTime": pd.Timestamp("2026-01-02 12:00:00", tz="UTC"),
                "generation": 5000.0,
            },
            {
                "publishTime": exact_cutoff,
                "startTime": pd.Timestamp("2026-01-02 12:00:00", tz="UTC"),
                "generation": 5500.0,
            },
            {
                "publishTime": after_cutoff,
                "startTime": pd.Timestamp("2026-01-02 12:00:00", tz="UTC"),
                "generation": 9999.0,
            },
            {
                "publishTime": later_after,
                "startTime": pd.Timestamp("2026-01-02 12:00:00", tz="UTC"),
                "generation": 8888.0,
            },
        ]
    )

    # Fill other hours to avoid empty dataframe
    for h in range(24):
        if h != 12:
            st = pd.Timestamp(f"2026-01-02 {h:02d}:00:00", tz="UTC")
            synthetic_wind = pd.concat(
                [
                    synthetic_wind,
                    pd.DataFrame(
                        [
                            {
                                "publishTime": before_cutoff,
                                "startTime": st,
                                "generation": 4000.0 + h * 50,
                            }
                        ]
                    ),
                ],
                ignore_index=True,
            )

    # Run asof
    result_df, cutoff_utc = compute_asof_forecast(
        delivery_date="2026-01-02", cutoff="09:20", include_actuals=False, wind_df=synthetic_wind
    )

    assert cutoff_utc == cutoff_ts
    assert len(result_df) == 48

    # Check target hour 12:00 (periods 25 and 26)
    p25 = result_df[result_df["settlementPeriod"] == 25].iloc[0]
    p26 = result_df[result_df["settlementPeriod"] == 26].iloc[0]

    # Must select exact_cutoff (5500 MW), strictly excluding 9999 MW and 8888 MW
    assert p25["forecast_mw"] == 5500.0
    assert p26["forecast_mw"] == 5500.0
    assert p25["publishTime"] == exact_cutoff
    assert p26["publishTime"] == exact_cutoff

    # Horizon checks: startTime - publishTime
    # Period 25 startTime is 12:00 -> 12:00 - 09:20 = 2h 40m = 2.6667h
    expected_h25 = (p25["startTime"] - exact_cutoff).total_seconds() / 3600.0
    assert pytest.approx(p25["horizon_hours"], 0.01) == expected_h25
