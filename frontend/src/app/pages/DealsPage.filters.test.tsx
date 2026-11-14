import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { axe } from "vitest-axe";
import { queryDeals } from "@/mocks/api";
import { server } from "@/mocks/server";
import { makeDeal } from "@/test/makeDeal";
import { renderWithClient } from "@/test/render";
import { DealsPage } from "./DealsPage";

// A small catalogue keeps the counts readable.
const DEALS = [
  makeDeal({ name: "Nike Tee", discount: 60, nowPrice: 10, sizes: ["S", "M"] }),
  makeDeal({ name: "Nike Hoodie", discount: 40, nowPrice: 30, sizes: ["M", "L"] }),
  makeDeal({
    name: "Samba Trainer",
    brand: "adidas",
    category: "Shoes",
    discount: 50,
    nowPrice: 40,
    sizes: ["8", "9"],
  }),
  makeDeal({
    name: "Puma Shorts",
    brand: "PUMA",
    store: "fl",
    discount: 30,
    nowPrice: 12,
    sizes: ["L"],
  }),
];
const DEALS_URL = "http://localhost:8000/v2/deals";
const TWO_STORES = [
  { store: "jd", name: "JD Sports" },
  { store: "fl", name: "Foot Locker" },
];

/** The query string of every deals request, in order. */
let requests: string[];

/** Answers as the backend would over DEALS, with `facets` replacing some of its counts. */
function serve(stores?: typeof TWO_STORES, facets: Record<string, unknown> = {}) {
  server.use(
    http.get(DEALS_URL, ({ request }) => {
      const { search, searchParams } = new URL(request.url);
      requests.push(search);
      const { status, json } = queryDeals(DEALS, searchParams, stores);
      return HttpResponse.json(
        { ...json, facets: { ...(json.facets as object), ...facets } },
        { status },
      );
    }),
  );
}

/** Holds every later response until released, to look at the page while a request is out. */
function holdResponses() {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  server.use(
    http.get(DEALS_URL, async ({ request }) => {
      await released;
      return HttpResponse.json(queryDeals(DEALS, new URL(request.url).searchParams).json);
    }),
  );
  return release;
}

beforeEach(() => {
  requests = [];
  serve();
});

async function setup(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const { container } = renderWithClient(<DealsPage />, { searchParams, onUrlUpdate });
  await screen.findByText(/\d deals?( ·|$)/);
  const url = () => onUrlUpdate.mock.lastCall?.[0].queryString;
  return { onUrlUpdate, url, container };
}

const toolbar = () => screen.getByRole("search", { name: "Filter deals" });

test("the toolbar is a search landmark with every control named, and axe is clean", async () => {
  const { container } = await setup();

  expect(within(toolbar()).getByRole("searchbox", { name: "Search deals" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("group", { name: "Minimum discount" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("group", { name: "Shop" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("group", { name: "Category" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("button", { name: "Brands" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("button", { name: "Sizes" })).toBeInTheDocument();
  // One store is no choice, so there is no Stores control.
  expect(within(toolbar()).queryByRole("button", { name: /^Stores/ })).not.toBeInTheDocument();
  expect(within(toolbar()).getByRole("combobox", { name: "Sort by" })).toHaveValue(
    "discount-high-to-low",
  );
  expect(await axe(container)).toHaveNoViolations();
});

test("typing searches once it settles and writes the term to the URL; Clear search removes it", async () => {
  const { url } = await setup();

  await userEvent.type(screen.getByRole("searchbox", { name: "Search deals" }), "nike");

  expect(url()).toBe("?search=nike");
  expect(await screen.findByText("2 deals")).toBeInTheDocument();
  // One request for the word, none for "n", "ni" or "nik".
  expect(requests).toEqual(["?gender=Male&limit=60", "?gender=Male&q=nike&limit=60"]);

  await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(url()).toBe("");
  expect(screen.getByRole("searchbox", { name: "Search deals" })).toHaveValue("");
  expect(await screen.findByText("4 deals")).toBeInTheDocument();
});

test("search matches every word against the name, brand or store", async () => {
  // "adidas" is only that deal's brand here, "sports" only its store's name.
  await setup("?search=trainer+ADIDAS+sports");

  expect(screen.getByText("1 deal")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Samba Trainer / })).toBeInTheDocument();
});

test("discount is a radio group: click a stop, then arrow keys move and select", async () => {
  const { url } = await setup();
  const group = within(toolbar()).getByRole("group", { name: "Minimum discount" });
  expect(
    within(group)
      .getAllByRole("radio")
      .map((radio) => radio.getAttribute("aria-label")),
  ).toEqual(["30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"]);
  expect(within(group).getByRole("radio", { name: "30%" })).toBeChecked();

  await userEvent.click(within(group).getByRole("radio", { name: "50%" }));
  expect(url()).toBe("?discount=50");
  expect(await screen.findByText("2 deals")).toBeInTheDocument();
  expect(requests.at(-1)).toBe("?gender=Male&minDiscount=50&limit=60");

  await userEvent.keyboard("{ArrowRight}");
  expect(url()).toBe("?discount=60");
  expect(within(group).getByRole("radio", { name: "60%" })).toHaveFocus();
});

test("the discount stops are the backend's, faint where they'd show nothing, plus the selected one", async () => {
  serve(undefined, {
    discounts: [
      { minDiscount: 20, count: 4 },
      { minDiscount: 45, count: 2 },
      { minDiscount: 70, count: 0 },
    ],
  });
  await setup("?discount=60");

  const radios = within(
    within(toolbar()).getByRole("group", { name: "Minimum discount" }),
  ).getAllByRole("radio");

  expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
    "20%",
    "45%",
    "60%",
    "70%",
  ]);
  expect(
    radios.map((radio) => radio.nextElementSibling?.classList.contains("text-text-faint")),
  ).toEqual([false, false, false, true]);
  expect(radios[2]).toBeChecked();
});

test("sort writes its id, and the default is left out", async () => {
  const { url } = await setup("?sort=price-high-to-low");
  const sort = screen.getByRole("combobox", { name: "Sort by" });

  await userEvent.selectOptions(sort, "Lowest price");
  expect(url()).toBe("?sort=price-low-to-high");
  expect(requests.at(-1)).toBe("?gender=Male&sort=price-low-to-high&limit=60");
  await expect
    .poll(() => screen.getAllByRole("heading", { level: 2 }).map((name) => name.textContent))
    .toEqual(["Nike Tee", "Puma Shorts", "Nike Hoodie", "Samba Trainer"]);

  await userEvent.selectOptions(sort, "Best discount");
  expect(url()).toBe("");
});

test("sizes: grouped toggles with counts in a popover, written in canonical order", async () => {
  const { url } = await setup();

  await userEvent.click(within(toolbar()).getByRole("button", { name: "Sizes" }));
  const popup = await screen.findByRole("dialog", { name: "Filter by size" });
  const clothing = within(popup).getByRole("group", { name: "Clothing sizes" });
  expect(within(popup).getByRole("group", { name: "Footwear sizes" })).toBeInTheDocument();
  expect(within(clothing).getByRole("button", { name: "M, 2 deals" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await userEvent.click(within(clothing).getByRole("button", { name: "L, 2 deals" }));
  await userEvent.click(within(clothing).getByRole("button", { name: "S, 1 deal" }));

  expect(url()).toBe("?sizes=S,L");
  expect(await screen.findByText("3 deals")).toBeInTheDocument();
  expect(requests.at(-1)).toBe("?gender=Male&size=L&size=S&limit=60");
});

test("a selected size the other filters have emptied still shows, at 0, so it can be turned off", async () => {
  const { url } = await setup("?sizes=XS&brands=Nike");

  await userEvent.click(within(toolbar()).getByRole("button", { name: /^Sizes/ }));
  const popup = await screen.findByRole("dialog", { name: "Filter by size" });
  const chips = within(within(popup).getByRole("group", { name: "Clothing sizes" }));

  expect(chips.getAllByRole("button").map((chip) => chip.getAttribute("aria-label"))).toEqual([
    "XS, 0 deals",
    "S, 1 deal",
    "M, 2 deals",
    "L, 1 deal",
  ]);
  await userEvent.click(chips.getByRole("button", { name: "XS, 0 deals", pressed: true }));
  expect(url()).toBe("?brands=Nike");
});

test("active filters show as chips; removing one or clearing all rewrites the URL", async () => {
  const { url } = await setup("?search=nike&discount=50&sizes=M&sort=price-low-to-high");
  const chips = screen.getByRole("list", { name: "Active filters" });
  expect(
    within(chips)
      .getAllByRole("button")
      .map((chip) => chip.textContent),
  ).toEqual(["“nike”", "≥50%", "M"]);

  await userEvent.click(within(chips).getByRole("button", { name: "Remove ≥50%" }));
  expect(url()).toBe("?search=nike&sizes=M&sort=price-low-to-high");

  await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
  expect(url()).toBe("?sort=price-low-to-high");
  expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
});

test("phones: the Filters button counts sheet filters and opens a complete filter form", async () => {
  const { url } = await setup("?search=nike&discount=50&sizes=M");
  const button = screen.getByRole("button", { name: "Filters (2)" });

  await userEvent.click(button);

  const sheet = await screen.findByRole("dialog", { name: "Filters" });
  expect(within(sheet).getByRole("button", { name: "Nike, 1 deal" })).toBeInTheDocument();
  expect(within(sheet).queryByRole("heading", { name: "Stores" })).not.toBeInTheDocument();
  expect(within(sheet).getByRole("group", { name: "Minimum discount" })).toBeInTheDocument();
  expect(within(sheet).getByRole("group", { name: "Clothing sizes" })).toBeInTheDocument();
  expect(within(sheet).getByRole("combobox", { name: "Sort by" })).toBeInTheDocument();

  await userEvent.click(within(sheet).getByRole("button", { name: "S, 1 deal" }));
  expect(url()).toBe("?search=nike&discount=50&sizes=S,M");

  await userEvent.click(await within(sheet).findByRole("button", { name: "Show 1 deal" }));
  expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Filters (3)" })).toHaveFocus();
});

test("a discount=10 or 20 link falls back to 30", async () => {
  await setup("?discount=20");

  expect(screen.getByText("4 deals")).toBeInTheDocument();
  expect(within(toolbar()).getByRole("radio", { name: "30%" })).toBeChecked();
  expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
});

test("category is a radio group: choosing Shoes asks the API for them and writes the URL", async () => {
  const { url } = await setup();
  const group = within(toolbar()).getByRole("group", { name: "Category" });
  expect(within(group).getAllByRole("radio")).toHaveLength(4);
  expect(within(group).getByRole("radio", { name: "All" })).toBeChecked();

  await userEvent.click(within(group).getByRole("radio", { name: "Shoes" }));

  expect(await screen.findByText("1 deal")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Samba Trainer / })).toBeInTheDocument();
  expect(requests).toEqual(["?gender=Male&limit=60", "?gender=Male&category=Shoes&limit=60"]);
  expect(url()).toBe("?category=Shoes");

  await userEvent.keyboard("{ArrowRight}");
  expect(url()).toBe("?category=Clothes");
  expect(within(group).getByRole("radio", { name: "Clothes" })).toHaveFocus();
});

async function openBrands() {
  await userEvent.click(within(toolbar()).getByRole("button", { name: /^Brands/ }));
  return within(await screen.findByRole("dialog", { name: "Filter by brand" }));
}

test("brand counts are the backend's facet, not counted from the loaded deals", async () => {
  serve(undefined, {
    brands: [
      { brand: "Nike", count: 41 },
      { brand: "adidas", count: 1 },
    ],
  });
  await setup();

  const popup = await openBrands();

  expect(
    (await popup.findAllByRole("button")).map((chip) => chip.getAttribute("aria-label")),
  ).toEqual(["Nike, 41 deals", "adidas, 1 deal"]);
});

test("brands: toggling one by keyboard keeps focus, announces pressed, and updates URL and request", async () => {
  const { url } = await setup();
  const popup = await openBrands();
  const nike = await popup.findByRole("button", { name: "Nike, 2 deals" });
  expect(nike).toHaveAttribute("aria-pressed", "false");

  nike.focus();
  await userEvent.keyboard(" ");

  expect(nike).toHaveAttribute("aria-pressed", "true");
  expect(nike).toHaveFocus();
  expect(url()).toBe("?brands=Nike");
  expect(await screen.findByText("2 deals")).toBeInTheDocument();
  expect(requests.at(-1)).toBe("?gender=Male&brand=Nike&limit=60");

  // The group is one Tab stop; arrow keys move between its chips.
  await userEvent.keyboard("{ArrowRight}{Enter}");

  expect(popup.getByRole("button", { name: "adidas, 1 deal" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(url()).toBe("?brands=Nike,adidas");
  expect(await screen.findByText("3 deals")).toBeInTheDocument();
  expect(requests.at(-1)).toBe("?gender=Male&brand=Nike&brand=adidas&limit=60");
  // The page behind the open popover is hidden from assistive tech.
  expect(screen.getByRole("button", { name: /^Brands ?· 2$/, hidden: true })).toBeInTheDocument();
});

test("a changed request keeps the last result and its count on screen until its own lands", async () => {
  await setup();
  const release = holdResponses();
  const popup = await openBrands();

  await userEvent.click(await popup.findByRole("button", { name: "PUMA, 1 deal" }));

  // Still the old list and total: the live region has nothing new to announce yet.
  expect(screen.getByText("4 deals")).toHaveAttribute("aria-live", "polite");
  expect(screen.getByRole("link", { name: /^Nike Tee /, hidden: true })).toBeInTheDocument();
  expect(screen.queryByText("Loading deals…")).not.toBeInTheDocument();

  release();
  expect(await screen.findByText("1 deal")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^Nike Tee /, hidden: true })).not.toBeInTheDocument();
});

test.each([
  ["?sizes=XS", "XS"],
  ["?brands=Fila", "Fila"],
  ["?stores=nope", "nope"],
  ["?discount=90", "≥90%"],
  ["?search=zzz", "“zzz”"],
])(
  "%s: leaving an empty result shows loading, never an empty state for the new request",
  async (link, chip) => {
    await setup(link);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /^(No deals|Nothing matches)/,
    );
    const release = holdResponses();

    await userEvent.click(screen.getByRole("button", { name: `Remove ${chip}` }));

    expect(await screen.findByText("Loading deals…")).toBeInTheDocument();
    expect(screen.queryByText(/^(No deals|Nothing matches)/)).not.toBeInTheDocument();

    release();
    expect(await screen.findByText("4 deals")).toBeInTheDocument();
  },
);

test("Clear all clears brands and keeps the category and gender", async () => {
  const { url } = await setup("?discount=40&brands=Nike,adidas&category=Clothes");
  expect(requests).toEqual([
    "?gender=Male&category=Clothes&brand=Nike&brand=adidas&minDiscount=40&limit=60",
  ]);
  const chips = screen.getByRole("list", { name: "Active filters" });
  expect(
    within(chips)
      .getAllByRole("button")
      .map((chip) => chip.textContent),
  ).toEqual(["≥40%", "Nike", "adidas"]);

  await userEvent.click(within(chips).getByRole("button", { name: "Remove adidas" }));
  expect(url()).toBe("?discount=40&brands=Nike&category=Clothes");

  await userEvent.click(screen.getByRole("button", { name: "Clear all" }));

  expect(url()).toBe("?category=Clothes");
  expect(within(toolbar()).getByRole("radio", { name: "Clothes" })).toBeChecked();
  expect(await screen.findByText("3 deals")).toBeInTheDocument();
  expect(requests.at(-1)).toBe("?gender=Male&category=Clothes&limit=60");
});

test("more than ten brands: the top ten plus the selected, and Show all keeps focus", async () => {
  const counts = Array.from({ length: 12 }, (_, index) => ({
    brand: `Brand ${index + 1}`,
    count: 20 - index,
  }));
  serve(undefined, { brands: counts });
  await setup("?brands=Brand+12,Gone");
  const popup = await openBrands();
  const chips = () => popup.getAllByRole("button", { pressed: undefined, name: /, \d+ deals?$/ });
  const showAll = await popup.findByRole("button", { name: "Show all 13 brands" });

  // Brand 11 is hidden; Brand 12 and the brand with no deals are selected, so they stay.
  expect(chips().map((chip) => chip.getAttribute("aria-label"))).toEqual([
    ...counts.slice(0, 10).map(({ brand, count }) => `${brand}, ${count} deals`),
    "Brand 12, 9 deals",
    "Gone, 0 deals",
  ]);
  expect(showAll).toHaveAttribute("aria-expanded", "false");

  showAll.focus();
  await userEvent.keyboard("{Enter}");

  expect(chips()).toHaveLength(13);
  expect(showAll).toHaveAccessibleName("Show fewer brands");
  expect(showAll).toHaveAttribute("aria-expanded", "true");
  expect(showAll).toHaveFocus();
});

test("ten brands or fewer: no Show all button", async () => {
  await setup();
  const popup = await openBrands();

  await popup.findByRole("button", { name: "Nike, 2 deals" });
  expect(popup.queryByRole("button", { name: /^Show / })).not.toBeInTheDocument();
});

test("a brand with no deals says so and offers to drop the brands", async () => {
  const { url } = await setup("?brands=Fila");

  expect(
    screen.getByRole("heading", { name: "No deals at 30% or more from Fila" }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Show deals from any brand" }));

  expect(url()).toBe("");
  expect(await screen.findByText("4 deals")).toBeInTheDocument();
});

test("a search with other filters always offers Clear search, and each offer is one tap", async () => {
  const { url } = await setup("?search=zzz&sizes=M");

  expect(
    screen.getByRole("heading", { name: "No deals for “zzz” at 30% or more in size M" }),
  ).toBeInTheDocument();
  // Nothing matches "zzz" in any size, so only the search is worth dropping.
  expect(screen.queryByRole("button", { name: "Show deals in any size" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  await userEvent.click(
    within(screen.getByRole("region")).getByRole("button", { name: "Clear search" }),
  );

  expect(url()).toBe("?sizes=M");
  expect(await screen.findByText("2 deals")).toBeInTheDocument();
});

test("two stores: a Stores popover with the backend's counts filters by store id and names its chip", async () => {
  serve(TWO_STORES);
  const { url, container } = await setup();

  await userEvent.click(within(toolbar()).getByRole("button", { name: "Stores" }));
  const popup = within(await screen.findByRole("dialog", { name: "Filter by store" }));
  expect(popup.getAllByRole("button").map((chip) => chip.getAttribute("aria-label"))).toEqual([
    "JD Sports, 3 deals",
    "Foot Locker, 1 deal",
  ]);
  const footLocker = popup.getByRole("button", { name: "Foot Locker, 1 deal" });

  footLocker.focus();
  await userEvent.keyboard(" ");

  expect(url()).toBe("?stores=fl");
  expect(requests.at(-1)).toBe("?gender=Male&store=fl&limit=60");
  expect(await screen.findByText("1 deal")).toBeInTheDocument();
  expect(footLocker).toHaveAttribute("aria-pressed", "true");
  expect(footLocker).toHaveFocus();
  expect(await axe(container)).toHaveNoViolations();

  await userEvent.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: /^Stores ?· 1$/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Remove Foot Locker" }));
  expect(url()).toBe("");
});

test("two stores: the phone sheet has a Stores section, and a store with no deals says so", async () => {
  serve(TWO_STORES);
  const { url } = await setup("?stores=fl&brands=Nike");

  expect(
    screen.getByRole("heading", { name: "No deals at 30% or more from Nike at Foot Locker" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show deals from any brand" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Filters (2)" }));
  const sheet = await screen.findByRole("dialog", { name: "Filters" });
  expect(within(sheet).getByRole("heading", { name: "Stores" })).toBeInTheDocument();
  expect(
    within(sheet).getByRole("button", { name: "Foot Locker, 0 deals", pressed: true }),
  ).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("button", { name: "Reset" }));
  expect(url()).toBe("");
});
