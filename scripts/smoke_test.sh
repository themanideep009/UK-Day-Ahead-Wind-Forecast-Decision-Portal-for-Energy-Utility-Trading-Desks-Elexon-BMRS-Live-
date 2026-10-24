#!/usr/bin/env bash
set -e

BASE_URL="${1:-http://localhost:3000}"

echo "=========================================="
echo "RUNNING SMOKE TESTS AGAINST: $BASE_URL"
echo "=========================================="

# 1. Health check
echo -n "[1/5] Testing /api/health ... "
HEALTH=$(curl -s -f "$BASE_URL/api/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "PASS (ok)"
else
    echo "FAIL: $HEALTH"
    exit 1
fi

# 2. Meta check
echo -n "[2/5] Testing /api/meta ... "
META=$(curl -s -f "$BASE_URL/api/meta")
if echo "$META" | grep -q 'decision_month'; then
    echo "PASS (scope validated)"
else
    echo "FAIL: $META"
    exit 1
fi

# 3. Decision desk check
echo -n "[3/5] Testing /api/decision ... "
DECISION=$(curl -s -f "$BASE_URL/api/decision?delivery_date=2026-01-02&cutoff=09:20")
if echo "$DECISION" | grep -q '"settlementPeriod":48'; then
    echo "PASS (48 half-hours returned)"
else
    echo "FAIL: $DECISION"
    exit 1
fi

# 4. Accuracy summary check
echo -n "[4/5] Testing /api/accuracy/summary ... "
ACCURACY=$(curl -s -f "$BASE_URL/api/accuracy/summary?date_from=2026-01-02&date_to=2026-01-08&cutoff=09:20")
if echo "$ACCURACY" | grep -q '"wape"'; then
    echo "PASS (metrics computed)"
else
    echo "FAIL: $ACCURACY"
    exit 1
fi

# 5. Frontend home page
echo -n "[5/5] Testing Frontend (/) ... "
HOME_HTML=$(curl -s -f "$BASE_URL/")
if echo "$HOME_HTML" | grep -q 'GB Wind Day-Ahead Forecast Decision Portal'; then
    echo "PASS (HTML loaded)"
else
    echo "FAIL: Home page response missing title"
    exit 1
fi

echo "=========================================="
echo "ALL SMOKE TESTS PASSED SUCCESSFULLY!"
echo "=========================================="
