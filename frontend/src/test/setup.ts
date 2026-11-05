import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect } from "vite-plus/test";
import * as axeMatchers from "vitest-axe/matchers";
import { server } from "@/mocks/server";

expect.extend(axeMatchers);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
