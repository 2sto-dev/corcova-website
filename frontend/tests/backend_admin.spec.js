import { test, expect } from '@playwright/test';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

loadEnvFile(fileURLToPath(new URL('../../backend/.env', import.meta.url)));
const adminUsername = process.env.DJANGO_ADMIN_USERNAME;
const adminPassword = process.env.DJANGO_ADMIN_PASSWORD;

test.describe('Django Backend & Admin Tests', () => {
  test('Django REST API health and site endpoints return valid JSON', async ({ request }) => {
    // Health check
    const healthRes = await request.get('http://127.0.0.1:8000/api/health/');
    expect(healthRes.ok()).toBeTruthy();
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe('ok');

    // Site endpoint
    const siteRes = await request.get('http://127.0.0.1:8000/api/v1/sites/corcova/');
    expect(siteRes.ok()).toBeTruthy();
    const siteJson = await siteRes.json();
    expect(siteJson.name).toContain('Corcova');
    expect(siteJson.slug).toBe('corcova');

    // Navigation endpoint
    const navRes = await request.get('http://127.0.0.1:8000/api/v1/sites/corcova/navigation/');
    expect(navRes.ok()).toBeTruthy();
    const navJson = await navRes.json();
    expect(navJson.items.length).toBeGreaterThan(5);

    // Monitor registers endpoint
    const regRes = await request.get('http://127.0.0.1:8000/api/v1/sites/corcova/monitor/registers/');
    expect(regRes.ok()).toBeTruthy();
    const regJson = await regRes.json();
    expect(regJson.count).toBe(7);

    // Documents endpoint
    const docRes = await request.get('http://127.0.0.1:8000/api/v1/sites/corcova/documents/?page_size=5');
    expect(docRes.ok()).toBeTruthy();
    const docJson = await docRes.json();
    expect(docJson.count).toBe(185);
    expect(docJson.results[0].download_url).toContain('/download/');
  });

  test('Django Admin authentication and back-office management dashboard', async ({ page }) => {
    test.skip(!adminUsername || !adminPassword, 'Set DJANGO_ADMIN_USERNAME and DJANGO_ADMIN_PASSWORD in backend/.env');

    // Navigate to Django admin login via /admin/ redirect
    await page.goto('http://127.0.0.1:8000/admin/login/');
    await expect(page).toHaveURL(/.*\/gestionare-primarie\/login\//);
    await expect(page.locator('h1, #site-name')).toContainText('Administrare Primăria Corcova');

    // Log in with server-side credentials; never include them in the frontend bundle.
    await page.locator('input[name="username"]').fill(adminUsername);
    await page.locator('input[name="password"]').fill(adminPassword);
    await page.locator('input[type="submit"]').click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*\/gestionare-primarie\/$/);
    await expect(page.locator('#tab-messages-panel')).toBeVisible();

    // Switch to Sections tab
    await page.locator('#btn-tab-sections').click();
    await expect(page.locator('#content-main')).toBeVisible();

    // Verify presence of Civic Core, Documents and Local Monitor models
    await expect(page.locator('#content-main a[href="/gestionare-primarie/civic_core/page/"]').first()).toBeVisible();
    await expect(page.locator('#content-main a[href="/gestionare-primarie/documents/document/"]').first()).toBeVisible();
    await expect(page.locator('#content-main a[href="/gestionare-primarie/local_monitor/register/"]').first()).toBeVisible();

    // Check Pages list
    await page.locator('#content-main a[href="/gestionare-primarie/civic_core/page/"]').first().click();
    await expect(page).toHaveURL(/.*\/gestionare-primarie\/civic_core\/page\//);
    await expect(page.locator('#result_list')).toBeVisible();
    await expect(page.locator('#result_list tbody tr')).not.toHaveCount(0);

    // Check Documents list
    await page.goto('http://127.0.0.1:8000/gestionare-primarie/documents/document/');
    await expect(page.locator('#result_list')).toBeVisible();
    await expect(page.locator('#result_list tbody tr')).not.toHaveCount(0);

    // Check Local Monitor registers
    await page.goto('http://127.0.0.1:8000/gestionare-primarie/local_monitor/register/');
    await expect(page.locator('#result_list')).toBeVisible();
    const rows = page.locator('#result_list tbody tr');
    await expect(rows).toHaveCount(7);

    // Check Contact Messages
    await page.goto('http://127.0.0.1:8000/gestionare-primarie/civic_core/contactmessage/');
    await expect(page.locator('#result_list')).toBeVisible();
  });
});

