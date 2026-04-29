import { describe, expect, mock, test } from "bun:test";
import { renderWithProviders } from "@duopool/test-config/frontend";

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

import { StageView } from "../StageView";

function setResults(data: ResultsShape, isLoading = false) {
  mockData = data;
  mockIsLoading = isLoading;
}

describe("<StageView /> — projector mode", () => {
  test("renders without any vote UI", () => {
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

    const view = renderWithProviders(<StageView slug="anime" />);

    // No interactive vote elements should appear in projector mode.
    expect(view.queryAllByRole("button").length).toBe(0);
    expect(view.queryByText(/Votar/i)).toBeNull();
    // No "you voted" footer either.
    expect(view.queryByText(/Você votou/i)).toBeNull();
  });

  test("renders the leader percentage prominently", () => {
    setResults({
      pollId: "p-1",
      slug: "anime",
      question: "Best anime?",
      total: 8,
      options: [
        { optionId: "opt-jedi", label: "Jedi", count: 3, percentage: 38 },
        { optionId: "opt-sith", label: "Sith", count: 5, percentage: 62 },
      ],
    });

    const view = renderWithProviders(<StageView slug="anime" />);

    // Leader % is shown. Use a flexible matcher because the % digit may be
    // followed by a literal "%" in the same text node.
    const leaderPct = view.getByText("62%");
    expect(leaderPct).not.toBeNull();
    // And the leader label (Sith) is rendered as the dominant choice.
    expect(view.getByText("Sith")).not.toBeNull();
  });
});
