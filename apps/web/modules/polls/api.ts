"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc-client";

// TanStack Query hooks for polls. This file owns query invalidation —
// components only do UI feedback. (Same rule as duo-admin starter.)
//
// ⚠️ useVote() is RESERVED FOR LIVE DEMO — see CLAUDE.md.

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
