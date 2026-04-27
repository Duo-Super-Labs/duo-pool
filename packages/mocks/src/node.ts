import { setupServer } from "msw/node";
import { handlers } from "./handlers.ts";

/**
 * Pre-configured MSW server for Node-side tests (bun test + happy-dom + RTL).
 *
 * Usage:
 *   import { server } from "@duopool/mocks/node";
 *   import { resetMockState, seedMockState } from "@duopool/mocks";
 *
 *   beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
 *   beforeEach(() => { resetMockState(); seedMockState({ polls: [...] }); });
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 *
 * Override per-test:
 *   server.use(http.post(`${BASE}/api/rpc/polls/list`, () => HttpResponse.error()));
 */
export const server = setupServer(...handlers);
