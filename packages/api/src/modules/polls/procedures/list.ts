import { db } from "@duopool/database";
import { listPolls } from "@duopool/database/query/polls";
import { pub } from "../../../orpc.ts";

export const listProc = pub.polls.list.handler(async () => {
  return listPolls(db);
});
