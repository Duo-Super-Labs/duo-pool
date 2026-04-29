# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

- DuoPool is a **live polls demo app** built for the talk *"AI Amplifica. O Processo É Seu."* (Univali, 2026-04-29)
- The app is **anonymous** — no auth, no tenants, no RBAC. A `dp_voter` cookie is the only voter identity
- The architecture is **incidental**, not the lesson. The point is: any documented process amplifies AI well — this happens to be ours
- Inspired by the production starter `duo-admin` (`~/workspace/work/gebra/duo-admin/CLAUDE.md`); slim version, no auth/RBAC/jobs

## Stack

- **Language**: TypeScript 5.x (`strict: true`, `allowImportingTsExtensions: true`)
- **Framework**: Next.js 16 (App Router, RSC-first, Turbopack default). **Never Next 15** (CVE-2025-29927). Next 16 has breaking changes vs. training-data Next 14/15 — read `apps/web/AGENTS.md` and the relevant guide under `apps/web/node_modules/next/dist/docs/` before writing Next code (e.g., dynamic route `params` are async — must `await params`)
- **Monorepo**: Turborepo + Bun workspaces
- **Database**: PostgreSQL + Drizzle ORM (`packages/database`). Local: Docker Postgres on port 5434. Prod: Neon (same `pg` driver — only `DATABASE_URL` changes)
- **API**: oRPC (`@orpc/contract` + `@orpc/server`) mounted at `apps/web/app/api/rpc/[[...rpc]]/route.ts` via `RPCHandler`. **No Hono** — DuoPool has no auth handler that would require it
- **UI**: shadcn-style components + Tailwind CSS v4
- **State/Fetching**: TanStack Query v5 (client-side, with `refetchInterval: 2000` for live results)
- **Forms / validation**: drizzle-zod (auto-derived from schema). **Never write Zod schemas by hand for entities — derive from `packages/database/src/schema/zod.ts`**

## The 5-Layer Data Flow (NEVER skip layers)

Every API feature follows this exact sequence. Same pattern as duo-admin starter, slim (no auth/tenant middleware in DuoPool).

```
Layer 1: packages/database/src/schema/*.ts        → Drizzle table definitions
Layer 2: packages/database/src/schema/zod.ts       → drizzle-zod validators (auto-derived)
Layer 3: packages/database/src/query/*.ts          → Pure functions: fn(db, input)
Layer 4: packages/contracts/src/*.ts               → oRPC contracts (frontend-importable, ZERO server imports)
Layer 5: packages/api/src/modules/*/procedures/*.ts → pub.<feature>.<method>.handler()
```

**Why this order matters (verbatim from duo-admin):**

> "Contracts (Layer 4) are importable by the frontend without pulling in server-side packages."

The frontend imports `@duopool/contracts` for types and route shapes. It NEVER imports `@duopool/api` or `@duopool/database` directly. Tree-shaking + `exports` map enforce this.

### Layer 3 — Query function example (`packages/database/src/query/polls.ts`)

```ts
export async function listPolls(db: Database) {
  return db
    .select({ /* ... */ })
    .from(polls)
    .orderBy(asc(polls.createdAt));
}
```

Pure. No business logic. `db` is the first argument.

### Layer 4 — Contract example (`packages/contracts/src/polls.ts`)

```ts
import { oc } from "@orpc/contract";
import { selectPollSchema } from "@duopool/database/schema/zod";

export const pollsContract = {
  list: oc.route({ method: "GET", path: "/polls" }).output(z.array(selectPollSchema)),
  // ...
};
```

Imports allowed: `@orpc/contract`, `zod`, `@duopool/database/schema/zod` (drizzle-zod schemas only — pure Zod, no DB connection).

### Layer 5 — Procedure example (`packages/api/src/modules/polls/procedures/list.ts`)

```ts
import { db } from "@duopool/database";
import { listPolls } from "@duopool/database/query/polls";
import { pub } from "../../../orpc.ts";

export const listProc = pub.polls.list.handler(async () => {
  return listPolls(db);
});
```

`pub = implement(contract)`. No middleware chain — DuoPool is anonymous.

### Frontend — TanStack Query hook (`apps/web/modules/polls/api.ts`)

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-client";

export function usePolls() {
  return useQuery({
    queryKey: ["polls", "list"],
    queryFn: () => orpc.polls.list(),
  });
}
```

Components NEVER call `orpc` directly. Always go through `api.ts` hooks.

## Web App Module Architecture

`app/` is Next-opinionated only (routes, layouts, metadata). All feature logic lives in `modules/<name>/`.

**Module anatomy** (every feature follows this shape — same as duo-admin):

```
apps/web/modules/<feature>/
  components/     React components (PollList, PollPage, ResultsBar)
  api.ts          TanStack Query hooks (useQuery / useMutation wrappers)
  hooks/          custom hooks (use-voter-cookie, etc.)
  lib/            Zod schemas, columns, pure utilities for this feature
```

DuoPool currently has only one feature module: `modules/polls/`.

## Project Structure

```text
apps/
  web/                                  Next.js 16 App Router
    app/
      page.tsx                          Polls list (RSC importing client component)
      poll/[slug]/page.tsx              Poll detail (await params — Next 16)
      api/rpc/[[...rpc]]/route.ts       oRPC fetch handler
      providers.tsx                     QueryClientProvider
      layout.tsx                        Root layout
      globals.css                       Tailwind v4 + theme tokens
    lib/
      utils.ts                          cn() helper
      orpc-client.ts                    @orpc/client RPCLink → /api/rpc
    modules/polls/                      see Module Anatomy
    modules/ui/                         shadcn-style primitives (button.tsx, card.tsx)
    bunfig.toml                         preloads @duopool/test-config/frontend/setup
    AGENTS.md                           Next 16 warning — read before any Next code

packages/
  database/                             L1 + L2 + L3
    src/schema/polls.ts                 polls, poll_options, votes (Drizzle)
    src/schema/zod.ts                   drizzle-zod auto-derived
    src/query/polls.ts                  pure DB functions
    src/client.ts                       drizzle(pool, { schema })
    src/migrate.ts                      bun src/migrate.ts
    src/seed.ts                         bun src/seed.ts
    drizzle.config.ts
    drizzle/0000_*.sql
  contracts/                            L4
    src/polls.ts                        pollsContract
    src/index.ts                        contract barrel
  api/                                  L5
    src/orpc.ts                         pub = implement(contract)
    src/router.ts                       router shape mirroring contract
    src/modules/polls/procedures/       list.ts, get.ts, results.ts
  mocks/                                MSW v2 handlers + fixtures (frontend tests)
  test-config/                          shared test setup
    src/frontend/                       happy-dom + RTL setup
    src/backend/                        backend bun test setup
    src/msw/                            MSW server wiring
```

## Commands

```bash
bun install                             Install all deps
docker compose up -d                    Start local Postgres on :5434
bun --filter @duopool/database db:migrate
bun --filter @duopool/database db:seed
bun dev                                 Run apps/web dev server
bun turbo type-check                    Type-check all packages in parallel
bun turbo build                         Production build

# Quality + tests
bun verify                              type-check + lint + test (parallel) — must exit 0
bun check                               biome check . --write (format + lint + organize imports)
bun --filter @duopool/database test     Run a single package's tests
bun test apps/web/modules/polls/__tests__/PollList.test.tsx   Single test file
```

## Frontend Rules (mirrors duo-admin)

- Every `"use client"` component that fetches data uses hooks from `api.ts` — never call `orpc` directly
- Mutation invalidation OWNED by `api.ts` (in `onSuccess`). Components only do UI feedback (toast, close sheet, reset form)
- Loading states via Skeleton-style placeholders — never spinners for page content
- Use semantic CSS vars (`--primary`, `--muted-foreground`, etc.) — never hardcode colors
- Derive list item types from API output type — never duplicate manually
- `mutateAsync` + `try/catch` in form submits; `mutate` + callbacks for fire-and-forget actions

## Code Style

- **Functional programming**: use `function` keyword for pure functions; avoid classes in business logic
- **No `any`**: use `unknown` + explicit narrowing
- **No enums**: use `as const` maps
- **Naming**: kebab-case for files/dirs, PascalCase for components, camelCase for vars/functions
- **Imports**: named exports preferred; explicit `.ts` extension is required (Bun + tsconfig `allowImportingTsExtensions: true`)
- **Imports across packages**: import from the package's `exports` (e.g., `@duopool/database/query/polls`), never deep-import internal paths

## NEVER DO

- Never write duplicate Zod schemas by hand — always derive from `drizzle-zod` in `packages/database/src/schema/zod.ts`
- Never import `@duopool/api` or `@duopool/database` directly from `apps/web` components or pages — go through `apps/web/modules/<feature>/api.ts`
- Never put `invalidateQueries` inside a component callback — it lives in `api.ts`
- Never use `any` — use `unknown` + narrowing (enforced by Biome `noExplicitAny: error` — fails `bun verify`)
- Never use enums — `as const` maps (Biome `useEnumInitializers` + `useAsConstAssertion: error`)
- Never skip a layer in the 5-Layer Data Flow
- Never call `orpc.<...>` directly inside a React component
- Never add Hono unless we add a non-oRPC HTTP handler that needs it (we currently don't)
- Never accept Next.js < 16 (CVE-2025-29927)

## ⚠️ Reserved for the live demo (DO NOT IMPLEMENT)

The feature `polls.vote` is implemented LIVE on stage during the talk via `/duo.exec`. The following code paths are intentionally empty in this scaffold and **MUST NOT** be filled in by automated runs unless the operator explicitly asks for the live execution:

- L3 query: `castVote()` in `packages/database/src/query/polls.ts`
- L4 contract: `pollsContract.vote` in `packages/contracts/src/polls.ts`
- L5 procedure: `voteProc` in `packages/api/src/modules/polls/procedures/vote.ts` (file does not exist)
- Frontend api: `useVote()` in `apps/web/modules/polls/api.ts`
- Frontend UI: vote button onClick in `apps/web/modules/polls/components/PollPage.tsx`

The architecture, schema (with `UNIQUE (voter_cookie, poll_id)`), and surrounding infrastructure are all in place — the live demo just fills in these 5 specific spots, validating that a deterministic repository + the 5-Layer Flow lets an AI agent produce code that respects the architecture.

## Quality gates (mandatory per phase)

Every phase of work ends with `bun verify` exiting 0. The command runs `turbo type-check lint test` in parallel across all packages. A phase is NOT done if any of the gates is red.

```bash
bun verify
# turbo runs in parallel, in each package:
#   tsc --noEmit          (type-check)
#   biome lint .          (lint)
#   bun test              (test)
```

**TDD principle:** Tests come before (or alongside) implementation. Backend uses `bun test` against the `duopool_test` Postgres database (real DB, no mocks). Frontend uses `bun test` + happy-dom + React Testing Library + `@testing-library/jest-dom` for user-behavior tests, with MSW v2 from `@duopool/mocks` for network. Shared setup lives in `@duopool/test-config` with environment-scoped subpath exports (`/frontend`, `/frontend/setup`, `/backend`, `/backend/setup`, `/msw`) so frontend tests don't accidentally pull in `pg`/`drizzle-orm`. `apps/web/bunfig.toml` preloads `@duopool/test-config/frontend/setup`. See `.env.test`. Frontend test files live in `modules/<feature>/__tests__/` (not co-located).

### Frontend Testing Rules (mandatory for all NEW tests)

- **Test user-observable behavior only.** What the user clicks/types and what they see. Never internals (state, props, hook return values, internal `data-*` attributes).
- **Queries**: prefer `getByRole`, then `getByText`/`getByLabelText`. Use `findByRole` for async content. `getByTestId` only as last resort.
- **Interactions**: `await userEvent.click(...)` (not `fireEvent.click`). Use `userEvent.type`, `userEvent.keyboard`, etc. for the rest. **Exception**: complex pointer gestures (hold-to-commit, drag) have no clean userEvent abstraction — `fireEvent.pointerDown/Up` is the escape hatch; comment WHY.
- **Assertions**: `toBeInTheDocument()` for "is on screen", `toBeEnabled()`/`toBeDisabled()` for buttons, `toHaveValue()` for inputs. Never assert on class names or implementation-detail `data-*` attributes.
- **Mocks at the network boundary via MSW only.** Use `useMswServer()` from `@duopool/test-config/msw` and override per-test with `server.use(http.post(...))`. **Do NOT** `mock.module("@/modules/<feat>/api", ...)` or stub TanStack Query hooks — that tests the mock, not the component.
- **Exception**: `next/navigation` (`useRouter`) has no MSW analog; mocking it as a proxy for navigation is acceptable when the test asserts the user was taken to a new page.

Pre-existing tests written before this rule (`PollList.test.tsx`, `HoldButton.test.tsx`, `VoteScreen.test.tsx`, `ResultStage.test.tsx`, `StageView.test.tsx`) use `mock.module` for the api hook. They're grandfathered until the next refactor — but new tests MUST follow the rules above.

**Test infra gotchas (learned the hard way):**
- Schema-specific test helpers belong with the schema package (`packages/database`), not in `@duopool/test-config`. Only generic, environment-level infra goes in the shared package.
- Don't wrap `mock.module()` in a helper that lives in a different package than the test — Bun resolves the spec at the call site, so a wrapper in `@duopool/test-config` will fail to mock a module imported from `apps/web`.

**Live demo TDD asset:** `packages/database/src/query/polls.castVote.test.ts` is a pre-written, currently-skipped test suite for the feature that gets implemented during `/duo.exec` on stage. The skip is runtime-guarded so `bun verify` stays green until the live demo. After implementation, all 4 cases run. See ADR-006.

## Architectural decisions (ADRs)

All decisions live under `.claude/knowledge/decisions/`. Each ADR is short (Context / Decision / Consequences) and includes a Quality gate impact section.

| ADR | Topic |
|---|---|
| [001](.claude/knowledge/decisions/2026-04-26-001-five-layer-data-flow.md) | 5-Layer Data Flow inspired by duo-admin |
| [002](.claude/knowledge/decisions/2026-04-26-002-monorepo-bun-turborepo.md) | Monorepo with Bun workspaces + Turborepo |
| [003](.claude/knowledge/decisions/2026-04-26-003-vote-uniqueness-as-db-constraint.md) | 1-vote-per-cookie as atomic UNIQUE constraint |
| [004](.claude/knowledge/decisions/2026-04-26-004-postgres-driver-docker-to-neon.md) | Postgres via `drizzle-orm/node-postgres` for both Docker and Neon |
| [005](.claude/knowledge/decisions/2026-04-26-005-realtime-via-polling-not-websockets.md) | Live results via React Query polling, not WebSockets |
| [006](.claude/knowledge/decisions/2026-04-26-006-quality-gates-and-tdd-asset.md) | Quality gates per phase + TDD asset for live demo |
