import { afterAll, afterEach, beforeAll } from "bun:test";
import { server } from "@duopool/mocks/node";

export interface UseMswServerOptions {
  onUnhandledRequest?: "error" | "warn" | "bypass";
}

/**
 * Codifies the MSW lifecycle so test files don't reimplement it.
 * Call once at the top of a `describe` (or at the module top-level).
 *
 *   describe("my feature", () => {
 *     useMswServer();
 *     // ...
 *   });
 */
export function useMswServer(options: UseMswServerOptions = {}) {
  const onUnhandledRequest = options.onUnhandledRequest ?? "error";

  beforeAll(() => {
    server.listen({ onUnhandledRequest });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });

  return server;
}
