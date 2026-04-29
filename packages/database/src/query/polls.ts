import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../client.ts";
import { pollOptions, polls, votes } from "../schema/polls.ts";

// Layer 3 — Pure DB functions. Each takes db as the first argument.
// No business rules here. No side effects beyond db.
//
// IMPORTANT: castVote() is reserved for the live demo (`/duo.exec polls.vote`).
// It is intentionally NOT implemented in this scaffold — see CLAUDE.md.

export async function listPolls(db: Database) {
  return db
    .select({
      id: polls.id,
      slug: polls.slug,
      question: polls.question,
      createdAt: polls.createdAt,
    })
    .from(polls)
    .orderBy(asc(polls.createdAt));
}

export async function getPollBySlug(db: Database, slug: string) {
  const poll = await db.query.polls.findFirst({
    where: eq(polls.slug, slug),
  });
  if (!poll) {
    return null;
  }

  const options = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, poll.id))
    .orderBy(asc(pollOptions.order), asc(pollOptions.label));

  return { ...poll, options };
}

export async function getResults(db: Database, slug: string) {
  const poll = await db.query.polls.findFirst({
    where: eq(polls.slug, slug),
  });
  if (!poll) {
    return null;
  }

  const rows = await db
    .select({
      optionId: pollOptions.id,
      label: pollOptions.label,
      order: pollOptions.order,
      count: sql<number>`COALESCE(COUNT(${votes.id}), 0)::int`,
    })
    .from(pollOptions)
    .leftJoin(votes, eq(votes.pollOptionId, pollOptions.id))
    .where(eq(pollOptions.pollId, poll.id))
    .groupBy(pollOptions.id, pollOptions.label, pollOptions.order)
    .orderBy(asc(pollOptions.order));

  const total = rows.reduce((acc, r) => acc + r.count, 0);

  return {
    pollId: poll.id,
    slug: poll.slug,
    question: poll.question,
    total,
    options: rows.map((r) => ({
      optionId: r.optionId,
      label: r.label,
      count: r.count,
      percentage: total === 0 ? 0 : Math.round((r.count / total) * 1000) / 10,
    })),
  };
}

export async function hasVoted(
  db: Database,
  input: { voterId: string; pollId: string },
): Promise<boolean> {
  const rows = await db
    .select({ id: votes.id })
    .from(votes)
    .where(
      and(
        eq(votes.voterCookie, input.voterId),
        eq(votes.pollId, input.pollId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// ⚠️ RESERVED FOR LIVE DEMO — DO NOT IMPLEMENT IN SCAFFOLD
// export async function castVote(db: Database, input: { pollId: string; pollOptionId: string; voterCookie: string })
//   : Promise<{ ok: true } | { alreadyVoted: true }>
// Implementation must:
//   1. Insert into votes
//   2. Catch PG error 23505 (unique_violation) on (voter_cookie, poll_id) → return { alreadyVoted: true }
//   3. Return { ok: true } on success
