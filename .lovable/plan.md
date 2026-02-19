

# Fix: Ramadan Calendar "Unauthorized" / non-2xx Error

## Root Cause

The edge function logs consistently show `Error: Unauthorized` at the `getUser()` call. This happens because:

1. The component uses `supabase.auth.getSession()` which returns a **cached** session token -- it does NOT refresh an expired token automatically
2. The component then manually passes this (possibly expired) `Authorization` header to `supabase.functions.invoke()`
3. The edge function's `getUser()` validates the token server-side and rejects it

## The Fix

### 1. Client-side: `ramadan-calendar.tsx`

- Replace `getSession()` with `getUser()` -- this forces a token refresh if needed and validates the session is truly active
- Remove the manual `Authorization` header from `functions.invoke()` -- let the Supabase client auto-attach the (freshly refreshed) token
- Improve error extraction from the edge function response, since `functions.invoke` wraps errors differently

**Before:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) throw new Error("...");
const { data, error } = await supabase.functions.invoke("claim-ramadan-reward", {
  body: { ... },
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

**After:**
```typescript
const { data: { user: currentUser } } = await supabase.auth.getUser();
if (!currentUser) throw new Error("...");
const { data, error } = await supabase.functions.invoke("claim-ramadan-reward", {
  body: { ... },
});
```

### 2. Edge function: `claim-ramadan-reward/index.ts`

- Add a fallback: if the `Authorization` header is missing, return a clear JSON error (not a thrown exception) so the client gets a readable message instead of a generic "non-2xx" error
- No logic changes needed -- the existing server-side sun verification and claim logic is correct

### Files Changed

| File | Change |
|------|--------|
| `src/components/weather/ramadan-calendar.tsx` | Replace `getSession` with `getUser`, remove manual auth header |
| `supabase/functions/claim-ramadan-reward/index.ts` | Minor: return clearer error JSON when auth fails |

### Why This Works

- `getUser()` makes a server round-trip that refreshes the token if expired, guaranteeing a valid token
- Removing the manual header lets `supabase.functions.invoke()` use its internal `_getAccessToken()` flow which also handles refresh
- The combination ensures the edge function always receives a valid, non-expired token

