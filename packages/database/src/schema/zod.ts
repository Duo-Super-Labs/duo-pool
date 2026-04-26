import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { pollOptions, polls, votes } from "./polls.ts";

// Auto-derived from Drizzle schema. NEVER write Zod for these by hand —
// the only source of truth is the table definition in ./polls.ts.
// (Mesma regra do duo-admin starter.)

export const selectPollSchema = createSelectSchema(polls);
export const insertPollSchema = createInsertSchema(polls);

export const selectPollOptionSchema = createSelectSchema(pollOptions);
export const insertPollOptionSchema = createInsertSchema(pollOptions);

export const selectVoteSchema = createSelectSchema(votes);
export const insertVoteSchema = createInsertSchema(votes);
