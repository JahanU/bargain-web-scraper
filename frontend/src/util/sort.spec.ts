import Item from "../interfaces/Item";
import { Sort } from "../interfaces/Sort";
import { applyItemFilters, discountSort, priceSort } from "./sort";

const items: Item[] = [
  {
    name: "Nike Air",
    wasPrice: "$90.00",
    nowPrice: "$70.00",
    discount: 22,
    url: "https://example.com/nike-air",
    sizes: ["M", "L"],
    timestamp: 1,
    gender: "Male",
  },
  {
    name: "Adidas Runner",
    wasPrice: "$80.00",
    nowPrice: "$55.00",
    discount: 31,
    url: "https://example.com/adidas-runner",
    sizes: ["S", "M"],
    timestamp: 2,
    gender: "Female",
  },
  {
    name: "Puma Tee",
    wasPrice: "$40.00",
    nowPrice: "$20.00",
    discount: 50,
    url: "https://example.com/puma-tee",
    sizes: ["XL"],
    timestamp: 3,
    gender: "Male",
  },
];

describe("priceSort", () => {
  it("sorts by price descending", () => {
    const sorted = priceSort(true, items);
    expect(sorted.map((item) => item.name)).toEqual(["Nike Air", "Adidas Runner", "Puma Tee"]);
  });

  it("sorts by price ascending", () => {
    const sorted = priceSort(false, items);
    expect(sorted.map((item) => item.name)).toEqual(["Puma Tee", "Adidas Runner", "Nike Air"]);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    priceSort(true, original);
    expect(original).toEqual(items);
  });
});

describe("discountSort", () => {
  it("sorts by discount descending", () => {
    const sorted = discountSort(true, items);
    expect(sorted.map((item) => item.name)).toEqual(["Puma Tee", "Adidas Runner", "Nike Air"]);
  });

  it("sorts by discount ascending", () => {
    const sorted = discountSort(false, items);
    expect(sorted.map((item) => item.name)).toEqual(["Nike Air", "Adidas Runner", "Puma Tee"]);
  });
});

describe("applyItemFilters", () => {
  it("handles case-insensitive and trimmed search", () => {
    const filtered = applyItemFilters(items, {
      search: "  NIKE ",
      minDiscount: 0,
      sizes: [],
      sort: null,
    });

    expect(filtered.map((item) => item.name)).toEqual(["Nike Air"]);
  });

  it("applies discount and size filters together", () => {
    const filtered = applyItemFilters(items, {
      search: "",
      minDiscount: 30,
      sizes: ["M"],
      sort: null,
    });

    expect(filtered.map((item) => item.name)).toEqual(["Adidas Runner"]);
  });

  it("applies enum sort after filtering", () => {
    const filtered = applyItemFilters(items, {
      search: "",
      minDiscount: 20,
      sizes: [],
      sort: Sort.priceLowToHigh,
    });

    expect(filtered.map((item) => item.name)).toEqual(["Puma Tee", "Adidas Runner", "Nike Air"]);
  });
});
