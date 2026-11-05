import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test } from "vite-plus/test";
import { axe } from "vitest-axe";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>About</Button>
      <Dialog open={open} onOpenChange={setOpen} title="About Bargain">
        <p>Deals from JD Sports UK.</p>
      </Dialog>
    </>
  );
}

test("opens as a named modal dialog with no axe violations", async () => {
  render(<Harness />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "About" }));

  const dialog = await screen.findByRole("dialog", { name: "About Bargain" });
  expect(dialog).toHaveTextContent("Deals from JD Sports UK.");
  expect(await axe(document.body)).toHaveNoViolations();
});

test("Escape closes it and returns focus to the opener", async () => {
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "About" });
  await userEvent.click(opener);
  await screen.findByRole("dialog");

  await userEvent.keyboard("{Escape}");

  await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
  expect(opener).toHaveFocus();
});

test("the Close button closes it", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "About" }));

  await userEvent.click(await screen.findByRole("button", { name: "Close" }));

  await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
});
