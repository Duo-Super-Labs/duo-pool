// Factories — pure data builders for tests. No deps on Drizzle, no DB writes.
// Each factory accepts a partial override so tests can pin specific fields.

let _seq = 0;
function nextId() {
  _seq += 1;
  // Deterministic UUID-ish ids — easier to assert against than random.
  return `00000000-0000-0000-0000-${String(_seq).padStart(12, "0")}`;
}

export interface PollFixture {
  id: string;
  slug: string;
  question: string;
  createdAt: string;
}

export interface PollOptionFixture {
  id: string;
  pollId: string;
  label: string;
  order: number;
}

export interface PollWithOptionsFixture extends PollFixture {
  options: PollOptionFixture[];
}

export interface ResultsFixture {
  pollId: string;
  slug: string;
  question: string;
  total: number;
  options: {
    optionId: string;
    label: string;
    count: number;
    percentage: number;
  }[];
}

export function buildPoll(overrides: Partial<PollFixture> = {}): PollFixture {
  return {
    id: nextId(),
    slug: "fixture-poll",
    question: "Fixture poll question?",
    createdAt: "2026-04-26T00:00:00.000Z",
    ...overrides,
  };
}

export function buildPollOption(
  pollId: string,
  overrides: Partial<PollOptionFixture> = {},
): PollOptionFixture {
  return {
    id: nextId(),
    pollId,
    label: "Fixture option",
    order: 0,
    ...overrides,
  };
}

export function buildPollWithOptions(
  pollOverrides: Partial<PollFixture> = {},
  optionLabels: string[] = ["Yes", "No"],
): PollWithOptionsFixture {
  const poll = buildPoll(pollOverrides);
  return {
    ...poll,
    options: optionLabels.map((label, order) =>
      buildPollOption(poll.id, { label, order }),
    ),
  };
}

export function buildResults(
  poll: PollWithOptionsFixture,
  counts: number[] = [],
): ResultsFixture {
  const total = counts.reduce((acc, c) => acc + c, 0);
  return {
    pollId: poll.id,
    slug: poll.slug,
    question: poll.question,
    total,
    options: poll.options.map((opt, i) => {
      const count = counts[i] ?? 0;
      return {
        optionId: opt.id,
        label: opt.label,
        count,
        percentage:
          total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
      };
    }),
  };
}

/** Reset the deterministic sequence — call from `beforeEach` to keep ids stable. */
export function resetFixtureIds() {
  _seq = 0;
}
