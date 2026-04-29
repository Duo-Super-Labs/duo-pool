import { db } from "@duopool/database";
import { getPollBySlug, hasVoted } from "@duopool/database/query/polls";
import { pub } from "../../../orpc.ts";

export const hasVotedProc = pub.polls.hasVoted.handler(
  async ({ input, context }) => {
    if (!context.voterId) {
      return { voted: false };
    }
    const poll = await getPollBySlug(db, input.slug);
    if (!poll) {
      return { voted: false };
    }
    const voted = await hasVoted(db, {
      voterId: context.voterId,
      pollId: poll.id,
    });
    return { voted };
  },
);
