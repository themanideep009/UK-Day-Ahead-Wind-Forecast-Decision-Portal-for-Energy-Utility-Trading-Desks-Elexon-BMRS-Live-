"""
Ingestion script for Elexon BMRS Wind Data.
Fetches actual outturn wind generation (FUELHH) and wind generation forecasts (WINDFOR)
for the configured evaluation buffer (2025-12-28 to 2026-02-04), validates data hygiene,
compresses to gzip CSV snapshots, and writes manifest.json with SHA-256 checksums.

Attribution: Contains BMRS data © Elexon Limited copyright and database right 2026.
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import httpx
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest")

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
DATA_DIR = Path("backend/data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

FUEL_URL = f"{BASE_URL}/datasets/FUELHH/stream"
WIND_URL = f"{BASE_URL}/datasets/WINDFOR/stream"

# Scope buffer
START_DATE = "2025-12-28"
END_DATE = "2026-02-04"


def compute_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def fetch_with_retry(
    client: httpx.Client, url: str, params: Dict[str, Any], max_retries: int = 5
) -> List[Dict[str, Any]]:
    for attempt in range(max_retries):
        try:
            r = client.get(url, params=params, timeout=60.0)
            if r.status_code in (429, 500, 502, 503, 504):
                sleep_s = 2**attempt
                logger.warning(
                    "Attempt %d failed with status %d; sleeping %ds...",
                    attempt + 1,
                    r.status_code,
                    sleep_s,
                )
                time.sleep(sleep_s)
                continue
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            return []
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error("Failed to fetch %s: %s", url, e)
                raise
            sleep_s = 2**attempt
            logger.warning("Attempt %d error: %s; sleeping %ds...", attempt + 1, e, sleep_s)
            time.sleep(sleep_s)
    return []


def ingest_fuelhh() -> pd.DataFrame:
    logger.info("Fetching FUELHH wind actuals from %s to %s...", START_DATE, END_DATE)
    params = {"settlementDateFrom": START_DATE, "settlementDateTo": END_DATE, "fuelType": "WIND"}
    with httpx.Client() as client:
        rows = fetch_with_retry(client, FUEL_URL, params)

    logger.info("Fetched %d raw FUELHH records", len(rows))
    df = pd.DataFrame(rows)
    # Required columns: startTime, settlementDate, settlementPeriod, generation
    cols_to_keep = ["startTime", "settlementDate", "settlementPeriod", "generation"]
    df = df[cols_to_keep].copy()

    # Deduplicate on startTime
    initial_len = len(df)
    df = df.drop_duplicates(subset=["startTime"]).sort_values("startTime").reset_index(drop=True)
    if len(df) < initial_len:
        logger.warning("Removed %d duplicate FUELHH rows", initial_len - len(df))

    # Validate
    assert not df["startTime"].isna().any(), "Found null startTime in FUELHH"
    assert not df["generation"].isna().any(), "Found null generation in FUELHH"
    assert (df["generation"] >= 0).all(), "Found negative generation in FUELHH"

    output_path = DATA_DIR / "fuelhh_actuals.csv.gz"
    df.to_csv(output_path, index=False, compression="gzip")
    logger.info(
        "Saved %s (%d rows, %.1f KB)", output_path, len(df), output_path.stat().st_size / 1024
    )
    return df


def ingest_windfor() -> pd.DataFrame:
    logger.info("Fetching WINDFOR forecasts across buffer in weekly chunks...")
    intervals = [
        ("2025-12-27T00:00:00Z", "2026-01-03T00:00:00Z"),
        ("2026-01-03T00:00:00Z", "2026-01-10T00:00:00Z"),
        ("2026-01-10T00:00:00Z", "2026-01-17T00:00:00Z"),
        ("2026-01-17T00:00:00Z", "2026-01-24T00:00:00Z"),
        ("2026-01-24T00:00:00Z", "2026-01-31T00:00:00Z"),
        ("2026-01-31T00:00:00Z", "2026-02-04T00:00:00Z"),
    ]

    all_rows = []
    with httpx.Client() as client:
        for idx, (p_from, p_to) in enumerate(intervals):
            logger.info(
                "Fetching WINDFOR chunk %d/%d (%s to %s)...", idx + 1, len(intervals), p_from, p_to
            )
            params = {"publishDateTimeFrom": p_from, "publishDateTimeTo": p_to}
            chunk = fetch_with_retry(client, WIND_URL, params)
            all_rows.extend(chunk)
            time.sleep(0.2)

    logger.info("Fetched %d raw WINDFOR records", len(all_rows))
    df = pd.DataFrame(all_rows)
    cols_to_keep = ["publishTime", "startTime", "generation"]
    df = df[cols_to_keep].copy()

    # Deduplicate on (publishTime, startTime)
    initial_len = len(df)
    df = (
        df.drop_duplicates(subset=["publishTime", "startTime"])
        .sort_values(["publishTime", "startTime"])
        .reset_index(drop=True)
    )
    if len(df) < initial_len:
        logger.warning("Removed %d duplicate WINDFOR rows", initial_len - len(df))

    # Validate
    assert not df["publishTime"].isna().any(), "Found null publishTime in WINDFOR"
    assert not df["startTime"].isna().any(), "Found null startTime in WINDFOR"
    assert not df["generation"].isna().any(), "Found null generation in WINDFOR"
    assert (df["generation"] >= 0).all(), "Found negative generation in WINDFOR"

    output_path = DATA_DIR / "windfor_forecasts.csv.gz"
    df.to_csv(output_path, index=False, compression="gzip")
    logger.info(
        "Saved %s (%d rows, %.1f KB)", output_path, len(df), output_path.stat().st_size / 1024
    )
    return df


def create_manifest(df_fuel: pd.DataFrame, df_wind: pd.DataFrame):
    fuel_file = DATA_DIR / "fuelhh_actuals.csv.gz"
    wind_file = DATA_DIR / "windfor_forecasts.csv.gz"

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "attribution": "Contains BMRS data © Elexon Limited copyright and database right 2026.",
        "buffer": {"start_date": START_DATE, "end_date": END_DATE},
        "datasets": {
            "FUELHH": {
                "file": fuel_file.name,
                "endpoint": FUEL_URL,
                "rows": int(len(df_fuel)),
                "sha256": compute_sha256(fuel_file),
                "size_bytes": fuel_file.stat().st_size,
                "min_startTime": str(df_fuel["startTime"].min()),
                "max_startTime": str(df_fuel["startTime"].max()),
                "min_generation_mw": float(df_fuel["generation"].min()),
                "max_generation_mw": float(df_fuel["generation"].max()),
                "mean_generation_mw": float(df_fuel["generation"].mean()),
                "expected_settlement_periods": 48,
            },
            "WINDFOR": {
                "file": wind_file.name,
                "endpoint": WIND_URL,
                "rows": int(len(df_wind)),
                "sha256": compute_sha256(wind_file),
                "size_bytes": wind_file.stat().st_size,
                "min_publishTime": str(df_wind["publishTime"].min()),
                "max_publishTime": str(df_wind["publishTime"].max()),
                "min_startTime": str(df_wind["startTime"].min()),
                "max_startTime": str(df_wind["startTime"].max()),
                "min_generation_mw": float(df_wind["generation"].min()),
                "max_generation_mw": float(df_wind["generation"].max()),
                "unique_publish_times": int(df_wind["publishTime"].nunique()),
            },
        },
    }

    manifest_path = DATA_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info("Saved %s", manifest_path)


def main():
    logger.info("Starting ingestion workflow...")
    df_fuel = ingest_fuelhh()
    df_wind = ingest_windfor()
    create_manifest(df_fuel, df_wind)
    logger.info("Ingestion complete. Snapshot ready.")


if __name__ == "__main__":
    main()
