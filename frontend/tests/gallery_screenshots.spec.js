import { test, expect } from '@playwright/test';

test('homepage displays authentic Corcova photo showcase and community pillars', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // Verify hero photo showcase is visible and loaded
  const heroPhoto = page.locator('.hero-main-photo');
  await expect(heroPhoto).toBeVisible();

  // Verify thumbnail selector works
  const thumbs = page.locator('.hero-thumb-btn');
  await expect(thumbs).toHaveCount(4);
  await thumbs.nth(1).click();
  await expect(page.locator('.hero-photo-badge')).toContainText('TRADIȚIE VITICOLĂ');

  // Verify 4 community pillars
  const pillars = page.locator('.pillar-card');
  await expect(pillars).toHaveCount(4);
  await expect(pillars.nth(0)).toContainText('Administrație Publică');
  await expect(pillars.nth(1)).toContainText('Agricultură & Zootehnie');
  await expect(pillars.nth(2)).toContainText('Economie & Viticultură');
  await expect(pillars.nth(3)).toContainText('Infrastructură & Lucrări');

  // Verify strategic initiatives
  const strategic = page.locator('.strategic-card');
  await expect(strategic).toHaveCount(2);

  // Verify leadership team
  const leadership = page.locator('.leadership-card');
  await expect(leadership).toHaveCount(9);

  // Capture homepage screenshot
  await page.screenshot({ path: 'tests/homepage_with_images.png', fullPage: false });
});

test('subpage displays photo gallery with interactive lightbox modal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/geografia');

  // Verify gallery header and 5 image cards
  await expect(page.locator('.page-gallery-section')).toBeVisible();
  const cards = page.locator('.gallery-card');
  await expect(cards).toHaveCount(5);

  // Click first card to open lightbox
  await cards.first().click();
  const lightbox = page.locator('.gallery-lightbox-overlay');
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator('.lightbox-details h3')).toContainText('Localizarea în Județul Mehedinți');

  // Next image navigation in lightbox
  await page.locator('.lightbox-nav-btn.next').click();
  await expect(lightbox.locator('.lightbox-details h3')).toContainText('Vedere în Câmp');

  // Close with Escape
  await page.keyboard.press('Escape');
  await expect(lightbox).not.toBeVisible();

  // Capture subpage gallery screenshot
  await page.screenshot({ path: 'tests/geografia_gallery.png', fullPage: false });
});
