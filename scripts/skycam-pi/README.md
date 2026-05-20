# Rainz SkyCam — Raspberry Pi station

Beginner-friendly setup for a permanent Rainz SkyCam station. Works on any Raspberry Pi with a connected camera (HQ Cam, Cam Module 3, USB webcam via `fswebcam`). Other mini-computers with a camera can use the same Python script — just install Python 3 and a way to grab a still image.

## What this does

1. Every few minutes, the Pi takes a single sky photo.
2. The photo is uploaded over HTTPS to Rainz `upload-skycam-observation`.
3. Rainz stores **only the latest image** for your station. The previous image is deleted automatically after the next successful upload.
4. Rainz runs Groq AI image analysis to see the current weather and whether rain might be likely soon.
5. The image and analysis appear on `/admin/skycam` and (if enabled) on `/skycam/<your-station-code>`.

## 1. Prepare the Pi

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv libcamera-apps
```

If you don't have `rpicam-still` / `libcamera-still`, install `fswebcam` instead and adjust `skycam-upload.py` (commented section).

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

## 3. Configure

```bash
cp .env.example .env
nano .env
```

Fill in:

```
RAINZ_SKYCAM_UPLOAD_URL=https://ohwtbkudpkfbakynikyj.functions.supabase.co/upload-skycam-observation
RAINZ_SKYCAM_STATION_CODE=CPH-BISPEBJERG-001
RAINZ_SKYCAM_UPLOAD_KEY=your-long-random-secret
RAINZ_SKYCAM_INTERVAL_MINUTES=5
```

The `RAINZ_SKYCAM_UPLOAD_KEY` must be the **plain** secret. The server stores only a SHA-256 hash (with project pepper). See `docs/skycam-setup.md` for how to generate one and how to update the station row.

## 4. Test a single upload

```bash
./venv/bin/python skycam-upload.py --once
```

You should see `SUCCESS` and a JSON response with `condition_label` and `cloud_cover_percent`.

## 5. Auto-start on boot

```bash
sudo cp rainz-skycam.service /etc/systemd/system/rainz-skycam.service
sudo systemctl daemon-reload
sudo systemctl enable rainz-skycam.service
sudo systemctl start rainz-skycam.service
sudo systemctl status rainz-skycam.service
```

## Tips

- Point the camera mostly at the sky. A small bit of roof, trees or horizon is fine.
- Keep the lens clean and dry. Wipe it weekly.
- South-ish facing helps if you live in the northern hemisphere.
- The server **deletes the previous image as soon as the next image lands**, so disk usage stays tiny.
- Logs: `journalctl -u rainz-skycam.service -f`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `invalid_upload_key` | Wrong `RAINZ_SKYCAM_UPLOAD_KEY` or wrong server pepper | Re-generate the hash and update the station row |
| `station_not_found` | Wrong `RAINZ_SKYCAM_STATION_CODE` | Match the `station_code` exactly |
| `image_too_large` | Photo > 15MB | Lower camera resolution |
| AI check pending / failed | Groq returned an error | The image still uploads; Rainz retries on next photo |
