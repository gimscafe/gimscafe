import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy singleton. We never touch `process.env.DATABASE_URL` at module load so
 * `next build` succeeds even before the database is provisioned.
 * (No Proxy wrapper — some libraries choke on it.)
 */

type Db = ReturnType<typeof create>;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local or your host environment.",
    );
  }

  const ssl =
    process.env.DATABASE_SSL === "disable"
      ? false
      : process.env.DATABASE_SSL === "require"
        ? ("require" as const)
        : ("prefer" as const);

  // Reuse the client across HMR reloads in dev.
  const globalForDb = globalThis as unknown as {
    __bakeryPg?: ReturnType<typeof postgres>;
  };
  const client =
    globalForDb.__bakeryPg ??
    postgres(url, {
      ssl,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  if (process.env.NODE_ENV !== "production") globalForDb.__bakeryPg = client;

  return drizzle(client, { schema });
}

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) _db = create();
  return _db;
}

export { schema };
