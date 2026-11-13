import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { deal } from "@/test/deal";
import { DealCard } from "./DealCard";
import { DealGrid } from "./DealGrid";
import { DealImage } from "./DealImage";

const tee = deal({
  name: "Nike NFL Tee",
  nowPrice: 10,
  wasPrice: 30,
  discount: 67,
  sizes: ["S", "M", "L", "XL", "XXL", "XXXL", "OS"],
  imageUrl: "https://i8.amplience.net/i/jpl/jd_1_plc",
  url: "https://www.jdsports.co.uk/product/nike-nfl-tee/1/",
});

test("one link, named by its own text with the price read once, opening a new tab", async () => {
  const { container } = render(<DealCard deal={tee} serverStart={tee.foundAt} priority={false} />);

  const link = screen.getByRole("link");
  expect(link).not.toHaveAttribute("aria-label"); // visible text is the name (WCAG 2.5.3)
  // The whole name, so the price provably appears once.
  expect(link).toHaveAccessibleName(
    /^Nike NFL Tee\s*£10 was £30\s*, 67% off\s*Sizes\s*S\s*M\s*L\s*XL\s*XXL\s*\+2\s*Men$/,
  );
  expect(link).toHaveAttribute("href", "https://www.jdsports.co.uk/product/nike-nfl-tee/1/");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener");
  expect(within(link).getByRole("heading", { level: 2, name: "Nike NFL Tee" })).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("shows prices, the badge and the first five sizes with +N", () => {
  render(<DealCard deal={tee} serverStart={0} priority={false} />);

  expect(screen.getByText("£10")).toBeVisible();
  expect(screen.getByText("£30").tagName).toBe("S");
  expect(screen.getByText("-67%")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByText("+2")).toBeInTheDocument();
  expect(screen.queryByText("XXXL")).not.toBeInTheDocument();
});

test("the image is decorative, responsive and at the plate size", () => {
  const { container } = render(<DealCard deal={tee} serverStart={0} priority={false} />);
  const image = container.querySelector("img");

  expect(image).toHaveAttribute("alt", "");
  expect(image?.getAttribute("srcset")?.split(", ")).toHaveLength(4);
  expect(image).toHaveAttribute("sizes", expect.stringContaining("(min-width: 1280px)"));
  expect(image).toHaveAttribute("width", "726");
  expect(image).toHaveAttribute("height", "926");
  expect(image).toHaveAttribute("loading", "lazy");
});

test("a deal found since the server started is marked new and says when", () => {
  const now = Date.now();
  render(
    <DealCard
      deal={deal({ name: "Fresh", timestamp: now - 60_000 })}
      serverStart={now - 3_600_000}
      priority
    />,
  );

  expect(screen.getByRole("link")).toHaveAccessibleName(/Found 1 min ago\s*, new$/);
  expect(screen.getByText("New")).toBeInTheDocument();
  expect(screen.getByText("1 min ago").tagName).toBe("TIME");
});

test("a deal from the server-start batch has no found time and no marker", () => {
  const start = Date.now() - 60_000;
  render(
    <DealCard deal={deal({ timestamp: start, gender: "Female" })} serverStart={start} priority />,
  );

  expect(screen.queryByText("New")).not.toBeInTheDocument();
  expect(screen.getByText("Women")).toBeInTheDocument();
  expect(screen.queryByText(/Found/)).not.toBeInTheDocument();
});

test("the grid renders only the rows near the viewport, each card knowing its place in the list", () => {
  const deals = Array.from({ length: 200 }, () => deal());
  const { container } = render(<DealGrid deals={deals} serverStart={0} />);
  const items = [...container.querySelectorAll('[role="listitem"]')]; // not the size chips' <li>s

  expect(items.length).toBeGreaterThan(0);
  expect(items.length).toBeLessThan(deals.length);
  expect(items.map((item) => item.getAttribute("aria-posinset"))).toEqual(
    items.map((_, index) => String(index + 1)),
  );
  expect(items.every((item) => item.getAttribute("aria-setsize") === "200")).toBe(true);
});

test("the grid loads the first ten images eagerly at high priority and the rest lazily", () => {
  const deals = Array.from({ length: 12 }, () => deal());
  const { container } = render(<DealGrid deals={deals} serverStart={0} />);
  const images = [...container.querySelectorAll("img")];

  expect(images.slice(0, 10).every((image) => image.getAttribute("loading") === "eager")).toBe(
    true,
  );
  expect(images.slice(0, 10).every((image) => image.getAttribute("fetchpriority") === "high")).toBe(
    true,
  );
  expect(images.slice(10).every((image) => image.getAttribute("loading") === "lazy")).toBe(true);
});

test("an image fades in on its first load, but not when its card is rendered again", () => {
  const image = deal().image;
  const first = render(<DealImage image={image} priority={false} />);
  const img = first.container.querySelector("img")!;
  expect(img).toHaveClass("opacity-0");
  fireEvent.load(img);
  expect(img).not.toHaveClass("opacity-0");
  first.unmount();

  const again = render(<DealImage image={image} priority={false} />);

  expect(again.container.querySelector("img")).not.toHaveClass("opacity-0");
});
