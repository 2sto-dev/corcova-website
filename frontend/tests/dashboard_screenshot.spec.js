import { test, expect } from '@playwright/test';

test('admin dashboard contact table layout is spacious and clean', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://127.0.0.1:8000/gestionare-primarie/login/');
  await page.locator('input[name="username"]').fill('primariacorcova');
  await page.locator('input[name="password"]').fill('Corcova2026!');
  await page.locator('input[type="submit"]').click();

  await expect(page).toHaveURL(/.*\/gestionare-primarie\//);
  await expect(page.locator('#tab-messages-panel')).toBeVisible();

  // Check table header and cells
  const senderTh = page.locator('#contact-dashboard table thead th.col-sender');
  await expect(senderTh).toBeVisible();
  const senderThBox = await senderTh.boundingBox();
  expect(senderThBox.width).toBeGreaterThan(120);

  // Check first sender cell
  const firstSenderTd = page.locator('#contact-dashboard table tbody td.col-sender').first();
  await expect(firstSenderTd).toBeVisible();
  const firstSenderBox = await firstSenderTd.boundingBox();
  expect(firstSenderBox.width).toBeGreaterThan(120);
  expect(firstSenderBox.height).toBeLessThan(60); // Not stretched vertically across 10 lines!

  // Take screenshot for visual inspection
  await page.locator('#contact-dashboard').screenshot({ path: 'tests/dashboard_contact_table.png' });
});
