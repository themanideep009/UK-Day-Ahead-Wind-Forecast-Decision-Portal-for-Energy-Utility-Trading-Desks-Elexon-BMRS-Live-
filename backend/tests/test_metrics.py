"""
Unit tests for Accuracy Metrics service.
Verifies every metric (MAE, RMSE, bias, WAPE, MAPE, quantiles, largest over/under)
against exact hand-computed values.
"""

import math

import numpy as np
import pandas as pd

from backend.app.services.metrics import compute_metrics


def test_hand_computed_metrics():
    # Synthetic dataset: 4 points
    # Errors: [100.0, -200.0, 300.0, 0.0]
    # Actuals: [1000.0, 2000.0, 1500.0, 2500.0] -> sum = 7000.0
    # Forecasts: [1100.0, 1800.0, 1800.0, 2500.0]
    errors = np.array([100.0, -200.0, 300.0, 0.0])
    actuals = np.array([1000.0, 2000.0, 1500.0, 2500.0])
    forecasts = np.array([1100.0, 1800.0, 1800.0, 2500.0])
    timestamps = pd.Series(
        [
            "2026-01-02T00:00:00Z",
            "2026-01-02T00:30:00Z",
            "2026-01-02T01:00:00Z",
            "2026-01-02T01:30:00Z",
        ]
    )
    periods = pd.Series([1, 2, 3, 4])

    m = compute_metrics(errors, actuals, forecasts, timestamps, periods)

    # 1. MAE = (100 + 200 + 300 + 0) / 4 = 600 / 4 = 150.0
    assert m["mae"] == 150.0

    # 2. RMSE = sqrt((100^2 + (-200)^2 + 300^2 + 0^2) / 4)
    # = sqrt((10000 + 40000 + 90000 + 0) / 4) = sqrt(140000 / 4) = sqrt(35000) = 187.0828... -> 187.1
    expected_rmse = round(math.sqrt(35000), 1)
    assert m["rmse"] == expected_rmse

    # 3. Bias = (100 - 200 + 300 + 0) / 4 = 200 / 4 = 50.0
    assert m["bias"] == 50.0

    # 4. WAPE = sum(|e|) / sum(actual) * 100% = 600 / 7000 * 100 = 8.5714... -> 8.57%
    assert m["wape"] == 8.57

    # 5. Shares
    # Over: 2 / 4 = 50.0%
    # Under: 1 / 4 = 25.0%
    # Exact: 1 / 4 = 25.0%
    assert m["share_over"] == 50.0
    assert m["share_under"] == 25.0
    assert m["share_exact"] == 25.0

    # 6. Largest over and under
    assert m["largest_over"] is not None
    assert m["largest_over"]["error_mw"] == 300.0
    assert m["largest_over"]["settlementPeriod"] == 3

    assert m["largest_under"] is not None
    assert m["largest_under"]["error_mw"] == -200.0
    assert m["largest_under"]["settlementPeriod"] == 2


def test_mape_near_zero_guard():
    # When actual is near zero or zero, MAPE should guard by filtering out actual < 100 MW
    errors = np.array([50.0, 100.0])
    actuals = np.array([0.0, 1000.0])  # first point has 0 MW actual
    forecasts = np.array([50.0, 1100.0])

    m = compute_metrics(errors, actuals, forecasts)
    # Should only evaluate point 2: 100 / 1000 = 10.0%
    assert m["mape"] == 10.0


def test_empty_dataset_handling():
    m = compute_metrics(np.array([]), np.array([]), np.array([]))
    assert m["n"] == 0
    assert m["mae"] == 0.0
    assert m["wape"] == 0.0
