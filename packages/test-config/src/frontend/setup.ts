// bun test preload — registers @testing-library/jest-dom matchers and
// installs happy-dom as the global DOM. Wired via `bunfig.toml`:
//   [test]
//   preload = ["@duopool/test-config/frontend/setup"]

import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Pin window.location to a real http origin so any direct fetch in tests
// (e.g. against MSW handlers in @duopool/mocks) is treated as same-origin.
GlobalRegistrator.register({ url: "http://localhost:3000" });

afterEach(() => {
  cleanup();
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0]?.trim();
    if (name) {
      // biome-ignore lint/suspicious/noDocumentCookie: test cleanup needs raw cookie API
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
});
