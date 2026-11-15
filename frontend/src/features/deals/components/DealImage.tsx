import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import type { DealImage as Image } from "../model/image";

// Matches the grid beside the open filter sidebar (320 px, from 1024 px): 2 columns on phones, 3
// from 640 px, 4 from 1280 px (container max 1440). With the sidebar hidden the cards are a
// little wider than this says.
export const GRID_SIZES =
  "(min-width: 1280px) min(calc((100vw - 440px) / 4), 250px), (min-width: 1024px) calc((100vw - 416px) / 3), (min-width: 640px) calc((100vw - 96px) / 3), calc((100vw - 44px) / 2)";

// Rows leave and re-enter the DOM as the grid scrolls; an image seen once must not fade in again.
const loadedSrcs = new Set<string>();

type DealImageProps = { image: Image | undefined; priority: boolean };

/** Decorative (the card's name says it all). The first rows load eagerly; the rest lazily. */
export function DealImage({ image, priority }: DealImageProps) {
  const [loaded, setLoaded] = useState(() => !!image && loadedSrcs.has(image.src));
  return (
    <div className="aspect-[726/926] bg-image-plate">
      {image && (
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={GRID_SIZES}
          width={image.width}
          height={image.height}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => {
            loadedSrcs.add(image.src);
            setLoaded(true);
          }}
          className={cn(
            "size-full object-contain transition-[opacity,scale] duration-base group-hover:scale-[1.02]",
            !loaded && "opacity-0",
          )}
        />
      )}
    </div>
  );
}
