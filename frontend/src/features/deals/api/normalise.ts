import { brandOf } from "../model/brand";
import type { Deal } from "../model/Deal";
import { buildImage } from "../model/image";
import { sortSizes } from "../model/sizes";
import type { WireDeal } from "./dealSchema";

export function normaliseDeal(wire: WireDeal): Deal {
  const sizes = sortSizes(wire.sizes ?? []);
  return {
    id: wire.url,
    url: wire.url,
    name: wire.name,
    brand: brandOf(wire.name),
    store: new URL(wire.url).hostname.replace(/^www\./, ""),
    nowPrice: wire.nowPrice,
    wasPrice: wire.wasPrice,
    discount: wire.discount,
    image: wire.imageUrl ? buildImage(wire.imageUrl) : undefined,
    sizes,
    sizeSet: new Set(sizes),
    searchText: wire.name.toLowerCase(),
    foundAt: wire.timestamp,
    gender: wire.gender,
  };
}

export function normaliseDeals(wire: readonly WireDeal[]): Deal[] {
  return wire.map(normaliseDeal);
}
