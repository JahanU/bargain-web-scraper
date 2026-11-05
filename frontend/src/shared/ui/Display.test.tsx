import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { Badge } from "./Badge";
import { Chip } from "./Chip";
import { Skeleton } from "./Skeleton";

test("Badge and Chip show their text", async () => {
  const { container } = render(
    <p>
      <Badge>-67%</Badge> <Badge tone="outline">New</Badge> <Chip>M</Chip>
    </p>,
  );

  expect(screen.getByText("-67%")).toBeVisible();
  expect(screen.getByText("New")).toBeVisible();
  expect(screen.getByText("M")).toBeVisible();
  expect(await axe(container)).toHaveNoViolations();
});

test("Skeleton is hidden from assistive tech", () => {
  render(
    <section aria-label="Loading">
      <Skeleton data-testid="skeleton" />
    </section>,
  );

  expect(screen.getByRole("region", { name: "Loading" })).toBeInTheDocument();
  expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
});
