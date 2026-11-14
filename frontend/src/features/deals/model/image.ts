// Product photos come from JD's Amplience CDN as a bare URL; the CDN resizes on request.
export const IMAGE_WIDTH = 726;
export const IMAGE_HEIGHT = 926;
export const SRCSET_WIDTHS = [240, 360, 480, 720] as const;

export type DealImage = { src: string; srcSet: string; width: number; height: number };

function sized(base: URL, width: number): string {
  const url = new URL(base);
  url.search = "";
  url.searchParams.set("w", String(width));
  url.searchParams.set("h", String(Math.round((width * IMAGE_HEIGHT) / IMAGE_WIDTH)));
  url.searchParams.set("qlt", "75");
  url.searchParams.set("fmt", "auto"); // the CDN picks AVIF or WebP
  return url.href;
}

/** Responsive image URLs, or undefined when the URL is unusable. */
export function buildImage(imageUrl: string): DealImage | undefined {
  if (!URL.canParse(imageUrl)) return undefined;
  const base = new URL(imageUrl);
  return {
    src: sized(base, 360),
    srcSet: SRCSET_WIDTHS.map((width) => `${sized(base, width)} ${width}w`).join(", "),
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  };
}
