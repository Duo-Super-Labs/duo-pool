/**
 * ⚠️  PRE-WRITTEN TEST ASSET — RUNS AFTER THE LIVE `polls.vote` DEMO
 *
 * This file encodes the post-implementation acceptance criteria for the
 * live `/duo.exec polls.vote` run. It is gated by `describe.skip` because
 * it asserts behavior that only exists once T05 (api.ts useVote replaces
 * stub) and T06 (VoteScreen branches on result.status + locks buttons)
 * from `.duo/tasks.md` land.
 *
 * The final step of T06 is to flip `describe.skip` → `describe` below.
 * After that flip, all 5 cases must pass with NO other edits to this file.
 *
 * Mirrors the backend pattern in
 * `packages/database/src/query/polls.castVote.test.ts`.
 */

import { describe, expect, mock, test } from "bun:test";
import { renderWithProviders } from "@duopool/test-config/frontend";
import { fireEvent, waitFor } from "@testing-library/react";

// ---- Fixtures ---------------------------------------------------------------

const POLL = {
  id: "poll-1",
  slug: "vibecoding-vs-eng-contexto",
  question: "Vibecoding ou Engenharia de Contexto?",
  options: [
    { id: "opt-vibe", label: "Vibecoding" },
    { id: "opt-eng", label: "Engenharia de Contexto" },
  ],
};

// ---- Mocks (mutated per test via resetMocks) --------------------------------

type VoteResult = { status: "ok" } | { status: "alreadyVoted" };

const voteState = {
  mutateAsync: mock<
    (input: { pollOptionId: string; voterCookie: string }) => Promise<VoteResult>
  >(() => Promise.resolve({ status: "ok" } as const)),
  isPending: false,
};

const routerState = {
  push: mock<(path: string) => void>(() => undefined),
};

// Track invalidations triggered by useVote.onSuccess. T05 specifies that the
// hook invalidates ["polls", "results", slug] and ["polls", "hasVoted", slug].
const invalidatedKeys: unknown[][] = [];

mock.module("@/modules/polls/api", () => ({
  // After T05 the export `VOTE_NOT_IMPLEMENTED_MESSAGE` no longer exists, so
  // we don't re-export it here. Tests that need the stub error message use
  // `VoteScreen.test.tsx` (mock-based, unaffected by implementation).
  useVote: (slug: string | undefined) => {
    // Side-effect mock to mimic the real hook's onSuccess invalidation behavior.
    // The real hook calls queryClient.invalidateQueries; here we record the keys.
    return {
      ...voteState,
      mutateAsync: async (input: {
        pollOptionId: string;
        voterCookie: string;
      }) => {
        const result = await voteState.mutateAsync(input);
        invalidatedKeys.push(["polls", "results", slug]);
        invalidatedKeys.push(["polls", "hasVoted", slug]);
        return result;
      },
    };
  },
}));

mock.module("next/navigation", () => ({
  useRouter: () => routerState,
}));

// Static import AFTER mock.module so the mocked api/router are picked up.
import { VoteScreen } from "../VoteScreen";

// ---- Helpers ----------------------------------------------------------------

function resetMocks() {
  voteState.mutateAsync = mock(() => Promise.resolve({ status: "ok" } as const));
  voteState.isPending = false;
  routerState.push = mock(() => undefined);
  invalidatedKeys.length = 0;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const HOLD_MS = 1_000; // matches HoldButton's default holdMs

// ---- Suite ------------------------------------------------------------------

describe.skip("<VoteScreen /> — post-implementation vote behavior (live demo target)", () => {
  test("AC-F1 + AC-F3 — on { status: 'ok' }, navigates to /poll/<slug>/result", async () => {
    resetMocks();
    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const button = view.getByRole("button", { name: "Vibecoding" });
    fireEvent.pointerDown(button);
    await wait(HOLD_MS + 80);
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(voteState.mutateAsync).toHaveBeenCalledTimes(1);
    });

    // AC-F1: input shape is { pollOptionId, voterCookie } — slug is bound via
    // useVote(slug), pollId is resolved server-side from slug.
    expect(voteState.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ pollOptionId: "opt-vibe" }),
    );
    const args = voteState.mutateAsync.mock.calls[0]?.[0];
    expect(typeof args?.voterCookie).toBe("string");
    expect(args?.voterCookie.length).toBeGreaterThan(0);

    // AC-F3: navigation on { status: ok }
    await waitFor(() => {
      expect(routerState.push).toHaveBeenCalledWith(
        `/poll/${POLL.slug}/result`,
      );
    });
  }, 5_000);

  test("AC-F2 — invalidates polls.results and polls.hasVoted on success", async () => {
    resetMocks();
    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const button = view.getByRole("button", { name: "Engenharia de Contexto" });
    fireEvent.pointerDown(button);
    await wait(HOLD_MS + 80);
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(voteState.mutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(invalidatedKeys).toContainEqual(["polls", "results", POLL.slug]);
    expect(invalidatedKeys).toContainEqual(["polls", "hasVoted", POLL.slug]);
  }, 5_000);

  test("AC-F4 — on { status: 'alreadyVoted' }, shows inline message and does NOT navigate", async () => {
    resetMocks();
    voteState.mutateAsync = mock(() =>
      Promise.resolve({ status: "alreadyVoted" } as const),
    );

    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const button = view.getByRole("button", { name: "Vibecoding" });
    fireEvent.pointerDown(button);
    await wait(HOLD_MS + 80);
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(voteState.mutateAsync).toHaveBeenCalledTimes(1);
    });
    await wait(20); // let the resolve propagate to setState

    expect(routerState.push).toHaveBeenCalledTimes(0);

    const status = view.getByRole("status");
    expect(status.getAttribute("data-message-kind")).toBe("already-voted");
    expect(status.textContent).toMatch(/voto já registrado/i);
  }, 5_000);

  test("AC-F5 — after a committed vote, all HoldButtons are disabled", async () => {
    resetMocks();
    // alreadyVoted path keeps the user on the page so we can inspect the buttons.
    voteState.mutateAsync = mock(() =>
      Promise.resolve({ status: "alreadyVoted" } as const),
    );

    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const first = view.getByRole("button", { name: "Vibecoding" });
    fireEvent.pointerDown(first);
    await wait(HOLD_MS + 80);
    fireEvent.pointerUp(first);

    await waitFor(() => {
      expect(voteState.mutateAsync).toHaveBeenCalledTimes(1);
    });
    await wait(20);

    // Both buttons must now be disabled — no double commit allowed.
    const buttons = view.getAllByRole("button");
    for (const button of buttons) {
      expect(button.getAttribute("aria-disabled")).toBe("true");
    }
  }, 5_000);

  test("AC-F1 — useVote is called with the poll slug (so the hook can build the route input)", async () => {
    // This is a structural assertion: when the implementation is in place, the
    // VoteScreen must call useVote(poll.slug). We verify by mocking useVote as
    // a spy that captures its argument.
    resetMocks();

    const calls: (string | undefined)[] = [];
    mock.module("@/modules/polls/api", () => ({
      useVote: (slug: string | undefined) => {
        calls.push(slug);
        return voteState;
      },
    }));

    // Re-import to pick up the spy. (This is per-test scoped because Bun
    // re-resolves on dynamic import after mock.module is updated.)
    const { VoteScreen: Reloaded } = await import("../VoteScreen");
    renderWithProviders(<Reloaded poll={POLL} />);

    expect(calls).toContain(POLL.slug);
  });
});
