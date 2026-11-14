import { expect, test } from "vite-plus/test";
import { deal } from "@/test/deal";
import { foundTime, isNew } from "./describe";

const HOUR = 3_600_000;

test("the batch from the server start has no found time and is never new", () => {
  const now = 10 * HOUR;
  const startBatch = deal({ timestamp: now - HOUR });
  const later = deal({ timestamp: now - HOUR / 2 });
  const start = now - HOUR;

  expect(foundTime(startBatch, start)).toBeUndefined();
  expect(isNew(startBatch, start, now)).toBe(false);
  expect(foundTime(later, start)).toBe(now - HOUR / 2);
  expect(isNew(later, start, now)).toBe(true);
});

test("new means found in the last two hours", () => {
  const now = 10 * HOUR;
  expect(isNew(deal({ timestamp: now - 2 * HOUR + 1 }), 0, now)).toBe(true);
  expect(isNew(deal({ timestamp: now - 2 * HOUR }), 0, now)).toBe(false);
});
