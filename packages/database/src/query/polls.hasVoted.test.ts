import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../client.ts";
import { votes } from "../schema/polls.ts";
import { insertPollFixture, resetTestDb } from "../test-helpers.ts";
import { hasVoted } from "./polls.ts";

describe("L3 query: hasVoted", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  test("returns false when no vote exists for (voterId, pollId)", async () => {
    const { poll } = await insertPollFixture({
      slug: "no-vote",
      question: "no vote?",
      options: ["a", "b"],
    });

    const result = await hasVoted(db, {
      voterId: "voter-A",
      pollId: poll.id,
    });

    expect(result).toBe(false);
  });

  test("returns true when a vote exists for (voterId, pollId)", async () => {
    const { poll, options } = await insertPollFixture({
      slug: "has-vote",
      question: "voted?",
      options: ["a", "b"],
    });
    const [option] = options;
    if (!option) throw new Error("fixture missing options");

    await db.insert(votes).values({
      pollId: poll.id,
      pollOptionId: option.id,
      voterCookie: "voter-B",
    });

    const result = await hasVoted(db, {
      voterId: "voter-B",
      pollId: poll.id,
    });

    expect(result).toBe(true);
  });

  test("returns false for a different voterId on the same poll", async () => {
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

    const result = await hasVoted(db, {
      voterId: "voter-Y",
      pollId: poll.id,
    });

    expect(result).toBe(false);
  });

  test("returns false for the same voterId on a different poll", async () => {
    const { poll: pollA, options: optsA } = await insertPollFixture({
      slug: "poll-a",
      question: "a?",
      options: ["a"],
    });
    const { poll: pollB } = await insertPollFixture({
      slug: "poll-b",
      question: "b?",
      options: ["b"],
    });
    const [optA] = optsA;
    if (!optA) throw new Error("fixture missing options");

    await db.insert(votes).values({
      pollId: pollA.id,
      pollOptionId: optA.id,
      voterCookie: "voter-Z",
    });

    const result = await hasVoted(db, {
      voterId: "voter-Z",
      pollId: pollB.id,
    });

    expect(result).toBe(false);
  });
});
