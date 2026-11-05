import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { setSystemDark } from "@/test/matchMedia";
import { ThemeToggle } from "./ThemeToggle";

const html = document.documentElement;

test("reflects the theme set before first paint", async () => {
  html.dataset.theme = "dark";
  const { container } = render(<ThemeToggle />);

  expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await axe(container)).toHaveNoViolations();
});

test("toggling switches the theme and remembers the choice", async () => {
  html.dataset.theme = "light";
  render(<ThemeToggle />);
  const toggle = screen.getByRole("button", { name: "Dark theme" });

  await userEvent.click(toggle);
  expect(html.dataset.theme).toBe("dark");
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(toggle).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(toggle);
  expect(html.dataset.theme).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
  expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("follows a system change while there is no stored choice", async () => {
  html.dataset.theme = "light";
  render(<ThemeToggle />);

  setSystemDark(true);

  await expect.poll(() => html.dataset.theme).toBe("dark");
  expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a stored choice wins over a later system change", async () => {
  html.dataset.theme = "light";
  render(<ThemeToggle />);
  await userEvent.click(screen.getByRole("button", { name: "Dark theme" }));

  setSystemDark(false);

  expect(html.dataset.theme).toBe("dark");
});
