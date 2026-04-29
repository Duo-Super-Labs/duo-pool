import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../client.ts";
import { votes } from "../schema/polls.ts";
import { insertPollFixture, resetTestDb } from "../test-helpers.ts";
import { getUserVote } from "./polls.ts";

describe("L3 query: getUserVote", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  test("returns null when the voter has not voted on the poll", async () => {
    const { poll } = await insertPollFixture({
      slug: "no-vote",
      question: "no vote?",
      options: ["a", "b"],
    });

    const result = await getUserVote(db, {
      voterId: "voter-A",
      pollId: poll.id,
    });

    expect(result).toBeNull();
  });

  test("returns the chosen pollOptionId when the voter has voted", async () => {
    const { poll, options } = await insertPollFixture({
      slug: "voted",
      question: "voted?",
      options: ["a", "b"],
    });
    const [, second] = options;
    if (!second) throw new Error("fixture missing options");

    await db.insert(votes).values({
      pollId: poll.id,
      pollOptionId: second.id,
      voterCookie: "voter-B",
    });

    const result = await getUserVote(db, {
      voterId: "voter-B",
      pollId: poll.id,
    });

    expect(result).toBe(second.id);
  });

  test("returns null for a different voter on the same poll", async () => {
    const { poll, options } = await insertPollFixture({
      slug: "other-voter",
      question: "other?",
      options: ["a"],
    });
    const [option] = options;
    if (!option) throw new Error("fixture missing options");

    await db.insert(votes).values({
      pollId: poll.id,
      pollOptionId: option.id,
      voterCookie: "voter-X",
    });

    const result = await getUserVote(db, {
      voterId: "voter-Y",
      pollId: poll.id,
    });

    expect(result).toBeNull();
  });
});
