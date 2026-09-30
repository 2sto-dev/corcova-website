import { test, expect } from '@playwright/test';

test('homepage "Vezi toate" button navigates to anunturi and displays all announcements', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.setViewportSize({ width: 1400, height: 950 });
  await page.goto('/');

  // Find the "Vezi toate" button in the news section
  const newsSection = page.locator('.news-layout');
  await expect(newsSection).toBeVisible();

  const seeAllBtn = newsSection.locator('a.text-link:has-text("Vezi toate")');
  await expect(seeAllBtn).toBeVisible();
  await seeAllBtn.click();

  // URL should now be #/anunturi
  await page.waitForURL(/#\/anunturi/);

  // The announcements view should be displayed and NOT empty
  const announcementsView = page.locator('.announcements-view');
  await expect(announcementsView).toBeVisible();

  // Heading check
  await expect(announcementsView.locator('h1')).toContainText('Anunțuri Publice');

  // Verify tabs
  const allTab = announcementsView.locator('.announcements-tab-btn:has-text("Toate anunțurile")');
  await expect(allTab).toBeVisible();

  // Verify cards are rendered
  const cards = announcementsView.locator('.announcement-card');
  await expect(cards.first()).toBeVisible({ timeout: 10000 });
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(15);

  // Check that "Nu există documente publicate" is NOT present
  await expect(page.locator('text=Nu există documente publicate în această secțiune')).toBeHidden();

  // Test live search filter
  const searchInput = announcementsView.locator('input[aria-label="Caută în anunțuri"]');
  await searchInput.fill('ITL');
  await page.waitForTimeout(300);

  const itlCards = announcementsView.locator('.announcement-card');
  const itlCount = await itlCards.count();
  expect(itlCount).toBeGreaterThanOrEqual(1);
  await expect(itlCards.first()).toContainText('itl', { ignoreCase: true });

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(300);

  // Test category tab filter (Concursuri)
  const concursTab = announcementsView.locator('.announcements-tab-btn:has-text("Concursuri")');
  await concursTab.click();
  await page.waitForTimeout(300);

  const concursCards = announcementsView.locator('.announcement-card');
  expect(await concursCards.count()).toBeGreaterThanOrEqual(1);

  // Capture screenshot of the announcements page
  await page.screenshot({ path: 'anunturi_page.png', fullPage: false });

  expect(errors).toEqual([]);
});
