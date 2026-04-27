import { beforeEach, describe, expect, test } from "bun:test";
import {
  buildPollWithOptions,
  buildResults,
  resetFixtureIds,
  resetMockState,
  seedMockState,
} from "./index.ts";
import { server } from "./node.ts";

describe("@duopool/mocks — MSW handlers", () => {
  // Use the same lifecycle as consumers so this test verifies the wiring works.
  beforeEach(() => {
    server.listen({ onUnhandledRequest: "error" });
    resetFixtureIds();
    resetMockState();
  });

  test("POST /api/rpc/polls/list returns seeded polls in oRPC envelope", async () => {
    const poll = buildPollWithOptions({ slug: "anime", question: "Best anime?" });
    seedMockState({ polls: [poll] });

    const res = await fetch("http://localhost:3000/api/rpc/polls/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: {} }),
    });

    const data = (await res.json()) as { json: unknown[] };
    expect(data.json).toHaveLength(1);
    expect((data.json[0] as { slug: string }).slug).toBe("anime");

    server.close();
  });

  test("POST /api/rpc/polls/get returns null for missing slug", async () => {
    const res = await fetch("http://localhost:3000/api/rpc/polls/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { slug: "does-not-exist" } }),
    });

    const data = (await res.json()) as { json: unknown };
    expect(data.json).toBeNull();

    server.close();
  });

  test("polls.vote returns alreadyVoted on second call from same cookie", async () => {
    const url = "http://localhost:3000/api/rpc/polls/vote";
    const body = {
      json: { slug: "anime", pollOptionId: "opt-1", voterCookie: "voter-X" },
    };

    const first = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json() as Promise<{ json: { status: string } }>);

    const second = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json() as Promise<{ json: { status: string } }>);

    expect(first.json.status).toBe("ok");
    expect(second.json.status).toBe("alreadyVoted");

    server.close();
  });

  test("buildResults aggregates percentages correctly", () => {
    const poll = buildPollWithOptions({ slug: "x" }, ["A", "B", "C"]);
    const results = buildResults(poll, [3, 1, 0]);

    expect(results.total).toBe(4);
    expect(results.options.find((o) => o.label === "A")?.percentage).toBe(75);
    expect(results.options.find((o) => o.label === "B")?.percentage).toBe(25);
    expect(results.options.find((o) => o.label === "C")?.percentage).toBe(0);
  });
});
