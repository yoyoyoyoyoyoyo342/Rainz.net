

# Plan: Product Hunt Launch Readiness - Multiple Critical Fixes

## Executive Summary
This plan addresses 6 critical issues before the Product Hunt launch: snow detection bugs, prediction share image generation, broken prediction points verification, Ramadan and Christmas calendars, and location permission persistence.

---

## Issue 1: Snow Detection Showing Wrong Conditions

### Root Cause
The `weatherCodeToText` function in `src/lib/weather-api.ts` (lines 150-188) uses a complex scoring system that can produce incorrect results:

```text
Problem areas:
- Snow score calculation is unreliable (lines 156-162)
- Weather codes 51-55, 61-65, 80-82 can show "Snow" when it's actually drizzle/rain
- The isSnowing threshold (snowScore >= 4) requires multiple conditions to be met
- Snowfall data from Open-Meteo may not align with weather codes
```

### Solution
Refactor the snow detection logic to:
1. Trust Open-Meteo's weather codes for snow detection (codes 71-77, 85-86 ARE snow)
2. Only override with temperature/snowfall data when weather code is ambiguous (drizzle/rain codes)
3. Prioritize the snowfall_sum data from Open-Meteo's daily forecast
4. Add explicit checks for freezing rain vs snow

### Files to Modify
- `src/lib/weather-api.ts` - Refactor `weatherCodeToText` function

---

## Issue 2: Prediction Share as Image Card

### Current State
The prediction share dialog (`src/components/weather/prediction-share.tsx`) displays plain text. The user wants it to be a shareable image card like the social card, but with a different design (no background photo).

### Solution
Create a new `PredictionShareCard` component that:
1. Uses `html-to-image` to generate a downloadable/shareable PNG
2. Has a clean, branded design with gradient background
3. Shows prediction details (location, temps, condition) in a visually appealing card
4. Includes Rainz branding
5. Supports native share API and download fallback

### Files to Create/Modify
- `src/components/weather/prediction-share.tsx` - Replace text preview with image card

---

## Issue 3: Prediction Points Not Being Awarded

### Root Cause
The `verify-predictions` edge function has multiple issues:

1. **Time-gated execution**: Lines 78-84 only allow verification at 10 PM CET (hour 21-22)
2. **No cron job configured**: The function isn't being called automatically
3. **Unverified predictions dating back months**: Database shows predictions from November 2025 still unverified

### Solution
1. **Add a cron job configuration** in `supabase/config.toml` to call `verify-predictions` daily at 10 PM CET
2. **Create an admin tool** to manually trigger verification for missed days
3. **Fix the time check logic** to handle timezone edge cases properly
4. **Add logging** to track verification runs

### Files to Create/Modify
- `supabase/config.toml` - Add cron job for verify-predictions
- `supabase/functions/verify-predictions/index.ts` - Fix time zone handling
- `src/components/weather/admin-panel.tsx` - Add manual verification trigger

---

## Issue 4: Ramadan Calendar Feature

### Requirements
- Daily rewards during Ramadan (dates vary each year based on Islamic calendar)
- Users can only claim rewards **after sundown (iftar) or before sunrise (suhoor)**
- One claim per day per user
- Calendar runs from first day of Ramadan to Eid

### Implementation Plan

#### Database Schema
```sql
CREATE TABLE ramadan_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  day_number INT NOT NULL, -- 1-30
  reward_type TEXT NOT NULL,
  reward_amount INT NOT NULL,
  hijri_date DATE NOT NULL,
  gregorian_date DATE NOT NULL,
  UNIQUE(year, day_number)
);

CREATE TABLE ramadan_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  calendar_id UUID REFERENCES ramadan_calendar NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  user_latitude FLOAT,
  user_longitude FLOAT,
  UNIQUE(user_id, calendar_id)
);
```

#### Sun Position Validation
- Use existing sunrise/sunset data from `weatherApi.getWeatherData`
- Check if current time is before sunrise OR after sunset at user's location
- Require location permission for validation

#### Components
- `RamadanCalendar` component with 30-day grid
- Each day shows reward type and claim status
- Modal for claiming with sun position check

### Files to Create
- `src/components/weather/ramadan-calendar.tsx`
- `supabase/functions/claim-ramadan-reward/index.ts`
- Database migration for tables

---

## Issue 5: Christmas Calendar Feature

### Requirements
- Daily rewards December 1-25
- Users can claim at any time of day
- One claim per day per user
- Traditional advent calendar style

### Implementation Plan

#### Database Schema
```sql
CREATE TABLE christmas_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  day_number INT NOT NULL, -- 1-25
  reward_type TEXT NOT NULL,
  reward_amount INT NOT NULL,
  unlock_date DATE NOT NULL,
  UNIQUE(year, day_number)
);

CREATE TABLE christmas_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  calendar_id UUID REFERENCES christmas_calendar NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, calendar_id)
);
```

#### Components
- `ChristmasCalendar` component with 25-day advent grid
- Visual design with festive theme (snowflakes, presents)
- Door/window animation on claim
- Previous days remain visible but locked if missed

### Files to Create
- `src/components/weather/christmas-calendar.tsx`
- `supabase/functions/claim-christmas-reward/index.ts`
- Database migration for tables

---

## Issue 6: Location Permission Persistence

### Current Problem
Every time the app/PWA opens, it calls `navigator.geolocation.getCurrentPosition` which triggers the browser permission dialog if not previously granted and saved.

### Root Cause
- The app stores the user's location in `useAccountStorage` but not the permission status
- When app loads, it always tries to detect location without checking if permission was previously granted/denied

### Solution

#### For Logged-In Users
Store permission status in database via `useAccountStorage`:
```typescript
interface AccountStorageData {
  userLocation: {...} | null;
  locationPermissionGranted: boolean | null; // NEW
  locationPermissionAskedAt: string | null; // NEW
  // ...existing fields
}
```

#### For Non-Logged-In Users
Store in localStorage:
```typescript
localStorage.setItem('rainz-location-permission-granted', 'true');
localStorage.setItem('rainz-location-permission-asked', new Date().toISOString());
```

#### Permission Flow
1. On app load, check stored permission status
2. If previously granted, proceed with geolocation
3. If previously denied, skip and show manual search
4. If never asked, show a custom prompt first, then request browser permission
5. Store the result after user responds

### Files to Modify
- `src/hooks/use-account-storage.tsx` - Add permission fields
- `src/pages/Weather.tsx` - Update location detection logic
- `src/components/weather/location-search.tsx` - Update "Use My Location" button

---

## Implementation Order

### Phase 1: Critical Bug Fixes (Priority)
1. **Snow Detection Fix** - Prevent incorrect weather displays
2. **Points Verification Fix** - Get points flowing again
3. **Location Permission Persistence** - Stop annoying 
4. **Prediction Share Image** - Better sharing experience
5. **Christmas Calendar** - December 1-25 (implement first as simpler)
6. **Ramadan Calendar** - More complex with sun position validation

---

## Technical Architecture

### Calendar System Design

```text
+-------------------+     +-------------------+
|  Calendar Config  |     |   User Claims     |
|-------------------|     |-------------------|
| year, day_number  |<--->| user_id           |
| reward_type       |     | calendar_id       |
| reward_amount     |     | claimed_at        |
| unlock_date       |     | location (Ramadan)|
+-------------------+     +-------------------+
         ^
         |
+-------------------+
|  Edge Function    |
|-------------------|
| - Validate date   |
| - Check sun pos   |
| - Award reward    |
| - Prevent dupe    |
+-------------------+
```

### Reward Types (Shared Between Calendars)
- `shop_points` - Add to user's SP balance
- `prediction_points` - Add to user's PP balance  
- `streak_freeze` - Add to user inventory
- `double_points` - Add power-up with 1 use
- `mystery_box` - Trigger mystery box reveal
- `xp_boost` - Temporary point multiplier

---

## Database Migrations Required

```sql
-- 1. Ramadan Calendar Tables
-- 2. Christmas Calendar Tables
-- 3. Add location_permission fields to user_preferences (optional, can use premium_settings JSON)
```

---

## Files Summary

### New Files (8)
- `src/components/weather/ramadan-calendar.tsx`
- `src/components/weather/christmas-calendar.tsx`
- `supabase/functions/claim-ramadan-reward/index.ts`
- `supabase/functions/claim-christmas-reward/index.ts`
- Database migration for calendar tables

### Modified Files (7)
- `src/lib/weather-api.ts` - Snow detection fix
- `src/components/weather/prediction-share.tsx` - Image card generation
- `src/hooks/use-account-storage.tsx` - Permission persistence
- `src/pages/Weather.tsx` - Permission flow
- `src/components/weather/location-search.tsx` - Permission check
- `supabase/functions/verify-predictions/index.ts` - Timezone fix
- `supabase/config.toml` - Cron job configuration

---

## Testing Checklist

- [ ] Snow shows correctly when Open-Meteo reports snow codes
- [ ] Rain shows correctly when it's actually raining
- [ ] Prediction share generates downloadable image
- [ ] Points are awarded after 10 PM CET daily
- [ ] Christmas calendar allows claims Dec 1-25 at any time
- [ ] Ramadan calendar blocks claims during daylight hours
- [ ] Location permission prompt only shows once per device/account
- [ ] All features work on mobile PWA
- [ ] All features work for non-logged-in users (where applicable)

