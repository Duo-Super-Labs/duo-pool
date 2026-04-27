# ADR-006: Quality gates per phase + TDD asset for the live demo

**Status:** Accepted
**Date:** 2026-04-26

## Context

The talk's thesis is *"AI amplifies your process — the better the process, the better the output"*. Shipping a demo without tests would undermine the message. Beyond philosophy, the live `/duo.exec` demo needs an artifact compelling enough to PROVE the thesis on stage in real time.

## Decision

Two coupled commitments:

### 1. Quality gates: every phase ends green

`bun verify` runs `turbo type-check lint test` in parallel across all packages. A phase is not "done" until that command exits 0.

- **Lint:** Biome 2.x at the root (single tool, mirrors duo-admin)
- **Type-check:** `tsc --noEmit` per package, in parallel
- **Tests:** `bun test` (native, no Jest); real Postgres for backend (`duopool_test`); React Testing Library + happy-dom for frontend behavior

### 2. TDD asset for the live demo

The single feature reserved for the live demo (`polls.vote`) is backed by a **pre-written, currently-failing** test file:

```
packages/database/src/query/polls.castVote.test.ts   (4 cases, currently SKIPPED)
```

The skip is runtime-guarded: `typeof pollsModule.castVote === "function" ? describe : describe.skip`. Until `castVote` is implemented, suites skip and `bun verify` stays green. Once implemented, all 4 cases run.

On stage during `/duo.exec`, the agent reads the test, implements `castVote()` in `query/polls.ts`, then `bun test` to validate. **Real TDD on stage.**

## Consequences

- **(+)** Every commit is a known-good baseline. Reverting to any tagged checkpoint produces a working app.
- **(+)** The live demo's output is *measurable*: tests went from skipped → all green. Audience can see the green checkmarks themselves; no hand-waving.
- **(+)** Reduces live demo risk. The agent has tests as a goal, not "produce code I'll judge by eye". If it generates wrong code, tests fail and the agent self-corrects.
- **(+)** Pedagogically: this is the strongest possible argument for "Engenharia de Contexto". The repo's pre-existing structure (5 layers + tests + ADRs) drives the AI to a correct implementation.
- **(−)** If we mis-write the failing tests (over-specified, under-specified, wrong shape), the agent's output gets graded against the wrong rubric. Mitigated by the rehearsal pass on T-1.
- **(−)** Initial setup cost: getting bun test + happy-dom + RTL + Drizzle test DB to all work together took ~30min (real time). Acceptable; reusable.

## Quality gate impact

This ADR *is* the quality gate. From here forward, any new feature in DuoPool must:
1. Have a test (TDD) before merge
2. Land in a commit where `bun verify` exits 0
3. Mention the gate result in the commit body when relevant
