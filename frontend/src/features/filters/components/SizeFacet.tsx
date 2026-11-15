import type { Facets } from "@/features/deals";
import { ToggleGroup } from "@/shared/ui";
import { facetCount } from "./toolbarLabel";

type SizeOptionsProps = {
  /** The toggle group's accessible name, e.g. "Clothing sizes". */
  label: string;
  selected: readonly string[];
  onChange: (sizes: string[]) => void;
  /** This kind's sizes in the backend's order, counted without the size filter; undefined until they arrive. */
  rows: Facets["sizes"] | undefined;
};

/**
 * One kind's size toggles with counts. A selected size the other filters have emptied still
 * shows (last, at 0) so it can be turned off.
 */
export function SizeOptions({ label, selected, onChange, rows = [] }: SizeOptionsProps) {
  const missing = selected
    .filter((size) => !rows.some((row) => row.size === size))
    .map((size) => ({ size, count: 0 }));
  const items = [...rows, ...missing];
  return (
    <ToggleGroup
      label={label}
      items={items.map(({ size, count }) => ({
        value: size,
        name: `${size}, ${count} ${count === 1 ? "deal" : "deals"}`,
        label: (
          <>
            {size} <span className={facetCount}>{count}</span>
          </>
        ),
      }))}
      value={selected}
      onValueChange={onChange}
    />
  );
}
