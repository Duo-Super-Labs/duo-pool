// Optional bun test preload for backend packages. Wire via:
//   [test]
//   preload = ["@duopool/test-config/backend/setup"]
// Currently unused — the `bun --env-file=../../.env.test` flow is enough for
// the existing backend tests. Provided for symmetry with the frontend preload.

import { assertTestEnv } from "./assert-test-env.ts";

assertTestEnv();
