import { expect, test } from "vite-plus/test";
import { gbp, relativeTime } from "./format";

test("gbp drops pence on whole pounds", () => {
  expect(gbp(10)).toBe("£10");
  expect(gbp(54.99)).toBe("£54.99");
  expect(gbp(54.5)).toBe("£54.50");
  expect(gbp(1250)).toBe("£1,250");
});

test("relativeTime counts back in minutes, hours and days", () => {
  const now = Date.UTC(2026, 10, 5, 14, 5);
  expect(relativeTime(now - 30_000, now)).toBe("just now");
  expect(relativeTime(now - 4 * 60_000, now)).toBe("4 min ago");
  expect(relativeTime(now - 2 * 3_600_000 - 59 * 60_000, now)).toBe("2 hr ago");
  expect(relativeTime(now - 26 * 3_600_000, now)).toBe("yesterday");
  expect(relativeTime(now - 3 * 86_400_000, now)).toBe("3 days ago");
});
