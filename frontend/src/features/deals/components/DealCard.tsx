import { relativeTime } from "@/shared/lib/format";
import { Badge, VisuallyHidden } from "@/shared/ui";
import { type Deal, STORE_LABEL } from "../model/Deal";
import { GENDER_LABEL, foundTime, isNew } from "../model/describe";
import { DealImage } from "./DealImage";
import { PriceBlock } from "./PriceBlock";
import { SizeChips } from "./SizeChips";

type DealCardProps = { deal: Deal; serverStart: number; priority: boolean };

/**
 * One link per deal, named by its own text (so speech users can say what they see). The badges
 * are hidden from assistive tech; their meaning is in the text below, so nothing is read twice.
 */
export function DealCard({ deal, serverStart, priority }: DealCardProps) {
  const found = foundTime(deal, serverStart);
  const fresh = isNew(deal, serverStart);
  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener"
      className="group block rounded-sm outline-offset-4"
    >
      <div className="relative overflow-hidden rounded-sm border border-transparent transition-colors duration-fast group-hover:border-border-strong group-focus-visible:border-border-strong">
        <DealImage image={deal.image} priority={priority} />
        <Badge tone="accent" className="absolute top-2 left-2" aria-hidden>
          -{deal.discount}%
        </Badge>
        <Badge tone="outline" className="absolute bottom-2 left-2" aria-hidden>
          {STORE_LABEL[deal.store]}
        </Badge>
        {fresh && (
          <Badge tone="outline" className="absolute top-2 right-2" aria-hidden>
            <svg viewBox="0 0 10 16" className="h-2.5 w-auto text-accent" aria-hidden>
              <path fill="currentColor" d="M5 0 10 8 5 16 0 8Z" />
            </svg>
            New
          </Badge>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        <h2 className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">{deal.name}</h2>
        <PriceBlock now={deal.nowPrice} was={deal.wasPrice} discount={deal.discount} />
        <SizeChips sizes={deal.sizes} />
        <p className="text-xs text-text-muted">
          <VisuallyHidden>{STORE_LABEL[deal.store]},</VisuallyHidden> {GENDER_LABEL[deal.gender]}
          {found !== undefined && (
            <>
              {" · Found "}
              <time
                dateTime={new Date(found).toISOString()}
                title={new Date(found).toLocaleString("en-GB")}
              >
                {relativeTime(found)}
              </time>
            </>
          )}
          {fresh && <VisuallyHidden>, new</VisuallyHidden>}
        </p>
      </div>
    </a>
  );
}
