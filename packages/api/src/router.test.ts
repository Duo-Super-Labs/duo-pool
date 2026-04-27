import { describe, expect, test } from "bun:test";
import { router } from "./router.ts";

describe("L5 router shape", () => {
  test("exposes polls.list / get / results procedures", () => {
    expect(router.polls.list).toBeDefined();
    expect(router.polls.get).toBeDefined();
    expect(router.polls.results).toBeDefined();
  });

  test("does NOT expose polls.vote — reserved for live demo", () => {
    expect("vote" in router.polls).toBe(false);
  });
});
