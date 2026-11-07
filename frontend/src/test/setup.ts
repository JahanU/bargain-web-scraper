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

// jsdom lacks these; the deal grid's virtualiser scrolls on mount and observes the document.
// Real scrolling and resizing are tested in e2e.
window.scrollTo = () => {};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no layout, so the virtualised deal grid would measure every row at 0 px and render an
// arbitrary window. Its rows (marked data-index) get a nominal height, so tests see the first rows
// as a browser would. Real sizes and scrolling are tested in e2e.
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!;
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get(this: HTMLElement) {
    return this.hasAttribute("data-index") ? 100 : offsetHeight.get!.call(this);
  },
});

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
