import postgres from "postgres";

// Postgres client for the parity board (Supabase Postgres).
// DATABASE_URL is the Supabase connection string (use the Transaction Pooler
// URI). Locally it comes from .env.local; on Vercel it's a project env var.
//
// Notes:
//   - prepare:false  -> required for Supabase's transaction pooler (pgbouncer).
//   - ssl:'require'   -> Supabase requires TLS.
//   - cached on globalThis so dev hot-reload doesn't open a new pool each time.

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn("DATABASE_URL is not set — parity store is unavailable.");
}

type Sql = ReturnType<typeof postgres>;

const g = globalThis as unknown as { __paritySql?: Sql };

export const sql: Sql | null = url
  ? (g.__paritySql ??= postgres(url, { prepare: false, ssl: "require" }))
  : null;

export function requireSql(): Sql {
  if (!sql) throw new Error("DATABASE_URL is not set");
  return sql;
}
