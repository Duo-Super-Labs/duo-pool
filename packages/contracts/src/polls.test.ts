import { describe, expect, test } from "bun:test";
import { contract, pollsContract } from "./index.ts";

describe("L4 contract: polls", () => {
  test("exposes list / get / results endpoints", () => {
    expect(pollsContract.list).toBeDefined();
    expect(pollsContract.get).toBeDefined();
    expect(pollsContract.results).toBeDefined();
  });

  test("does NOT expose vote — reserved for live demo", () => {
    expect("vote" in pollsContract).toBe(false);
  });

  test("contract barrel mounts polls under contract.polls", () => {
    expect(contract.polls).toBe(pollsContract);
  });
});
