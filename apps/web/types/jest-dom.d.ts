// Augments bun:test's Matchers interface with the @testing-library/jest-dom
// matchers (toBeInTheDocument, toBeEnabled, toBeDisabled, toHaveValue, etc.).
// Runtime extension happens in @duopool/test-config/frontend/setup via
// `import "@testing-library/jest-dom"`; this ambient declaration teaches
// TypeScript about the new matcher methods so the asserts compile.

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "bun:test" {
  interface Matchers<T = unknown> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchers extends TestingLibraryMatchers<unknown, void> {}
}
