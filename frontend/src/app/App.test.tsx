import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { App } from "./App";

test("renders the page heading inside the main landmark, with no axe violations", async () => {
  const { container } = render(<App />);

  expect(screen.getByRole("main")).toContainElement(
    screen.getByRole("heading", { level: 1, name: "Bargain" }),
  );
  expect(await axe(container)).toHaveNoViolations();
});
