# Frontend Redesign — DuoPool

**Date:** 2026-04-28
**Author:** brainstorming session (`/brainstorming`)
**Status:** Design approved by user; awaiting spec review before plan generation
**Timeline:** Post-talk OR isolated worktree (talk is 2026-04-29; this redesign is 1-2 days of work)

## Goal

Lift DuoPool from the current functional-but-bare scaffold into a phone-first, two-screen demo with a dramatic fullscreen result. Add a projector-only `/stage/[slug]` route, a hold-to-commit voting ritual, and `framer-motion`-driven transitions. Visual identity (palette, typography, pop-culture theming) is deliberately deferred.

## Non-goals

- Authentication, organizations, or user accounts (DuoPool stays anonymous; ADR-001 holds).
- Replacing oRPC or adding Hono (CLAUDE.md `NEVER DO` constraints respected).
- Implementing `polls.vote` (live demo slot — assumed already implemented when this work starts).
- Visual identity / brand decisions (palette, fonts, pop-culture per-poll theming) — deferred to a follow-up brainstorm.
- Vote retraction, admin UI for poll creation, per-IP rate limiting (out of scope per `.duo/plan.md`).

## Decisions (from brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Primary north star | **Phone-first** (audience scans QR, votes from their phone) |
| 2 | Page structure | **Two-screen** — vote screen → fullscreen result screen, separate URLs |
| 3 | Result screen treatment | **Big winner stat** — 64px % of leader, runner-up as small footer |
| 4 | Vote interaction | **Hold-to-commit ~1s ritual** — gradient fills option, vibrate on commit |
| 5 | Returning-user behavior | **Auto-skip to result** — server-side redirect, no flash of vote UI |
| 6 | Visual identity | **Deferred** — placeholder tokens only |
| 7 | Implementation scope | **#3 full polish** — route-split + framer-motion + stage route + dark theme tokens |
| 8 | Execution | **Parallel agents** — 5 agents across 2 waves in isolated worktrees |

## Architecture

### Routes

```
app/
  page.tsx                              Home (lista de polls — baixa prioridade, mantém atual)
  poll/[slug]/
    page.tsx                            Vote screen (RSC; server-side redirect se já votou)
    result/
      page.tsx                          Result screen (fullscreen big-winner)
  stage/[slug]/
    page.tsx                            Projector mode (no vote UI, horizontal layout)
  api/rpc/[[...rpc]]/route.ts           oRPC handler (existing, unchanged)
```

### 5-Layer Data Flow additions

Honors ADR-001. New feature: `polls.hasVoted`.

| Layer | File | Change |
|---|---|---|
| L3 query | `packages/database/src/query/polls.ts` | Add `hasVoted(db, { voterId, pollId })` → `Promise<boolean>`. Reuses `UNIQUE(voter_cookie, poll_id)` index. |
| L4 contract | `packages/contracts/src/polls.ts` | Add `pollsContract.hasVoted` with input `{ slug }` (server resolves slug → pollId), output `{ voted: boolean }`. |
| L5 procedure | `packages/api/src/modules/polls/procedures/has-voted.ts` (new) | `hasVotedProc = pub.polls.hasVoted.handler(...)`. Reads cookie via oRPC context. |
| L5 router | `packages/api/src/router.ts` | Wire `hasVoted: hasVotedProc` under `polls`. |
| Frontend api | `apps/web/modules/polls/api.ts` | Add `useHasVoted(slug)` for client-side fallback (e.g., during hot-reload). |

### Server-side redirect

`app/poll/[slug]/page.tsx` (RSC):

```ts
export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;                          // Next 16 async params
  const cookieStore = await cookies();                    // next/headers
  const voterId = cookieStore.get("dp_voter")?.value;
  const poll = await getPollBySlug(db, slug);

  if (voterId && (await hasVoted(db, { voterId, pollId: poll.id }))) {
    redirect(`/poll/${slug}/result`);                     // server-side, no flash
  }

  return <VoteScreen poll={poll} />;
}
```

### New package: `@duopool/motion`

```
packages/motion/
  src/
    index.ts                  re-exports `motion`, `AnimatePresence` from framer-motion
    variants.ts               fadeUp, screenSwap, holdProgress
  package.json                exports map: ".", "./variants"
  tsconfig.json
```

**Rationale:** centralizes animation imports (one mock target in tests, easy to swap engine later). Tradeoff is one more package; accepted for test isolation.

### Components

| Component | File | Responsibility |
|---|---|---|
| `<HoldButton>` | `apps/web/modules/polls/components/HoldButton.tsx` | Primitive hold-to-commit gesture. Props: `label`, `accent`, `onCommit`, `holdMs?` (default 1000), `disabled?`. Pointer events drive a `progress` state; gradient-fills the button left-to-right; calls `onCommit` at 100% and triggers `navigator.vibrate?.(50)`. Keyboard fallback: Space hold. |
| `<VoteScreen>` | `apps/web/modules/polls/components/VoteScreen.tsx` | Composes `<HoldButton>` per option. On commit, calls `useVote().mutateAsync(...)`, then `router.push(\`/poll/\${slug}/result\`)`. Errors → toast + back to idle. |
| `<ResultStage>` | `apps/web/modules/polls/components/ResultStage.tsx` | Fullscreen winner. Top: live badge + total. Center: 64px-clamped % font-black. Sub: leader name. Bar: 4px line at leader %. Footer: runner-up + (optional) "✓ Você votou X". Polls via `usePollResults(slug)`. |
| `<StageView>` | `apps/web/modules/polls/components/StageView.tsx` | Projector mode, horizontal 16:9 layout. Question + total left, leader % (~240px) right, runner-up smaller. No vote, no "you voted". |

### State model

| State | Owner | Mechanism |
|---|---|---|
| `voterId` (cookie `dp_voter`) | Server (`cookies()`) + client (`useVoterCookie`) | Server reads via `next/headers`; client reads `document.cookie` and sets if missing |
| Has voted? | Server (RSC redirect) | New L3 query `hasVoted`, called inline in `app/poll/[slug]/page.tsx` |
| Vote mutation | Client (`useVote`) | Existing; LIVE DEMO slot — assumed implemented before this work starts |
| Live results | Client (`usePollResults`) | Existing; `refetchInterval: 2000` |
| Hold progress | Local in `<HoldButton>` | `useState` + `useRef` for timer ID |
| Current screen | URL routing (`/poll/[slug]` vs `/poll/[slug]/result`) | No global client state |

### Theme tokens (placeholder, identity deferred)

`apps/web/app/globals.css` additions to `:root` (and dark mode override):

```css
--accent-primary: hsl(48 96% 53%);     /* gold; hold gradient leader */
--accent-secondary: hsl(217 91% 60%);  /* blue; hold gradient runner-up */
--stage-bg: hsl(0 0% 0%);              /* true black for ResultStage / StageView */
--stage-fg: hsl(0 0% 100%);
--pulse-live: hsl(142 76% 56%);        /* live badge dot */
```

Components reference these via `var(--token)` only — never hardcoded HSL. Swapping the identity later is a single-file edit.

## Files touched (estimate)

```
packages/database/src/query/polls.ts                              (modified)
packages/database/src/query/polls.hasVoted.test.ts                (new)
packages/contracts/src/polls.ts                                   (modified)
packages/contracts/src/polls.test.ts                              (modified)
packages/api/src/modules/polls/procedures/has-voted.ts            (new)
packages/api/src/router.ts                                        (modified)
packages/api/src/router.test.ts                                   (modified)
packages/motion/                                                  (new package, ~5 files)
apps/web/app/poll/[slug]/page.tsx                                 (refactor → RSC redirect)
apps/web/app/poll/[slug]/result/page.tsx                          (new)
apps/web/app/stage/[slug]/page.tsx                                (new)
apps/web/app/globals.css                                          (modified — token additions)
apps/web/modules/polls/components/HoldButton.tsx                  (new)
apps/web/modules/polls/components/VoteScreen.tsx                  (new)
apps/web/modules/polls/components/ResultStage.tsx                 (new)
apps/web/modules/polls/components/StageView.tsx                   (new)
apps/web/modules/polls/components/__tests__/HoldButton.test.tsx   (new)
apps/web/modules/polls/components/__tests__/VoteScreen.test.tsx   (new)
apps/web/modules/polls/components/__tests__/ResultStage.test.tsx  (new)
apps/web/modules/polls/components/__tests__/StageView.test.tsx    (new)
apps/web/modules/polls/api.ts                                     (modified — add useHasVoted)
```

~21 files (12 new, 9 modified).

## Test strategy

| Track | Tool | Cases |
|---|---|---|
| L3 `hasVoted` | `bun test` against `duopool_test` Postgres | (a) no vote → `false`; (b) with vote → `true`; (c) different cookie same poll → `false`; (d) same cookie different poll → `false` |
| L4 contract | type test (existing pattern) | `pollsContract.hasVoted` shape compiles, output schema validates |
| L5 procedure | handler test | returns `{ voted: bool }` for given input |
| `<HoldButton>` | RTL + `userEvent` + `vi.useFakeTimers()` | (a) commit at `holdMs`; (b) cancel on early `pointerup`; (c) `disabled` ignores; (d) Space-key fallback works |
| `<VoteScreen>` | RTL + MSW (`@duopool/mocks`) | (a) hold dispatches `useVote`; (b) success navigates; (c) error toasts |
| `<ResultStage>` | RTL + MSW | (a) renders leader %; (b) "you voted" only when cookie present; (c) refetch every 2s |
| `<StageView>` | RTL + MSW | renders without vote chrome |
| Server-side redirect | E2E (Playwright, **deferred** — manual verification on PR) | `dp_voter` cookie present + voted → redirected to `/result` |

`bun verify` must exit 0 across all packages. Pre-existing `polls.castVote.test.ts` remains runtime-skipped (untouched by this work).

## Parallel execution plan

5 agents in 2 waves, isolated `git worktree`s, sequential merges after review.

```
Wave 1 (parallel — A, B, E):
  A. Backend       packages/database, packages/contracts, packages/api
                   adds: hasVoted query/contract/procedure/router/tests
  B. Motion        new packages/motion/ (framer-motion wrapper + variants)
  E. Theme tokens  apps/web/app/globals.css (additions only, ~10 lines)

Wave 2 (parallel — C, D, depends on Wave 1 merging):
  C. Vote screen   apps/web/modules/polls/components/HoldButton.tsx, VoteScreen.tsx,
                   refactor app/poll/[slug]/page.tsx (RSC redirect using A)
                   ★ owns apps/web/modules/polls/api.ts (adds useHasVoted)
                   tests for HoldButton + VoteScreen
  D. Result+Stage  apps/web/modules/polls/components/ResultStage.tsx, StageView.tsx,
                   app/poll/[slug]/result/page.tsx, app/stage/[slug]/page.tsx
                   only consumes existing hooks from api.ts (does NOT modify it)
                   tests for both
```

- **Branch convention:** `feat/redesign-{a,b,c,d,e}`
- **Worktree:** each agent runs in `git worktree add ../duo-pool-redesign-<letter> feat/redesign-<letter>`
- **Quality gate:** each track only opens its PR after `bun verify` exits 0 in its worktree
- **Merge order:** A → B → E (any order in Wave 1) → C → D
- **Orchestrator:** `dmux` or `devfleet` (decided in `writing-plans`)

**Wall-clock estimate:** Wave 1 ~3-4h, Wave 2 ~4-5h. Total ~1 working day if no surprises.

## Dependencies

- New: `framer-motion` in `packages/motion/` and `apps/web/`
- Existing: `next/headers` (for `cookies()`); `@duopool/mocks` (MSW); RTL + happy-dom
- No DB migration needed — `votes` table with `UNIQUE(voter_cookie, poll_id)` already exists

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Live demo slot (`polls.vote`) not yet implemented when this work begins | Spec assumes post-talk timeline. If pre-talk, gate `<VoteScreen>` to a "demo not yet wired" state OR run `/duo.exec` first. |
| RSC + cookie reading race on hot-reload | Client-side `useHasVoted` as fallback re-check; if mismatch, client navigates |
| Framer Motion bundle size | Only imported where needed; `packages/motion/` re-exports tree-shake-friendly |
| Worktree merges accumulate conflict in `apps/web/modules/polls/` | Strict file ownership per track (no overlap in modified files); if conflict, rebase later track |
| Visual identity TBD blocks visual QA | Placeholder tokens look acceptable enough for staging review; full QA after identity decision |

## Open questions (resolved before plan)

None remaining for design phase. The following are explicitly deferred to follow-up specs:

- Visual identity (palette, fonts, pop-culture theming per poll vs unified brand)
- E2E test infrastructure for server-side redirect
- Home page (`/`) redesign (kept as-is for this iteration)
- Empty / error / connection-lost states (handled inline with current toast pattern; full UX pass deferred)
