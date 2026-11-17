import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { CategoryControl } from "./CategoryControl";
import { ChipFacetOptions } from "./ChipFacet";
import { DiscountControl } from "./DiscountControl";
import { brandOptions, storeOptions } from "./facetOptions";
import type { FilterBarProps } from "./FilterBar";
import { GenderControl } from "./GenderControl";
import { SizeOptions } from "./SizeFacet";
import { SortSelect } from "./SortSelect";

type FilterPanelProps = Pick<FilterBarProps, "values" | "onChange" | "facets"> & {
  /** Leave out "Shop for" and "Category": on wide screens the bar has them. */
  inBar?: boolean;
};

/**
 * Every filter, as a stack of collapsible sections: the sidebar on wide screens and the body of
 * the drawer on small ones. Filters apply as they are chosen.
 */
export function FilterPanel({ values, onChange, facets, inBar }: FilterPanelProps) {
  const stores = storeOptions(facets);
  // A kind with nothing to choose and nothing chosen (footwear sizes when browsing clothes) has no section.
  // Until the sizes arrive it stays, so the sidebar does not jump on every load.
  const hasSizes = (rows: readonly unknown[] | undefined, selected: readonly string[]) =>
    selected.length > 0 || rows === undefined || rows.length > 0;
  return (
    <>
      <Section title="Sort by">
        <SortSelect value={values.sort} onChange={(sort) => onChange({ sort })} />
      </Section>
      {!inBar && (
        <>
          <Section title="Shop for">
            <GenderControl value={values.gender} onChange={(gender) => onChange({ gender })} />
          </Section>
          <Section title="Category">
            <CategoryControl
              value={values.category}
              onChange={(category) => onChange({ category })}
            />
          </Section>
        </>
      )}
      <Section title="Minimum discount">
        <DiscountControl
          value={values.discount}
          onChange={(discount) => onChange({ discount })}
          stops={facets?.discounts}
          name="discount"
        />
      </Section>
      {stores && (
        <Section title="Stores" count={values.stores.length}>
          <ChipFacetOptions
            noun="store"
            selected={values.stores}
            onChange={(next) => onChange({ stores: next })}
            options={stores}
          />
        </Section>
      )}
      <Section title="Brands" count={values.brands.length}>
        <ChipFacetOptions
          list
          noun="brand"
          selected={values.brands}
          onChange={(brands) => onChange({ brands })}
          options={brandOptions(facets)}
        />
      </Section>
      {hasSizes(facets?.sizes, values.sizes) && (
        <Section title="Clothing size" count={values.sizes.length}>
          <SizeOptions
            label="Clothing sizes"
            selected={values.sizes}
            onChange={(sizes) => onChange({ sizes })}
            rows={facets?.sizes}
          />
        </Section>
      )}
      {hasSizes(facets?.shoeSizes, values.shoeSizes) && (
        <Section title="Footwear size" count={values.shoeSizes.length}>
          <SizeOptions
            label="Footwear sizes (UK)"
            selected={values.shoeSizes}
            onChange={(shoeSizes) => onChange({ shoeSizes })}
            rows={facets?.shoeSizes}
          />
        </Section>
      )}
    </>
  );
}

type SectionProps = {
  title: string;
  /** How many of its options are on. */ count?: number;
  children: ReactNode;
};

function Section({ title, count = 0, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="border-b border-border">
      {/* Not a heading: the deals' names are the page's outline. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex h-12 w-full items-center gap-2 text-xs font-semibold tracking-widest uppercase"
      >
        {title}
        {count > 0 && (
          <span aria-hidden className="text-text-muted">
            {count}
          </span>
        )}
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "ml-auto text-text-muted transition-transform duration-base",
            open && "rotate-180",
          )}
        />
      </button>
      {/* A grid row going from 0fr to 1fr animates to the content's own height. */}
      <div
        id={id}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-base ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* The side padding keeps focus rings inside the clip. */}
        <div className="-mx-1 overflow-hidden px-1">
          <div className="pt-1 pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
