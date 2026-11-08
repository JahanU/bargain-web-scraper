import { dealsApi, expect, test } from "./test";

test("asks the API for Men first, then for Women once chosen", async ({ page }) => {
  const genders: Array<string | null> = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (dealsApi(url)) genders.push(url.searchParams.get("gender"));
  });

  await page.goto("/");
  await expect(page.getByText("81 deals")).toBeVisible();
  expect(genders[0]).toBe("Male");

  await page.getByRole("radio", { name: "Women" }).check();

  await expect.poll(() => genders).toContain("Female");
  await expect(page).toHaveURL(/[?&]gender=Female/);
});
