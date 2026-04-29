import { afterEach, describe, expect, test } from "bun:test";
import { assertTestEnv } from "./assert-test-env.ts";

const originalDbUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;

function restore(key: "DATABASE_URL" | "NODE_ENV", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

afterEach(() => {
  restore("DATABASE_URL", originalDbUrl);
  restore("NODE_ENV", originalNodeEnv);
});

describe("assertTestEnv", () => {
  test("throws when DATABASE_URL does not point at duopool_test", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/prod_db";
    process.env.NODE_ENV = "test";
    expect(() => assertTestEnv()).toThrow(/duopool_test/);
  });

  test("throws when NODE_ENV is not 'test'", () => {
    process.env.DATABASE_URL = "postgresql://x/duopool_test";
    process.env.NODE_ENV = "development";
    expect(() => assertTestEnv()).toThrow(/NODE_ENV/);
  });

  test("passes when both env vars are correct", () => {
    process.env.DATABASE_URL = "postgresql://x/duopool_test";
    process.env.NODE_ENV = "test";
    expect(() => assertTestEnv()).not.toThrow();
  });
});
