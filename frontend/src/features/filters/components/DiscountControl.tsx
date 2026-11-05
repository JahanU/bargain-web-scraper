import { cn } from "@/shared/lib/cn";
import { BACKEND_MIN_DISCOUNT, DISCOUNT_STOPS } from "../model/registry";

type DiscountControlProps = {
  value: number;
  onChange: (value: number) => void;
  /** Deals each stop would show; stops with none, and stops below the backend floor, look faint. */
  counts: Record<number, number> | undefined;
  /** Distinguishes the toolbar's group from the sheet's, which can both be in the page. */
  name: string;
  className?: string;
};

/** Native radios styled as a segmented control: arrow keys and roving focus come for free. */
export function DiscountControl({
  value,
  onChange,
  counts,
  name,
  className,
}: DiscountControlProps) {
  return (
    <fieldset className={cn("grid overflow-hidden rounded-sm border border-border", className)}>
      <legend className="sr-only">Minimum discount</legend>
      {DISCOUNT_STOPS.map((stop) => {
        const faint = stop < BACKEND_MIN_DISCOUNT || counts?.[stop] === 0;
        return (
          <label key={stop} className="relative">
            <input
              type="radio"
              name={name}
              value={stop}
              checked={value === stop}
              onChange={() => onChange(stop)}
              aria-label={`${stop}%`}
              className="peer absolute inset-0 appearance-none"
            />
            <span
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center text-sm font-semibold transition-colors duration-fast sm:h-8 sm:px-2 sm:text-xs",
                "peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-focus",
                "hover:bg-surface-sunken peer-checked:hover:bg-accent",
                faint && "text-text-faint",
              )}
            >
              {stop}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
