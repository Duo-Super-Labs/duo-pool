/**
 * ⚠️  FAILING TEST — RESERVED FOR THE LIVE /duo.exec DEMO
 *
 * This file is an explicit TDD asset. The live demo on stage runs `/duo.exec`
 * with the task: "implement castVote() in src/query/polls.ts so these tests
 * pass". The agent reads this file, implements the function in the L3 query
 * module, and runs `bun test` to validate.
 *
 * BEFORE the live demo: these tests must fail (the function doesn't exist).
 * AFTER the live demo: these tests must pass.
 *
 * DO NOT delete this file. DO NOT implement castVote in scaffolds. The whole
 * point of the demo is to watch a deterministic repository + types + tests
 * + 5-Layer architecture drive the AI to a correct implementation.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { db } from "../client.ts";
import { insertPollFixture, resetTestDb } from "../test-helpers.ts";

// `castVote` is implemented during the live /duo.exec demo on stage.
// Until then, this dynamic import resolves the function as undefined and
// the suite is skipped so CI / `bun turbo test` stays green. After the
// live implementation, `bun test` picks the function up automatically
// and runs the 4 cases below.
const pollsModule = (await import("./polls.ts")) as Record<string, unknown>;

type CastVoteFn = (
  db: typeof import("../client.ts").db,
  input: { pollId: string; pollOptionId: string; voterCookie: string },
) => Promise<{ ok: true } | { alreadyVoted: true }>;

const castVote = pollsModule.castVote as CastVoteFn;
const describeIfImplemented =
  typeof pollsModule.castVote === "function" ? describe : describe.skip;

describeIfImplemented("L3 query: castVote (live demo target)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  test("inserts a vote and returns ok=true", async () => {
    const { poll, options } = await insertPollFixture({
      slug: "first-vote",
      question: "first vote?",
      options: ["one", "two"],
    });
    const [option] = options;
    if (!option) {
      throw new Error("fixture missing options");
    }

    const result = await castVote(db, {
      pollId: poll.id,
      pollOptionId: option.id,
      voterCookie: "voter-A",
    });

    expect(result).toEqual({ ok: true });
  });

  test("second vote from same cookie on same poll returns alreadyVoted=true", async () => {
    const { poll, options } = await insertPollFixture({
      slug: "double-vote",
      question: "double?",
      options: ["one", "two"],
    });
    const [first, second] = options;
    if (!first || !second) {
      throw new Error("fixture missing options");
    }

    const initial = await castVote(db, {
      pollId: poll.id,
      pollOptionId: first.id,
      voterCookie: "voter-B",
    });
    expect(initial).toEqual({ ok: true });

    // Try again with the same cookie, picking a DIFFERENT option to confirm
    // the constraint is on (cookie, poll), not (cookie, option).
    const dup = await castVote(db, {
      pollId: poll.id,
      pollOptionId: second.id,
      voterCookie: "voter-B",
    });
    expect(dup).toEqual({ alreadyVoted: true });
  });

  test("different cookies on same poll both succeed", async () => {
    const { poll, options } = await insertPollFixture({
      slug: "two-voters",
      question: "two voters?",
      options: ["only"],
    });
    const [option] = options;
    if (!option) {
      throw new Error("fixture missing options");
    }

    const a = await castVote(db, {
      pollId: poll.id,
      pollOptionId: option.id,
      voterCookie: "voter-X",
    });
    const b = await castVote(db, {
      pollId: poll.id,
      pollOptionId: option.id,
      voterCookie: "voter-Y",
    });

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
  });

  test("same cookie can vote on different polls", async () => {
    const { poll: pollA, options: optsA } = await insertPollFixture({
      slug: "poll-a",
      question: "a?",
      options: ["a-one"],
    });
    const { poll: pollB, options: optsB } = await insertPollFixture({
      slug: "poll-b",
      question: "b?",
      options: ["b-one"],
    });
    const [optA] = optsA;
    const [optB] = optsB;
    if (!optA || !optB) {
      throw new Error("fixture missing options");
    }

    const onA = await castVote(db, {
      pollId: pollA.id,
      pollOptionId: optA.id,
      voterCookie: "voter-Z",
    });
    const onB = await castVote(db, {
      pollId: pollB.id,
      pollOptionId: optB.id,
      voterCookie: "voter-Z",
    });

    expect(onA).toEqual({ ok: true });
    expect(onB).toEqual({ ok: true });
  });
});
