import { test, expect } from '@playwright/test';

test.describe('Verify Administratia & Homepage Leadership Section', () => {
  test('verify restored administratia page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#/administratia');
    await page.waitForSelector('h1');

    // Heading should be Administraţia
    await expect(page.locator('h1')).toContainText(/Administra/i);

    // Should NOT have the squished leadership subpage section
    const subpageLeadership = page.locator('.leadership-subpage-section');
    await expect(subpageLeadership).toHaveCount(0);

    // Take screenshot of restored administratia page
    await page.screenshot({ path: 'frontend/tests/administratia_restored.png', fullPage: true });
    console.log('Saved administratia_restored.png');
  });

  test('verify restored homepage leadership section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/');

    const section = page.locator('.leadership-section');
    await expect(section).toBeVisible();
    await expect(section.getByText('ADMINISTRAȚIA LOCALĂ')).toBeVisible();

    // Verify 9 cards
    const cards = section.locator('.leadership-card');
    await expect(cards).toHaveCount(9);

    // Take screenshot of leadership section
    await section.screenshot({ path: 'frontend/tests/leadership_restored.png' });
    console.log('Saved leadership_restored.png');
  });
});
