"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-client";

// TanStack Query hooks for polls. This file owns query invalidation —
// components only do UI feedback. (Same rule as duo-admin starter.)
//
// ⚠️ useVote() is RESERVED FOR LIVE DEMO — see CLAUDE.md. The stub below
// preserves the call-site shape (so <VoteScreen> can be built and tested
// today) but rejects with a recognizable "not implemented" error. The live
// demo replaces the mutationFn with the real `orpc.polls.vote(...)` call.

export const VOTE_NOT_IMPLEMENTED_MESSAGE =
  "polls.vote not implemented yet — reserved for live demo";

export function usePolls() {
  return useQuery({
    queryKey: ["polls", "list"],
    queryFn: () => orpc.polls.list(),
  });
}

export function usePoll(slug: string | undefined) {
  return useQuery({
    queryKey: ["polls", "get", slug],
    queryFn: slug ? () => orpc.polls.get({ slug }) : undefined,
    enabled: !!slug,
  });
}

export function usePollResults(slug: string | undefined) {
  return useQuery({
    queryKey: ["polls", "results", slug],
    queryFn: slug ? () => orpc.polls.results({ slug }) : undefined,
    enabled: !!slug,
    refetchInterval: 2_000, // Live results — polling every 2s during the talk.
  });
}

/**
 * Client-side fallback for the server-side redirect in `app/poll/[slug]/page.tsx`.
 * The RSC redirect is the primary mechanism; this hook covers hot-reload edge
 * cases where the server route briefly serves the vote screen with a stale
 * cookie. See ADR-001 / spec section "Server-side redirect".
 */
export function useHasVoted(slug: string | undefined) {
  return useQuery({
    queryKey: ["polls", "hasVoted", slug],
    queryFn: slug ? () => orpc.polls.hasVoted({ slug }) : undefined,
    enabled: !!slug,
  });
}

interface VoteInput {
  pollId: string;
  pollOptionId: string;
}

/**
 * useVote() — RESERVED LIVE-DEMO SLOT.
 *
 * Until `polls.vote` is wired (live, on stage, via /duo.exec), this stub
 * returns a mutation whose mutationFn rejects with VOTE_NOT_IMPLEMENTED_MESSAGE.
 * Consumers (`<VoteScreen>`) MUST catch this specific error and degrade
 * gracefully so the rest of the redesign is reviewable end-to-end.
 *
 * Post-talk: replace the mutationFn body with `orpc.polls.vote(input)` and
 * keep the same invalidation behavior.
 */
export function useVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_input: VoteInput) => {
      throw new Error(VOTE_NOT_IMPLEMENTED_MESSAGE);
    },
    onSuccess: () => {
      // Invalidation lives in api.ts (per duo-admin rule).
      queryClient.invalidateQueries({ queryKey: ["polls", "results"] });
      queryClient.invalidateQueries({ queryKey: ["polls", "hasVoted"] });
    },
  });
}
