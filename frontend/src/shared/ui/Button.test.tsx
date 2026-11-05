import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { axe } from "vitest-axe";
import { Search } from "lucide-react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { VisuallyHidden } from "./VisuallyHidden";

test("Button is a plain button by default, so it never submits a surrounding form", async () => {
  const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
  const onClick = vi.fn();
  render(
    <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
      <Button onClick={onClick}>Reset</Button>
    </form>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Reset" }));

  expect(onClick).toHaveBeenCalledOnce();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("a disabled Button ignores clicks", async () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick}>
      Retry
    </Button>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Retry" }));

  expect(onClick).not.toHaveBeenCalled();
});

test("IconButton is named by its label, not its icon", async () => {
  const { container } = render(<IconButton label="Close" icon={<svg aria-hidden />} />);

  expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});

test("VisuallyHidden text names its control", async () => {
  const { container } = render(
    <Button>
      <Search aria-hidden />
      <VisuallyHidden>Search deals</VisuallyHidden>
    </Button>,
  );

  expect(screen.getByRole("button", { name: "Search deals" })).toBeInTheDocument();
  expect(await axe(container)).toHaveNoViolations();
});
