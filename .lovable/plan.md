

# Fix: Black Screen (Dual React Instance)

## Root Cause

The error `Cannot read properties of null (reading 'useState')` at `TimeOfDayProvider` is caused by **two separate copies of React** being loaded by Vite's dependency optimizer. The stack trace confirms this: `useState` is called from `chunk-CMM6OKGN.js` while React DOM renders from `chunk-I3COAS7K.js`. When React hooks run against a different React instance than the renderer, the internal dispatcher is `null`.

The current `optimizeDeps.include` + `resolve.dedupe` config is not sufficient because Vite can still split React into separate pre-bundled chunks when transitive dependencies (like `@tanstack/react-query-persist-client`, `next-themes`, `framer-motion`, etc.) each pull in their own React reference.

## Fix

**Force all React imports to resolve to a single physical file** using `resolve.alias` in `vite.config.ts`. This is the most reliable approach and overrides any transitive dependency resolution:

```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    // Force single React instance
    "react": path.resolve(__dirname, "./node_modules/react"),
    "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
    "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
  },
  dedupe: ['react', 'react-dom'],
},
```

This is a single-file edit to `vite.config.ts`. The `dedupe` array can be simplified since the aliases now guarantee resolution. The `optimizeDeps.force` can remain to ensure a clean cache rebuild.

## File Changed

| File | Action |
|------|--------|
| `vite.config.ts` | **Edit** -- add React resolve aliases to force singleton |

