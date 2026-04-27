// bun test preload — registers @testing-library/jest-dom matchers and
// installs happy-dom as the global DOM. Loaded via apps/web/bunfig.toml.

import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

GlobalRegistrator.register();

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
