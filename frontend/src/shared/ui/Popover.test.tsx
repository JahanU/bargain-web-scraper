import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { Button } from "./Button";
import { Popover } from "./Popover";

test("the trigger opens a named popup and Escape closes it, returning focus", async () => {
  render(
    <Popover trigger={<Button>Sizes</Button>} title="Filter by size">
      <p>Pick sizes</p>
    </Popover>,
  );
  const trigger = screen.getByRole("button", { name: "Sizes" });

  await userEvent.click(trigger);

  const popup = await screen.findByRole("dialog", { name: "Filter by size" });
  expect(popup).toHaveTextContent("Pick sizes");
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await axe(document.body)).toHaveNoViolations();

  await userEvent.keyboard("{Escape}");

  await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
  expect(trigger).toHaveFocus();
});
