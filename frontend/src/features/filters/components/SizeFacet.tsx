import { ChevronDown } from "lucide-react";
import { type Facets, type SizeGroup, compareSizes, sizeGroup } from "@/features/deals";
import { Button, Popover, ToggleGroup } from "@/shared/ui";
import { facetCount, toolbarLabel } from "./toolbarLabel";

const GROUPS: { group: SizeGroup; title: string }[] = [
  { group: "clothing", title: "Clothing" },
  { group: "footwear", title: "Footwear" },
];

type SizeFacetProps = {
  selected: readonly string[];
  onChange: (sizes: string[]) => void;
  /** Deals per size with every filter but sizes applied; undefined until they arrive. */
  counts: Facets["sizes"] | undefined;
};

/**
 * One group's sizes in canonical order. A selected size the other filters have emptied still
 * shows (at 0) so it can be turned off.
 */
function sizesIn(group: SizeGroup, counts: Facets["sizes"], selected: readonly string[]) {
  const missing = selected
    .filter((size) => !counts.some((row) => row.size === size))
    .map((size) => ({ size, count: 0 }));
  return [...counts, ...missing]
    .filter(({ size }) => sizeGroup(size) === group)
    .sort((a, b) => compareSizes(a.size, b.size));
}

/** Size toggles with counts, Clothing then Footwear. OR within sizes. */
export function SizeOptions({ selected, onChange, counts = [] }: SizeFacetProps) {
  const groups = GROUPS.map(({ group, title }) => ({
    group,
    title,
    items: sizesIn(group, counts, selected),
  }));
  if (groups.every(({ items }) => items.length === 0)) {
    return <p className="text-sm text-text-muted">No sizes listed for these deals.</p>;
  }
  return (
    <div className="space-y-4">
      {groups.map(({ group, title, items }) =>
        items.length === 0 ? null : (
          <div key={group} className="space-y-2">
            <p className={toolbarLabel} aria-hidden>
              {title}
            </p>
            <ToggleGroup
              label={`${title} sizes`}
              items={items.map(({ size, count }) => ({
                value: size,
                name: `${size}, ${count} ${count === 1 ? "deal" : "deals"}`,
                label: (
                  <>
                    {size} <span className={facetCount}>{count}</span>
                  </>
                ),
              }))}
              value={selected.filter((size) => sizeGroup(size) === group)}
              onValueChange={(next) =>
                onChange([...selected.filter((size) => sizeGroup(size) !== group), ...next])
              }
            />
          </div>
        ),
      )}
    </div>
  );
}

/** On wide screens the options sit in a popover behind a "Sizes" button. */
export function SizePopover(props: SizeFacetProps) {
  const count = props.selected.length;
  return (
    <Popover
      title="Filter by size"
      trigger={
        <Button tone="secondary">
          Sizes
          {count > 0 && <span className="text-accent"> · {count}</span>}
          <ChevronDown size={16} aria-hidden />
        </Button>
      }
    >
      <div className="w-[min(22rem,calc(100vw-3rem))]">
        <SizeOptions {...props} />
      </div>
    </Popover>
  );
}
