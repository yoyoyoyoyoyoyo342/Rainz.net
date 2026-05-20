# Rainz SkyCam — Setup & Operations

## What it is

Rainz SkyCam is a network of small sky-pointing cameras (Raspberry Pi or any mini computer with a camera) that send a fresh photo to Rainz every few minutes. Groq AI analyses the photo to decide the current weather and whether rain is likely soon, and the app shows **Data from SkyCam** instead of **Data from API** when a trusted nearby SkyCam exists.

Users without a station can also submit a one-off SkyCam photo from their phone (it goes through Groq too and stays pending review by default).

## Architecture

```
Raspberry Pi SkyCam
   │
   ▼ multipart/form-data
upload-skycam-observation  (Edge Function)
   │  validates upload key (SHA-256 + pepper)
   │  uploads image -> skycam-images bucket
   │  Groq vision -> JSON analysis
   │  inserts skycam_observations
   │  upserts skycam_station_latest
   │  deletes previous station image
   ▼
Rainz UI -> WeatherSourceLabel ("Data from SkyCam" | "Data from API")

User phone
   │
   ▼ multipart/form-data (auth required)
submit-skycam-photo (Edge Function)
   │  Groq vision -> analysis
   │  inserts skycam_user_submissions (pending_review)
```

## Latest-image-only storage

For permanent stations, only the most recent image per station is kept in storage. When the next upload arrives:

1. New image is uploaded.
2. New `skycam_observations` row is inserted.
3. New `skycam_station_latest` row is upserted.
4. Old observations are marked `is_latest = false, status = 'replaced'`.
5. Old storage object is deleted from the `skycam-images` bucket.

If the new upload fails, nothing is deleted.

## Creating a station

```sql
insert into public.skycam_stations
  (station_code, name, city, area, country, latitude, longitude,
   camera_direction, coverage_radius_km, display_for_city, is_active, is_public,
   upload_key_hash)
values
  ('CPH-BISPEBJERG-001', 'Bispebjerg SkyCam 001', 'Copenhagen', 'Bispebjerg', 'Denmark',
   55.706, 12.541, 'unknown', 8, true, true, false,
   '<SHA256_HEX_OF_KEY_PLUS_PEPPER>');
```

The Bispebjerg row is already seeded by the migration with a placeholder hash. Replace `upload_key_hash` after generating a real key.

## Generating the upload key hash

Pick any long random secret for `RAINZ_SKYCAM_UPLOAD_KEY` on the Pi (e.g. `openssl rand -hex 32`).

The server stores SHA-256 of `<key>:<SKYCAM_UPLOAD_SECRET_PEPPER>`.

```bash
KEY="$(openssl rand -hex 32)"
PEPPER="$SKYCAM_UPLOAD_SECRET_PEPPER"   # same value as the Supabase secret
echo -n "${KEY}:${PEPPER}" | shasum -a 256 | awk '{print $1}'
```

Update the station:

```sql
update public.skycam_stations
set upload_key_hash = '<output-of-shasum>'
where station_code = 'CPH-BISPEBJERG-001';
```

Then put `KEY` (the plain value) into the Pi's `.env` as `RAINZ_SKYCAM_UPLOAD_KEY`.

## Required environment variables

| Name | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Supabase Edge secret | AI image analysis |
| `SKYCAM_UPLOAD_SECRET_PEPPER` | Supabase Edge secret | Hashing salt for upload keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge secret | Server-side DB + storage (already present) |
| `VITE_SKYCAM_ENABLED` | Frontend `.env` | If `true`, `/skycam/:stationCode` is publicly reachable for non-admin users |

## Raspberry Pi script

See `scripts/skycam-pi/README.md`. Summary:

```bash
sudo apt install -y python3 python3-venv libcamera-apps
python3 -m venv venv && ./venv/bin/pip install requests python-dotenv
cp .env.example .env && nano .env
./venv/bin/python skycam-upload.py --once
sudo cp rainz-skycam.service /etc/systemd/system/
sudo systemctl enable --now rainz-skycam.service
```

## Testing an upload manually

```bash
curl -X POST "$RAINZ_SKYCAM_UPLOAD_URL" \
  -F "image=@./sky.jpg" \
  -F "station_code=CPH-BISPEBJERG-001" \
  -F "upload_key=$RAINZ_SKYCAM_UPLOAD_KEY" \
  -F "captured_at=$(date -u +%FT%TZ)"
```

Expected JSON: `{ success: true, observation_id, image_path, uploaded_at, ai_checked, condition_label, cloud_cover_percent, rain_likely_soon }`.

## How Rainz decides "Data from SkyCam"

A SkyCam is **trusted** when ALL of:

- `is_active = true`
- latest observation exists and is `ai_checked = true`
- `captured_at` is < 10 minutes old
- `image_quality_score ≥ 70`
- `ai_confidence ≥ 0.75`
- requested location is within station `coverage_radius_km`
- **OR** the station has `display_for_city = true` and its `city` matches the searched city (case-insensitive)

If any check fails, the UI falls back to **Data from API**.

## Location search labels

When a user searches a city, the result row shows `Data from SkyCam` if a trusted nearby station applies. The Bispebjerg station has `display_for_city = true` and `city = 'Copenhagen'`, so once it's pushing trusted images, searching **Copenhagen** will show **Data from SkyCam**.

## User phone submissions

Tap **Rainz SkyCam** on the weather page → take a sky photo → submit. The image goes through Groq, lands in `skycam_user_submissions` with `status = 'pending_review'`, and surfaces in `/admin/skycam-submissions` for approve / reject / public toggle. Approved submissions are reserved for future local confidence boosts.

## Verifying old image deletion

1. POST one image.
2. POST a second image for the same station.
3. In Supabase Storage browser, the first image path should be gone.
4. `select id, image_path, is_latest, status from skycam_observations where station_id = '<id>' order by captured_at desc;` — only the newest row should have `is_latest = true`; older rows should be `status = 'replaced'`.
