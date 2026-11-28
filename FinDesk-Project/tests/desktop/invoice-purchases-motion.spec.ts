import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-purchase-motion-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
test('D173: altura desce/sobe progressivamente, card acompanha, saída termina e movimento reduzido é imediato', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-purchase-motion-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0]!;
      w.setSize(1800, 1000);
      w.show();
      w.focus();
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    const list = page.locator('fd-invoice-purchases');
    const card = page.locator('[data-card-id="invoice-purchases"]');
    const six = list.locator('[data-purchase-id="compra-6x"] .purchase-toggle');
    const three = list.locator('[data-purchase-id="compra-3x"] .purchase-toggle');
    const frames = () =>
      page.evaluate(
        () =>
          new Promise<void>((done) =>
            requestAnimationFrame(() => requestAnimationFrame(() => done())),
          ),
      );
    const state = () =>
      page.evaluate(async () => ({
        demo: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        layout: await window.finDesk!.storage.getInvoiceCardsLayout(),
      }));
    const before = await state();
    expect(await page.evaluate(() => CSS.supports('interpolate-size', 'allow-keywords'))).toBe(
      true,
    );
    await list.scrollIntoViewIfNeeded();
    const collapsed = (await card.boundingBox())!.height;
    await six.click();
    const reveal = list.locator('.purchase-reveal');
    const sample = async (time: number) =>
      reveal.evaluate(async (element, position) => {
        const animation = element.getAnimations()[0];
        if (!animation) throw new Error('Animação não encontrada.');
        animation.pause();
        animation.currentTime = position;
        await new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        );
        return {
          height: element.getBoundingClientRect().height,
          natural: element.querySelector('.purchase-details')!.getBoundingClientRect().height,
          card: element.closest('[data-card-id]')!.getBoundingClientRect().height,
        };
      }, time);
    const early = await sample(60),
      later = await sample(200);
    expect(early.height).toBeGreaterThan(0);
    expect(early.height).toBeLessThan(later.height);
    expect(later.height).toBeLessThan(later.natural);
    expect(early.card).toBeGreaterThan(collapsed);
    expect(later.card).toBeGreaterThan(early.card);
    await page.screenshot({ path: 'test-results/d173-purchase-opening.png' });
    await reveal.evaluate((element) =>
      element.getAnimations().forEach((animation) => animation.finish()),
    );
    await expect(list.locator('.purchase-enter')).toHaveCount(0);
    const full = (await card.boundingBox())!.height;
    await six.click();
    await expect(list.locator('.purchase-row-leave')).toHaveCount(1);
    await expect(list.locator('.purchase-row-leave')).toHaveAttribute('inert', '');
    await expect(list.locator('.purchase-row-leave')).toHaveAttribute('aria-hidden', 'true');
    const closingEarly = await sample(60),
      closingLater = await sample(200);
    expect(closingEarly.height).toBeGreaterThan(closingLater.height);
    expect(closingLater.height).toBeGreaterThan(0);
    expect(closingEarly.card).toBeLessThan(full);
    expect(closingLater.card).toBeLessThan(closingEarly.card);
    await page.screenshot({ path: 'test-results/d173-purchase-closing.png' });
    await reveal.evaluate((element) => {
      element.getAnimations().forEach((animation) => animation.finish());
      element
        .closest('.purchase-detail-row')
        ?.getAnimations()
        .forEach((animation) => animation.finish());
    });
    await expect(list.locator('.purchase-details')).toHaveCount(0);
    await expect.poll(async () => (await card.boundingBox())!.height).toBeCloseTo(collapsed, 0);
    // Trocas rápidas e reversão durante a abertura não deixam painéis/IDs pendurados.
    await six.evaluate((element) => (element as HTMLElement).click());
    await frames();
    await six.evaluate((element) => (element as HTMLElement).click());
    await frames();
    await three.evaluate((element) => (element as HTMLElement).click());
    await frames();
    await six.evaluate((element) => (element as HTMLElement).click());
    await expect(six).toHaveAttribute('aria-expanded', 'true');
    await expect(three).toHaveAttribute('aria-expanded', 'false');
    await expect(list.locator('.purchase-details')).toHaveCount(1);
    await expect(list.locator('.purchase-enter, .purchase-row-leave')).toHaveCount(0);
    expect(await list.locator('.purchase-details').evaluate((element) => element.id)).not.toBe('');
    await expect
      .poll(() =>
        card
          .locator('.card-content')
          .evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
      )
      .toBe(true);
    await six.click();
    await expect(list.locator('.purchase-details')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await three.click();
    await expect(list.locator('.purchase-details')).toHaveCount(1);
    expect(await reveal.evaluate((element) => element.getAnimations().length)).toBe(0);
    await list.locator('.purchase-details').focus();
    await page.keyboard.press('Escape');
    await expect(list.locator('.purchase-details')).toHaveCount(0);
    await expect(three).toBeFocused();
    expect(await state()).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await clean(profile);
  }
});
