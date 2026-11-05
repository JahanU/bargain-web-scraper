import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import type { DealImage as Image } from "../model/image";

// Matches the grid: 2 columns on phones, 3 from 640 px, 4 from 1024 px, 5 from 1280 px (max 1440).
export const GRID_SIZES =
  "(min-width: 1280px) min(calc((100vw - 144px) / 5), 260px), (min-width: 1024px) calc((100vw - 120px) / 4), (min-width: 640px) calc((100vw - 96px) / 3), calc((100vw - 44px) / 2)";

type DealImageProps = { image: Image | undefined; priority: boolean };

/** Decorative (the card's name says it all). The first rows load eagerly; the rest lazily. */
export function DealImage({ image, priority }: DealImageProps) {
  const [loaded, setLoaded] = useState(false);
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
          onLoad={() => setLoaded(true)}
          className={cn(
            "size-full object-contain transition-[opacity,scale] duration-base group-hover:scale-[1.02]",
            !loaded && "opacity-0",
          )}
        />
      )}
    </div>
  );
}
