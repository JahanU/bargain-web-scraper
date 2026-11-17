import { Check } from "lucide-react";
import { useState } from "react";
import { ToggleGroup } from "@/shared/ui";
import { SearchField } from "./SearchField";
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
  /** One row per option, with a search box once there are more than ten. */
  list?: boolean;
};

/**
 * Toggles with the backend's counts: the ten biggest plus any selected, the rest behind "Show
 * all". OR within the facet. A selected value with no deals still shows (at 0) so it can be
 * turned off; without counts only the selected values show.
 */
export function ChipFacetOptions({ noun, selected, onChange, options, list }: ChipFacetProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const all = [
    ...(options ?? []),
    ...selected
      .filter((value) => !options?.some((option) => option.value === value))
      .map((value) => ({ value, label: undefined, count: 0 })),
  ];
  const searchable = list && all.length > TOP_OPTIONS;
  const needle = searchable ? query.trim().toLowerCase() : "";
  // A search looks through every option, not just the top ten.
  const shown = needle
    ? all.filter(({ value, label = value }) => label.toLowerCase().includes(needle))
    : expanded
      ? all
      : all.filter(({ value }, index) => index < TOP_OPTIONS || selected.includes(value));

  return (
    <div className="space-y-3">
      {searchable && (
        <SearchField
          value={query}
          onChange={setQuery}
          label={`Search ${noun}s`}
          placeholder={`Search ${noun}s`}
        />
      )}
      {shown.length > 0 && (
        <ToggleGroup
          list={list}
          label={plural(noun)}
          items={shown.map(({ value, label = value, count }) =>
            options
              ? {
                  value,
                  name: `${label}, ${count} ${count === 1 ? "deal" : "deals"}`,
                  label: (
                    <>
                      {label} <span className={facetCount}>{count}</span>
                      {list && (
                        <Check
                          size={16}
                          aria-hidden
                          className="ml-auto opacity-0 in-data-pressed:opacity-100"
                        />
                      )}
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
      ) : shown.length === 0 ? (
        <p className="text-sm text-text-muted">
          No {noun}s match “{query.trim()}”.
        </p>
      ) : null}
      {all.length > TOP_OPTIONS && !needle && (
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
