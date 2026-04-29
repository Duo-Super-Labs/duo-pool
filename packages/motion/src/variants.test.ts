import { describe, expect, test } from "bun:test";
import { fadeUp, holdProgress, screenSwap } from "./variants.ts";

describe("fadeUp", () => {
  test("hidden state starts fully transparent and offset down", () => {
    expect(fadeUp.hidden).toMatchObject({ opacity: 0, y: 16 });
  });

  test("visible state is fully opaque at rest", () => {
    expect(fadeUp.visible).toMatchObject({ opacity: 1, y: 0 });
  });
});

describe("screenSwap", () => {
  test("exposes enter, center, and exit keys", () => {
    expect(screenSwap).toHaveProperty("enter");
    expect(screenSwap).toHaveProperty("center");
    expect(screenSwap).toHaveProperty("exit");
  });

  test("center state lands at x: 0 with full opacity", () => {
    expect(screenSwap.center).toMatchObject({ opacity: 1, x: 0 });
  });
});

describe("holdProgress", () => {
  test("exposes idle and holding keys", () => {
    expect(holdProgress).toHaveProperty("idle");
    expect(holdProgress).toHaveProperty("holding");
  });

  test("idle state is at rest scale 1", () => {
    expect(holdProgress.idle).toMatchObject({ scale: 1 });
  });

  test("holding state scales down for press affordance", () => {
    expect(holdProgress.holding).toMatchObject({ scale: 0.98 });
  });
});
