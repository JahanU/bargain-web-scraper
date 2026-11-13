import * as z from "zod/mini";
import { CATEGORIES, GENDERS, STORES } from "../model/Deal";
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
  // Optional: snapshots saved before Size was added, and an older backend, have none.
  store: z.optional(z.enum(STORES)),
});

export type WireDeal = z.infer<typeof wireDeal>;

/** Keeps every valid deal and drops the rest; only a body that isn't a list is an error. */
export function parseDeals(body: unknown): WireDeal[] {
  if (!Array.isArray(body)) throw new ApiError("invalid-body");
  const deals: WireDeal[] = [];
  for (const item of body) {
    const result = wireDeal.safeParse(item);
    if (result.success) deals.push(result.data);
  }
  const dropped = body.length - deals.length;
  if (dropped > 0)
    console.warn(`Dropped ${dropped} of ${body.length} deals that failed validation.`);
  return deals;
}
