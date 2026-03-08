

## New Fun Features for Rainz

The app already has a rich set of features (predictions, battles, streaks, games, quizzes, time machine, spin wheel, mystery boxes, seasonal tournaments). Here are fresh, fun feature ideas that complement what exists:

### 1. Weather Bingo Card
A daily bingo card with weather-related squares (e.g., "Temp drops 5°+", "See a rainbow", "Wind > 20mph", "Humidity > 80%"). Squares auto-complete based on real weather data throughout the day. Completing rows/columns earns bonus points.

- New component: `weather-bingo.tsx`
- 5x5 grid with randomized weather conditions
- Checks against live weather data to auto-mark squares
- Awards points for lines/full card, integrates with existing points system
- Persisted daily via localStorage or Supabase

### 2. Weather Mood Journal
Users log how the weather makes them feel each day with emoji reactions + optional short note. Over time, shows mood-weather correlations ("You're happiest on sunny 22°C days!").

- New component: `weather-mood-journal.tsx`
- Quick emoji picker (☀️😊, 🌧😴, ❄️😤, etc.)
- Stores entries in Supabase with date/weather snapshot
- Shows a "mood calendar" heatmap and insights after enough entries

### 3. "Outfit of the Day" Recommender
Based on current weather conditions, suggests what to wear with fun illustrations/icons (sunglasses, umbrella, layers, etc.). Could include a "What are others wearing?" community poll.

- New component: `outfit-recommender.tsx`
- Logic maps temp ranges + precipitation + wind to outfit suggestions
- Uses Lucide icons for clothing items
- Optional community poll: "What are you wearing today?"

### 4. Weather Trivia Daily Challenge
One new weather trivia question per day (e.g., "What's the hottest temperature ever recorded?"). Correct answers earn points. Shows global stats of who got it right.

- New component: `weather-trivia.tsx`
- Curated question bank (~100+ questions)
- Daily rotation based on date seed
- Integrates with points system, shows % of users who answered correctly

### 5. Location Weather Comparison Tool
Side-by-side comparison of weather between two cities. "Is it warmer in Tokyo or New York right now?" Great for travel planning or settling debates.

- New component: `weather-compare.tsx`
- Two location search inputs
- Side-by-side cards showing temp, humidity, wind, conditions
- Fun verdict line: "Tokyo is 8° warmer and way less windy!"

---

### Implementation approach
- Each feature is a self-contained component added to the Explore sheet or main weather page
- All integrate with existing points system, auth, and language/localization (including Boomer translations)
- Data persistence via Supabase for logged-in users, localStorage fallback for guests

