import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vite-plus/test";
import { axe } from "vitest-axe";
import { ToggleGroup } from "./ToggleGroup";

const SIZES = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
];

test("each item is a toggle button whose pressed state follows the value", async () => {
  const { container } = render(
    <ToggleGroup label="Sizes" items={SIZES} value={["M"]} onValueChange={() => {}} />,
  );

  expect(screen.getByRole("group", { name: "Sizes" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "S" })).toHaveAttribute("aria-pressed", "false");
  expect(await axe(container)).toHaveNoViolations();
});

test("clicking adds and removes values, keeping the others", async () => {
  const onValueChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState<string[]>(["M"]);
    return (
      <ToggleGroup
        label="Sizes"
        items={SIZES}
        value={value}
        onValueChange={(next) => {
          onValueChange(next);
          setValue(next);
        }}
      />
    );
  }
  render(<Harness />);

  await userEvent.click(screen.getByRole("button", { name: "L" }));
  expect(onValueChange).toHaveBeenLastCalledWith(["M", "L"]);
  expect(screen.getByRole("button", { name: "L" })).toHaveAttribute("aria-pressed", "true");

  await userEvent.click(screen.getByRole("button", { name: "M" }));
  expect(onValueChange).toHaveBeenLastCalledWith(["L"]);
});
