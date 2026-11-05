import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { axe } from "vitest-axe";
import { server } from "@/mocks/server";
import { makeDeal } from "@/test/makeDeal";
import { renderWithClient } from "@/test/render";
import { DealsPage } from "./DealsPage";

// A small catalogue keeps the counts readable.
const DEALS = [
  makeDeal({ name: "Nike Tee", discount: 60, nowPrice: 10, sizes: ["S", "M"] }),
  makeDeal({ name: "Nike Hoodie", discount: 40, nowPrice: 30, sizes: ["M", "L"] }),
  makeDeal({ name: "Adidas Trainer", discount: 50, nowPrice: 40, sizes: ["8", "9"] }),
  makeDeal({ name: "Puma Shorts", discount: 30, nowPrice: 12, sizes: ["L"] }),
];

beforeEach(() => {
  server.use(http.get("http://localhost:8000/v1/deals", () => HttpResponse.json(DEALS)));
});

async function setup(searchParams = "") {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const { container } = renderWithClient(<DealsPage />, { searchParams, onUrlUpdate });
  await screen.findByText(/4 deals|of 4 deals/);
  const url = () => onUrlUpdate.mock.lastCall?.[0].queryString;
  return { onUrlUpdate, url, container };
}

const toolbar = () => screen.getByRole("search", { name: "Filter deals" });

test("the toolbar is a search landmark with every control named, and axe is clean", async () => {
  const { container } = await setup();

  expect(within(toolbar()).getByRole("searchbox", { name: "Search deals" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("group", { name: "Minimum discount" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("button", { name: "Sizes" })).toBeInTheDocument();
  expect(within(toolbar()).getByRole("combobox", { name: "Sort by" })).toHaveValue(
    "discount-high-to-low",
  );
  expect(await axe(container)).toHaveNoViolations();
});

test("typing searches and writes the term to the URL; Clear search removes it", async () => {
  const { url } = await setup();

  await userEvent.type(screen.getByRole("searchbox", { name: "Search deals" }), "nike");

  expect(url()).toBe("?search=nike");
  expect(await screen.findByText("2 of 4 deals")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(url()).toBe("");
  expect(screen.getByRole("searchbox", { name: "Search deals" })).toHaveValue("");
});

test("discount is a radio group: click a stop, then arrow keys move and select", async () => {
  const { url } = await setup();
  const group = within(toolbar()).getByRole("group", { name: "Minimum discount" });
  expect(within(group).getAllByRole("radio")).toHaveLength(10);
  expect(within(group).getByRole("radio", { name: "30%" })).toBeChecked();

  await userEvent.click(within(group).getByRole("radio", { name: "50%" }));
  expect(url()).toBe("?discount=50");
  expect(screen.getByText("2 of 4 deals")).toBeInTheDocument();

  await userEvent.keyboard("{ArrowRight}");
  expect(url()).toBe("?discount=60");
  expect(within(group).getByRole("radio", { name: "60%" })).toHaveFocus();
});

test("sort writes its id, and the default is left out", async () => {
  const { url } = await setup("?sort=price-high-to-low");
  const sort = screen.getByRole("combobox", { name: "Sort by" });

  await userEvent.selectOptions(sort, "Lowest price");
  expect(url()).toBe("?sort=price-low-to-high");

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
  expect(screen.getByText("3 of 4 deals")).toBeInTheDocument();
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
  expect(within(sheet).getByRole("group", { name: "Minimum discount" })).toBeInTheDocument();
  expect(within(sheet).getByRole("group", { name: "Clothing sizes" })).toBeInTheDocument();
  expect(within(sheet).getByRole("combobox", { name: "Sort by" })).toBeInTheDocument();

  await userEvent.click(within(sheet).getByRole("button", { name: "S, 1 deal" }));
  expect(url()).toBe("?search=nike&discount=50&sizes=S,M");

  await userEvent.click(within(sheet).getByRole("button", { name: "Show 1 deal" }));
  expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Filters (3)" })).toHaveFocus();
});
