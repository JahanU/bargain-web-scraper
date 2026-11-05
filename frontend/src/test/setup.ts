import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect } from "vite-plus/test";
import * as axeMatchers from "vitest-axe/matchers";
import { server } from "@/mocks/server";
import { installMatchMedia } from "./matchMedia";

expect.extend(axeMatchers);

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
