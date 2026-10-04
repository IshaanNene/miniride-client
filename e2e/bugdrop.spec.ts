import { expect, test } from "@playwright/test";

const BUGDROP = process.env.E2E_BUGDROP_URL ?? "http://localhost:8200";

test("report a bug with an attached image", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Where to?" })).toBeVisible();
  await page.getByTestId("bugdrop-button").click();
  await page.getByTestId("bugdrop-description").fill("my screen is blank");
  await page.getByTestId("bugdrop-attach").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByTestId("bugdrop-submit").click();
  const done = page.getByTestId("bugdrop-done");
  await expect(done).toContainText(/Report BD-\d+ sent/, { timeout: 20_000 });
  const id = (await done.textContent())!.match(/BD-\d+/)![0];
  const report = await (await request.get(`${BUGDROP}/api/reports/${id}`)).json();
  expect(report.description).toBe("my screen is blank");
  expect(report.files.map((f: { kind: string }) => f.kind)).toEqual(["app_screenshot", "user_attachment"]);
  expect(report.log_counts.ui_state).toBeGreaterThan(0);
  expect(report.log_counts.network).toBeGreaterThan(0);
});
