# Plan — `polls.vote` feature

**Generated:** 2026-04-26 (T-3)
**Target:** Implement the missing piece reserved for the live demo on stage.
**Status:** Ready for `/duo.exec` execution. All upstream artifacts (schema, drizzle-zod, contracts package, procedures router slot, frontend module shape, tests) are in place.

---

## Goal

Make `bun verify` exit 0 with **all four `castVote` test cases passing** (currently runtime-skipped). Ship a working vote button end-to-end.

## Acceptance criteria

1. `packages/database/src/query/polls.castVote.test.ts` — 4 cases pass (no skips):
   - inserts a vote and returns `{ ok: true }`
   - second vote from same cookie on same poll returns `{ alreadyVoted: true }`
   - different cookies on same poll both succeed
   - same cookie can vote on different polls
2. `packages/contracts/src/polls.test.ts` updates: `pollsContract.vote` exists.
3. `packages/api/src/router.test.ts` updates: `router.polls.vote` exists.
4. `bun verify` exits 0 (type-check + lint + test green across all packages).
5. Manual: clicking "Votar" in `/poll/<slug>` posts a vote and the live results update within 2 seconds. Voting again with the same cookie shows an "already voted" UI state.

## Architecture (per ADR-001 — 5-Layer Data Flow)

This feature touches **5 files in 4 packages**, in order:

| Layer | File | What changes |
|---|---|---|
| L3 query | `packages/database/src/query/polls.ts` | Add `castVote()` exported function |
| L4 contract | `packages/contracts/src/polls.ts` | Add `pollsContract.vote` |
| L5 procedure | `packages/api/src/modules/polls/procedures/vote.ts` | NEW file — `voteProc` |
| L5 router | `packages/api/src/router.ts` | Wire `vote: voteProc` under `polls` |
| Frontend api | `apps/web/modules/polls/api.ts` | Add `useVote()` mutation hook |
| Frontend UI | `apps/web/modules/polls/components/PollPage.tsx` | Wire button onClick → `useVote().mutateAsync` |

## Invariant (per ADR-003)

`UNIQUE (voter_cookie, poll_id)` is already in `packages/database/src/schema/polls.ts`. The implementation MUST:

- Attempt insert without a pre-read.
- Catch Postgres error code `23505` (`unique_violation`) and return `{ alreadyVoted: true }`.
- Return `{ ok: true }` on successful insert.

## Out of scope

- Vote retraction / change vote.
- Per-IP rate limiting.
- Admin UI for creating new polls.
- Auth / accounts.
