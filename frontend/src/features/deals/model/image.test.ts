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
