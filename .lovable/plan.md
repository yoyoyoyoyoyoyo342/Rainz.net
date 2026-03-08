# Pollen Index Wheel Redesign + Allergy Tracking Overhaul

## Overview

Replace the current flat grid layout with an SVG donut/wheel chart where each pollen type is a segment whose arc length scales with its concentration. User-tracked allergies get visually highlighted on the wheel and, if they match a known pollen type, their real-time data is fetched from the API. The allergy tracking system gets a full overhaul with predefined allergen selection, severity-based alerts, and a dedicated management section.

---

## Part 1: SVG Pollen Wheel

### Design

A centered SVG donut chart (similar to a pie chart with a hole in the middle). Each pollen type becomes a colored arc segment. The arc's angular size is proportional to its concentration relative to the total. The center of the wheel shows the overall pollen level number and label (e.g., "5 - Medium").

- Minimum arc angle of 15 degrees so even low-value pollens are visible
- Each segment gets its assigned color (Alder = orange, Birch = green, Grass = lime, Mugwort = purple, Olive = yellow, Ragweed = red-orange)
- Segments for user-tracked allergens get a pulsing glow/thicker stroke to visually stand out
- An alert icon appears next to any segment that exceeds the user's sensitivity threshold
- Below the wheel, a compact legend shows pollen name + value + intensity label, laid out horizontally

### SVG Implementation

Use inline SVG with `<path>` elements for each arc segment, calculated with basic trigonometry (`Math.cos`, `Math.sin`). No new dependencies needed. Each segment path uses `stroke-dasharray` or arc path commands. Hover/tap on a segment shows a tooltip with the pollen name, value, and season.

---

## Part 2: Allergy Tracking Overhaul

### Current Problems

1. Users type free-text allergen names, leading to mismatches with API pollen types (e.g., "birch pollen" vs "Birch")
2. No predefined list -- users must guess which allergens are trackable
3. Custom allergens (like "dust mites") are stored but never get real data
4. The severity selector is bare -- no explanation of what each level means

### New Design

**Predefined Allergen Picker**: Replace the free-text input with a selectable list of the 6 API-supported pollen types (Alder, Birch, Grass, Mugwort, Olive, Ragweed) shown as tappable chips/cards. Each shows its current value so users can see what's high right now before selecting.

**Custom Allergens**: Keep an "Other" option with a text input for non-pollen allergens (dust, pet dander, mold).  And if it's a pollen that open-meteos api just doesn't have it should get data from another free api with many more pollen types.

**Severity Descriptions**: Each severity level gets a short explanation:

- Mild: "Alert me when levels are high (above 5)"
- Moderate: "Alert me when levels are moderate or higher (above 2)"  
- Severe: "Alert me at any detectable level (above 0)"

**Allergy Management Sheet**: Replace the inline badge list with a bottom sheet (using the existing Drawer component) that shows all tracked allergies with their severity, current pollen level, and a delete button. Accessed via a "Manage Allergies" button.

### Database Changes

Add a `pollen_type` column to the `user_allergies` table that maps to the API field name (e.g., "birch_pollen"). This is nullable -- custom allergens won't have it. This allows the wheel to reliably match tracked allergens to API data without string matching.

**Migration SQL:**

```sql
ALTER TABLE user_allergies 
ADD COLUMN pollen_type text;
```

No new RLS policies needed -- existing policies already cover CRUD by user_id.

---

## Part 3: Wheel + Tracked Allergies Integration

When the user has tracked pollen-type allergens:

1. Those segments on the wheel get a highlighted border (thicker stroke, e.g., 4px vs 2px)
2. If the pollen level exceeds their severity threshold, the segment pulses with an animation
3. A small alert badge appears in the wheel center area showing "2 alerts" if multiple tracked allergens are high

For pollen data, no API changes are needed -- all 6 pollen types are already fetched from Open-Meteo. The wheel just needs to cross-reference the user's tracked list to decide which segments to highlight.

---

## Part 4: Updated PollenCard Header

Add a small "Manage" button next to the "Pollen Index" header that opens the allergy management drawer. The "Track Allergy" button moves from inside the wheel component to the card header for better discoverability.

---

## Files Changed


| Action    | File                                      | Change                                                                                                                                                                                                            |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit      | `src/components/weather/pollen-wheel.tsx` | Replace grid layout with SVG donut wheel chart. Add segment highlighting for tracked allergens. Add tooltip on tap. Move allergy management to a Drawer. Replace free-text input with predefined allergen picker. |
| Edit      | `src/components/weather/pollen-card.tsx`  | Add "Manage" button in header that opens allergy drawer                                                                                                                                                           |
| Migration | SQL                                       | Add `pollen_type` column to `user_allergies` table                                                                                                                                                                |


---

## Technical Details

### SVG Arc Calculation

Each pollen segment's arc angle = `max(15, (value / totalValue) * 360)` degrees, normalized so all arcs sum to 360. The arc path is drawn using SVG `A` (arc) commands with the donut's outer radius (90px) and inner radius (55px).

```text
function describeArc(cx, cy, outerR, innerR, startAngle, endAngle):
  // Convert to radians, compute start/end points for outer and inner arcs
  // Return SVG path: M -> A (outer) -> L -> A (inner) -> Z
```

### Predefined Allergen Chips

```text
const POLLEN_ALLERGENS = [
  { name: "Alder", pollenType: "alder_pollen", color: "hsl(25 95% 53%)" },
  { name: "Birch", pollenType: "birch_pollen", color: "hsl(142 71% 45%)" },
  { name: "Grass", pollenType: "grass_pollen", color: "hsl(120 60% 50%)" },
  { name: "Mugwort", pollenType: "mugwort_pollen", color: "hsl(280 70% 55%)" },
  { name: "Olive", pollenType: "olive_pollen", color: "hsl(47 96% 53%)" },
  { name: "Ragweed", pollenType: "ragweed_pollen", color: "hsl(15 80% 50%)" },
];
```

Users tap to select, then choose severity. Insert includes `pollen_type` field for reliable matching.

### Alert Logic (unchanged threshold logic)

- Severe sensitivity: alert when value > 0
- Moderate sensitivity: alert when value > 2
- Mild sensitivity: alert when value > 5

### Wheel Segment Highlighting

Tracked allergen segments get `strokeWidth: 4` and a CSS `filter: drop-shadow(0 0 4px color)`. If above threshold, add `@keyframes pulse` animation on the segment.