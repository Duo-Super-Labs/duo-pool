import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { useVoterCookie } from "./use-voter-cookie";

const COOKIE_NAME = "dp_voter";

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

describe("useVoterCookie", () => {
  beforeEach(() => {
    clearCookie();
  });

  afterEach(() => {
    clearCookie();
  });

  test("generates a UUID-shaped voter id on first call", async () => {
    const { result } = renderHook(() => useVoterCookie());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current).toMatch(/^[0-9a-f-]+$/i);
    // Length sanity check: UUID v4 is 36 chars; fallback ids are similar shape.
    expect((result.current as string).length).toBeGreaterThanOrEqual(8);
  });
});
