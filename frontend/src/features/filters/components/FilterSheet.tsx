import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, IconButton } from "@/shared/ui";
import type { FilterBarProps } from "./FilterBar";
import { FilterPanel } from "./FilterPanel";

type FilterSheetProps = Omit<FilterBarProps, "busy"> & { onClose: () => void };

/**
 * The filters on small screens: a sheet rising from the bottom, in a native modal <dialog>, so the
 * focus trap, Escape and an inert page come from the browser. Filters apply as you tap, so the main
 * button only closes it. Lazy-loaded.
 */
export default function FilterSheet({
  values,
  onChange,
  onClearAll,
  facets,
  resultCount,
  onClose,
}: FilterSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dragFrom = useRef<number>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  // Slides the sheet back down, then closes it: a closed dialog can't animate.
  const close = () => {
    const sheet = dialog.current;
    if (!sheet || sheet.dataset.closing !== undefined) return;
    sheet.dataset.closing = "";
    // Optional: jsdom has no getAnimations.
    const leaving = sheet.getAnimations?.() ?? [];
    void Promise.allSettled(leaving.map((animation) => animation.finished)).then(() =>
      sheet.close(),
    );
  };

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop tap; keyboard has Escape
    <dialog
      ref={dialog}
      aria-labelledby="filter-sheet-title"
      onClose={onClose}
      // Escape takes the animated way out too.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      // A tap on the backdrop lands on the dialog itself. Keyboard users have Escape and Close.
      onClick={(event) => event.target === event.currentTarget && close()}
      // Mounted closed and off-screen, so opening it is a transition up from there.
      className="top-auto bottom-0 m-0 mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-lg border border-b-0 border-border bg-surface-raised p-0 text-text shadow-sm backdrop:bg-text/40 backdrop:transition-opacity backdrop:duration-slow backdrop:starting:opacity-0 translate-y-full open:translate-y-0 open:data-closing:translate-y-full data-closing:backdrop:opacity-0 transition-[translate] duration-[360ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
    >
      {/* shortcut: a downward flick on the header closes the sheet but it doesn't follow the
          finger; track the drag if that feels dead. */}
      <div
        className="relative flex touch-none items-center justify-between border-b border-border px-4 pt-4 pb-2"
        onPointerDown={(event) => (dragFrom.current = event.clientY)}
        onPointerUp={(event) => {
          if (dragFrom.current !== null && event.clientY - dragFrom.current > 48) {
            close();
          }
        }}
      >
        <span
          aria-hidden
          className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border-strong"
        />
        <h2 id="filter-sheet-title" className="text-base font-bold">
          Filters
        </h2>
        <IconButton
          label="Close filters"
          icon={<X size={20} aria-hidden />}
          onClick={() => close()}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <FilterPanel values={values} onChange={onChange} facets={facets} />
      </div>

      <div className="flex gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={onClearAll}>Reset</Button>
        <Button tone="primary" className="flex-1" onClick={() => close()}>
          {resultCount === undefined
            ? "Show deals"
            : `Show ${resultCount} ${resultCount === 1 ? "deal" : "deals"}`}
        </Button>
      </div>
    </dialog>
  );
}
