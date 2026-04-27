import { http, HttpResponse } from "msw";
import {
  buildPoll,
  buildPollWithOptions,
  buildResults,
  type PollFixture,
  type PollWithOptionsFixture,
  type ResultsFixture,
} from "./factories.ts";

// MSW handlers covering the oRPC endpoints exposed by @duopool/api.
// Wire format follows oRPC's standard JSON envelope: `{ json: <data> }`.
//
// Used by:
//   · Frontend (apps/web): bun test + happy-dom + setupServer from msw/node
//   · Future backend integration tests if we ever add HTTP-level coverage
//
// The base URL is pinned to NEXT_PUBLIC_BASE_URL or http://localhost:3000.
// Tests that need to override responses can call `server.use(...customHandlers)`
// per-test (see msw docs).

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// In-memory state — reset per test via `resetMockState()`.
const state: {
  polls: PollWithOptionsFixture[];
  results: Map<string, ResultsFixture>;
  votedCookies: Set<string>;
} = {
  polls: [],
  results: new Map(),
  votedCookies: new Set(),
};

export function resetMockState() {
  state.polls = [];
  state.results.clear();
  state.votedCookies.clear();
}

export function seedMockState(input: {
  polls?: PollWithOptionsFixture[];
  results?: ResultsFixture[];
}) {
  if (input.polls) {
    state.polls = input.polls;
  }
  if (input.results) {
    for (const r of input.results) {
      state.results.set(r.slug, r);
    }
  }
}

function ok(data: unknown) {
  return HttpResponse.json({ json: data });
}

export const handlers = [
  // polls.list — returns lightweight Poll[] (no embedded options)
  http.post(`${BASE}/api/rpc/polls/list`, () => {
    const list: PollFixture[] = state.polls.map((p) => ({
      id: p.id,
      slug: p.slug,
      question: p.question,
      createdAt: p.createdAt,
    }));
    return ok(list);
  }),

  // polls.get — returns Poll & { options: PollOption[] } | null
  http.post(`${BASE}/api/rpc/polls/get`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      json?: { slug?: string };
    };
    const slug = body.json?.slug;
    const poll = state.polls.find((p) => p.slug === slug) ?? null;
    return ok(poll);
  }),

  // polls.results — returns ResultsFixture | null
  http.post(`${BASE}/api/rpc/polls/results`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      json?: { slug?: string };
    };
    const slug = body.json?.slug;
    const results = (slug && state.results.get(slug)) || null;
    return ok(results);
  }),

  // polls.vote — discriminated union { ok } | { alreadyVoted }
  // (handler exists ahead of the live demo so frontend tests can mock it
  //  even before the backend procedure lands.)
  http.post(`${BASE}/api/rpc/polls/vote`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      json?: { slug?: string; pollOptionId?: string; voterCookie?: string };
    };
    const cookie = body.json?.voterCookie;
    const slug = body.json?.slug;
    const key = `${cookie}:${slug}`;
    if (cookie && state.votedCookies.has(key)) {
      return ok({ status: "alreadyVoted" });
    }
    if (cookie) {
      state.votedCookies.add(key);
    }
    return ok({ status: "ok" });
  }),
];

// Re-export factories so callers can `import { buildPoll, handlers } from "@duopool/mocks"`.
export {
  buildPoll,
  buildPollWithOptions,
  buildResults,
};
