import * as z from "zod/mini";
import { CATEGORIES, GENDERS } from "../model/Deal";
import { ApiError } from "./ApiError";

// Prices are numbers now; the old backend sent strings like "£54.99", so those still parse.
const price = z.pipe(
  z.pipe(
    z.union([z.number(), z.string()]),
    z.transform((value) =>
      typeof value === "number" ? value : Number(value.replace(/[£,\s]/g, "")),
    ),
  ),
  z.number().check(z.nonnegative()),
);

const wireDeal = z.object({
  name: z.string().check(z.minLength(1)),
  wasPrice: price,
  nowPrice: price,
  discount: z.int(),
  url: z.url(),
  imageUrl: z.optional(z.string()),
  sizes: z.optional(z.array(z.string())),
  timestamp: z.number(),
  // A hint only (it comes from the listing URL), so an unknown value doesn't drop the deal.
  gender: z.catch(z.enum(GENDERS), "Unisex"),
  brand: z.string().check(z.minLength(1)),
  category: z.enum(CATEGORIES),
  store: z.string().check(z.minLength(1)),
});

export type WireDeal = z.infer<typeof wireDeal>;

const label = z.string().check(z.minLength(1));
const count = z.int().check(z.nonnegative());

const facets = z.object({
  stores: z.array(z.object({ store: label, name: label, count })),
  brands: z.array(z.object({ brand: label, count })),
  sizes: z.array(z.object({ size: label, count })),
  discounts: z.array(z.object({ minDiscount: z.int(), count })),
});

export type Facets = z.infer<typeof facets>;

const envelope = z.object({
  items: z.array(z.unknown()),
  total: count,
  nextCursor: z.nullable(z.string()),
  trackingSince: z.number(),
  facets: z.optional(facets),
});

/** One page of GET /v2/deals. `facets` come with the first page only. */
export type WirePage = Omit<z.infer<typeof envelope>, "items"> & { items: WireDeal[] };

/**
 * The envelope is strict: its totals and counts are shown as facts, so anything malformed is an
 * error. The deals are tolerant: every valid one is kept and the rest dropped.
 */
export function parsePage(body: unknown): WirePage {
  const result = envelope.safeParse(body);
  if (!result.success) throw new ApiError("invalid-body");
  const items: WireDeal[] = [];
  for (const item of result.data.items) {
    const deal = wireDeal.safeParse(item);
    if (deal.success) items.push(deal.data);
  }
  const dropped = result.data.items.length - items.length;
  // Nothing valid in a non-empty page is a backend that speaks another shape, not an empty sale.
  if (dropped > 0 && items.length === 0) throw new ApiError("invalid-body");
  if (dropped > 0)
    console.warn(`Dropped ${dropped} of ${result.data.items.length} deals that failed validation.`);
  return { ...result.data, items };
}
