import {
  getProc,
  hasVotedProc,
  listProc,
  resultsProc,
} from "./modules/polls/procedures/index.ts";

// oRPC router — wires every procedure into a single tree mirroring the
// contract shape. The shape `{ polls: { list, get, results, hasVoted } }`
// matches `contract.polls.{list, get, results, hasVoted}` exactly so type
// inference works end-to-end for the frontend orpcClient.
//
// ⚠️ When polls.vote is implemented in the live demo, add `vote: voteProc`
// here. The contract slot is already prepared in @duopool/contracts.

export const router = {
  polls: {
    list: listProc,
    get: getProc,
    results: resultsProc,
    hasVoted: hasVotedProc,
  },
};

export type Router = typeof router;
