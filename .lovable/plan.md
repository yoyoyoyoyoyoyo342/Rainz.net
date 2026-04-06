# Fix: Monthly Leaderboard & Trophy Board

## Root Cause Analysis

Three issues found after investigating the live database:

1. **Monthly leaderboard says "no predictions"**: There are TWO `get_monthly_leaderboard` functions -- one with no args, one with `(_limit integer DEFAULT 10)`. When the frontend calls `supabase.rpc("get_monthly_leaderboard")`, Postgres cannot decide which to call and throws an ambiguity error ("function is not unique"). The RPC fails silently, returning no data.
2. **Trophy board shows blank trophies**: The `get_leaderboard()` function in the live database does NOT return a `trophy_count` column (the migration that adds it was never applied). The frontend maps `row.trophy_count` which is `undefined`, displaying as blank.
3. **Migrations not applied**: The `monthly_trophies` table does not exist. The `trophy_count` column does not exist on `profiles`. The three trophy-related migrations (`20260405000000`, `20260405001000`, `20260405002000`) were never deployed.

## Fix Plan

### Step 1: Single new migration to do everything cleanly

Create one migration that:

- **Adds `trophy_count` column** to `profiles` (integer, default 0)
- **Creates `monthly_trophies` table** (year, month, user_id, with unique constraint on year+month)
- **Drops the old `get_monthly_leaderboard(_limit integer)` overload** -- this is the root cause of the ambiguity error
- **Replaces `get_monthly_leaderboard()**` to filter by current month using `prediction_date`, rank by points, and include `trophy_count`
- **Replaces `get_leaderboard()**` to rank by `trophy_count DESC` (trophy board) and include the column
- **Creates `award_monthly_trophy(date)` function** to insert the month's winner
- **Backfills trophies** for all months from August 2025 through March 2026
- **Syncs `profiles.trophy_count**` from the `monthly_trophies` table
- **Adds RLS** on `monthly_trophies` (public SELECT, admin ALL)

### Step 2: Delete the three broken migration files

Remove the three migrations that were never applied and conflict with each other:

- `20260405000000_add_trophy_leaderboard.sql`
- `20260405001000_fix_monthly_leaderboard_and_award_trophies.sql`
- `20260405002000_comprehensive_leaderboard_fix.sql`

### Step 3: Fix the build error

Fix the unrelated build error in `supabase/functions/rainz-mcp/index.ts` (bad `npm:mcp-lite@^0.10.0` import).

### Step 4: No frontend changes needed

The existing `leaderboard.tsx` component already correctly maps `trophy_count` from both RPCs and displays it. Once the database functions return the column, everything will work.

&nbsp;

Step 5:

Also make sure that monthly still uses points and the user with the most points at the end of the month wins 1 trophy for the all time.

## Technical Details

**Key SQL for the monthly leaderboard fix:**

```sql
-- Drop the ambiguous overload
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard(integer);

-- Recreate with trophy_count column, filtered to current month
CREATE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(rank bigint, display_name text, total_points bigint,
  current_streak integer, longest_streak integer,
  total_predictions bigint, correct_predictions bigint,
  trophy_count bigint, user_id uuid)
-- filters on prediction_date >= date_trunc('month', now())
```

**Key SQL for the trophy board fix:**

```sql
CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(rank bigint, display_name text, total_points integer,
  current_streak integer, longest_streak integer,
  total_predictions bigint, correct_predictions bigint,
  trophy_count bigint, user_id uuid)
-- orders by trophy_count DESC, total_points DESC
```

**Trophy backfill** awards 1 trophy per month to the user with the most verified points that month, for Aug 2025 through Mar 2026 (8 months of history).