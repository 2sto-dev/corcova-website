import { test, expect } from '@playwright/test';

test.describe('Leadership & Administration Section', () => {
  test('renders 3-column executive & specialty administration section with 9 members', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/');

    const section = page.locator('.leadership-section');
    await expect(section).toBeVisible();

    // Verify Title & Subtitle
    await expect(section.getByText('ADMINISTRAȚIA LOCALĂ')).toBeVisible();
    await expect(section.getByRole('heading', { name: /Conducerea Executivă & Aparatul de Specialitate/i })).toBeVisible();
    await expect(section.getByText(/Reprezentanții aleși și corpul administrativ/i)).toBeVisible();

    // Verify Organigrama Button
    const organigramaBtn = section.locator('.organigrama-link');
    await expect(organigramaBtn).toBeVisible();
    await expect(organigramaBtn).toHaveAttribute('href', '/organigrama');

    // Verify all 9 cards
    const cards = section.locator('.leadership-card');
    await expect(cards).toHaveCount(9);

    // Mayor (Adam Durac)
    const mayorCard = cards.nth(0);
    await expect(mayorCard).toHaveClass(/is-mayor/);
    await expect(mayorCard.getByText('Adam DURAC')).toBeVisible();
    await expect(mayorCard.getByText('Primar')).toBeVisible();
    await expect(mayorCard.getByText('DEMNITAR ALES')).toBeVisible();
    await expect(mayorCard.getByText('Conducere Executivă')).toBeVisible();
    const mayorImg = mayorCard.locator('img.leadership-photo');
    await expect(mayorImg).toBeVisible();
    await expect(mayorImg).toHaveAttribute('src', '/dosare/imagini/design/frontpage/conducerea/1.jpg');

    // Viceprimar (Gheorghe Gologan)
    const viceCard = cards.nth(1);
    await expect(viceCard.locator('.leadership-monogram')).toHaveText('GG');
    await expect(viceCard.getByText('Gheorghe GOLOGAN')).toBeVisible();
    await expect(viceCard.getByText('Viceprimar')).toBeVisible();
    await expect(viceCard.getByText('DEMNITAR ALES')).toBeVisible();
    await expect(viceCard.getByText('Protecția Mediului & Executiv')).toBeVisible();

    // Secretar General (George Marian Coarda)
    const secCard = cards.nth(2);
    await expect(secCard.locator('.leadership-monogram')).toHaveText('GC');
    await expect(secCard.getByText('George Marian COARDĂ')).toBeVisible();
    await expect(secCard.getByText('Secretar General')).toBeVisible();
    await expect(secCard.getByText('FUNCȚIONAR PUBLIC DE CONDUCERE')).toBeVisible();

    // Contabil Sef (Camelia Enescu)
    const contCard = cards.nth(3);
    await expect(contCard.locator('.leadership-monogram')).toHaveText('CE');
    await expect(contCard.getByText('Camelia ENESCU')).toBeVisible();
    await expect(contCard.getByText('Contabil Șef')).toBeVisible();
    await expect(contCard.getByText('COMPARTIMENT FINANCIAR')).toBeVisible();

    // Inspector (Emanoil Rosu)
    const inspCard = cards.nth(4);
    await expect(inspCard.locator('.leadership-monogram')).toHaveText('ER');
    await expect(inspCard.getByText('Emanoil ROȘU')).toBeVisible();
    await expect(inspCard.getByText('Inspector', { exact: true })).toBeVisible();
    await expect(inspCard.getByText('APARATUL DE SPECIALITATE')).toBeVisible();

    // Inspector Urbanism (Aurica Mindrut)
    const urbCard = cards.nth(5);
    await expect(urbCard.locator('.leadership-monogram')).toHaveText('AM');
    await expect(urbCard.getByText('Aurica MÎNDRUȚ')).toBeVisible();
    await expect(urbCard.getByText('Inspector Urbanism')).toBeVisible();

    // Ofiter Stare Civila (Emil Octavian Mogosanu)
    const civCard = cards.nth(6);
    await expect(civCard.locator('.leadership-monogram')).toHaveText('EM');
    await expect(civCard.getByText('Emil Octavian MOGOȘANU')).toBeVisible();
    await expect(civCard.getByText('Ofițer Stare Civilă')).toBeVisible();
    await expect(civCard.getByText('SERVICIUL PUBLIC COMUNITAR')).toBeVisible();

    // Responsabil SVSU (Constantin Barbulescu)
    const svsuCard = cards.nth(7);
    await expect(svsuCard.locator('.leadership-monogram')).toHaveText('CB');
    await expect(svsuCard.getByText('Constantin BĂRBULESCU')).toBeVisible();
    await expect(svsuCard.getByText('Responsabil SVSU')).toBeVisible();
    await expect(svsuCard.getByText('SITUAȚII DE URGENȚĂ')).toBeVisible();

    // Referenti Sociali (Ana Serban & Victoria Vlad)
    const socCard = cards.nth(8);
    await expect(socCard.locator('.leadership-monogram')).toHaveText('AS');
    await expect(socCard.getByText('Ana ȘERBAN & Victoria VLAD')).toBeVisible();
    await expect(socCard.getByText('Referenți Sociali')).toBeVisible();
    await expect(socCard.getByText('ASISTENȚĂ SOCIALĂ')).toBeVisible();

    // Capture clean screenshot of section
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await section.screenshot({ path: 'leadership_section.png' });
  });

  test('subpage /organigrama displays leadership team', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/organigrama');
    const leadershipSub = page.locator('.leadership-subpage-section');
    await expect(leadershipSub).toBeVisible();
    await expect(leadershipSub.locator('.leadership-card')).toHaveCount(9);
  });
});
