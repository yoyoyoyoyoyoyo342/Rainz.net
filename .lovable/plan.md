

# Plan: Fix Share Prediction, Location Fallbacks, and Improve AR View

## Issue Analysis

### Issue 1: Share Prediction Pop-up Not Appearing

**Root Cause Identified:**
The `PredictionShare` component is rendered inside `WeatherPredictionForm`, which is inside the `PredictionDialog`. When a prediction is submitted:
1. The form sets `showShare(true)` and stores the prediction data
2. But immediately after, `onPredictionMade()` is called
3. The parent `PredictionDialog` then calls `setOpen(false)`, closing the entire dialog
4. This **unmounts** the `PredictionShare` component before it can render

This is the same pattern that caused the battle accept dialog issue - components get unmounted when their parent dialog closes.

**Solution:** 
Create a global `PredictionShareContext` (similar to `BattleAcceptDialogContext`) that renders the share dialog at the app root level, outside any other dialogs. This prevents unmounting when the prediction dialog closes.

---

### Issue 2: Smaller Places (Emdrup) Not Linking to Copenhagen

**Root Cause Identified:**
In `supabase/functions/generate-landmark-image/index.ts`, there's a `localityFallbacks` map that maps smaller neighborhoods to larger cities. Currently it includes:
- Ørestad, Valby, Amager, Frederiksberg, Nørrebro, Vesterbro

But **Emdrup is missing** from this list, along with many other Copenhagen neighborhoods.

**Solution:**
Expand the `localityFallbacks` map to include more Copenhagen neighborhoods and all other cities' suburbs.

---

### Issue 3: AR View Needs Improvement

**Current State:**
The AR overlay has:
- Camera feed with compass
- Wind direction arrow
- Aurora probability (from NOAA Kp index)
- Basic info cards

**Proposed Improvements:**
1. Better visual design with animated overlays
2. Add more weather data overlays (temperature, humidity, UV)
3. Add sun/moon position indicators
4. Smoother compass animation
5. Photo capture feature to save AR weather snapshot

---

## Implementation Steps

### Step 1: Create Global Prediction Share Context

Create `src/contexts/prediction-share-context.tsx`:
- Export `PredictionShareProvider` component
- Export `usePredictionShare()` hook with `openShareDialog(prediction)` method
- Render the `PredictionShare` dialog at root level
- Manage share dialog state independently of prediction dialog

### Step 2: Integrate Share Context

Update `src/App.tsx`:
- Wrap app with `PredictionShareProvider`

Update `src/components/weather/weather-prediction-form.tsx`:
- Import and use `usePredictionShare()` hook
- Replace local share dialog state with global context
- Call `openShareDialog(predictionForShare)` instead of setting local state
- Remove the local `PredictionShare` component render

### Step 3: Expand Location Fallbacks

Update `supabase/functions/generate-landmark-image/index.ts`:
- Add more Copenhagen neighborhoods to `localityFallbacks`:
  - Emdrup, Brønshøj, Vanløse, Bispebjerg, Østerbro, Christianshavn, Islands Brygge, Sydhavn, Nordvest, Husum, Utterslev, Bellahøj, Hellerup, Gentofte, Charlottenlund
- Add more international suburb/city mappings

### Step 4: Improve AR View

Update `src/components/weather/ar-weather-overlay.tsx`:
- Add animated gradient overlays based on weather condition
- Add temperature display with animated thermometer
- Add sun position indicator using solar calculation
- Add UV exposure meter with color gradient
- Add photo capture button to save AR snapshot
- Improve compass with smoother spring animation
- Add humidity and pressure indicators
- Better visual hierarchy with glassmorphism design

---

## Technical Details

### New Files
- `src/contexts/prediction-share-context.tsx` - Global share dialog management

### Modified Files
- `src/App.tsx` - Add PredictionShareProvider wrapper
- `src/components/weather/weather-prediction-form.tsx` - Use global share context
- `supabase/functions/generate-landmark-image/index.ts` - Expand locality fallbacks
- `src/components/weather/ar-weather-overlay.tsx` - Enhanced AR features

### Dependencies
No new dependencies required.

