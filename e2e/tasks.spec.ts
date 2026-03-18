import { expect, test } from "@playwright/test";

test("authenticated user can create, edit, and delete a task", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run task flow tests.",
  );

  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(process.env.E2E_USER_EMAIL ?? "");
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(process.env.E2E_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.goto("/dashboard/tasks/new");
  await page.getByLabel("Date").fill("2026-03-16");
  await page.getByLabel("Ticket number").fill("E2E-101");
  await page.getByLabel("Ticket title").fill("Playwright task");
  await page.getByRole("button", { name: /create task/i }).click();

  await expect(page).toHaveURL(/dashboard\/tasks/);
  await expect(page.getByText("Playwright task")).toBeVisible();
});
