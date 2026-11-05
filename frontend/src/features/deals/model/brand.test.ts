import { expect, test } from "vite-plus/test";
import { brandOf } from "./brand";

test.each([
  ["Nike NFL Las Vegas Raiders Helmet T-Shirt", "Nike"],
  ["adidas Originals Trefoil Hoodie", "adidas"],
  ["The North Face Mountain Jacket", "The North Face"],
  ["Under Armour Tech T-Shirt", "Under Armour"],
  ["New Balance 530", "New Balance"],
  ["  BOSS Kai Polo", "BOSS"],
  ["Newcastle Shirt", "Newcastle"],
])("brandOf(%j) is %j", (name, brand) => {
  expect(brandOf(name)).toBe(brand);
});
