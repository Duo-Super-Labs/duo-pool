import { describe, expect, test } from "bun:test";
import { createTestQueryClient, renderWithProviders } from "./render.tsx";

describe("createTestQueryClient", () => {
  test("returns a QueryClient with retries disabled", () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.queries?.staleTime).toBe(0);
  });
});

describe("renderWithProviders", () => {
  test("renders children inside a QueryClientProvider", () => {
    const view = renderWithProviders(<span>hello</span>);
    expect(view.getByText("hello")).not.toBeNull();
    expect(view.queryClient).toBeDefined();
  });

  test("uses a passed-in queryClient when provided", () => {
    const queryClient = createTestQueryClient();
    const view = renderWithProviders(<span>x</span>, { queryClient });
    expect(view.queryClient).toBe(queryClient);
  });
});
