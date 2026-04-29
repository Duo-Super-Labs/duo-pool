# Frontend Redesign — DuoPool

**Date:** 2026-04-28
**Author:** brainstorming session (`/brainstorming`)
**Status:** Design approved by user; awaiting spec review before plan generation
**Timeline:** Post-talk OR isolated worktree (talk is 2026-04-29; this redesign is 1-2 days of work)

## Goal

Lift DuoPool from the current functional-but-bare scaffold into a phone-first, two-screen demo with a dramatic fullscreen result. Add a projector-only `/stage/[slug]` route, a hold-to-commit voting ritual, `framer-motion`-driven transitions, and a synthwave/cyberpunk dark theme (defaulted on; light theme available as fallback).

## Non-goals

- Authentication, organizations, or user accounts (DuoPool stays anonymous; ADR-001 holds).
- Replacing oRPC or adding Hono (CLAUDE.md `NEVER DO` constraints respected).
- Implementing `polls.vote` (live demo slot — assumed already implemented when this work starts).
- Per-poll pop-culture theming (one unified palette is shipped now; per-poll color stories deferred).
- Dark mode toggle UI (dark is hardcoded `<html class="dark">`; toggle is post-talk).
- Vote retraction, admin UI for poll creation, per-IP rate limiting (out of scope per `.duo/plan.md`).

## Decisions (from brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Primary north star | **Phone-first** (audience scans QR, votes from their phone) |
| 2 | Page structure | **Two-screen** — vote screen → fullscreen result screen, separate URLs |
| 3 | Result screen treatment | **Big winner stat** — 64px % of leader, runner-up as small footer |
| 4 | Vote interaction | **Hold-to-commit ~1s ritual** — gradient fills option, vibrate on commit |
| 5 | Returning-user behavior | **Auto-skip to result** — server-side redirect, no flash of vote UI |
| 6 | Visual identity | **Synthwave dark (default) + soft purple light** — full token system in OKLCH, dark hardcoded via `<html class="dark">` |
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

### Theme (visual identity)

**Vibe:** synthwave/cyberpunk dark default + soft purple/teal/cyan light fallback. Dark is the "show" theme — hardcoded via `<html class="dark">` until a toggle is added post-talk.

**Color system:** OKLCH throughout (perceptual lightness, wider gamut than HSL). Light and dark modes share a token vocabulary (`--background`, `--foreground`, `--primary`, `--secondary`, `--accent`, `--destructive`, `--muted`, `--border`, `--ring`, `--card`, `--popover`, `--sidebar*`, `--chart-1..5`).

**Highlights (dark mode — the talk's primary look):**
- `--background: oklch(0 0 0)` — true black
- `--primary: oklch(0.6182 0.2788 321.6143)` — vivid magenta/pink (hold gradient leader)
- `--secondary: oklch(0.7858 0.1553 166.4670)` — teal-green (runner-up accent)
- `--accent: oklch(0.7786 0.1489 226.0174)` — cyan
- Border radius `0` (sharp synthwave corners)
- Shadow color `hsl(280 100% 50%)` with `0 0 20px 2px` glow on every elevation step (`--shadow-2xs` through `--shadow-2xl`)

**Highlights (light mode — fallback for testing/post-talk):**
- `--primary: oklch(0.5287 0.2570 302.2604)` — vivid purple
- `--secondary: oklch(0.7858 0.1553 166.4670)` — same teal as dark
- `--accent: oklch(0.7786 0.1489 226.0174)` — same cyan
- Border radius `0.5rem`
- Soft drop shadows (`hsl(0 0% 0% / 0.10)`)

**Typography:**
- Sans (light): **Inter** via `next/font/google` — variable `--font-sans-light`
- Sans (dark): **Orbitron** via `next/font/google` — variable `--font-sans-dark` (geometric sci-fi)
- Mono (light): **JetBrains Mono** — variable `--font-mono-light`
- Mono (dark): **Space Mono** (weights 400, 700) — variable `--font-mono-dark`
- Serif (both modes): **Georgia** (system font; CSS fallback only — NOT loaded via `next/font/google` because Georgia is not on Google Fonts)

CSS resolves `--font-sans` and `--font-mono` to the appropriate variable based on `:root` vs `.dark`:

```css
:root  { --font-sans: var(--font-sans-light), system-ui, sans-serif; }
.dark  { --font-sans: var(--font-sans-dark), sans-serif; }
:root  { --font-mono: var(--font-mono-light), monospace; }
.dark  { --font-mono: var(--font-mono-dark), monospace; }
```

**Class-based dark mode:** `@custom-variant dark (&:is(.dark *))`. The `<html>` element gets `class="dark"` hardcoded for now (no toggle, no `prefers-color-scheme`).

**Typographic refinements:** baseline `letter-spacing: var(--tracking-normal)` (`0.02em`); utilities `--tracking-tighter` through `--tracking-widest` available.

Full CSS lives in `apps/web/app/globals.css` (replaces the current placeholder file). Components reference tokens via `var(--token)` only — no hardcoded colors anywhere.

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
apps/web/app/globals.css                                          (full replacement — synthwave theme)
apps/web/app/layout.tsx                                           (modified — load 4 fonts, set <html class="dark">)
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

~22 files (12 new, 10 modified).

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
  E. Theme + fonts apps/web/app/globals.css (full replacement, ~150 lines OKLCH theme)
                   apps/web/app/layout.tsx (load Inter, Orbitron, JetBrains_Mono,
                     Space_Mono via next/font/google; set <html class="dark">)
                   shadcn-ui components updated to consume new tokens (only if any
                     existing component breaks); install missing components via the
                     shadcn-ui MCP server as needed

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

**Wall-clock estimate:** Wave 1 ~4-5h (Track E grew with the full theme), Wave 2 ~4-5h. Total ~1-1.5 working days.

## Dependencies

- New runtime: `framer-motion` in `packages/motion/` and `apps/web/`
- New fonts (loaded via `next/font/google`): `Inter`, `Orbitron`, `JetBrains_Mono`, `Space_Mono`. **Do NOT** import `Georgia` from `next/font/google` (it's not a Google font; CSS `Georgia, serif` system fallback handles it).
- Tooling: shadcn-ui MCP server for adding any missing primitives (Toast/Sonner, Dialog, etc.) at implementation time. Components installed as needed; no upfront list.
- Existing: `next/headers` (for `cookies()`); `@duopool/mocks` (MSW); RTL + happy-dom
- No DB migration needed — `votes` table with `UNIQUE(voter_cookie, poll_id)` already exists

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Live demo slot (`polls.vote`) not yet implemented when this work begins | Spec assumes post-talk timeline. If pre-talk, gate `<VoteScreen>` to a "demo not yet wired" state OR run `/duo.exec` first. |
| RSC + cookie reading race on hot-reload | Client-side `useHasVoted` as fallback re-check; if mismatch, client navigates |
| Framer Motion bundle size | Only imported where needed; `packages/motion/` re-exports tree-shake-friendly |
| Worktree merges accumulate conflict in `apps/web/modules/polls/` | Strict file ownership per track (no overlap in modified files); if conflict, rebase later track |
| Class-based dark mode regression on existing components | Track E does a smoke pass on `PollList` + `Card` + `Button` after CSS swap; any broken component is updated to use new tokens before opening PR |
| Font flash (FOUC) on first paint | `next/font/google` is loaded server-side and inlined; `<html class="dark">` is hardcoded so no JS runs before paint to flip themes |
| Wave 2 components depend on tokens that Wave 1 ships | Hard-gate: Wave 2 only starts once Track E PR is merged |

## Open questions (resolved before plan)

None remaining for design phase. The following are explicitly deferred to follow-up specs:

- Per-poll pop-culture theming (Star Wars colors for "Sith vs Jedi", etc.) — current iteration ships one unified synthwave palette
- Dark mode toggle UI — dark is hardcoded for now
- E2E test infrastructure for server-side redirect
- Home page (`/`) redesign (kept as-is for this iteration)
- Empty / error / connection-lost states (handled inline with current toast pattern; full UX pass deferred)
