import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { db } from "../client.ts";
import { votes } from "../schema/polls.ts";
import { insertPollFixture, resetTestDb } from "../test-helpers.ts";
import { getPollBySlug, getResults, listPolls } from "./polls.ts";

describe("L3 query: polls", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  describe("listPolls", () => {
    test("returns empty array when no polls exist", async () => {
      const result = await listPolls(db);
      expect(result).toEqual([]);
    });

    test("returns polls ordered by createdAt asc", async () => {
      await insertPollFixture({
        slug: "first",
        question: "first?",
        options: ["a", "b"],
      });
      await insertPollFixture({
        slug: "second",
        question: "second?",
        options: ["c", "d"],
      });

      const result = await listPolls(db);
      expect(result).toHaveLength(2);
      expect(result[0]?.slug).toBe("first");
      expect(result[1]?.slug).toBe("second");
    });
  });

  describe("getPollBySlug", () => {
    test("returns null for missing slug", async () => {
      const result = await getPollBySlug(db, "does-not-exist");
      expect(result).toBeNull();
    });

    test("returns poll with options ordered by `order`", async () => {
      const { poll } = await insertPollFixture({
        slug: "fav-anime",
        question: "fav anime?",
        options: ["Frieren", "Solo Leveling", "Dandadan"],
      });

      const result = await getPollBySlug(db, "fav-anime");
      expect(result).not.toBeNull();
      expect(result?.id).toBe(poll.id);
      expect(result?.question).toBe("fav anime?");
      expect(result?.options.map((o) => o.label)).toEqual([
        "Frieren",
        "Solo Leveling",
        "Dandadan",
      ]);
    });
  });

  describe("getResults", () => {
    test("returns null for missing slug", async () => {
      const result = await getResults(db, "does-not-exist");
      expect(result).toBeNull();
    });

    test("returns zero counts when poll has no votes", async () => {
      await insertPollFixture({
        slug: "fresh",
        question: "fresh?",
        options: ["x", "y"],
      });

      const result = await getResults(db, "fresh");
      expect(result?.total).toBe(0);
      expect(result?.options.every((o) => o.count === 0)).toBe(true);
      expect(result?.options.every((o) => o.percentage === 0)).toBe(true);
    });

    test("aggregates counts and percentages correctly", async () => {
      const { poll, options } = await insertPollFixture({
        slug: "tally",
        question: "tally?",
        options: ["alpha", "beta"],
      });
      const [alpha, beta] = options;
      if (!alpha || !beta) {
        throw new Error("fixture missing options");
      }

      // 3 votes for alpha, 1 vote for beta
      await db.insert(votes).values([
        {
          pollId: poll.id,
          pollOptionId: alpha.id,
          voterCookie: "voter-1",
        },
        {
          pollId: poll.id,
          pollOptionId: alpha.id,
          voterCookie: "voter-2",
        },
        {
          pollId: poll.id,
          pollOptionId: alpha.id,
          voterCookie: "voter-3",
        },
        { pollId: poll.id, pollOptionId: beta.id, voterCookie: "voter-4" },
      ]);

      const result = await getResults(db, "tally");
      expect(result?.total).toBe(4);

      const alphaResult = result?.options.find((o) => o.optionId === alpha.id);
      const betaResult = result?.options.find((o) => o.optionId === beta.id);
      expect(alphaResult?.count).toBe(3);
      expect(alphaResult?.percentage).toBe(75);
      expect(betaResult?.count).toBe(1);
      expect(betaResult?.percentage).toBe(25);
    });
  });
});

afterAll(async () => {
  // pg pool is shared; let bun process exit handle teardown.
});
