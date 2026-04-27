# ADR-003: 1-vote-per-cookie as an atomic UNIQUE constraint

**Status:** Accepted
**Date:** 2026-04-26

## Context

DuoPool's headline business rule is *"one vote per device per poll"*. The naive implementation is application-level: read existing votes for `(voterCookie, pollId)`, decide, then insert. This has a race window: two concurrent requests with the same cookie can both pass the read-side check and both insert.

We need a guarantee that survives concurrent traffic (the live demo will get ~125 audience votes in a short window) and that's *visible* enough to use as a teaching moment — code that reads "tries to insert, falls back gracefully on conflict" is better than code that reads as a rule.

## Decision

The invariant lives in the **database schema** as a UNIQUE composite constraint:

```sql
UNIQUE (voter_cookie, poll_id)  -- on the votes table
```

Application code (L3 `castVote()` query function) attempts the insert and catches Postgres error code **23505** (`unique_violation`). On conflict, returns `{ alreadyVoted: true }`. The L5 procedure converts that to an oRPC response.

## Consequences

- **(+)** Atomicity guaranteed by Postgres — no race window, even under high concurrency.
- **(+)** Single source of truth for the invariant: the schema. Application code follows.
- **(+)** Pedagogically clear: in the live demo, audience can see (a) the constraint declared in `schema/polls.ts`, (b) the error catch in `query/polls.ts`, (c) the API response shape — invariant traverses 3 layers without losing identity.
- **(−)** Couples to Postgres-specific error code 23505. Mitigated by introducing a thin `isUniqueViolation()` helper if we ever migrate. Acceptable: DuoPool stays on Postgres (Docker → Neon).
- **(−)** Cookies are spoofable. Acceptable for an anonymous live polls app — the goal is friction, not security. A determined attacker is out of scope.

## Quality gate impact

Tests in `packages/database/src/query/polls.castVote.test.ts` cover four scenarios: first vote success, second vote from same cookie returns `alreadyVoted`, different cookies on same poll both succeed, same cookie can vote on different polls. These tests are pre-written and FAILING — implementation happens during the live demo (`/duo.exec`).
