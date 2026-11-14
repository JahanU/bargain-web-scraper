import { DEFAULT_DISCOUNT, type Facets } from "@/features/deals";
import { SegmentedRadio } from "./SegmentedRadio";

// Stands in until the backend's stops arrive, so the toolbar doesn't change width when they do.
const EXPECTED_STOPS = Array.from({ length: 8 }, (_, index) => DEFAULT_DISCOUNT + index * 10);

type DiscountControlProps = {
  value: number;
  onChange: (value: number) => void;
  /** The backend's stops and the deals each would show; stops with none look faint. */
  stops: Facets["discounts"] | undefined;
  /** Distinguishes the toolbar's group from the sheet's, which can both be in the page. */
  name: string;
};

export function DiscountControl({ stops, ...props }: DiscountControlProps) {
  const counts = new Map(stops?.map((stop) => [stop.minDiscount, stop.count]));
  // The selected value is always on offer, even one the backend doesn't list.
  const values = [...new Set([...(stops ? counts.keys() : EXPECTED_STOPS), props.value])];
  return (
    <SegmentedRadio
      legend="Minimum discount"
      options={values
        .sort((a, b) => a - b)
        .map((stop) => ({
          value: stop,
          label: stop,
          name: `${stop}%`,
          faint: counts.get(stop) === 0,
        }))}
      {...props}
    />
  );
}
