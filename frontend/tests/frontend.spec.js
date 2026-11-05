import { test, expect } from '@playwright/test';

test('desktop navigation supports branding, hover, keyboard, routes and search', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.setViewportSize({ width: 1900, height: 1080 });
  await page.goto('/');

  // Masthead branding
  await expect(page.locator('.masthead-lettering strong')).toContainText('PRIMĂRIA COMUNEI CORCOVA');
  await expect(page.locator('.masthead-county')).toContainText('MEHEDINȚI');
  await expect(page.locator('.masthead-contact')).toBeVisible();
  await expect(page.locator('.masthead-contact')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.masthead-contact')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.masthead-contact a[href="mailto:primaria.corcova@gmail.com"]')).toBeVisible();
  await expect(page.locator('.masthead-contact a[href="tel:0252383464"]')).toBeVisible();

  // Hero section
  await expect(page.getByRole('heading', { level: 1 })).toContainText('O comunitate unită');

  // Navigation menu
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  const despreBtn = nav.getByRole('button', { name: 'Despre', exact: true });

  // Hover menu
  await despreBtn.hover();
  await expect(nav.getByRole('link', { name: 'Geografia' })).toBeVisible();

  // Keyboard navigation
  await page.mouse.move(0, 0);
  await despreBtn.focus();
  await page.keyboard.press('Enter');
  await expect(despreBtn).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(despreBtn).toHaveAttribute('aria-expanded', 'false');
  await expect(despreBtn).toBeFocused();

  // Route to Geografia
  await despreBtn.hover();
  await nav.getByRole('link', { name: 'Geografia' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Geografia');

  // Check ExpandableArticle
  const expandBtn = page.getByRole('button', { name: 'Continuă lectura' });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await expect(page.getByRole('button', { name: 'Restrânge textul' })).toBeVisible();
    await page.getByRole('button', { name: 'Restrânge textul' }).click();
    await expect(page.getByRole('button', { name: 'Continuă lectura' })).toBeVisible();
  }

  // Search feature
  await page.getByRole('button', { name: 'Deschide căutarea' }).click();
  const searchInput = page.getByRole('textbox', { name: 'Caută pe site' });
  await searchInput.fill('geografia');
  await expect(page.getByRole('region', { name: 'Căutare pe site' }).getByRole('link').first()).toBeVisible();

  // Search not found
  await searchInput.fill('zzzzinexistent999');
  await expect(page.getByRole('status')).toContainText('Nu am găsit');

  // Escape closes search and focuses button
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Deschide căutarea' })).toBeFocused();

  expect(errors).toEqual([]);
});

test('mobile disclosure menu opens, closes after navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  const toggle = nav.getByRole('button', { name: 'Meniu', exact: true });

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
  await expect(page.locator('.masthead-contact')).toBeHidden();

  await expect(nav.getByRole('link', { name: 'Acasă', exact: true })).toBeHidden();
  await toggle.click();
  await expect(nav.getByRole('link', { name: 'Contact', exact: true })).toBeVisible();

  // Click Despre and sublink
  await nav.getByRole('button', { name: 'Despre', exact: true }).click();
  await nav.getByRole('link', { name: 'Istoria' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Istoria');
  expect(errors).toEqual([]);
});

test('hero image cards show their full titles on desktop and mobile', async ({ page }) => {
  for (const width of [1280, 412]) {
    await page.setViewportSize({ width, height: 915 });
    await page.goto('/');

    const cards = page.locator('.hero-thumb-btn');
    await expect(cards).toHaveCount(4);
    expect(await cards.evaluateAll(buttons => buttons.every(button => {
      const title = button.querySelector('span');
      return title &&
        title.scrollHeight <= title.clientHeight &&
        title.scrollWidth <= title.clientWidth &&
        button.scrollHeight <= button.clientHeight &&
        button.scrollWidth <= button.clientWidth;
    }))).toBe(true);
  }
});

test('Monitorul Oficial Local loads registers, search, and document links', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/monitorul-oficial-local');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Monitorul Oficial Local');

  // Check registers buttons
  await expect(page.getByRole('button', { name: 'Toate registrele' })).toBeVisible();

  // Filter search
  const searchInput = page.getByPlaceholder('Titlu, număr sau cuvânt-cheie');
  await searchInput.fill('HCL');
  await expect(page.locator('[aria-live="polite"] article').first()).toBeVisible({ timeout: 10000 });

  expect(errors).toEqual([]);
});

test('Contact page displays details and submits form successfully', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/sites/corcova/contact/', route => route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' }));

  await page.goto('/contact');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact');
  await expect(page.locator('.contact-location-main')).toContainText('Primăria Comunei Corcova');
  await expect(page.locator('.contact-location-details')).toContainText('primaria.corcova@gmail.com');

  // Fill form
  await page.locator('input[name="name"]').fill('Ion Popescu');
  await page.locator('input[name="email"]').fill('ion.popescu@exemplu.ro');
  await page.locator('input[name="subject"]').fill('Solicitare informații');
  await page.locator('textarea[name="message"]').fill('Bună ziua, aș dori să solicit informații privind eliberarea unui certificat.');

  await page.getByRole('button', { name: 'Trimite mesajul' }).click();
  await expect(page.locator('.message-preview')).toContainText('Mesajul a fost trimis');

  expect(errors).toEqual([]);
});

test('Contact keeps the message and reports an API failure honestly', async ({ page }) => {
  await page.route('**/api/v1/sites/corcova/contact/', route => route.abort());
  await page.goto('/contact');
  await page.locator('input[name="name"]').fill('Ion Popescu');
  await page.locator('input[name="email"]').fill('ion.popescu@exemplu.ro');
  await page.locator('input[name="subject"]').fill('Solicitare informații');
  await page.locator('textarea[name="message"]').fill('Un mesaj suficient de lung pentru verificarea formularului.');
  await page.getByRole('button', { name: 'Trimite mesajul' }).click();

  await expect(page.getByRole('alert')).toContainText('Mesajul nu a fost trimis');
  await expect(page.locator('textarea[name="message"]')).toHaveValue('Un mesaj suficient de lung pentru verificarea formularului.');
  await expect(page.getByText('Mesajul a fost trimis.')).toHaveCount(0);
});

test('Chatbot virtual assistant opens and answers citizen inquiries', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/sites/corcova/chatbot/', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      reply: '**Contact:** 0252 383 464 · primaria.corcova@gmail.com',
      sources: [{ title: 'Contact Primărie', url: '/contact' }],
    }),
  }));

  await page.goto('/');

  const bubbleBtn = page.locator('.chatbot-bubble-btn');
  await expect(bubbleBtn).toBeVisible();
  await bubbleBtn.click();

  const chatWindow = page.locator('.chatbot-window');
  await expect(chatWindow).toBeVisible();
  await expect(chatWindow).toContainText('Asistent Virtual');

  // Click a quick suggestion chip
  const suggestionBtn = page.getByRole('button', { name: /Care sunt datele de contact/i });
  await expect(suggestionBtn).toBeVisible();
  await suggestionBtn.click();

  // Check that bot responded with Corcova contact details
  await expect(page.locator('.chat-msg.bot').last()).toContainText('0252 383 464');
  await expect(page.locator('.chat-msg.bot').last()).toContainText('primaria.corcova@gmail.com');

  expect(errors).toEqual([]);
});
