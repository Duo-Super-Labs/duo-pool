import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock the orpc client BEFORE importing the component so the hook in api.ts
// resolves to our test double.
mock.module("@/lib/orpc-client", () => ({
  orpc: {
    polls: {
      list: () =>
        Promise.resolve([
          {
            id: "uuid-1",
            slug: "anime",
            question: "Best anime?",
            createdAt: new Date(),
          },
          {
            id: "uuid-2",
            slug: "dev",
            question: "Best dev?",
            createdAt: new Date(),
          },
        ]),
    },
  },
}));

import { PollList } from "./PollList";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("<PollList /> — user behavior", () => {
  test("renders poll questions as links to /poll/<slug>", async () => {
    const view = render(<PollList />, { wrapper });

    const anime = await view.findByText("Best anime?");
    const dev = await view.findByText("Best dev?");

    expect(anime).not.toBeNull();
    expect(dev).not.toBeNull();

    const animeLink = anime.closest("a");
    expect(animeLink?.getAttribute("href")).toBe("/poll/anime");
  });
});
