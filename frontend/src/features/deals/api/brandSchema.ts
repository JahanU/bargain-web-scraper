import * as z from "zod/mini";
import { ApiError } from "./ApiError";

const brandCounts = z.array(
  z.object({ brand: z.string().check(z.minLength(1)), count: z.int().check(z.nonnegative()) }),
);

export type BrandCount = z.infer<typeof brandCounts>[number];

/** The counts are shown as facts, so one bad row rejects the whole list. */
export function parseBrands(body: unknown): BrandCount[] {
  const result = brandCounts.safeParse(body);
  if (!result.success) throw new ApiError("invalid-body");
  return result.data;
}
