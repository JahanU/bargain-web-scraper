import { delay, http, HttpResponse } from "msw";
import { expect, test } from "vite-plus/test";
import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { makeDeal } from "@/test/makeDeal";
import { fetchBrands, fetchDeals, retryAfterMs } from "./dealsApi";

const URL = "http://localhost:8000/v1/deals";
const BRANDS_URL = "http://localhost:8000/v1/brands";
const MEN = { gender: "Male", category: "All", brands: [] } as const;

/** Answers with each response in turn (the last one repeats) and records every request. */
function respondWith(...responses: Array<() => Response>) {
  return respondAt(URL, ...responses);
}

function respondAt(url: string, ...responses: Array<() => Response>) {
  const requests: Request[] = [];
  server.use(
    http.get(url, ({ request }) => {
      requests.push(request);
      return (responses[Math.min(requests.length - 1, responses.length - 1)] as () => Response)();
    }),
  );
  return requests;
}

const loading = (retryAfter?: string) => () =>
  HttpResponse.json(
    { error: "loading" },
    { status: 503, headers: retryAfter === undefined ? {} : { "Retry-After": retryAfter } },
  );

/** A fake clock: sleeping advances time instantly and is recorded. */
function fakeClock() {
  let time = 0;
  const waits: number[] = [];
  return {
    waits,
    now: () => time,
    sleep: async (ms: number) => {
      waits.push(ms);
      time += ms;
    },
  };
}

test("one plain GET: no custom headers (they'd force a CORS preflight), no cache bypass", async () => {
  const deal = makeDeal();
  const requests = respondWith(() => HttpResponse.json([deal]));

  expect(await fetchDeals({ ...MEN, gender: "Female" })).toEqual([deal]);

  expect(requests).toHaveLength(1);
  const [request] = requests;
  expect(request?.method).toBe("GET");
  expect(request?.url).toBe(`${URL}?gender=Female`);
  // Only what the runtime adds by itself; anything else would trigger a preflight.
  const automatic = [
    "accept",
    "accept-encoding",
    "accept-language",
    "connection",
    "host",
    "sec-fetch-mode",
    "user-agent",
  ];
  expect([...(request?.headers.keys() ?? [])].filter((name) => !automatic.includes(name))).toEqual(
    [],
  );
  expect(request?.cache).toBe("default");
});

test("on 503 it waits Retry-After and tries again", async () => {
  const deal = makeDeal();
  const requests = respondWith(loading("7"), () => HttpResponse.json([deal]));
  const clock = fakeClock();

  expect(await fetchDeals(MEN, undefined, clock)).toEqual([deal]);

  expect(requests).toHaveLength(2);
  expect(clock.waits).toEqual([7000]);
});

test("Retry-After defaults to 10 s and is clamped to 1–60 s", () => {
  expect(retryAfterMs(null)).toBe(10_000);
  expect(retryAfterMs("")).toBe(10_000);
  expect(retryAfterMs("soon")).toBe(10_000);
  expect(retryAfterMs("0")).toBe(1000);
  expect(retryAfterMs("99999")).toBe(60_000);
  expect(retryAfterMs("15")).toBe(15_000);
});

test("after two minutes of 503s it gives up with still-loading", async () => {
  const requests = respondWith(loading("10"));
  const clock = fakeClock();

  await expect(fetchDeals(MEN, undefined, clock)).rejects.toMatchObject({
    kind: "still-loading",
  });

  expect(requests).toHaveLength(13); // t = 0, 10, … 120 s
  expect(clock.now()).toBe(120_000);
});

test("other statuses are http errors and are not retried here", async () => {
  const requests = respondWith(() => HttpResponse.json({ error: "Not Found" }, { status: 404 }));

  await expect(fetchDeals(MEN)).rejects.toMatchObject({ kind: "http", status: 404 });
  expect(requests).toHaveLength(1);
});

test("a non-JSON 502 platform page is an http error, not a parse crash", async () => {
  server.use(scenarios["bad-gateway"]);
  await expect(fetchDeals(MEN)).rejects.toMatchObject({ kind: "http", status: 502 });
});

test("a 200 that isn't JSON, or isn't a list, is invalid-body", async () => {
  respondWith(
    () => new HttpResponse("<html>oops</html>", { headers: { "Content-Type": "text/html" } }),
    () => HttpResponse.json({ deals: [] }),
  );
  await expect(fetchDeals(MEN)).rejects.toMatchObject({ kind: "invalid-body" });
  await expect(fetchDeals(MEN)).rejects.toMatchObject({ kind: "invalid-body" });
});

test("no response at all is a network error", async () => {
  server.use(scenarios.offline);
  await expect(fetchDeals(MEN)).rejects.toMatchObject({ kind: "network" });
});

test("an attempt that hangs past the timeout is a timeout error", async () => {
  server.use(
    http.get(URL, async () => {
      await delay("infinite");
      return HttpResponse.json([]);
    }),
  );
  await expect(fetchDeals(MEN, undefined, { attemptTimeoutMs: 20 })).rejects.toMatchObject({
    kind: "timeout",
  });
});

test("cancelling (the page going away) stops the 503 loop without an API error", async () => {
  const requests = respondWith(loading("10"));
  const controller = new AbortController();
  const pending = fetchDeals(MEN, controller.signal);
  await expect.poll(() => requests.length).toBe(1);

  controller.abort();

  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(requests).toHaveLength(1);
});

test("category and brands go in the query; brands are sorted so equal selections share a URL", async () => {
  const requests = respondWith(() => HttpResponse.json([]));

  await fetchDeals({
    gender: "Male",
    category: "Shoes",
    brands: ["adidas", "New Balance", "Nike"],
  });
  await fetchDeals({
    gender: "Male",
    category: "Shoes",
    brands: ["Nike", "New Balance", "adidas"],
  });

  expect(requests.map((request) => request.url)).toEqual([
    `${URL}?gender=Male&category=Shoes&brand=New+Balance&brand=Nike&brand=adidas`,
    `${URL}?gender=Male&category=Shoes&brand=New+Balance&brand=Nike&brand=adidas`,
  ]);
});

test("brands: asks for the gender and category, and waits out a 503 like deals", async () => {
  const counts = [
    { brand: "Nike", count: 41 },
    { brand: "adidas", count: 38 },
  ];
  const requests = respondAt(BRANDS_URL, loading("7"), () => HttpResponse.json(counts));
  const clock = fakeClock();

  expect(await fetchBrands("Female", "Shoes", undefined, clock)).toEqual(counts);

  expect(requests.map((request) => request.url)).toEqual([
    `${BRANDS_URL}?gender=Female&category=Shoes`,
    `${BRANDS_URL}?gender=Female&category=Shoes`,
  ]);
  expect(clock.waits).toEqual([7000]);
});

test("brands: All sends no category, and a malformed list is invalid-body", async () => {
  const requests = respondAt(BRANDS_URL, () => HttpResponse.json([{ brand: "Nike" }]));

  await expect(fetchBrands("Male", "All")).rejects.toMatchObject({ kind: "invalid-body" });
  expect(requests[0]?.url).toBe(`${BRANDS_URL}?gender=Male`);
});
