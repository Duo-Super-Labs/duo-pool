import { describe, expect, mock, test } from "bun:test";
import { renderWithProviders } from "@duopool/test-config/frontend";
import { fireEvent } from "@testing-library/react";
import { HoldButton } from "../HoldButton";

// We intentionally use real timers + a small `holdMs` here. The button drives
// progress with `requestAnimationFrame`, which doesn't play well with Bun's
// jest-style fake timers — happy-dom's rAF runs on real microtasks. A short
// hold window keeps each test in the millisecond range.
//
// React occasionally logs "not wrapped in act(...)" warnings because the
// rAF-driven setState ticks run outside React's testing scheduler. Those
// are warnings only — the assertions still observe the final state through
// React's testing renderer. We accept the noise rather than tighten the
// timing into something fragile.
const HOLD_MS = 60;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe("<HoldButton /> — hold-to-commit gesture", () => {
  test("fires onCommit after holdMs of pointer-down → pointer-up", async () => {
    const onCommit = mock(() => undefined);
    const view = renderWithProviders(
      <HoldButton label="Vote A" onCommit={onCommit} holdMs={HOLD_MS} />,
    );

    const button = view.getByRole("button", { name: "Vote A" });

    fireEvent.pointerDown(button);
    await wait(HOLD_MS + 40);
    fireEvent.pointerUp(button);

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  test("does NOT fire onCommit when pointer-up happens before holdMs", async () => {
    const onCommit = mock(() => undefined);
    const view = renderWithProviders(
      <HoldButton label="Vote B" onCommit={onCommit} holdMs={HOLD_MS} />,
    );

    const button = view.getByRole("button", { name: "Vote B" });

    fireEvent.pointerDown(button);
    await wait(HOLD_MS / 4);
    fireEvent.pointerUp(button);

    // Wait past where commit would have fired, to be sure it didn't sneak in.
    await wait(HOLD_MS + 40);
    expect(onCommit).toHaveBeenCalledTimes(0);
  });

  test("when disabled, pointer events do not start a hold and onCommit never fires", async () => {
    const onCommit = mock(() => undefined);
    const view = renderWithProviders(
      <HoldButton
        label="Vote C"
        onCommit={onCommit}
        holdMs={HOLD_MS}
        disabled={true}
      />,
    );

    const button = view.getByRole("button", { name: "Vote C" });

    fireEvent.pointerDown(button);
    await wait(HOLD_MS + 40);
    fireEvent.pointerUp(button);

    expect(onCommit).toHaveBeenCalledTimes(0);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  test("Space-key hold fires onCommit after holdMs", async () => {
    const onCommit = mock(() => undefined);
    const view = renderWithProviders(
      <HoldButton label="Vote D" onCommit={onCommit} holdMs={HOLD_MS} />,
    );

    const button = view.getByRole("button", { name: "Vote D" });
    button.focus();

    fireEvent.keyDown(button, { key: " " });
    await wait(HOLD_MS + 40);
    fireEvent.keyUp(button, { key: " " });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
