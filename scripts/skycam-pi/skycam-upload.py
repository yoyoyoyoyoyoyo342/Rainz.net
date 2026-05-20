#!/usr/bin/env python3
"""
Rainz SkyCam — Raspberry Pi uploader.

Captures a sky photo every RAINZ_SKYCAM_INTERVAL_MINUTES minutes and
posts it to the Rainz upload-skycam-observation Edge Function.

The Rainz server deletes the previous image for this station as soon as
the next successful upload + DB insert finishes — so this script does
NOT need to manage history locally.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

UPLOAD_URL = os.environ.get("RAINZ_SKYCAM_UPLOAD_URL", "").strip()
STATION_CODE = os.environ.get("RAINZ_SKYCAM_STATION_CODE", "").strip()
UPLOAD_KEY = os.environ.get("RAINZ_SKYCAM_UPLOAD_KEY", "").strip()
INTERVAL_MINUTES = int(os.environ.get("RAINZ_SKYCAM_INTERVAL_MINUTES", "5"))
FIRMWARE_VERSION = os.environ.get("RAINZ_SKYCAM_FIRMWARE", "rainz-skycam-pi/1.0.0")

TMP_PATH = Path("/tmp/rainz-skycam.jpg")


def capture_photo(path: Path) -> bool:
    """Capture a still photo using rpicam-still (preferred) or libcamera-still."""
    cmds = [
        ["rpicam-still", "-n", "-t", "1500", "--width", "1920", "--height", "1080", "-o", str(path)],
        ["libcamera-still", "-n", "-t", "1500", "--width", "1920", "--height", "1080", "-o", str(path)],
        # Fallback for USB webcams:
        # ["fswebcam", "-r", "1280x720", "--no-banner", str(path)],
    ]
    for cmd in cmds:
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if path.exists() and path.stat().st_size > 0:
                return True
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    return False


def upload_photo(path: Path) -> dict:
    files = {"image": ("skycam.jpg", path.read_bytes(), "image/jpeg")}
    data = {
        "station_code": STATION_CODE,
        "upload_key": UPLOAD_KEY,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "firmware_version": FIRMWARE_VERSION,
    }
    resp = requests.post(UPLOAD_URL, files=files, data=data, timeout=60)
    try:
        return {"status": resp.status_code, "body": resp.json()}
    except ValueError:
        return {"status": resp.status_code, "body": {"raw": resp.text[:400]}}


def run_once() -> int:
    if not (UPLOAD_URL and STATION_CODE and UPLOAD_KEY):
        print("ERROR: missing env vars. See .env.example", file=sys.stderr)
        return 2
    if not capture_photo(TMP_PATH):
        print("ERROR: could not capture photo", file=sys.stderr)
        return 3
    result = upload_photo(TMP_PATH)
    if 200 <= result["status"] < 300 and result["body"].get("success"):
        print(f"SUCCESS {result['body']}")
        return 0
    print(f"FAIL ({result['status']}): {result['body']}", file=sys.stderr)
    return 1


def run_loop() -> None:
    interval = max(1, INTERVAL_MINUTES) * 60
    while True:
        try:
            run_once()
        except Exception as e:  # noqa: BLE001
            print(f"loop error: {e}", file=sys.stderr)
        time.sleep(interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="capture and upload one photo, then exit")
    args = parser.parse_args()
    if args.once:
        sys.exit(run_once())
    run_loop()
