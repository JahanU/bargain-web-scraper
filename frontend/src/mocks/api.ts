/** The fields of a deal the backend's query reads. */
type Row = {
  name: string;
  brand: string;
  store: string;
  gender: string;
  category: string;
  discount: number;
  nowPrice: number;
  url: string;
  sizes?: string[];
  timestamp: number;
};
type Store = { store: string; name: string };
type SortKey = Pick<Row, "discount" | "nowPrice" | "url">;

const STORES: Store[] = [{ store: "jd", name: "JD Sports" }];
const DISCOUNT_FLOOR = 30;

// Each sort breaks ties with the other key, then the URL, so every deal has one place.
const byUrl = (a: SortKey, b: SortKey) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
const SORTS: Record<string, (a: SortKey, b: SortKey) => number> = {
  "discount-high-to-low": (a, b) =>
    b.discount - a.discount || a.nowPrice - b.nowPrice || byUrl(a, b),
  "discount-low-to-high": (a, b) =>
    a.discount - b.discount || a.nowPrice - b.nowPrice || byUrl(a, b),
  "price-low-to-high": (a, b) => a.nowPrice - b.nowPrice || b.discount - a.discount || byUrl(a, b),
  "price-high-to-low": (a, b) => b.nowPrice - a.nowPrice || b.discount - a.discount || byUrl(a, b),
};

const tally = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts];
};

/**
 * GET /v2/deals as the backend answers it, over `deals`: AND across parameters, OR within a
 * repeated one, keyset paging, and facets on the first page, each counted without its own filter.
 * Shared by MSW (unit tests, dev:mock) and Playwright, so both see one backend.
 */
export function queryDeals<T extends Row>(
  deals: readonly T[],
  params = new URLSearchParams(),
  stores = STORES,
): { status: number; json: Record<string, unknown> } {
  const q = params.get("q");
  const compare = SORTS[params.get("sort") ?? "discount-high-to-low"];
  if (q?.trim() === "" || !compare) return { status: 400, json: { error: "Bad Request" } };

  const storeName = (id: string) => stores.find((row) => row.store === id)?.name ?? "";
  const words = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const anyOf = (name: string, value: (deal: T) => string | string[]) => {
    const wanted = params.getAll(name);
    return (deal: T) => wanted.length === 0 || wanted.some((one) => value(deal).includes(one));
  };
  const tests: Record<string, (deal: T) => boolean> = {
    gender: anyOf("gender", (deal) => [deal.gender]),
    category: anyOf("category", (deal) => [deal.category]),
    store: anyOf("store", (deal) => [deal.store]),
    brand: anyOf("brand", (deal) => [deal.brand]),
    size: anyOf("size", (deal) => deal.sizes ?? []),
    q: (deal) => {
      const text = `${deal.name} ${deal.brand} ${storeName(deal.store)}`.toLowerCase();
      return words.every((word) => text.includes(word));
    },
    minDiscount: (deal) => deal.discount >= Number(params.get("minDiscount") ?? 0),
  };
  const matching = (except?: string) =>
    deals.filter((deal) =>
      Object.entries(tests).every(([name, test]) => name === except || test(deal)),
    );

  const sorted = matching().sort(compare);
  const cursor = params.get("cursor");
  const after =
    cursor === null ? sorted : sorted.filter((deal) => compare(deal, decode(cursor)) > 0);
  const items = after.slice(0, Number(params.get("limit") ?? 60));
  const last = items.at(-1);
  return {
    status: 200,
    json: {
      items,
      total: sorted.length,
      nextCursor: last && items.length < after.length ? encode(last) : null,
      trackingSince: deals.length > 0 ? Math.min(...deals.map((deal) => deal.timestamp)) : 0,
      ...(cursor === null && {
        facets: {
          stores: stores.map((row) => ({
            ...row,
            count: matching("store").filter((deal) => deal.store === row.store).length,
          })),
          brands: tally(matching("brand").map((deal) => deal.brand))
            .map(([brand, count]) => ({ brand, count }))
            .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand)),
          sizes: tally(matching("size").flatMap((deal) => deal.sizes ?? [])).map(
            ([size, count]) => ({ size, count }),
          ),
          discounts: Array.from({ length: 8 }, (_, index) => DISCOUNT_FLOOR + index * 10).map(
            (minDiscount) => ({
              minDiscount,
              count: matching("minDiscount").filter((deal) => deal.discount >= minDiscount).length,
            }),
          ),
        },
      }),
    },
  };
}

// The cursor is the last deal's sort key, not an offset: the next page is whatever sorts after it.
const encode = ({ discount, nowPrice, url }: SortKey) =>
  btoa(JSON.stringify({ discount, nowPrice, url }));
const decode = (cursor: string) => JSON.parse(atob(cursor)) as SortKey;
