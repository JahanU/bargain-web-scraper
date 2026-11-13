import { expect, test } from "vite-plus/test";
import { makeDeal } from "@/test/makeDeal";
import { normaliseDeal } from "./normalise";

test("turns a wire deal into the UI's Deal", () => {
  const deal = normaliseDeal(
    makeDeal({
      name: "The North Face Mountain Jacket",
      brand: "The North Face",
      category: "Clothes",
      url: "https://www.jdsports.co.uk/product/black-tnf/19599668/",
      sizes: ["XL", "S", "9", "S"],
      timestamp: 123,
    }),
  );

  expect(deal).toMatchObject({
    id: "https://www.jdsports.co.uk/product/black-tnf/19599668/",
    brand: "The North Face",
    category: "Clothes",
    store: "jd",
    sizes: ["S", "XL", "9"],
    searchText: "the north face mountain jacket",
    foundAt: 123,
  });
  expect(deal.sizeSet).toEqual(new Set(["S", "XL", "9"]));
  expect(deal.image?.srcSet).toContain("w=240");
});

test("missing sizes and image become an empty list and no image", () => {
  const deal = normaliseDeal(makeDeal({ sizes: undefined, imageUrl: undefined }));
  expect(deal.sizes).toEqual([]);
  expect(deal.sizeSet.size).toBe(0);
  expect(deal.image).toBeUndefined();
});

test("the store comes from the wire, and a deal saved before stores existed is JD's", () => {
  expect(normaliseDeal(makeDeal({ store: "size" })).store).toBe("size");
  expect(normaliseDeal(makeDeal({ store: undefined })).store).toBe("jd");
});
