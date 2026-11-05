import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { renderWithClient } from "@/test/render";
import { App } from "./App";

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
