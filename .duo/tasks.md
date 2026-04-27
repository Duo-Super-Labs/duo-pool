# Tasks — `polls.vote` feature

**Source:** `.duo/plan.md` (refined)
**Total:** 6 tasks. Sequential — earlier layers are dependencies for later ones, per ADR-001 (5-Layer Data Flow).

---

## T01 — L3: implement `castVote()` in `packages/database/src/query/polls.ts`

**File:** `packages/database/src/query/polls.ts`

Add an exported async function:

```ts
export async function castVote(
  db: Database,
  input: { pollId: string; pollOptionId: string; voterCookie: string },
): Promise<{ ok: true } | { alreadyVoted: true }>
```

Behavior:
1. `db.insert(votes).values({...input}).returning()`.
2. Wrap in `try / catch`. On Postgres error code `23505` (`unique_violation`), return `{ alreadyVoted: true }`. Re-throw anything else.
3. On success, return `{ ok: true }`.

Reference: existing functions in this file (`listPolls`, `getPollBySlug`, `getResults`) for style. The error code check can use `pg`'s typed error: `(err as { code?: string }).code === "23505"`.

**Acceptance:** `bun --filter @duopool/database test` runs all 11 cases, with the 4 castVote cases passing instead of skipping.

---

## T02 — L4: add `pollsContract.vote` in `packages/contracts/src/polls.ts`

**File:** `packages/contracts/src/polls.ts`

Add to the `pollsContract` object:

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

**Acceptance:** Update `packages/contracts/src/polls.test.ts` so it asserts `pollsContract.vote` exists (remove the "does NOT expose vote" test, replace with positive assertion). All 3 contract tests pass.

---

## T03 — L5: create `packages/api/src/modules/polls/procedures/vote.ts`

**File NEW:** `packages/api/src/modules/polls/procedures/vote.ts`

Implements the procedure:

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
    ? { status: "ok" as const }
    : { status: "alreadyVoted" as const };
});
```

Also re-export from `packages/api/src/modules/polls/procedures/index.ts`.

---

## T04 — L5 router: wire `vote: voteProc` in `packages/api/src/router.ts`

**File:** `packages/api/src/router.ts`

Add `vote: voteProc` to the `polls` object. Update the smoke test in `packages/api/src/router.test.ts` to assert `router.polls.vote` exists (replace the negative assertion).

---

## T05 — Frontend api: `useVote()` in `apps/web/modules/polls/api.ts`

**File:** `apps/web/modules/polls/api.ts`

Add a TanStack Query mutation hook. Invalidation lives HERE (per duo-admin convention).

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useVote(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { pollOptionId: string; voterCookie: string }) =>
      orpc.polls.vote({ slug: slug!, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["polls", "results", slug] });
    },
  });
}
```

---

## T06 — Frontend UI: wire button onClick in `PollPage.tsx`

**File:** `apps/web/modules/polls/components/PollPage.tsx`

- Replace the placeholder `onVote` and `voteEnabled = false` with a call to `useVote(slug)`.
- On click, `mutateAsync({ pollOptionId: selected, voterCookie: voterId })`.
- On success of result `{ status: "alreadyVoted" }`, surface a small UI hint ("Voto já registrado.") in `PollPage` state.
- Disable the button while pending and after a successful vote.

**Acceptance:** `bun verify` exits 0. Manual smoke: vote on `/poll/vibecoding-vs-eng-contexto`, results update within 2s, second vote shows alreadyVoted state.

---

## Quality gate (final)

After all 6 tasks complete:

```
bun verify
# expected:
#   @duopool/database    7 + 4 castVote pass (no skips)
#   @duopool/contracts   3 pass (with vote assertion)
#   @duopool/api         2 pass (router exposes vote)
#   @duopool/web         2 pass
#   type-check + lint    green everywhere
```

Then commit and tag `step-4-post-vote`. The talk recovers from this tag if anything breaks live.
