import { oc } from "@orpc/contract";
import {
  selectPollOptionSchema,
  selectPollSchema,
} from "@duopool/database/schema/zod";
import { z } from "zod";

// Layer 4 — oRPC contracts. Frontend-importable. ZERO server imports
// (only @orpc/contract + zod + drizzle-zod schemas, no pg, no Drizzle client).
//
// IMPORTANT: pollsContract.vote is reserved for the live demo — see CLAUDE.md.

const pollWithOptionsSchema = selectPollSchema.extend({
  options: z.array(selectPollOptionSchema),
});

const resultsSchema = z.object({
  pollId: z.string().uuid(),
  slug: z.string(),
  question: z.string(),
  total: z.number().int().nonnegative(),
  options: z.array(
    z.object({
      optionId: z.string().uuid(),
      label: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  ),
});

export const pollsContract = {
  list: oc
    .route({ method: "GET", path: "/polls" })
    .output(z.array(selectPollSchema)),

  get: oc
    .route({ method: "GET", path: "/polls/{slug}" })
    .input(z.object({ slug: z.string().min(1) }))
    .output(pollWithOptionsSchema.nullable()),

  results: oc
    .route({ method: "GET", path: "/polls/{slug}/results" })
    .input(z.object({ slug: z.string().min(1) }))
    .output(resultsSchema.nullable()),

  // ⚠️ RESERVED FOR LIVE DEMO — DO NOT IMPLEMENT IN SCAFFOLD
  // vote: oc
  //   .route({ method: "POST", path: "/polls/{slug}/vote" })
  //   .input(z.object({
  //     slug: z.string().min(1),
  //     pollOptionId: z.string().uuid(),
  //     voterCookie: z.string().min(1),
  //   }))
  //   .output(z.discriminatedUnion("status", [
  //     z.object({ status: z.literal("ok") }),
  //     z.object({ status: z.literal("alreadyVoted") }),
  //   ])),
};
