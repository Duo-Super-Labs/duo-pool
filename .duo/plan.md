# Plan — `polls.vote` feature

**Branch:** `rehearsal/live-demo-vote` (rehearsal of the live `/duo.exec` run)
**Date:** 2026-04-29 (talk day)
**Target:** Implement the only remaining slot reserved for the live demo. Everything else (schema, drizzle-zod, contracts package, router slot, frontend module, redesign, theme, motion) is already in `main`.

---

## Goal

Replace the `useVote()` stub and the absent `polls.vote` procedure/contract/query with a working end-to-end vote, atomically protected by `UNIQUE (voter_cookie, poll_id)`. After this run, holding a `<HoldButton>` on `/poll/<slug>` records a vote, navigates to `/poll/<slug>/result`, and the `<ResultStage>` polling picks up the new tally within 2s. A second hold from the same browser surfaces a "Voto já registrado" inline message with no navigation.

The agent never invents schema or middleware — every change targets a file already named in this plan.

---

## Acceptance criteria

Each AC maps to ONE test that proves it. Tests are **pre-written and runtime-skipped** until the matching code exists, mirroring the backend `polls.castVote.test.ts` pattern. When the agent's implementation flips the runtime guard, all ACs activate at once.

### Backend domain — L3 query

| ID | Acceptance criterion | Test |
|---|---|---|
| **AC-B1** | `castVote(db, { pollId, pollOptionId, voterCookie })` returns `{ ok: true }` for a fresh `(voterCookie, pollId)` pair | `packages/database/src/query/polls.castVote.test.ts` — case 1 |
| **AC-B2** | A second `castVote` with the same `(voterCookie, pollId)` returns `{ alreadyVoted: true }` (constraint on cookie+poll, NOT cookie+option) | case 2 |
| **AC-B3** | Different `voterCookie` values on the same `pollId` both succeed | case 3 |
| **AC-B4** | The same `voterCookie` can vote on multiple distinct `pollId`s | case 4 |

**Implementation rule** (per ADR-003): attempt `INSERT` without a pre-read; catch Postgres error code `23505` (unique_violation) and translate to `{ alreadyVoted: true }`. Re-throw any other error.

### Backend domain — L4 contract

| ID | Acceptance criterion | Test |
|---|---|---|
| **AC-B5** | `pollsContract.vote` exists with `input: { slug, pollOptionId, voterCookie }` and `output: discriminatedUnion("status", [{ok}, {alreadyVoted}])` | `packages/contracts/src/polls.test.ts` — replace the negative `vote` assertion with a positive shape check |

### Backend domain — L5 procedure + router

| ID | Acceptance criterion | Test |
|---|---|---|
| **AC-B6** | `router.polls.vote` is wired (procedure exists, exported from procedures barrel, mounted in router) | `packages/api/src/router.test.ts` — replace negative assertion with `expect(router.polls.vote).toBeDefined()` |
| **AC-B7** | `voteProc` resolves slug→pollId via `getPollBySlug`, throws `ORPCError("NOT_FOUND")` for missing slug, otherwise delegates to `castVote` | covered transitively by AC-B5 + AC-B6 + AC-B1..B4; no separate handler test required (TDD asset suffices) |

### Frontend domain — api hook

| ID | Acceptance criterion | Test |
|---|---|---|
| **AC-F1** | `useVote().mutateAsync({ pollId, pollOptionId })` calls `orpc.polls.vote(...)` (NOT the stub error) and resolves with the discriminated `{ status }` payload | `apps/web/modules/polls/components/__tests__/VoteScreen.vote.test.tsx` — runtime-skipped until stub is removed; case 1 |
| **AC-F2** | `useVote()` invalidates `["polls", "results", slug]` and `["polls", "hasVoted", slug]` on success (any status) | `VoteScreen.vote.test.tsx` — case 2 |

### Frontend domain — VoteScreen behavior

| ID | Acceptance criterion | Test |
|---|---|---|
| **AC-F3** | On `{ status: "ok" }`, `router.push("/poll/<slug>/result")` is called | `VoteScreen.vote.test.tsx` — case 3 |
| **AC-F4** | On `{ status: "alreadyVoted" }`, no navigation; an inline status with `data-message-kind="already-voted"` and text "Voto já registrado" appears | case 4 |
| **AC-F5** | After any committed vote (success path), the `<HoldButton>` row goes `disabled` so a second hold cannot fire | case 5 |

### Quality gate

| ID | Acceptance criterion | Test |
|---|---|---|
| **AC-Q1** | `bun verify` exits 0 with all packages green; the runtime-skipped test files (backend `castVote` + frontend `vote`) are now active and passing | `bun verify` |
| **AC-Q2** | The demo-pending test in `VoteScreen.test.tsx` still passes (mock-based, unaffected by implementation) | existing |

---

## Architecture (per ADR-001 — 5-Layer Data Flow)

Touches **6 spots in 4 packages**, in dependency order:

| Layer | File | Status before run | After |
|---|---|---|---|
| L3 query | `packages/database/src/query/polls.ts` | `castVote` stubbed in comment block | Add `castVote()` exported function |
| L4 contract | `packages/contracts/src/polls.ts` | `vote` commented out | Add `pollsContract.vote` |
| L5 procedure | `packages/api/src/modules/polls/procedures/vote.ts` | does not exist | NEW — `voteProc` |
| L5 router | `packages/api/src/router.ts` | excludes `vote` | Wire `vote: voteProc` under `polls`; update `router.test.ts` |
| Frontend api | `apps/web/modules/polls/api.ts` | `useVote` stub throws `VOTE_NOT_IMPLEMENTED_MESSAGE` | Replace stub `mutationFn` with `orpc.polls.vote(input)`. Remove `VOTE_NOT_IMPLEMENTED_MESSAGE` export. |
| Frontend UI | `apps/web/modules/polls/components/VoteScreen.tsx` | navigates on any success, treats throw as demo-pending | Differentiate `result.status === "ok"` vs `"alreadyVoted"`. On `alreadyVoted`, set `message.kind = "already-voted"`. Lock buttons after commit. |

Note: the older plan referenced `PollPage.tsx`. That file was replaced during the redesign — the vote-screen lives in `VoteScreen.tsx` now, composed of `<HoldButton>` primitives.

---

## Invariant (per ADR-003)

`UNIQUE (voter_cookie, poll_id)` is enforced at the schema level. The agent MUST NOT add an application-level "already voted" pre-check — the constraint is the source of truth, and the race-free path is `INSERT` + catch `23505`.

---

## Out of scope

- Vote retraction / change vote.
- Per-IP rate limiting.
- Admin UI for creating new polls.
- Auth / accounts.
- Animation polish on the result transition (post-talk).

---

## Test-driven sequence

The agent should follow this sequence to keep `bun verify` green incrementally:

1. **Backend tests already exist** (`polls.castVote.test.ts` is runtime-skipped) → implement `castVote()` first; tests activate automatically and turn green.
2. **Update `polls.test.ts` (contracts)** — flip the negative assertion → implement `pollsContract.vote` → green.
3. **Update `router.test.ts`** — flip the negative assertion → create `voteProc` + wire router → green.
4. **Frontend test stub** at `VoteScreen.vote.test.tsx` is runtime-skipped while `VOTE_NOT_IMPLEMENTED_MESSAGE` export exists → replace `useVote` stub body and remove the export → tests activate, MUST pass.
5. **Update `VoteScreen.tsx`** for the `alreadyVoted` branch and post-vote lock → AC-F4 and AC-F5 pass.

`bun verify` is the single source of "done".
