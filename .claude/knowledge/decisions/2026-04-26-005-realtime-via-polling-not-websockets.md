# ADR-005: Live results via React Query polling (2s), not WebSockets

**Status:** Accepted
**Date:** 2026-04-26

## Context

DuoPool's poll detail page shows live vote counts that need to feel responsive. Two options:

1. **WebSockets** (or SSE) — server pushes updates to subscribed clients. Truly real-time.
2. **HTTP polling** — client refetches `polls.results` every N seconds. Simpler, "real-time enough".

The talk audience is ~125 people watching a 2-second-resolution counter. Latency below human perception (~250ms) doesn't matter; the experience is the same either way.

## Decision

**HTTP polling at 2-second intervals**, via TanStack Query's `refetchInterval: 2_000` on `usePollResults()`. No WebSocket server, no subscription protocol, no Vercel-Edge-vs-Node compatibility worries.

```ts
export function usePollResults(slug: string | undefined) {
  return useQuery({
    queryKey: ["polls", "results", slug],
    queryFn: slug ? () => orpc.polls.results({ slug }) : undefined,
    enabled: !!slug,
    refetchInterval: 2_000,
  });
}
```

## Consequences

- **(+)** Zero new infrastructure. The same oRPC `polls.results` procedure serves both initial load and live updates.
- **(+)** Vercel serverless friendly. WebSockets require a long-lived connection — incompatible with stateless serverless functions without external services (Pusher, Ably).
- **(+)** Pedagogically clean: the whole stack is request/response, easy to explain in a 60-min talk.
- **(−)** Wasted requests when the page is open but no voting is happening. At 2s intervals × 125 viewers = ~62.5 req/s. Postgres + Neon free tier handle this trivially.
- **(−)** Up to 2s "stale" data. Imperceptible for an audience watching a counter tick up.

## Quality gate impact

No specific test for polling cadence. `usePollResults` is a thin TanStack wrapper; behavior is covered indirectly by the live oRPC integration in `apps/web` and the L3 `getResults()` test.
