import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { chip } from "./chipStyles";

type ToggleGroupProps = {
  label: string;
  /** `name` overrides the visible label as the accessible name (it must contain it). */
  items: readonly { value: string; label: ReactNode; name?: string }[];
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  /** One full-width row per item instead of wrapping chips. */
  list?: boolean;
  className?: string;
};

/** A set of independent on/off chips (aria-pressed); any number can be on. */
export function ToggleGroup({
  label,
  items,
  value,
  onValueChange,
  list,
  className,
}: ToggleGroupProps) {
  return (
    <BaseToggleGroup
      aria-label={label}
      multiple
      value={value}
      onValueChange={onValueChange}
      className={cn(list ? "flex flex-col" : "flex flex-wrap gap-1.5", className)}
    >
      {items.map((item) => (
        <Toggle
          key={item.value}
          value={item.value}
          aria-label={item.name}
          className={(state) =>
            list
              ? cn(
                  "flex h-11 w-full cursor-pointer items-center gap-2 text-left text-sm transition-colors duration-fast sm:h-9",
                  state.pressed ? "font-semibold text-text" : "text-text-muted hover:text-text",
                )
              : cn(
                  chip({ tone: state.pressed ? "selected" : "neutral", interactive: true }),
                  "min-w-11 justify-center max-sm:h-11",
                )
          }
        >
          {item.label}
        </Toggle>
      ))}
    </BaseToggleGroup>
  );
}
