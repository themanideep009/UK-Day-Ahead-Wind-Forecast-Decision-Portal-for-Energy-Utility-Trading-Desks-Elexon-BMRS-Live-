param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "RUNNING SMOKE TESTS AGAINST: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Health
Write-Host -NoNewline "[1/5] Testing /api/health ... "
$res = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get
if ($res.status -eq "ok") {
    Write-Host "PASS (status ok)" -ForegroundColor Green
} else {
    Write-Host "FAIL: $($res | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

# 2. Meta
Write-Host -NoNewline "[2/5] Testing /api/meta ... "
$res = Invoke-RestMethod -Uri "$BaseUrl/api/meta" -Method Get
if ($res.scope.mode -eq "decision_month") {
    Write-Host "PASS (scope validated)" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    exit 1
}

# 3. Decision
Write-Host -NoNewline "[3/5] Testing /api/decision ... "
$res = Invoke-RestMethod -Uri "$BaseUrl/api/decision?delivery_date=2026-01-02&cutoff=09:20" -Method Get
if ($res.points.Length -eq 48) {
    Write-Host "PASS (48 half-hours returned)" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    exit 1
}

# 4. Accuracy
Write-Host -NoNewline "[4/5] Testing /api/accuracy/summary ... "
$res = Invoke-RestMethod -Uri "$BaseUrl/api/accuracy/summary?date_from=2026-01-02&date_to=2026-01-08&cutoff=09:20" -Method Get
if ($res.metrics.wape -gt 0) {
    Write-Host "PASS (WAPE: $($res.metrics.wape)%)" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    exit 1
}

# 5. Frontend
Write-Host -NoNewline "[5/5] Testing Frontend (/) ... "
$res = Invoke-WebRequest -Uri "$BaseUrl/" -Method Get
if ($res.Content -match "GB Wind Day-Ahead Forecast Decision Portal") {
    Write-Host "PASS (HTML loaded)" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ALL SMOKE TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
