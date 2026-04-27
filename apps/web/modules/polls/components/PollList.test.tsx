import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import {
  buildPoll,
  buildPollWithOptions,
  resetFixtureIds,
} from "@duopool/mocks";
import type { ReactNode } from "react";

// Mock the orpc client BEFORE importing the component. We use mock.module
// here (not MSW) because @orpc/client/fetch doesn't go through MSW's patched
// undici fetch in the bun + happy-dom environment. MSW handlers from
// @duopool/mocks ARE useful for direct-fetch integration tests
// (see packages/mocks/src/handlers.test.ts) and could power apps/worker or
// future SSR tests where the request layer is plain fetch.
resetFixtureIds();
const seedPolls = [
  buildPollWithOptions({ slug: "anime", question: "Best anime?" }),
  buildPollWithOptions({ slug: "dev", question: "Best dev?" }),
];

mock.module("@/lib/orpc-client", () => ({
  orpc: {
    polls: {
      list: () =>
        Promise.resolve(
          seedPolls.map((p) => buildPoll({ id: p.id, slug: p.slug, question: p.question })),
        ),
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
