// The plate every photo is framed in. Photos keep their own shape inside it (JD's are this
// portrait shape, Size's vary), so these are the <img> hints, not a crop.
export const IMAGE_WIDTH = 726;
export const IMAGE_HEIGHT = 926;
export const SRCSET_WIDTHS = [240, 360, 480, 720] as const;

export type DealImage = { src: string; srcSet: string; width: number; height: number };

type Sizer = (base: URL, width: number) => string;

// JD's CDN, and the fallback for a host not listed below: a bare URL, resized on request.
const amplience: Sizer = (base, width) => {
  const url = new URL(base);
  url.search = "";
  url.searchParams.set("w", String(width));
  url.searchParams.set("h", String(Math.round((width * IMAGE_HEIGHT) / IMAGE_WIDTH)));
  url.searchParams.set("qlt", "75");
  url.searchParams.set("fmt", "auto"); // the CDN picks AVIF or WebP
  return url.href;
};

// Size's CDN: ?v= is the file's version and stays; width alone keeps the photo's own shape, and
// the CDN picks the format itself.
const shopify: Sizer = (base, width) => {
  const url = new URL(base);
  url.searchParams.delete("height");
  url.searchParams.set("width", String(width));
  return url.href;
};

const SIZER_BY_HOST: Record<string, Sizer> = { "cdn.shopify.com": shopify };

/** Responsive image URLs, or undefined when the URL is unusable. */
export function buildImage(imageUrl: string): DealImage | undefined {
  if (!URL.canParse(imageUrl)) return undefined;
  const base = new URL(imageUrl);
  const sized = SIZER_BY_HOST[base.hostname] ?? amplience;
  return {
    src: sized(base, 360),
    srcSet: SRCSET_WIDTHS.map((width) => `${sized(base, width)} ${width}w`).join(", "),
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  };
}
