/**
 * Fails fast if the current process is not configured for tests against the
 * `duopool_test` database. Call at the top of backend test files (or via the
 * optional `@duopool/test-config/backend/setup` preload).
 */
export function assertTestEnv(): void {
  if (!process.env.DATABASE_URL?.includes("duopool_test")) {
    throw new Error(
      "assertTestEnv: DATABASE_URL is not pointing at duopool_test. " +
        "Did you forget --env-file=../../.env.test?",
    );
  }
  if (process.env.NODE_ENV !== "test") {
    throw new Error("assertTestEnv: NODE_ENV must be 'test'");
  }
}
