import { test, expect } from "@playwright/test";

test("login page renders credentials fields", async ({ page }) => {
  await page.goto("/login");
  // Check if title or login text is present
  await expect(page.locator("h1")).toContainText(/Sign In/i);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
