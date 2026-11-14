import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { queryDeals } from "@/mocks/api";
import { server } from "@/mocks/server";
import { makeDeal } from "@/test/makeDeal";
import { renderWithClient } from "@/test/render";
import { App } from "./App";

// The shell doesn't need the full fixture; a short list keeps these tests fast.
beforeEach(() => {
  server.use(
    http.get("http://localhost:8000/v2/deals", () =>
      HttpResponse.json(queryDeals([makeDeal(), makeDeal()]).json),
    ),
  );
});

test("has header, main and footer landmarks and no axe violations", async () => {
  const { container } = renderWithClient(<App />);

  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("the first Tab lands on a skip link to the main content", async () => {
  renderWithClient(<App />);

  await userEvent.tab();

  const skip = screen.getByRole("link", { name: "Skip to deals" });
  expect(skip).toHaveFocus();
  expect(skip).toHaveAttribute("href", "#main");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main");
});

test("the GitHub link says it opens a new tab", () => {
  renderWithClient(<App />);

  expect(screen.getByRole("link", { name: "GitHub (opens in a new tab)" })).toHaveAttribute(
    "target",
    "_blank",
  );
});

test("the About button opens a factual dialog, and Escape returns focus", async () => {
  renderWithClient(<App />);
  const about = screen.getByRole("button", { name: "About Bargain" });

  await userEvent.click(about);

  const dialog = await screen.findByRole("dialog", { name: "About Bargain" });
  expect(dialog).toHaveTextContent("30% off or more");
  expect(dialog).toHaveTextContent("Not affiliated with JD Sports.");

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
  expect(about).toHaveFocus();
});
