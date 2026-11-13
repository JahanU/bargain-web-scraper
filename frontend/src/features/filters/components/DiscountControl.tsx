import { DISCOUNT_STOPS } from "../model/registry";
import { SegmentedRadio } from "./SegmentedRadio";

type DiscountControlProps = {
  value: number;
  onChange: (value: number) => void;
  /** Deals each stop would show; stops with none look faint. */
  counts: Record<number, number> | undefined;
  /** Distinguishes the toolbar's group from the sheet's, which can both be in the page. */
  name: string;
};

export function DiscountControl({ counts, ...props }: DiscountControlProps) {
  return (
    <SegmentedRadio
      legend="Minimum discount"
      options={DISCOUNT_STOPS.map((stop) => ({
        value: stop,
        label: stop,
        name: `${stop}%`,
        faint: counts?.[stop] === 0,
      }))}
      {...props}
    />
  );
}
