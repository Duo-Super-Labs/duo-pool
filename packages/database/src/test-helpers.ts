import { sql } from "drizzle-orm";
import { db } from "./client.ts";
import { pollOptions, polls, votes } from "./schema/polls.ts";

/**
 * Truncates every table this package owns. Call from `beforeEach` in each
 * test suite to keep tests isolated. Cascades through FK dependencies.
 *
 * Refuses to run unless `DATABASE_URL` points at `duopool_test`.
 */
export async function resetTestDb(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes("duopool_test")) {
    throw new Error(
      "resetTestDb refused: DATABASE_URL is not pointing at duopool_test. " +
        "Refusing to truncate. Did you forget --env-file=../../.env.test?",
    );
  }
  await db.execute(
    sql`TRUNCATE TABLE ${votes}, ${pollOptions}, ${polls} RESTART IDENTITY CASCADE`,
  );
}

export interface InsertPollFixtureInput {
  slug: string;
  question: string;
  options: string[];
}

/** Insert a poll with N options. Returns the poll + its option rows. */
export async function insertPollFixture(input: InsertPollFixtureInput) {
  const [poll] = await db
    .insert(polls)
    .values({ slug: input.slug, question: input.question })
    .returning();
  if (!poll) {
    throw new Error("failed to insert poll fixture");
  }

  const opts = await db
    .insert(pollOptions)
    .values(
      input.options.map((label, i) => ({
        pollId: poll.id,
        label,
        order: i,
      })),
    )
    .returning();

  return { poll, options: opts };
}
