import { expect, test } from "vite-plus/test";
import { type DealsRequest, dealsQuery, isUnfilteredQuery } from "./request";

const request = (overrides: Partial<DealsRequest> = {}): DealsRequest => ({
  gender: "Male",
  category: "All",
  stores: [],
  brands: [],
  sizes: [],
  search: "",
  discount: 30,
  sort: "discount-high-to-low",
  ...overrides,
});

test("defaults are left out: the plain view asks only for its gender and a page", () => {
  expect(dealsQuery(request())).toBe("gender=Male&limit=60");
});

test("every part of the request has its parameter, in one fixed order", () => {
  expect(
    dealsQuery(
      request({
        gender: "Female",
        category: "Shoes",
        stores: ["jd"],
        brands: ["Nike"],
        sizes: ["9"],
        search: "air max",
        discount: 50,
        sort: "price-low-to-high",
      }),
    ),
  ).toBe(
    "gender=Female&category=Shoes&store=jd&brand=Nike&size=9&q=air+max&minDiscount=50&sort=price-low-to-high&limit=60",
  );
});

test("repeated values are sorted, so a selection made in any order is one request", () => {
  const one = request({ brands: ["adidas", "New Balance", "Nike"], sizes: ["M", "9"] });
  const other = request({ brands: ["Nike", "adidas", "New Balance"], sizes: ["9", "M"] });

  expect(dealsQuery(one)).toBe(
    "gender=Male&brand=New+Balance&brand=Nike&brand=adidas&size=9&size=M&limit=60",
  );
  expect(dealsQuery(other)).toBe(dealsQuery(one));
});

test("search is trimmed, and a blank one is never sent", () => {
  expect(dealsQuery(request({ search: "  nike " }))).toBe("gender=Male&q=nike&limit=60");
  expect(dealsQuery(request({ search: "   " }))).toBe("gender=Male&limit=60");
});

test("unfiltered means no store, brand, size, search or discount; scope and sort don't count", () => {
  expect(
    isUnfilteredQuery(dealsQuery(request({ category: "Shoes", sort: "price-high-to-low" }))),
  ).toBe(true);
  for (const filtered of [
    { stores: ["jd"] },
    { brands: ["Nike"] },
    { sizes: ["M"] },
    { search: "nike" },
    { discount: 40 },
  ]) {
    expect(isUnfilteredQuery(dealsQuery(request(filtered)))).toBe(false);
  }
});
