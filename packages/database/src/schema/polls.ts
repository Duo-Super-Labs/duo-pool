import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const polls = pgTable(
  "polls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    question: text("question").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugUnique: uniqueIndex("polls_slug_unique").on(table.slug),
  }),
);

export const pollOptions = pgTable(
  "poll_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    order: integer("order").notNull().default(0),
  },
  (table) => ({
    pollIdx: index("poll_options_poll_id_idx").on(table.pollId),
  }),
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    pollOptionId: uuid("poll_option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    voterCookie: text("voter_cookie").notNull(),
    votedAt: timestamp("voted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // INVARIANTE: 1 voto por device por poll — UNIQUE atômica no Postgres.
    // Quando violada, repository captura PG 23505 e retorna { alreadyVoted: true }.
    voterPollUnique: uniqueIndex("votes_voter_poll_unique").on(
      table.voterCookie,
      table.pollId,
    ),
    pollIdx: index("votes_poll_id_idx").on(table.pollId),
    optionIdx: index("votes_poll_option_id_idx").on(table.pollOptionId),
  }),
);

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
export type PollOption = typeof pollOptions.$inferSelect;
export type NewPollOption = typeof pollOptions.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
