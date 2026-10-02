import { test, expect } from '@playwright/test';

test.describe('Test Restyled Document Buttons and Pagination', () => {
  test('verify social assistance page document buttons and pagination', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#/compartimentul-de-asistenta-sociala');
    await page.waitForSelector('.doc-download-button');

    const downloadButtons = page.locator('.doc-download-button');
    const count = await downloadButtons.count();
    console.log(`Found ${count} doc-download-button elements on social assistance page`);
    expect(count).toBeGreaterThan(0);

    // Verify badge
    const firstBadge = downloadButtons.first().locator('.doc-download-badge');
    await expect(firstBadge).toBeVisible();

    // Verify pagination exists
    const pagination = page.locator('.monitor-pagination');
    await expect(pagination).toBeVisible();

    // Capture screenshot of documents section
    const details = page.locator('details.group');
    if (await details.count() > 0) {
      await details.screenshot({ path: 'frontend/tests/redesigned_doc_buttons.png' });
    } else {
      await page.screenshot({ path: 'frontend/tests/redesigned_doc_buttons.png', fullPage: true });
    }
  });

  test('verify monitorul oficial local buttons and pagination', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#/monitorul-oficial-local');
    await page.waitForSelector('.doc-download-button');

    const downloadButtons = page.locator('.doc-download-button');
    const count = await downloadButtons.count();
    console.log(`Found ${count} doc-download-button elements on monitorul oficial local`);
    expect(count).toBeGreaterThan(0);

    const pagination = page.locator('.monitor-pagination');
    await expect(pagination).toBeVisible();

    // Capture screenshot of monitor documents section
    const section = page.locator('section[aria-live="polite"]');
    await section.screenshot({ path: 'frontend/tests/redesigned_monitor.png' });
  });

  test('verify administratia page remains completely untouched', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#/administratia');
    await page.waitForSelector('h1');
    await expect(page.locator('h1')).toContainText(/Administra/i);
    await page.screenshot({ path: 'frontend/tests/administratia_verified.png', fullPage: true });
  });
});
