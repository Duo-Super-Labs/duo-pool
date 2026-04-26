import { db } from "@duopool/database";
import { getPollBySlug } from "@duopool/database/query/polls";
import { pub } from "../../../orpc.ts";

export const getProc = pub.polls.get.handler(async ({ input }) => {
  return getPollBySlug(db, input.slug);
});
