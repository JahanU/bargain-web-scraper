import { parseSizesParam, parseSortParam } from "./urlParams";
import { Sort } from "../interfaces/Sort";

describe("parseSizesParam", () => {
    it("returns empty array for null input", () => {
        expect(parseSizesParam(null)).toEqual([]);
    });

    it("returns empty array for empty string", () => {
        expect(parseSizesParam("")).toEqual([]);
    });

    it("parses a single size", () => {
        expect(parseSizesParam("M")).toEqual(["M"]);
    });

    it("parses multiple comma-separated sizes", () => {
        expect(parseSizesParam("S,M,L")).toEqual(["S", "M", "L"]);
    });

    it("trims whitespace around sizes", () => {
        expect(parseSizesParam(" S , M , L ")).toEqual(["S", "M", "L"]);
    });

    it("deduplicates repeated sizes", () => {
        expect(parseSizesParam("M,M,L")).toEqual(["M", "L"]);
    });

    it("filters out empty segments from double commas", () => {
        expect(parseSizesParam("S,,L")).toEqual(["S", "L"]);
    });
});

describe("parseSortParam", () => {
    it("returns null for null input", () => {
        expect(parseSortParam(null)).toBeNull();
    });

    it("returns null for an empty string", () => {
        expect(parseSortParam("")).toBeNull();
    });

    it("returns null for an invalid sort string", () => {
        expect(parseSortParam("invalid-sort")).toBeNull();
    });

    it("returns null for a partially-matching sort string", () => {
        expect(parseSortParam("price")).toBeNull();
    });

    it("returns the Sort enum for 'discount-high-to-low'", () => {
        expect(parseSortParam("discount-high-to-low")).toBe(Sort.discountHighToLow);
    });

    it("returns the Sort enum for 'discount-low-to-high'", () => {
        expect(parseSortParam("discount-low-to-high")).toBe(Sort.discountLowToHigh);
    });

    it("returns the Sort enum for 'price-high-to-low'", () => {
        expect(parseSortParam("price-high-to-low")).toBe(Sort.priceHighToLow);
    });

    it("returns the Sort enum for 'price-low-to-high'", () => {
        expect(parseSortParam("price-low-to-high")).toBe(Sort.priceLowToHigh);
    });
});
