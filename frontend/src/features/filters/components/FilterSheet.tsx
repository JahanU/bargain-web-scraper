import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, IconButton } from "@/shared/ui";
import type { FilterBarProps } from "./FilterBar";
import { DiscountControl } from "./DiscountControl";
import { SizeOptions } from "./SizeFacet";
import { SortSelect } from "./SortSelect";
import { toolbarLabel } from "./toolbarLabel";

type FilterSheetProps = Omit<FilterBarProps, "busy"> & { onClose: () => void };

/**
 * The phone filter form, in a native modal <dialog>: focus trap, Escape and an inert page come
 * from the browser. Filters apply as you tap, so the main button only closes it. Lazy-loaded.
 */
export default function FilterSheet({
  values,
  onChange,
  onClearAll,
  sizeFacets,
  discountCounts,
  resultCount,
  onClose,
}: FilterSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop tap; keyboard has Escape
    <dialog
      ref={dialog}
      aria-labelledby="filter-sheet-title"
      onClose={onClose}
      // A tap on the backdrop lands on the dialog itself. Keyboard users have Escape and Close.
      onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
      className="m-0 mt-auto flex max-h-[92dvh] w-full max-w-none flex-col rounded-t-lg border border-border bg-surface-raised p-0 text-text shadow-sm backdrop:bg-text/40 starting:open:translate-y-full open:translate-y-0 transition-[translate] duration-slow ease-out"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 id="filter-sheet-title" className="text-base font-bold">
          Filters
        </h2>
        <IconButton
          label="Close filters"
          icon={<X size={20} aria-hidden />}
          onClick={() => dialog.current?.close()}
        />
      </div>

      <div className="space-y-6 overflow-y-auto px-4 py-4">
        <section className="space-y-2">
          <h3 className={toolbarLabel}>Minimum discount</h3>
          <DiscountControl
            value={values.discount}
            onChange={(discount) => onChange({ discount })}
            counts={discountCounts}
            name="discount-sheet"
            className="grid-cols-5"
          />
        </section>
        <section className="space-y-2">
          <h3 className={toolbarLabel}>Sizes</h3>
          <SizeOptions
            selected={values.sizes}
            onChange={(sizes) => onChange({ sizes })}
            facets={sizeFacets}
          />
        </section>
        <section className="space-y-2">
          <h3 className={toolbarLabel}>Sort</h3>
          <SortSelect value={values.sort} onChange={(sort) => onChange({ sort })} />
        </section>
      </div>

      <div className="flex gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={onClearAll}>Reset</Button>
        <Button tone="primary" className="flex-1" onClick={() => dialog.current?.close()}>
          {resultCount === undefined
            ? "Show deals"
            : `Show ${resultCount} ${resultCount === 1 ? "deal" : "deals"}`}
        </Button>
      </div>
    </dialog>
  );
}
