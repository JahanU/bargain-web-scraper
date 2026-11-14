import { dehydrate, QueryClient } from "@tanstack/react-query";
import { expect, test } from "vite-plus/test";
import { dealsQueryOptions } from "@/features/deals";
import { queryDeals } from "@/mocks/api";
import fixture from "@/test/fixtures/deals.json";
import { persistOptions } from "./queryClient";

const MEN = {
  gender: "Male",
  category: "All",
  stores: [],
  brands: [],
  sizes: [],
  search: "",
  discount: 30,
  sort: "discount-high-to-low",
} as const;

test("only unfiltered views are saved, and only their first page", async () => {
  const client = new QueryClient();
  const views = [
    MEN,
    { ...MEN, category: "Shoes", sort: "price-low-to-high" },
    { ...MEN, search: "nike" },
    { ...MEN, discount: 50 },
    { ...MEN, sizes: ["M"] },
    { ...MEN, brands: ["Nike"] },
    { ...MEN, stores: ["jd"] },
  ] as const;
  for (const view of views) await client.prefetchInfiniteQuery(dealsQueryOptions(view));
  await client.fetchInfiniteQuery({ ...dealsQueryOptions(MEN), pages: 2, staleTime: 0 });

  const saved = dehydrate(client, persistOptions.dehydrateOptions).queries;

  expect(saved.map((query) => query.queryKey[2])).toEqual([
    "gender=Male&limit=60",
    "gender=Male&category=Shoes&sort=price-low-to-high&limit=60",
  ]);
  expect(client.getQueryData(dealsQueryOptions(MEN).queryKey)?.pages).toHaveLength(2);
  expect(saved[0]?.state.data).toEqual({
    pages: [queryDeals(fixture, new URLSearchParams("gender=Male&limit=60")).json],
    pageParams: [null],
  });
});
