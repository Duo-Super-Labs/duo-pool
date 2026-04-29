# Tasks — `polls.vote` feature

**Source:** `.duo/plan.md` (rehearsal pass on `rehearsal/live-demo-vote`)
**Total:** 6 tasks. Strictly sequential — earlier layers gate later ones (ADR-001 5-Layer Data Flow). Each task lists the AC IDs it satisfies; `bun verify` is the gate after every task.

---

## T01 — L3: implement `castVote()`

**File:** `packages/database/src/query/polls.ts`
**Acceptance:** AC-B1, AC-B2, AC-B3, AC-B4

Add an exported async function:

```ts
export async function castVote(
  db: Database,
  input: { pollId: string; pollOptionId: string; voterCookie: string },
): Promise<{ ok: true } | { alreadyVoted: true }> {
  try {
    await db.insert(votes).values({
      pollId: input.pollId,
      pollOptionId: input.pollOptionId,
      voterCookie: input.voterCookie,
    });
    return { ok: true };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return { alreadyVoted: true };
    }
    throw err;
  }
}
```

**Implementation rules:**
- Match the style of existing exports in this file (`listPolls`, `getPollBySlug`, `getResults`, `hasVoted`).
- Postgres error code `23505` is `unique_violation`. The `pg` driver surfaces it as `err.code`.
- Do NOT pre-check for existing votes. The race-free path is `INSERT` + catch.

**How to verify:** `bun --filter @duopool/database test`. The 4 cases in `polls.castVote.test.ts` flip from skipped → passing as soon as `typeof castVote === "function"` (the test file's runtime guard).

---

## T02 — L4: add `pollsContract.vote`

**File:** `packages/contracts/src/polls.ts`
**Acceptance:** AC-B5

In the `pollsContract` object, replace the commented-out `vote:` block with:

```ts
vote: oc
  .route({ method: "POST", path: "/polls/{slug}/vote" })
  .input(z.object({
    slug: z.string().min(1),
    pollOptionId: z.string().uuid(),
    voterCookie: z.string().min(1),
  }))
  .output(z.discriminatedUnion("status", [
    z.object({ status: z.literal("ok") }),
    z.object({ status: z.literal("alreadyVoted") }),
  ])),
```

**Test update:** in `packages/contracts/src/polls.test.ts`, replace the negative `vote` assertion:
- BEFORE: `expect("vote" in pollsContract).toBe(false);`
- AFTER: `expect(pollsContract.vote).toBeDefined();`

**How to verify:** `bun --filter @duopool/contracts test` — both cases (list/get/results/hasVoted shape + vote exists) pass.

---

## T03 — L5: create `voteProc`

**File NEW:** `packages/api/src/modules/polls/procedures/vote.ts`
**Acceptance:** AC-B7

```ts
import { db } from "@duopool/database";
import { castVote, getPollBySlug } from "@duopool/database/query/polls";
import { ORPCError } from "@orpc/server";
import { pub } from "../../../orpc.ts";

export const voteProc = pub.polls.vote.handler(async ({ input }) => {
  const poll = await getPollBySlug(db, input.slug);
  if (!poll) {
    throw new ORPCError("NOT_FOUND", { message: "Poll not found." });
  }

  const result = await castVote(db, {
    pollId: poll.id,
    pollOptionId: input.pollOptionId,
    voterCookie: input.voterCookie,
  });

  return "ok" in result
    ? ({ status: "ok" } as const)
    : ({ status: "alreadyVoted" } as const);
});
```

**Re-export:** add `export { voteProc } from "./vote.ts";` to `packages/api/src/modules/polls/procedures/index.ts`.

**No new test file.** AC-B7 is covered transitively by router shape (AC-B6) plus L3 cases (AC-B1..B4).

---

## T04 — L5 router: wire `vote: voteProc`

**File:** `packages/api/src/router.ts`
**Acceptance:** AC-B6

Add `vote: voteProc` to the `polls` block (and the comment about "When polls.vote is implemented" can be removed since it now is).

**Test update:** in `packages/api/src/router.test.ts`:
- The first test already lists `polls.vote` would need adding — change the assertion from "exposes polls.list / get / results / hasVoted" to also include `expect(router.polls.vote).toBeDefined();`.
- Replace the negative test "does NOT expose polls.vote — reserved for live demo" with a positive smoke or simply delete it (router.polls.vote is now part of the contract).

**How to verify:** `bun --filter @duopool/api test`.

---

## T05 — Frontend api: replace `useVote()` stub

**File:** `apps/web/modules/polls/api.ts`
**Acceptance:** AC-F1, AC-F2

Edits:

1. **Remove** the `VOTE_NOT_IMPLEMENTED_MESSAGE` export (this is the runtime guard for `VoteScreen.vote.test.tsx` — its absence flips the test from `describe.skip` to `describe`).
2. **Replace** the `useVote()` body. The current stub throws; the live version takes a `slug` (so it can call the route correctly) and resolves with the discriminated payload:

```ts
export function useVote(slug: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { pollOptionId: string; voterCookie: string }) =>
      orpc.polls.vote({ slug: slug!, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls", "results", slug] });
      queryClient.invalidateQueries({ queryKey: ["polls", "hasVoted", slug] });
    },
  });
}
```

3. **Update the comment block** at the top of the file: drop the "RESERVED LIVE-DEMO SLOT" warning since the slot is now filled.

**Note for the agent:** `VoteScreen` will need a tiny call-site change in T06 to pass `slug` to `useVote(slug)` and `voterCookie` to `mutateAsync`. Don't make that change here — keep the diff scoped.

---

## T06 — Frontend UI: handle `alreadyVoted` + lock after commit

**File:** `apps/web/modules/polls/components/VoteScreen.tsx`
**Acceptance:** AC-F3, AC-F4, AC-F5

Changes:

1. Call `useVote(poll.slug)` instead of `useVote()`.
2. Pass `voterCookie: voterId` from `useVoterCookie()` to `mutateAsync` along with `pollOptionId`. Drop `pollId` from the input (the procedure resolves slug→pollId server-side).
3. After `await vote.mutateAsync(...)`, branch on `result.status`:
   - `"ok"` → `router.push(\`/poll/\${poll.slug}/result\`)`
   - `"alreadyVoted"` → `setMessage({ kind: "already-voted", text: "Voto já registrado." })` and DO NOT navigate
4. Add `"already-voted"` to the `MessageState["kind"]` union and to the className branch (use `text-sm text-muted-foreground` like demo-pending — informational, not destructive).
5. After ANY successful `mutateAsync` (status ok OR alreadyVoted), set a local `committed = true` ref and pass `disabled={disabled || committed}` to every `<HoldButton>`. This satisfies AC-F5: no double commits.

**Existing `demo-pending` branch** can be removed (it's only reachable when the stub is in place; T05 removes the stub). Leave it for one commit if you want a safety net, but the AC tests don't require it.

**How to verify:** `bun --filter @duopool/web test` — `VoteScreen.test.tsx` (mock-based) still passes; `VoteScreen.vote.test.tsx` (runtime-skipped pre-T05) now activates and all 5 cases pass.

---

## Quality gate

Run after EACH task and at the end:

```bash
bun verify
```

Expected final state:

- `@duopool/database` — 11 + 4 castVote pass (no skips)
- `@duopool/contracts` — 2 pass (pollsContract.vote present, vote NOT-exposed assertion replaced)
- `@duopool/api` — 2 pass (router.polls.vote wired)
- `@duopool/web` — 8 + 5 vote pass (VoteScreen.test.tsx + VoteScreen.vote.test.tsx)
- `@duopool/motion`, `@duopool/mocks`, `@duopool/test-config` unchanged
- type-check + lint green everywhere

After AC-Q1 passes, commit with a message like `feat(polls): implement vote (live demo, end-to-end)` and tag `step-4-post-vote` for talk recovery.
