import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Did you copy .env.example to .env.local and start docker compose?",
  );
}

// Single shared pool. The same driver works for local Docker Postgres and Neon
// (Neon accepts vanilla TCP connections). Only DATABASE_URL changes between envs.
const pool = new pg.Pool({ connectionString: databaseUrl });

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export { schema };
