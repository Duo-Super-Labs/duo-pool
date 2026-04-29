import { describe, expect, mock, test } from "bun:test";
import { renderWithProviders } from "@duopool/test-config/frontend";
import { fireEvent, waitFor } from "@testing-library/react";

// VoteScreen depends on:
//   - useVote() / VOTE_NOT_IMPLEMENTED_MESSAGE from "../api"
//   - useRouter() from "next/navigation"
// Both are mocked at module level via Bun's mock.module (per the
// PollList.test.tsx pattern). Each test customizes the per-call behavior
// through closures captured below.

const HOLD_MS = 60;
const POLL = {
  id: "poll-1",
  slug: "anime",
  question: "Best anime?",
  options: [
    { id: "opt-a", label: "Naruto" },
    { id: "opt-b", label: "One Piece" },
  ],
};

// Mock state (mutated per test) — must be declared BEFORE mock.module calls.
const voteState = {
  mutateAsync: mock<(input: { pollId: string; pollOptionId: string }) => unknown>(
    () => Promise.resolve({ ok: true }),
  ),
  isPending: false,
};
const routerState = {
  push: mock<(path: string) => void>(() => undefined),
};

mock.module("@/modules/polls/api", () => ({
  VOTE_NOT_IMPLEMENTED_MESSAGE:
    "polls.vote not implemented yet — reserved for live demo",
  useVote: () => voteState,
}));

mock.module("next/navigation", () => ({
  useRouter: () => routerState,
}));

import { VoteScreen } from "../VoteScreen";

function resetMocks() {
  voteState.mutateAsync = mock(() => Promise.resolve({ ok: true }));
  voteState.isPending = false;
  routerState.push = mock(() => undefined);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe("<VoteScreen /> — hold-to-vote + navigation", () => {
  test("holding an option for holdMs triggers useVote().mutateAsync with the right input", async () => {
    resetMocks();
    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const button = view.getByRole("button", { name: "Naruto" });

    // Override the default holdMs (1000) by using fireEvent to drive the
    // button quickly. Since VoteScreen passes the default holdMs=1000ms to
    // HoldButton, we instead poll until the button has been held long enough.
    // Easiest: just wait the default holdMs from the spec (1s) — but tests
    // would be slow. We use the keyboard path because Space hold is the same
    // gesture, and we wait the FULL holdMs.

    fireEvent.pointerDown(button);
    await wait(1000 + 80);
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(voteState.mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(voteState.mutateAsync).toHaveBeenCalledWith({
      pollId: "poll-1",
      pollOptionId: "opt-a",
    });
  }, 5_000);

  test("on success, router.push is called with /poll/<slug>/result", async () => {
    resetMocks();
    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const button = view.getByRole("button", { name: "One Piece" });

    fireEvent.pointerDown(button);
    await wait(1000 + 80);
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(routerState.push).toHaveBeenCalledWith("/poll/anime/result");
    });
  }, 5_000);

  test("when useVote().mutateAsync rejects with 'not implemented', no navigation happens and an inline message is shown", async () => {
    resetMocks();
    voteState.mutateAsync = mock(() =>
      Promise.reject(
        new Error("polls.vote not implemented yet — reserved for live demo"),
      ),
    );

    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const button = view.getByRole("button", { name: "Naruto" });

    fireEvent.pointerDown(button);
    await wait(1000 + 80);
    fireEvent.pointerUp(button);

    await waitFor(() => {
      expect(voteState.mutateAsync).toHaveBeenCalledTimes(1);
    });

    // Wait a tick more for the rejection to propagate to setState.
    await wait(20);

    expect(routerState.push).toHaveBeenCalledTimes(0);

    const status = view.getByRole("status");
    expect(status.getAttribute("data-message-kind")).toBe("demo-pending");
  }, 5_000);
});
