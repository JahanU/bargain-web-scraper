import { act, renderHook } from "@testing-library/react";
import { withNuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { expect, test, vi } from "vite-plus/test";
import { useFilters } from "./useFilters";

function setup(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const hook = renderHook(() => useFilters(), {
    wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate, hasMemory: true }),
  });
  const lastUrl = () => onUrlUpdate.mock.lastCall?.[0];
  return { ...hook, onUrlUpdate, lastUrl };
}

test("reads a legacy link on mount", () => {
  const { result } = setup("?search=nike&sizes=S,M,L&sort=price-low-to-high");
  expect(result.current[0]).toEqual({
    search: "nike",
    discount: 30,
    sizes: ["S", "M", "L"],
    brands: [],
    sort: "price-low-to-high",
    gender: "Male",
    category: "All",
    store: "all",
  });
});

test("an invalid sort reads as the default", () => {
  const { result } = setup("?sort=invalid-sort");
  expect(result.current[0].sort).toBe("discount-high-to-low");
});

test("writes replace history and leave defaults out", async () => {
  const { result, lastUrl } = setup("?sort=price-low-to-high");

  await act(() => result.current[1].set({ discount: 50, sort: "discount-high-to-low" }));

  expect(lastUrl()?.queryString).toBe("?discount=50");
  expect(lastUrl()?.options.history).toBe("replace");
  expect(result.current[0].discount).toBe(50);
});

test("setting the current sort again keeps it (no toggle-to-clear any more)", async () => {
  const { result } = setup("?sort=price-low-to-high");
  await act(() => result.current[1].set({ sort: "price-low-to-high" }));
  expect(result.current[0].sort).toBe("price-low-to-high");
});

test("sizes are added and removed independently and written in canonical order", async () => {
  const { result, lastUrl } = setup("?sizes=M,L");

  await act(() => result.current[1].set({ sizes: ["M", "L", "S"] }));
  expect(lastUrl()?.queryString).toBe("?sizes=S,M,L");

  await act(() => result.current[1].set({ sizes: ["L", "S"] }));
  expect(lastUrl()?.queryString).toBe("?sizes=S,L");
  expect(result.current[0].sizes).toEqual(["L", "S"]);
});

test("search writes are throttled: rapid typing updates the value at once and the URL once", async () => {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const { result } = renderHook(() => useFilters(), {
    wrapper: withNuqsTestingAdapter({ onUrlUpdate, hasMemory: true, rateLimitFactor: 1 }),
  });

  act(() => void result.current[1].set({ search: "a" }));
  act(() => void result.current[1].set({ search: "ad" }));
  act(() => void result.current[1].set({ search: "adi" }));

  expect(result.current[0].search).toBe("adi");
  await expect
    .poll(() => onUrlUpdate.mock.lastCall?.[0].queryString, { timeout: 1000 })
    .toBe("?search=adi");
  expect(onUrlUpdate.mock.calls.length).toBeLessThan(3);
});

test("clearing search to empty removes it from the URL", async () => {
  const { result, lastUrl } = setup("?search=nike");
  await act(() => result.current[1].set({ search: "" }));
  expect(result.current[0].search).toBe("");
  expect(lastUrl()?.queryString).toBe("");
});

test("clearAll resets every filter but keeps the sort, gender, category and store", async () => {
  const { result, lastUrl } = setup(
    "?search=nike&discount=50&sizes=M&brands=Nike&sort=price-high-to-low&gender=Female&category=Shoes&store=size",
  );

  await act(() => result.current[1].clearAll());

  expect(lastUrl()?.queryString).toBe(
    "?sort=price-high-to-low&gender=Female&category=Shoes&store=size",
  );
  expect(result.current[0]).toEqual({
    search: "",
    discount: 30,
    sizes: [],
    brands: [],
    sort: "price-high-to-low",
    gender: "Female",
    category: "Shoes",
    store: "size",
  });
});

test.each(["shoes", "Kids", ""])("category=%j reads as All", (value) => {
  expect(setup(`?category=${value}`).result.current[0].category).toBe("All");
});

test("category is written to the URL, and All is left out", async () => {
  const { result, lastUrl } = setup();

  await act(() => result.current[1].set({ category: "Accessories" }));
  expect(lastUrl()?.queryString).toBe("?category=Accessories");

  await act(() => result.current[1].set({ category: "All" }));
  expect(lastUrl()?.queryString).toBe("");
});

test.each(["Size", "asos", ""])("store=%j reads as all", (value) => {
  expect(setup(`?store=${value}`).result.current[0].store).toBe("all");
});

test("store is written to the URL, and all is left out", async () => {
  const { result, lastUrl } = setup();

  await act(() => result.current[1].set({ store: "size" }));
  expect(lastUrl()?.queryString).toBe("?store=size");

  await act(() => result.current[1].set({ store: "all" }));
  expect(lastUrl()?.queryString).toBe("");
});
