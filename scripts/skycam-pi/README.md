# Rainz SkyCam — Raspberry Pi station

Beginner-friendly setup for a permanent Rainz SkyCam station. Works on any Raspberry Pi with a connected camera (HQ Cam, Cam Module 3, USB webcam via `fswebcam`). Other mini-computers with a camera can use the same Python script.

## What this does

1. Every few minutes, the Pi takes a single sky photo.
2. The photo is uploaded over HTTPS to Rainz `upload-skycam-observation` with your station's API key in the `Authorization: Bearer …` header.
3. Rainz stores **only the latest image** for your station. The previous image is deleted automatically after the next successful upload.
4. Rainz runs Groq AI image analysis to see the current weather and whether rain might be likely soon.
5. The image and analysis appear on `/admin/skycam` and (if enabled) on `/skycam/<your-station-code>`.

## 1. Prepare the Pi

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv libcamera-apps
```

If you don't have `rpicam-still` / `libcamera-still`, install `fswebcam` instead and adjust `skycam-upload.py`.

## 2. Install the Rainz SkyCam client

```bash
mkdir -p ~/rainz-skycam && cd ~/rainz-skycam
# Copy these files from this repo's scripts/skycam-pi/ folder:
#   skycam-upload.py
#   .env.example
#   install.sh
#   rainz-skycam.service

python3 -m venv venv
./venv/bin/pip install requests python-dotenv
```

## 3. Register your station and get an API key

1. Sign in at https://rainz.net.
2. Open **My SkyCam Stations** (`/skycam-stations`).
3. Click **Register station**, fill in name, location (lat/lng), and camera type.
4. Copy the API key shown — it's displayed **once**.

## 4. Configure

```bash
cp .env.example .env
nano .env
```

```
RAINZ_SKYCAM_UPLOAD_URL=https://ohwtbkudpkfbakynikyj.functions.supabase.co/upload-skycam-observation
RAINZ_SKYCAM_API_KEY=rzsky_yourkeyhere
RAINZ_SKYCAM_INTERVAL_MINUTES=5
```

The server stores only a SHA-256 hash of your key. If you lose it, register a new station — there is no recovery.

## 5. Test a single upload

```bash
./venv/bin/python skycam-upload.py --once
```

You should see `SUCCESS` and a JSON response with `condition_label` and `cloud_cover_percent`.

## 6. Auto-start on boot

```bash
sudo cp rainz-skycam.service /etc/systemd/system/rainz-skycam.service
sudo systemctl daemon-reload
sudo systemctl enable rainz-skycam.service
sudo systemctl start rainz-skycam.service
sudo systemctl status rainz-skycam.service
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `missing_api_key` | No `Authorization` header | Check `RAINZ_SKYCAM_API_KEY` is set in `.env` |
| `invalid_api_key` | Key wrong or station deleted | Register a new station in Rainz |
| `station_inactive` | Admin disabled your station | Contact Rainz support |
| `image_too_large` | Photo > 15MB | Lower camera resolution |
| AI check failed | Groq returned an error | Image still uploads; Rainz retries on next photo |
