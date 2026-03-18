import { expect, test } from "@playwright/test";

test("user can register, log in, and log out", async ({ page }) => {
  const email = `auth-e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Full name", { exact: true }).fill("E2E Test User");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Password123!");
  await page.getByRole("button", { name: /create account/i }).click();

  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(
    "Password123!",
  );
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/dashboard/);

  await page.getByRole("button", { name: /user menu/i }).click();
  await page.getByRole("menuitem", { name: /logout/i }).click();
  await expect(page).toHaveURL(/login/);
});
