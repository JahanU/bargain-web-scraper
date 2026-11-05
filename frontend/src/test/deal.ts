import type { Deal } from "@/features/deals";
import { normaliseDeal } from "@/features/deals/api/normalise";
import { makeDeal } from "./makeDeal";

/** A normalised Deal, for model tests. */
export const deal = (overrides: Parameters<typeof makeDeal>[0] = {}): Deal =>
  normaliseDeal(makeDeal(overrides));
