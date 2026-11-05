import type { Deal } from "../model/Deal";
import { DealCard } from "./DealCard";

const PRIORITY_COUNT = 10; // roughly the first two rows on any screen
const RENDER_LAZILY_FROM = 20;

/** The single seam for virtualisation later; for now cards past the fold skip layout until scrolled to. */
type DealGridProps = {
  deals: readonly Deal[];
  /** From the full list, not the filtered one: see serverStartOf. */
  serverStart: number;
};

export function DealGrid({ deals, serverStart }: DealGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
      {deals.map((deal, index) => (
        <li
          key={deal.id}
          className={
            index >= RENDER_LAZILY_FROM
              ? "[contain-intrinsic-size:auto_440px] [content-visibility:auto]"
              : undefined
          }
        >
          <DealCard deal={deal} serverStart={serverStart} priority={index < PRIORITY_COUNT} />
        </li>
      ))}
    </ul>
  );
}
