/**
 * ⚠️  PRE-WRITTEN TEST ASSET — RUNS AFTER THE LIVE `polls.vote` DEMO
 *
 * Encodes the post-implementation acceptance criteria for /duo.exec on
 * polls.vote. Gated by `describe.skip` because it asserts behavior that
 * only exists once T05 (api.ts useVote replaces stub) and T06 (VoteScreen
 * branches on result.status + locks buttons) from `.duo/tasks.md` land.
 *
 * The final step of T06 flips `describe.skip` → `describe`. After that
 * flip, all 3 cases must pass with NO other edits to this file.
 *
 * ───────────────────────────────────────────────────────────────────
 * Conforms to the duo-pool Frontend Testing Rules (CLAUDE.md):
 *   - User-observable behavior only — no internal state / data-* asserts
 *   - userEvent for clicks; fireEvent.pointer{Down,Up} only for the
 *     hold-to-commit gesture (no userEvent abstraction for sustained press)
 *   - Visual assertions: toBeInTheDocument / toBeEnabled / toBeDisabled
 *   - Mocks at the network boundary via MSW; only useRouter is mocked
 *     directly because there's no MSW analog for navigation
 * ───────────────────────────────────────────────────────────────────
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { renderWithProviders } from "@duopool/test-config/frontend";
import { useMswServer } from "@duopool/test-config/msw";
import { fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

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

const VOTE_URL = "http://localhost:3000/api/rpc/polls/vote";
const HOLD_MS = 1_000; // matches HoldButton's default holdMs

// ---- Navigation mock --------------------------------------------------------
// useRouter has no MSW analog — mocking as a proxy for "navigation happened"
// is the documented exception in CLAUDE.md / Frontend Testing Rules.

const routerState = {
  push: mock<(path: string) => void>(() => undefined),
};

mock.module("next/navigation", () => ({
  useRouter: () => routerState,
}));

import { VoteScreen } from "../VoteScreen";

// ---- Helpers ----------------------------------------------------------------

function holdAndRelease(button: HTMLElement) {
  // RTL's userEvent has no abstraction for sustained press, so the escape
  // hatch fireEvent.pointerDown/Up is the documented way (CLAUDE.md).
  fireEvent.pointerDown(button);
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      fireEvent.pointerUp(button);
      resolve();
    }, HOLD_MS + 80),
  );
}

// ---- Suite ------------------------------------------------------------------

describe.skip("polls.vote — full user flow (live demo target)", () => {
  const server = useMswServer();

  beforeEach(() => {
    routerState.push = mock(() => undefined);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  test("audience holds Vibecoding → vote registered → taken to the result page", async () => {
    server.use(
      http.post(VOTE_URL, () =>
        HttpResponse.json({ json: { status: "ok" } }),
      ),
    );

    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const vibecoding = view.getByRole("button", { name: /vibecoding/i });
    expect(vibecoding).toBeInTheDocument();
    expect(vibecoding).toBeEnabled();

    await holdAndRelease(vibecoding);

    await waitFor(() => {
      expect(routerState.push).toHaveBeenCalledWith(
        `/poll/${POLL.slug}/result`,
      );
    });
  }, 5_000);

  test("audience already voted from this device → sees 'Voto já registrado' and stays on the vote page", async () => {
    server.use(
      http.post(VOTE_URL, () =>
        HttpResponse.json({ json: { status: "alreadyVoted" } }),
      ),
    );

    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const vibecoding = view.getByRole("button", { name: /vibecoding/i });
    await holdAndRelease(vibecoding);

    await waitFor(() => {
      expect(view.getByText(/voto já registrado/i)).toBeInTheDocument();
    });
    expect(routerState.push).not.toHaveBeenCalled();
  }, 5_000);

  test("after a committed vote, every option button is disabled — no double commit", async () => {
    server.use(
      http.post(VOTE_URL, () =>
        HttpResponse.json({ json: { status: "alreadyVoted" } }),
      ),
    );

    const view = renderWithProviders(<VoteScreen poll={POLL} />);

    const vibecoding = view.getByRole("button", { name: /vibecoding/i });
    await holdAndRelease(vibecoding);

    await waitFor(() => {
      expect(view.getByText(/voto já registrado/i)).toBeInTheDocument();
    });

    expect(view.getByRole("button", { name: /vibecoding/i })).toBeDisabled();
    expect(
      view.getByRole("button", { name: /engenharia de contexto/i }),
    ).toBeDisabled();
  }, 5_000);
});
