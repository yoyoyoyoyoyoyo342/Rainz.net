# Rainz SkyCam — Setup & Operations

## What it is

Rainz SkyCam is a public network of sky-pointing cameras (Raspberry Pi, mini PC, or even a phone) run by Rainz users. Each station pushes a fresh photo every few minutes. Groq AI analyses every image to decide the current weather, and the app shows **Data from SkyCam** instead of **Data from API** when a trusted nearby SkyCam exists.

## Per-user API keys (new)

There is **no** shared upload secret or pepper. Each station has its own API key generated when the owner registers the station in Rainz.

1. A signed-in Rainz user opens **/skycam-stations** and clicks **Register station**.
2. They enter station name, location (lat/lng), and camera type (normal or noir).
3. Rainz generates a random key like `rzsky_<base64url>` and stores **only the SHA-256 hash** in `skycam_stations.api_key_hash`.
4. The plain key is shown **once** in a dialog. The owner copies it into their Pi's `.env` as `RAINZ_SKYCAM_API_KEY`.
5. If lost, the user just registers a new station — old key cannot be recovered.

Admins can toggle `is_active` on any station from **/admin/skycam** to disable bad actors.

## Architecture

```
SkyCam (Pi / phone / mini PC)
   │  Authorization: Bearer rzsky_...
   ▼ multipart/form-data
upload-skycam-observation  (Edge Function, verify_jwt = false)
   │  sha256(apiKey) → lookup skycam_stations.api_key_hash
   │  reject if station inactive (403)
   │  upload image -> skycam-images bucket
   │  Groq vision -> JSON analysis
   │  insert skycam_observations + upsert skycam_station_latest
   │  delete previous station image
   │  stamp last_upload_at
   ▼
Rainz UI -> WeatherSourceLabel ("Data from SkyCam" | "Data from API")
```

## Required environment variables

| Name | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Supabase Edge secret | AI image analysis |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge secret | Server-side DB + storage |
| `RAINZ_SKYCAM_API_KEY` | Pi `.env` | Per-station API key from Rainz |
| `RAINZ_SKYCAM_UPLOAD_URL` | Pi `.env` | Edge function URL |

`SKYCAM_UPLOAD_SECRET_PEPPER` is no longer used.

## Raspberry Pi setup

```bash
sudo apt install -y python3 python3-venv libcamera-apps
python3 -m venv venv && ./venv/bin/pip install requests python-dotenv
cp .env.example .env && nano .env   # paste your API key from Rainz
./venv/bin/python skycam-upload.py --once
sudo cp rainz-skycam.service /etc/systemd/system/
sudo systemctl enable --now rainz-skycam.service
```

## Testing an upload manually

```bash
curl -X POST "$RAINZ_SKYCAM_UPLOAD_URL" \
  -H "Authorization: Bearer $RAINZ_SKYCAM_API_KEY" \
  -F "image=@./sky.jpg" \
  -F "captured_at=$(date -u +%FT%TZ)"
```

Expected JSON: `{ success: true, observation_id, image_path, uploaded_at, ai_checked, condition_label, cloud_cover_percent, rain_likely_soon }`.

Possible errors:
- `401 missing_api_key` — no `Authorization: Bearer …` header
- `401 invalid_api_key` — key doesn't match any station
- `403 station_inactive` — admin disabled the station

## How Rainz decides "Data from SkyCam"

Unchanged. A SkyCam is **trusted** when ALL of:

- `is_active = true`
- latest observation `ai_checked = true`
- `captured_at` < 10 minutes old
- `image_quality_score ≥ 70`
- `ai_confidence ≥ 0.75`
- requested location within `coverage_radius_km` (or `display_for_city` + city match)

## Verifying old image deletion

1. POST one image with your API key.
2. POST a second image.
3. In Supabase Storage, only the newest path under `skycam/stations/<station_code>/…` remains.
4. `select id, image_path, is_latest, status from skycam_observations where station_id = '<id>' order by captured_at desc;` — only the newest row should have `is_latest = true`.
