import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type SegmentedRadioProps<T extends string | number> = {
  /** The group's accessible name (visually hidden). */
  legend: string;
  /** Distinguishes groups for the same value, e.g. the toolbar's and the sheet's. */
  name: string;
  /** `name` overrides the visible label as the accessible name; `faint` dims an option. */
  options: readonly { value: T; label: ReactNode; name?: string; faint?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Native radios styled as a segmented control: arrow keys and roving focus come for free. */
export function SegmentedRadio<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  className,
}: SegmentedRadioProps<T>) {
  return (
    <fieldset className={cn("flex overflow-hidden rounded-sm border border-border", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="relative flex-auto">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            aria-label={option.name}
            className="peer absolute inset-0 appearance-none"
          />
          <span
            className={cn(
              "flex h-11 cursor-pointer items-center justify-center text-sm font-semibold transition-colors duration-fast px-2 sm:h-8 sm:text-xs md:px-2.5",
              "peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-focus",
              "hover:bg-surface-sunken peer-checked:hover:bg-accent",
              option.faint && "text-text-faint",
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
