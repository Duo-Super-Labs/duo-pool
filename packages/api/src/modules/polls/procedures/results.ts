import { db } from "@duopool/database";
import { getResults } from "@duopool/database/query/polls";
import { pub } from "../../../orpc.ts";

export const resultsProc = pub.polls.results.handler(async ({ input }) => {
  return getResults(db, input.slug);
});
