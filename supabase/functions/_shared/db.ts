// Shared Aiven Postgres client for all Rejn edge functions.
// Browser code MUST NEVER import this file. Only Deno edge functions.
//
// Uses postgres.js via npm specifier — Deno can open raw TCP sockets.
// Connection pool is small (max=5) because edge function instances are short-lived.
import postgres from "npm:postgres@3.4.4";

const url = Deno.env.get("AIVEN_DATABASE_URL");
if (!url) {
  console.warn("[_shared/db] AIVEN_DATABASE_URL is not set — DB calls will fail");
}

// Single shared connection pool per warm function instance.
const db = postgres(url ?? "", {
  ssl: "require",
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default db;
