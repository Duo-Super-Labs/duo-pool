# ADR-004: Postgres via `drizzle-orm/node-postgres` for both Docker and Neon

**Status:** Accepted
**Date:** 2026-04-26

## Context

DuoPool runs on **Docker Postgres locally** (Phase 2a — `localhost:5434`) and is destined for **Neon Postgres** in production (`pool.duosuperlabs.com` via Vercel serverless). Neon publishes a serverless-optimized driver (`drizzle-orm/neon-serverless` over WebSocket) that's faster on cold starts but only works against Neon endpoints.

We could switch drivers per environment. We chose not to.

## Decision

Use **`pg` + `drizzle-orm/node-postgres`** for both local Docker and production Neon. Neon accepts vanilla TCP Postgres connections, so the same driver works against both. Only `DATABASE_URL` changes between environments.

```ts
// packages/database/src/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

## Consequences

- **(+)** Zero driver swap between dev and prod. Same code path. Same failure modes. Same test surface.
- **(+)** Local Docker tests catch the same kinds of bugs prod will hit.
- **(+)** Defers the deploy-time Neon setup to the very end of the work session (per user preference: *"esses setups ficam para o final"*).
- **(−)** Slightly higher cold-start latency on Neon vs the Neon HTTP/WebSocket driver. For DuoPool's load (~125 votes during the talk), negligible.
- **(−)** If we ever need request-scoped connections in Edge Runtime, we'd need to revisit. Acceptable: `apps/web` runs on Vercel Node serverless, not Edge.

## Quality gate impact

No driver-specific tests needed; the existing L3 query tests run against any Postgres-compatible URL via `--env-file=.env.test`.
