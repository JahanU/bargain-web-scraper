// Brand is only inside the product name. Most brands are its first word; these are not.
const MULTI_WORD_BRANDS = ["The North Face", "Under Armour", "New Balance"];

export function brandOf(name: string): string {
  const lower = name.toLowerCase();
  const multiWord = MULTI_WORD_BRANDS.find((brand) => lower.startsWith(`${brand.toLowerCase()} `));
  return multiWord ?? name.trim().split(/\s+/)[0] ?? "";
}
