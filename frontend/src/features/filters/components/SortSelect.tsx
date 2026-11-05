import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { VisuallyHidden } from "@/shared/ui";
import { SORT_LABELS, SORTS, type SortId } from "../model/sort";

type SortSelectProps = { value: SortId; onChange: (value: SortId) => void; className?: string };

/** A native select: four options need no custom listbox, and phones get their own picker. */
export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <label className={cn("relative flex items-center", className)}>
      <VisuallyHidden>Sort by</VisuallyHidden>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortId)}
        className="h-11 w-full appearance-none rounded-sm border border-border bg-surface-raised pr-9 pl-3 text-sm font-medium hover:border-border-strong sm:h-10"
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
