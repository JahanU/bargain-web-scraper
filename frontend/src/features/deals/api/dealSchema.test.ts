import { expect, test, vi } from "vite-plus/test";
import fixture from "@/test/fixtures/deals.json";
import { makeDeal } from "@/test/makeDeal";
import { ApiError } from "./ApiError";
import { parseDeals } from "./dealSchema";

test("a valid list passes through unchanged", () => {
  const deals = [makeDeal(), makeDeal({ sizes: undefined, imageUrl: undefined })];
  expect(parseDeals(deals)).toEqual(deals);
});

test("legacy price strings are coerced to numbers", () => {
  const [deal] = parseDeals([{ ...makeDeal(), wasPrice: "£1,135.00", nowPrice: "54.99" }]);
  expect(deal).toMatchObject({ wasPrice: 1135, nowPrice: 54.99 });
});

test("an invalid item is dropped and counted; the rest survive", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const good = makeDeal();

  const deals = parseDeals([good, { ...makeDeal(), nowPrice: "free" }, { name: "no url" }, null]);

  expect(deals).toEqual([good]);
  expect(warn).toHaveBeenCalledWith("Dropped 3 of 4 deals that failed validation.");
});

test("fields the backend no longer sends are stripped, and an unknown gender becomes Unisex", () => {
  const [deal] = parseDeals([{ ...makeDeal(), inStock: "IN STOCK", gender: "Kids" }]);
  expect(deal).not.toHaveProperty("inStock");
  expect(deal?.gender).toBe("Unisex");
});

test("a body that isn't a list is an invalid-body error; an empty list is fine", () => {
  expect(() => parseDeals({ error: "Not Found" })).toThrow(
    expect.objectContaining({ kind: "invalid-body" }),
  );
  expect(() => parseDeals(null)).toThrow(ApiError);
  expect(parseDeals([])).toEqual([]);
});

test("every deal in the checked-in fixture is valid", () => {
  expect(parseDeals(fixture)).toHaveLength(81);
});

test("a deal without a brand or with an unknown category is dropped", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { brand: _brand, ...noBrand } = makeDeal();
  const valid = makeDeal();

  expect(parseDeals([noBrand, { ...makeDeal(), category: "Kids" }, valid])).toHaveLength(1);
  expect(warn).toHaveBeenCalledWith("Dropped 2 of 3 deals that failed validation.");
});

test("a list with no valid deal is an invalid-body error, not an empty sale", () => {
  const { brand: _brand, ...noBrand } = makeDeal();

  expect(() => parseDeals([noBrand, noBrand])).toThrow(
    expect.objectContaining({ kind: "invalid-body" }),
  );
});
