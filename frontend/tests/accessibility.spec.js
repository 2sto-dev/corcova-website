import { test, expect } from '@playwright/test';

test('read aloud keeps utterances alive and reads the page in Romanian chunks', async ({ page }) => {
  await page.addInitScript(() => {
    window.__speechTest = { canceled: 0, utterances: [] };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class {
      constructor(text) {
        this.text = text;
        this.lang = '';
        this.rate = 1;
        this.volume = 1;
      }
    } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel() { window.__speechTest.canceled += 1; },
      getVoices() { return [{ lang: 'ro-RO', default: true, name: 'Romanian test voice' }]; },
      addEventListener() {},
      removeEventListener() {},
      speak(utterance) {
        window.__speechTest.utterances.push({
          text: utterance.text,
          lang: utterance.lang,
          rate: utterance.rate,
          volume: utterance.volume,
        });
        setTimeout(() => utterance.onend?.(), 0);
      },
    } });
  });

  await page.goto('/');
  await page.locator('.a11y-trigger').click();
  await page.getByRole('button', { name: 'Citește pagina' }).click();

  await expect(page.getByRole('status')).toContainText('s-a încheiat');
  const speech = await page.evaluate(() => window.__speechTest);
  expect(speech.utterances.length).toBeGreaterThan(1);
  expect(speech.utterances.every(item => item.lang === 'ro-RO' && item.rate === 0.95 && item.volume === 1)).toBe(true);
  expect(speech.utterances.map(item => item.text).join(' ')).toContain('O comunitate unită');
});
