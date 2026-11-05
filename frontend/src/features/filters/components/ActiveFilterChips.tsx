import { X } from "lucide-react";
import { Button } from "@/shared/ui";
import { chip } from "@/shared/ui/chipStyles";
import { activeChips, type FilterValues } from "../model/registry";

type ActiveFilterChipsProps = {
  values: FilterValues;
  onChange: (next: Partial<FilterValues>) => void;
  onClearAll: () => void;
};

/** One removable chip per non-default filter value, and Clear all. Renders nothing at defaults. */
export function ActiveFilterChips({ values, onChange, onClearAll }: ActiveFilterChipsProps) {
  const chips = activeChips(values);
  if (chips.length === 0) return null;
  return (
    <div className="mb-3 flex items-center gap-2 overflow-x-auto max-sm:-mx-4 max-sm:px-4">
      <ul aria-label="Active filters" className="flex shrink-0 gap-2">
        {chips.map((active) => (
          <li key={`${active.filter}:${active.label}`}>
            <button
              type="button"
              aria-label={`Remove ${active.label}`}
              onClick={() => onChange({ [active.filter]: active.next } as Partial<FilterValues>)}
              className={chip({ tone: "neutral", interactive: true, size: "sm" })}
            >
              {active.label}
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Button tone="ghost" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}
