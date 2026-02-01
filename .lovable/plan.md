
# Embeddable Weather Widget with AI-Enhanced Data

## Overview
Create a new `/embed` route that auto-detects the visitor's location and displays a clean, minimal weather widget using AI-enhanced data (LLM weather forecast). External sites can embed this via iframe.

## Design (Matching DBU Screenshot)
```text
+----------------------------------+
|          Weather Forecast        |
|                                  |
|      [Cloud Icon]  -1.6°C        |
|                                  |
|   Wind    Sunset    Precip       |
|  7.6 m/s  16:42     0 mm         |
|                                  |
|  Based on data from Rainz.net    |
+----------------------------------+
```

## Technical Implementation

### 1. New Page: `src/pages/Embed.tsx`

**Location Detection:**
- Use `navigator.geolocation` to auto-detect visitor location
- Support URL parameter overrides: `?lat=X&lon=Y&location=Name`
- Reverse geocode using BigDataCloud API for display name

**AI-Enhanced Data Flow:**
1. Fetch raw weather data via `weatherApi.getWeatherData()`
2. Transform sources array for LLM processing
3. Call `llm-weather-forecast` edge function with sources
4. Display AI-enhanced temperature, conditions, and insights

**URL Parameters:**
| Parameter | Description | Default |
|-----------|-------------|---------|
| `lat`, `lon` | Fixed location coordinates | Auto-detect |
| `location` | Display name | Reverse geocoded |
| `units` | `metric` or `imperial` | `metric` |
| `theme` | `light` or `dark` | `light` |
| `lang` | `en` or `da` | `en` |

**UI Components:**
- Header: "Weather Forecast" / "Vejrudsigt"
- Large weather icon (condition-based)
- Temperature with unit
- 3-column metrics row: Wind speed, Sunset time, Precipitation
- Footer branding: "Based on data from Rainz.net" linking to main site

### 2. Update Router in `src/App.tsx`
- Add `/embed` route lazily loaded
- Render without app chrome (no footer for embed)

## Embedding Usage
```html
<!-- Auto-detect visitor location -->
<iframe 
  src="https://rainz.net/embed" 
  width="320" 
  height="200" 
  frameborder="0"
  style="border-radius: 12px;"
></iframe>

<!-- Fixed location (Copenhagen) -->
<iframe 
  src="https://rainz.net/embed?lat=55.68&lon=12.57&location=Copenhagen" 
  width="320" 
  height="200"
  frameborder="0"
></iframe>
```

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/pages/Embed.tsx` | Create - Embed widget with AI-enhanced data |
| `src/App.tsx` | Modify - Add /embed route without footer |

## Key Differences from Existing Widget
- Uses AI-enhanced data via `llm-weather-forecast` (not raw API)
- Auto-detects location (existing widget requires lat/lon params)
- Styled to match DBU screenshot (compact, clean design)
- Different branding: "Based on data from" vs "Powered by"

## Privacy Note
Location permission is requested from the visitor's browser. If denied, shows a "Location required" message or uses IP-based fallback.
