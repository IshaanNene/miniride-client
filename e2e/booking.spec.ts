import { expect, test } from "@playwright/test";

test("book a ride: search → price → request → driver assigned", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Where to?" })).toBeVisible();
  await page.getByTestId("pickup").selectOption({ label: "Ferry Building" });
  await page.getByTestId("dropoff").selectOption({ label: "Golden Gate Park" });
  await page.getByRole("button", { name: "See prices" }).click();
  await expect(page.getByTestId("fare")).toContainText("$");
  await page.getByRole("button", { name: "Request MiniRide" }).click();
  await expect(page).toHaveURL(/\/ride\//, { timeout: 30_000 });
  await expect(page.getByTestId("driver")).toBeVisible();
  await expect(page.getByTestId("ride-status")).toHaveText(/driver is on the way|arriving/);
  await expect(page.getByTestId("eta")).toHaveText(/min/);
  // The gateway pushes a "Driver assigned" notification for this session.
  await expect(page.getByTestId("unread-count")).toHaveText(/\d+/, { timeout: 15_000 });
});

test("opening the app from a push notification lands on the linked screen", async ({ page }) => {
  const push = Buffer.from(JSON.stringify({ deepLink: "/notifications" })).toString("base64url");
  await page.goto(`/?push=${push}`);
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(page).not.toHaveURL(/push=/);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
