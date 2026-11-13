import type { WireDeal } from "@/features/deals";

let next = 0;

/** A valid deal as the API sends it; override what the test cares about. */
export function makeDeal(overrides: Partial<WireDeal> = {}): WireDeal {
  next += 1;
  return {
    name: `Nike Test Tee ${next}`,
    wasPrice: 40,
    nowPrice: 20,
    discount: 50,
    url: `https://www.jdsports.co.uk/product/test-${next}/${100000 + next}/`,
    imageUrl: `https://i8.amplience.net/i/jpl/jd_${next}_plc`,
    sizes: ["S", "M"],
    timestamp: 1_700_000_000_000,
    gender: "Male",
    brand: "Nike",
    category: "Clothes",
    store: "jd",
    ...overrides,
  };
}
