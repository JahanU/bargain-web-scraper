import { expect, test } from "vite-plus/test";
import { readApiUrl } from "./env";

test("accepts an http(s) URL and drops trailing slashes", () => {
  expect(readApiUrl("http://localhost:8000")).toBe("http://localhost:8000");
  expect(readApiUrl("https://bargain-web-scraper-8bbn.onrender.com/")).toBe(
    "https://bargain-web-scraper-8bbn.onrender.com",
  );
});

test("fails loudly on a missing or malformed value", () => {
  expect(() => readApiUrl(undefined)).toThrow(/VITE_API_URL/);
  expect(() => readApiUrl("localhost:8000")).toThrow(/VITE_API_URL/);
  expect(() => readApiUrl("ftp://example.com")).toThrow(/VITE_API_URL/);
});
