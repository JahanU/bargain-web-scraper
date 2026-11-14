import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button, Popover, ToggleGroup } from "@/shared/ui";
import { facetCount } from "./toolbarLabel";

const TOP_OPTIONS = 10;
const plural = (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)}s`;

type ChipFacetProps = {
  /** What one option is, e.g. "brand": names the group, the popover and "Show all 12 brands". */
  noun: string;
  selected: readonly string[];
  onChange: (values: string[]) => void;
  /**
   * Deals per option with every filter but this one applied, biggest first; undefined until they
   * arrive. `label` is shown when the value is an id.
   */
  options: readonly { value: string; label?: string; count: number }[] | undefined;
};

/**
 * Toggles with the backend's counts: the ten biggest plus any selected, the rest behind "Show
 * all". OR within the facet. A selected value with no deals still shows (at 0) so it can be
 * turned off; without counts only the selected values show.
 */
export function ChipFacetOptions({ noun, selected, onChange, options }: ChipFacetProps) {
  const [expanded, setExpanded] = useState(false);
  const all = [
    ...(options ?? []),
    ...selected
      .filter((value) => !options?.some((option) => option.value === value))
      .map((value) => ({ value, label: undefined, count: 0 })),
  ];
  const shown = expanded
    ? all
    : all.filter(({ value }, index) => index < TOP_OPTIONS || selected.includes(value));

  return (
    <div className="space-y-3">
      {shown.length > 0 && (
        <ToggleGroup
          label={plural(noun)}
          items={shown.map(({ value, label = value, count }) =>
            options
              ? {
                  value,
                  name: `${label}, ${count} ${count === 1 ? "deal" : "deals"}`,
                  label: (
                    <>
                      {label} <span className={facetCount}>{count}</span>
                    </>
                  ),
                }
              : { value, label },
          )}
          value={selected}
          onValueChange={onChange}
        />
      )}
      {!options ? (
        <p className="text-sm text-text-muted">The {noun} list isn’t available yet.</p>
      ) : all.length === 0 ? (
        <p className="text-sm text-text-muted">No {noun}s for these deals.</p>
      ) : null}
      {all.length > TOP_OPTIONS && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="flex h-11 items-center text-sm font-semibold underline underline-offset-2 sm:h-8"
        >
          {expanded ? `Show fewer ${noun}s` : `Show all ${all.length} ${noun}s`}
        </button>
      )}
    </div>
  );
}

/** On wide screens the options sit in a popover behind a "Brands" or "Stores" button. */
export function ChipFacetPopover(props: ChipFacetProps) {
  const count = props.selected.length;
  return (
    <Popover
      title={`Filter by ${props.noun}`}
      trigger={
        <Button tone="secondary">
          {plural(props.noun)}
          {count > 0 && <span className="text-accent"> · {count}</span>}
          <ChevronDown size={16} aria-hidden />
        </Button>
      }
    >
      <div className="w-[min(22rem,calc(100vw-3rem))]">
        <ChipFacetOptions {...props} />
      </div>
    </Popover>
  );
}
