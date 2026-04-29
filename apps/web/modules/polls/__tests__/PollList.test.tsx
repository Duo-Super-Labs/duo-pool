import { describe, expect, mock, test } from "bun:test";
import {
  buildPoll,
  buildPollWithOptions,
  resetFixtureIds,
} from "@duopool/mocks";
import { renderWithProviders } from "@duopool/test-config/frontend";

// Mock the orpc client BEFORE importing the component. We use mock.module
// here (not MSW) because @orpc/client/fetch doesn't go through MSW's patched
// undici fetch in the bun + happy-dom environment. MSW handlers from
// @duopool/mocks ARE useful for direct-fetch integration tests
// (see packages/mocks/src/handlers.test.ts) and could power apps/worker or
// future SSR tests where the request layer is plain fetch.
//
// `mock.module` is invoked from this file (not a helper) because Bun resolves
// the specifier from the caller's module graph — the `@/` alias only resolves
// when the call originates inside `apps/web`.
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
          seedPolls.map((p) =>
            buildPoll({ id: p.id, slug: p.slug, question: p.question }),
          ),
        ),
    },
  },
}));

import { PollList } from "../components/PollList";

describe("<PollList /> — user behavior", () => {
  test("renders poll questions as links to /poll/<slug>", async () => {
    const view = renderWithProviders(<PollList />);

    const anime = await view.findByText("Best anime?");
    const dev = await view.findByText("Best dev?");

    expect(anime).not.toBeNull();
    expect(dev).not.toBeNull();

    const animeLink = anime.closest("a");
    expect(animeLink?.getAttribute("href")).toBe("/poll/anime");
  });
});
