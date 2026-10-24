"""
Integration tests for FastAPI endpoints.
Tests /api/health, /api/meta, /api/decision, /api/accuracy/*, and /api/evolution.
"""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["snapshot_loaded"] is True


def test_meta():
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert "scope" in data
    assert data["scope"]["mode"] in ("decision_month", "delivery_month")
    assert len(data["data_quality"]) == 2
    assert "attribution" in data


def test_decision_desk_valid():
    res = client.get("/api/decision?delivery_date=2026-01-02&cutoff=09:20&include_actuals=false")
    assert res.status_code == 200
    data = res.json()
    assert data["delivery_date"] == "2026-01-02"
    assert data["cutoff"] == "09:20"
    assert len(data["points"]) == 48
    assert data["points"][0]["actual_mw"] is None  # back-test hidden by default

    # Reveal actuals
    res_act = client.get("/api/decision?delivery_date=2026-01-02&cutoff=09:20&include_actuals=true")
    assert res_act.status_code == 200
    data_act = res_act.json()
    assert data_act["points"][0]["actual_mw"] is not None


def test_decision_desk_invalid_date():
    res = client.get("/api/decision?delivery_date=2024-01-01&cutoff=09:20")
    assert res.status_code == 400
    assert "out of scope" in res.json()["detail"]


def test_accuracy_summary():
    res = client.get("/api/accuracy/summary?date_from=2026-01-02&date_to=2026-01-08&cutoff=09:20")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert data["metrics"]["n"] == 7 * 48
    assert data["metrics"]["mae"] > 0
    assert len(data["callouts"]) >= 3


def test_accuracy_breakdowns():
    # by-day
    res_day = client.get("/api/accuracy/by-day?date_from=2026-01-02&date_to=2026-01-08")
    assert res_day.status_code == 200
    assert len(res_day.json()) == 7

    # by-hour
    res_hr = client.get("/api/accuracy/by-hour?date_from=2026-01-02&date_to=2026-01-08")
    assert res_hr.status_code == 200
    assert len(res_hr.json()) == 24

    # by-horizon
    res_hor = client.get("/api/accuracy/by-horizon?date_from=2026-01-02&date_to=2026-01-08")
    assert res_hor.status_code == 200
    assert len(res_hor.json()) > 0

    # distribution
    res_dist = client.get(
        "/api/accuracy/distribution?date_from=2026-01-02&date_to=2026-01-08&bins=20"
    )
    assert res_dist.status_code == 200
    assert len(res_dist.json()) == 20


def test_evolution():
    res = client.get("/api/evolution?target_startTime=2026-01-02T12:00:00Z&cutoff=09:20")
    assert res.status_code == 200
    data = res.json()
    assert "vintages" in data
    assert len(data["vintages"]) > 1
    assert "revision_mw" in data
