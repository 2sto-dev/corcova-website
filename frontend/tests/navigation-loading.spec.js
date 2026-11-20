import { test, expect } from '@playwright/test';

test('internal menu navigation keeps the app mounted and supports history', async ({ page }) => {
  const apiRequests = [];
  page.on('request', request => {
    if (/\/sites\/corcova\/(?:navigation\/)?$/.test(new URL(request.url()).pathname)) apiRequests.push(request.url());
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  await expect(nav.getByRole('button', { name: 'Despre', exact: true })).toBeVisible();
  await page.evaluate(() => { window.__appNavigationSentinel = 'mounted'; });

  await nav.getByRole('button', { name: 'Despre', exact: true }).hover();
  await nav.getByRole('link', { name: 'Geografia' }).click();
  await expect(page).toHaveURL(/\/geografia$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Geografia');
  expect(await page.evaluate(() => window.__appNavigationSentinel)).toBe('mounted');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveTitle(/Geografia/);

  await nav.getByRole('button', { name: 'Despre', exact: true }).hover();
  await nav.getByRole('link', { name: 'Istoria' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Istoria');
  expect(await page.evaluate(() => window.__appNavigationSentinel)).toBe('mounted');

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Geografia');
  await expect(page.locator('#main-content')).toBeFocused();
  expect(apiRequests.filter(url => url.endsWith('/navigation/'))).toHaveLength(1);
  expect(apiRequests.filter(url => url.endsWith('/corcova/'))).toHaveLength(1);
});

test('a slow page shows a stable loading state while the header remains visible', async ({ page }) => {
  await page.route('**/api/v1/sites/corcova/pages/istoria/', async route => {
    await new Promise(resolve => setTimeout(resolve, 650));
    await route.continue();
  });
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  await nav.getByRole('button', { name: 'Meniu', exact: true }).click();
  await nav.getByRole('button', { name: 'Despre', exact: true }).click();
  await nav.getByRole('link', { name: 'Istoria' }).click();

  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Se încarcă informațiile paginii' })).toBeVisible();
  await expect(page.locator('.masthead-brand')).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Acasă', exact: true })).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Istoria');
});
