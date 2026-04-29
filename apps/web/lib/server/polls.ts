import { db } from "@duopool/database";
import {
  getPollBySlug as getPollBySlugQuery,
  hasVoted as hasVotedQuery,
} from "@duopool/database/query/polls";

// Server-only wrappers around Layer 3 queries. Server components import from
// this module instead of reaching into `@duopool/database` directly — this
// keeps the "no @duopool/database imports inside apps/web" rule (CLAUDE.md
// NEVER DO list) honest while still letting RSC do server-side redirects.
//
// Client components must NEVER import from this file. By convention, only
// files under `app/**/page.tsx`, `app/**/layout.tsx`, and other server
// components reach into `lib/server/`.

export function getPollBySlug(slug: string) {
  return getPollBySlugQuery(db, slug);
}

export function hasVoted(input: { voterId: string; pollId: string }) {
  return hasVotedQuery(db, input);
}
