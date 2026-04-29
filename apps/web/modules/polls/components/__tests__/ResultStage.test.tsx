import { describe, expect, mock, test } from "bun:test";
import { renderWithProviders } from "@duopool/test-config/frontend";

// Mock the api module BEFORE importing the component, mirroring the
// pattern used in apps/web/modules/polls/components/PollList.test.tsx.
// We control `usePollResults` per-test to assert the various states the
// stage can be in (loading / empty / leader+runner-up).
type ResultsShape = {
  pollId: string;
  slug: string;
  question: string;
  total: number;
  options: Array<{
    optionId: string;
    label: string;
    count: number;
    percentage: number;
  }>;
} | null;

let mockData: ResultsShape = null;
let mockIsLoading = false;

mock.module("@/modules/polls/api", () => ({
  usePollResults: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}));

import { ResultStage } from "../ResultStage";

function setResults(data: ResultsShape, isLoading = false) {
  mockData = data;
  mockIsLoading = isLoading;
}

describe("<ResultStage /> — user behavior", () => {
  test("renders the leader's percentage and label", () => {
    setResults({
      pollId: "p-1",
      slug: "anime",
      question: "Best anime?",
      total: 10,
      options: [
        { optionId: "opt-jedi", label: "Jedi", count: 4, percentage: 40 },
        { optionId: "opt-sith", label: "Sith", count: 6, percentage: 60 },
      ],
    });

    const view = renderWithProviders(<ResultStage slug="anime" />);

    expect(view.getByText("60%")).not.toBeNull();
    expect(view.getByText("Sith")).not.toBeNull();
  });

  test("shows '✓ Você votou X' only when youVotedOptionId matches an option", () => {
    setResults({
      pollId: "p-1",
      slug: "anime",
      question: "Best anime?",
      total: 5,
      options: [
        { optionId: "opt-jedi", label: "Jedi", count: 2, percentage: 40 },
        { optionId: "opt-sith", label: "Sith", count: 3, percentage: 60 },
      ],
    });

    // First render — no youVotedOptionId provided
    const withoutVote = renderWithProviders(<ResultStage slug="anime" />);
    expect(withoutVote.queryByText(/Você votou/)).toBeNull();
    withoutVote.unmount();

    // Second render — voter picked Jedi
    const withVote = renderWithProviders(
      <ResultStage slug="anime" youVotedOptionId="opt-jedi" />,
    );
    expect(withVote.getByText("✓ Você votou Jedi")).not.toBeNull();
  });

  test("shows the empty state when total is 0", () => {
    setResults({
      pollId: "p-1",
      slug: "anime",
      question: "Best anime?",
      total: 0,
      options: [
        { optionId: "opt-jedi", label: "Jedi", count: 0, percentage: 0 },
        { optionId: "opt-sith", label: "Sith", count: 0, percentage: 0 },
      ],
    });

    const view = renderWithProviders(<ResultStage slug="anime" />);

    expect(view.getByText("Aguardando primeiro voto…")).not.toBeNull();
  });
});
