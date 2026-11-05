import { gbp } from "@/shared/lib/format";
import { VisuallyHidden } from "@/shared/ui";

type PriceBlockProps = { now: number; was: number; discount: number };

/** Read as "£10 was £30, 67% off": the struck price and the badge's meaning in words. */
export function PriceBlock({ now, was, discount }: PriceBlockProps) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="text-[17px] leading-6 font-bold lg:text-xl">{gbp(now)}</span>
      {was > now && " "}
      {was > now && (
        <s className="text-[13px] text-text-muted">
          <VisuallyHidden>was</VisuallyHidden> {gbp(was)}
        </s>
      )}
      <VisuallyHidden>, {discount}% off</VisuallyHidden>
    </p>
  );
}
