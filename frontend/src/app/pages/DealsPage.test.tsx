import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { axe } from "vitest-axe";
import { dealsKeys } from "@/features/deals";
import { queryDeals } from "@/mocks/api";
import { scenarios } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { makeDeal } from "@/test/makeDeal";
import { createTestQueryClient, renderWithClient } from "@/test/render";
import { DealsPage } from "./DealsPage";

const URL = "http://localhost:8000/v2/deals";
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
/** The backend's answer when these are all its deals. */
const page = (...deals: ReturnType<typeof makeDeal>[]) => queryDeals(deals).json;

function countRequests(response: () => Response) {
  const count = { value: 0 };
  server.use(
    http.get(URL, () => {
      count.value += 1;
      return response();
    }),
  );
  return count;
}

afterEach(() => {
  vi.useRealTimers();
});

test("success: the deals are listed with their count", async () => {
  renderWithClient(<DealsPage />);

  expect(await screen.findByText("81 deals")).toBeInTheDocument();
  // The grid is virtualised and paged: only the first rows are rendered, each card one of 81.
  expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "81");
  // Naming one card directly: computing names for all 81 links is slow in jsdom.
  const card = screen.getByText("Nike NFL Las Vegas Raiders Helmet T-Shirt").closest("a");
  expect(card).toHaveAccessibleName(/^Nike NFL Las Vegas Raiders Helmet T-Shirt £10 was £30/);
  expect(card).toHaveAttribute(
    "href",
    "https://www.jdsports.co.uk/product/black-nike-nfl-las-vegas-raiders-helmet-t-shirt/19599668/",
  );
});

test("the loaded page has no axe violations", async () => {
  // A few deals: axe over all 81 cards takes ~5 s in jsdom; the full page is checked in e2e.
  server.use(
    http.get(URL, () =>
      HttpResponse.json(page(makeDeal(), makeDeal({ sizes: undefined, wasPrice: 0 }))),
    ),
  );
  const { container } = renderWithClient(<DealsPage />);

  expect(await screen.findByText("2 deals")).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("an empty list is a valid result, not an error", async () => {
  server.use(http.get(URL, () => HttpResponse.json(page())));
  renderWithClient(<DealsPage />);

  expect(await screen.findByRole("heading", { name: "No deals right now" })).toBeInTheDocument();
  expect(screen.getByText("0 deals")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("filtered to nothing: says why, and each way out is one tap that rewrites the URL", async () => {
  const deals = [
    makeDeal({ name: "Tee M", discount: 50, sizes: ["M"] }),
    makeDeal({ name: "Tee L", discount: 70, sizes: ["L"] }),
  ];
  server.use(
    http.get(URL, ({ request }) =>
      HttpResponse.json(queryDeals(deals, new globalThis.URL(request.url).searchParams).json),
    ),
  );
  const onUrlUpdate = vi.fn();
  renderWithClient(<DealsPage />, { searchParams: "?discount=70&sizes=M", onUrlUpdate });

  expect(
    await screen.findByRole("heading", { name: "No deals at 70% or more in size M" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show deals in any size" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Show 1 deal at 50% or more" }));

  expect(onUrlUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({ queryString: "?discount=50&sizes=M" }),
  );
  expect(await screen.findByRole("link", { name: /^Tee M / })).toBeInTheDocument();
});

test("a search with no matches quotes the term and offers to clear it", async () => {
  const onUrlUpdate = vi.fn();
  renderWithClient(<DealsPage />, { searchParams: "?search=zzz", onUrlUpdate });

  expect(await screen.findByRole("heading", { name: "Nothing matches “zzz”" })).toBeInTheDocument();
  // The search field has a Clear search of its own; this is the empty state's.
  await userEvent.click(
    within(screen.getByRole("region")).getByRole("button", { name: "Clear search" }),
  );

  expect(onUrlUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ queryString: "" }));
  expect(await screen.findByText("81 deals")).toBeInTheDocument();
});

test("http error: explains the status once, without retrying a 4xx", async () => {
  const requests = countRequests(() => HttpResponse.json({ error: "Not Found" }, { status: 404 }));
  const { container } = renderWithClient(<DealsPage />);

  const alert = await screen.findByRole("alert");
  expect(
    within(alert).getByRole("heading", { name: "The deals server had a problem" }),
  ).toBeInTheDocument();
  expect(alert).toHaveTextContent("error 404");
  expect(requests.value).toBe(1);
  expect(await axe(container)).toHaveNoViolations();
});

test("network error: retried 3 times, then the waking copy and a working Try again", async () => {
  const requests = countRequests(() => HttpResponse.error());
  renderWithClient(<DealsPage />);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("The deals server is still waking up");
  expect(requests.value).toBe(4);

  server.use(http.get(URL, () => HttpResponse.json(page(makeDeal({ name: "Back Online Tee" })))));
  await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

  expect(await screen.findByRole("link", { name: /^Back Online Tee / })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("slow first load: skeletons, then the waking line after 3 seconds, while 503s retry quietly", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const requests = countRequests(() =>
    HttpResponse.json({ error: "loading" }, { status: 503, headers: { "Retry-After": "10" } }),
  );
  renderWithClient(<DealsPage />);

  expect(screen.getByRole("status")).toHaveTextContent("Loading deals…");
  await act(() => vi.advanceTimersByTimeAsync(3000));

  expect(screen.getByRole("status")).toHaveTextContent(
    "Waking the server, this can take a minute.",
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(requests.value).toBe(1); // the next try waits for Retry-After (10 s)
});

test("cached snapshot: renders at once, and a failed refresh keeps it with a stale banner", async () => {
  const client = createTestQueryClient();
  client.setQueryData(
    dealsKeys.list(MEN),
    { pages: [page(makeDeal({ name: "Cached Tee" }))], pageParams: [null] },
    { updatedAt: Date.now() - 10 * 60_000 },
  );
  server.use(scenarios["bad-gateway"]);

  renderWithClient(<DealsPage />, { client });

  expect(screen.getByRole("link", { name: /^Cached Tee / })).toBeInTheDocument();
  const banner = await screen.findByRole("status");
  expect(banner).toHaveTextContent(/Showing deals from \d\d:\d\d, couldn’t refresh/);
  expect(screen.getByRole("link", { name: /^Cached Tee / })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("a link shared before the rewrite shows the same deals: nike, sizes M or L, cheapest first", async () => {
  renderWithClient(<DealsPage />, {
    searchParams: "?search=nike&sizes=M,L&sort=price-low-to-high",
  });

  expect(await screen.findByText("19 deals")).toBeInTheDocument();
  const names = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
  expect(names.slice(0, 3)).toEqual([
    "Nike NFL Las Vegas Raiders Helmet T-Shirt",
    "Nike NFL Green Bay Packers Local T-Shirt",
    "Nike Core T-Shirt", // level on price and discount with the Club T-Shirt; the URL decides
  ]);
});

/** Answers each gender with its own deals and records the gender of every request. */
function dealsByGender(deals: Record<string, ReturnType<typeof makeDeal>[]>) {
  const requested: Array<string | null> = [];
  server.use(
    http.get(URL, ({ request }) => {
      const gender = new globalThis.URL(request.url).searchParams.get("gender");
      requested.push(gender);
      return HttpResponse.json(page(...(deals[gender ?? ""] ?? [])));
    }),
  );
  return requested;
}

test("Men by default: one request for gender=Male, with Men checked", async () => {
  const requested = dealsByGender({ Male: [makeDeal({ name: "Men Tee" })] });
  renderWithClient(<DealsPage />);

  expect(await screen.findByRole("link", { name: /^Men Tee / })).toBeInTheDocument();
  expect(requested).toEqual(["Male"]);
  expect(screen.getByRole("radio", { name: "Men" })).toBeChecked();
});

test("choosing Women fetches and shows the women's deals, and writes it to the URL", async () => {
  const requested = dealsByGender({
    Male: [makeDeal({ name: "Men Tee" })],
    Female: [makeDeal({ name: "Women Tee", gender: "Female" })],
  });
  const onUrlUpdate = vi.fn();
  renderWithClient(<DealsPage />, { onUrlUpdate });
  await screen.findByRole("link", { name: /^Men Tee / });

  await userEvent.click(screen.getByRole("radio", { name: "Women" }));

  expect(await screen.findByRole("link", { name: /^Women Tee / })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^Men Tee / })).not.toBeInTheDocument();
  expect(requested).toEqual(["Male", "Female"]);
  expect(onUrlUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({ queryString: "?gender=Female" }),
  );
});

test("a late Men response never replaces the Women deals chosen meanwhile", async () => {
  let releaseMen = () => {};
  const menReleased = new Promise<void>((resolve) => (releaseMen = resolve));
  let menAnswered = () => {};
  const menDone = new Promise<void>((resolve) => (menAnswered = resolve));
  server.use(
    http.get(URL, async ({ request }) => {
      if (new globalThis.URL(request.url).searchParams.get("gender") === "Male") {
        await menReleased;
        menAnswered();
        return HttpResponse.json(page(makeDeal({ name: "Late Men Tee" })));
      }
      return HttpResponse.json(page(makeDeal({ name: "Women Tee", gender: "Female" })));
    }),
  );
  renderWithClient(<DealsPage />);

  await userEvent.click(screen.getByRole("radio", { name: "Women" }));
  expect(await screen.findByRole("link", { name: /^Women Tee / })).toBeInTheDocument();

  releaseMen();
  await act(async () => {
    await menDone;
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(screen.getByRole("link", { name: /^Women Tee / })).toBeInTheDocument();
  expect(screen.queryByText("Late Men Tee")).not.toBeInTheDocument();
});

test("a ?gender=Unisex link loads the unisex deals", async () => {
  const requested = dealsByGender({
    Unisex: [makeDeal({ name: "Unisex Tee", gender: "Unisex" })],
  });
  renderWithClient(<DealsPage />, { searchParams: "?gender=Unisex" });

  expect(await screen.findByRole("link", { name: /^Unisex Tee / })).toBeInTheDocument();
  expect(requested).toEqual(["Unisex"]);
  expect(screen.getByRole("radio", { name: "Unisex" })).toBeChecked();
});

test("the next page loads as the last rows come near, and is appended without duplicates", async () => {
  const deals = ["A", "B", "C", "D", "E", "F"].map((letter) => makeDeal({ name: `Tee ${letter}` }));
  const cursors: Array<string | null> = [];
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  server.use(
    http.get(URL, async ({ request }) => {
      const cursor = new globalThis.URL(request.url).searchParams.get("cursor");
      cursors.push(cursor);
      if (cursor === null)
        return HttpResponse.json({ ...page(...deals), items: deals.slice(0, 4), nextCursor: "p2" });
      await released;
      // The catalogue moved between the two fetches: Tee D comes round again.
      return HttpResponse.json({
        items: deals.slice(3),
        total: 6,
        nextCursor: null,
        trackingSince: 0,
      });
    }),
  );
  renderWithClient(<DealsPage />);
  const names = () =>
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

  // Four deals fit on screen, so the second page is asked for at once.
  expect(await screen.findByText("Loading more deals…")).toHaveRole("status");
  expect(screen.getByText("6 deals")).toBeInTheDocument();
  expect(names()).toEqual(["Tee A", "Tee B", "Tee C", "Tee D"]);

  release();

  expect(await screen.findByText("Tee F")).toBeInTheDocument();
  expect(names()).toEqual(["Tee A", "Tee B", "Tee C", "Tee D", "Tee E", "Tee F"]);
  expect(cursors).toEqual([null, "p2"]);
  expect(screen.queryByText("Loading more deals…")).not.toBeInTheDocument();
});

test("a next page that fails keeps the list, says so, and isn't asked for again until Retry", async () => {
  const deals = [makeDeal({ name: "Tee A" }), makeDeal({ name: "Tee B" })];
  const requests = countRequests(() =>
    requests.value === 1
      ? HttpResponse.json({ ...page(...deals), items: deals.slice(0, 1), nextCursor: "p2" })
      : HttpResponse.json({ error: "Bad Request" }, { status: 400 }),
  );
  renderWithClient(<DealsPage />);

  expect(await screen.findByText(/couldn’t refresh/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Tee A / })).toBeInTheDocument();
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(requests.value).toBe(2);
});
