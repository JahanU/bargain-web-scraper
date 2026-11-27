import {
  ArrowDown01,
  ArrowDown10,
  ArrowDownWideNarrow,
  ChevronDown,
  ClockArrowDown,
  ClockArrowUp,
} from "lucide-react";
import { VisuallyHidden } from "@/shared/ui";
import { SORTS, type SortId } from "@/features/deals";
import { cn } from "@/shared/lib/cn";
import { SORT_LABELS } from "../model/sort";

// The order each sort puts first: bars for discount, digits for price, a clock for found.
const ICONS = {
  "discount-high-to-low": ArrowDownWideNarrow,
  "price-low-to-high": ArrowDown01,
  "price-high-to-low": ArrowDown10,
  "found-new-to-old": ClockArrowDown,
  "found-old-to-new": ClockArrowUp,
} satisfies Record<SortId, unknown>;

type SortSelectProps = { value: SortId; onChange: (value: SortId) => void; className?: string };

/** A native select: five options need no custom listbox, and phones get their own picker. */
export function SortSelect({ value, onChange, className }: SortSelectProps) {
  const Icon = ICONS[value];
  return (
    <label className={cn("relative flex items-center", className)}>
      <VisuallyHidden>Sort by</VisuallyHidden>
      <Icon size={16} aria-hidden className="pointer-events-none absolute left-3" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortId)}
        className="h-11 w-full appearance-none rounded-sm border border-border bg-surface-raised pr-9 pl-9 text-sm font-semibold hover:border-border-strong sm:h-10"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 text-text-muted"
      />
    </label>
  );
}
