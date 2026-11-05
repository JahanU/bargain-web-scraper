import { expect, test } from "vite-plus/test";
import { sizeFacets, sizeGroup, sortSizes } from "./sizes";

test("numeric sizes are footwear, everything else is clothing", () => {
  expect(sizeGroup("8")).toBe("footwear");
  expect(sizeGroup("8.5")).toBe("footwear");
  expect(sizeGroup("070")).toBe("footwear");
  expect(sizeGroup("M")).toBe("clothing");
  expect(sizeGroup("LXL")).toBe("clothing");
  expect(sizeGroup("OS")).toBe("clothing");
});

test("canonical order: clothing XS→XXXL, odd clothing A→Z, then footwear ascending", () => {
  expect(
    sortSizes(["12", "OS", "XXL", "8.5", "S", "LXL", "3", "XS", "XXXL", "070", "M", "SM", "10"]),
  ).toEqual(["XS", "S", "M", "XXL", "XXXL", "LXL", "OS", "SM", "3", "8.5", "10", "12", "070"]);
});

test("duplicates are dropped", () => {
  expect(sortSizes(["M", "S", "M"])).toEqual(["S", "M"]);
});

test("size facets count deals per size, grouped, canonical, absent sizes left out", () => {
  expect(
    sizeFacets([
      { sizes: ["M", "9"] },
      { sizes: ["S", "M"] },
      { sizes: [] },
      { sizes: ["9", "OS"] },
    ]),
  ).toEqual({
    clothing: [
      { size: "S", count: 1 },
      { size: "M", count: 2 },
      { size: "OS", count: 1 },
    ],
    footwear: [{ size: "9", count: 2 }],
  });
});
