import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vite-plus/test";
import * as axeMatchers from "vitest-axe/matchers";
import { server } from "@/mocks/server";
import { installMatchMedia } from "./matchMedia";

expect.extend(axeMatchers);

// jsdom has <dialog> but not showModal/close. Real modal behaviour (focus trap, Escape, inert
// page) is the browser's and is tested in e2e; this only opens, closes and fires "close".
if (!("showModal" in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true;
    },
    close(this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event("close"));
    },
  });
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  installMatchMedia();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
