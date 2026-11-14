import { expect, test } from "vite-plus/test";
import { buildImage } from "./image";

const BASE = "https://i8.amplience.net/i/jpl/jd_752441_plc";

test("builds a srcset at 240, 360, 480 and 720 wide at the plate ratio, quality 75, auto format", () => {
  const image = buildImage(BASE);

  expect(image?.srcSet.split(", ")).toEqual([
    `${BASE}?w=240&h=306&qlt=75&fmt=auto 240w`,
    `${BASE}?w=360&h=459&qlt=75&fmt=auto 360w`,
    `${BASE}?w=480&h=612&qlt=75&fmt=auto 480w`,
    `${BASE}?w=720&h=918&qlt=75&fmt=auto 720w`,
  ]);
  expect(image?.src).toBe(`${BASE}?w=360&h=459&qlt=75&fmt=auto`);
  expect(image).toMatchObject({ width: 726, height: 926 });
});

test("replaces any size parameters already on the URL", () => {
  expect(buildImage(`${BASE}?w=726&h=926&qlt=92`)?.src).toBe(`${BASE}?w=360&h=459&qlt=75&fmt=auto`);
});

test("an unusable URL gives no image rather than a broken one", () => {
  expect(buildImage("not a url")).toBeUndefined();
});

test("a Shopify photo (Size) keeps its version and is resized by width only, so it keeps its shape", () => {
  const file =
    "https://cdn.shopify.com/s/files/1/0921/0911/1619/files/sz_778334_a_441b0d25-2f80-496f-86ff-e6419ac43475.jpg";
  const image = buildImage(`${file}?v=1792586592`);

  expect(image?.srcSet.split(", ")).toEqual([
    `${file}?v=1792586592&width=240 240w`,
    `${file}?v=1792586592&width=360 360w`,
    `${file}?v=1792586592&width=480 480w`,
    `${file}?v=1792586592&width=720 720w`,
  ]);
  expect(image?.src).toBe(`${file}?v=1792586592&width=360`);
  expect(buildImage(`${file}?v=1&width=2000&height=2000`)?.src).toBe(`${file}?v=1&width=360`);
});
