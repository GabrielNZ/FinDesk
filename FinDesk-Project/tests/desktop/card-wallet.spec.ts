import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';

async function choose(page: Page, label: string, value: string) {
  await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  await page
    .getByRole('listbox', { name: label, exact: true })
    .locator(`[data-value="${value}"]`)
    .click();
  await expect(page.getByRole('listbox', { name: label, exact: true })).toBeHidden();
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-wallet-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
test('F08a: carteira, faturas, conversão, gesto/teclado, contexto preservado, reabertura e janela estreita', async () => {
  test.setTimeout(150_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-wallet-ui-'));
  let app: ElectronApplication | undefined;
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  env['FINDESK_TEST_MODE'] = '1';
  const launch = async () => {
    app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.show();
      BrowserWindow.getAllWindows()[0]?.focus();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => {
      const prefs = await window.finDesk!.storage.getPreferences();
      if (!prefs.ok) throw new Error('Preferências temporárias indisponíveis.');
      const saved = await window.finDesk!.storage.savePreferences({
        ...prefs.value,
        cycleReferences: [
          { accountId: 'demo-a', salaryDay: null, salaryFrom: null, referenceCardId: 'card-demo' },
        ],
      });
      if (!saved.ok) throw new Error('Falha ao configurar referência temporária.');
    });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(page.locator('fd-card-page .bank-card')).toHaveCount(2);
    return page;
  };
  try {
    let page = await launch();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const baseline = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    const card = (id: string) => page.locator(`[data-wallet-id="${id}"]`);
    const summary = () => page.locator('.invoice-summary');
    const categories = () => page.locator('fd-invoice-categories');
    await expect(categories().locator('.category-segment')).toHaveCount(2);
    const casa = categories().locator('[data-category="casa"]');
    const entertainment = categories().locator('[data-category="entretenimento"]');
    const compositionTip = categories().getByRole('tooltip');
    const baseWidth = (await casa.boundingBox())!.width;
    const plotHeight = (await categories().boundingBox())!.height;
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await casa.hover();
    await expect(compositionTip).toContainText('Casa');
    await expect(compositionTip).toContainText('R$ 233,34');
    await expect(compositionTip).toContainText('82,4%');
    await expect
      .poll(async () => (await casa.locator('.segment-fill').boundingBox())!.height)
      .toBeGreaterThan(19);
    expect((await casa.boundingBox())!.width).toBeCloseTo(baseWidth, 1);
    expect((await categories().boundingBox())!.height).toBeCloseTo(plotHeight, 1);
    await entertainment.hover();
    await expect(compositionTip).toContainText('Entretenimento');
    await expect(compositionTip).toContainText('R$ 49,90');
    await expect(compositionTip).toContainText('17,6%');
    await page.mouse.move(0, 0);
    await casa.focus();
    await page.keyboard.press('Home');
    await expect(compositionTip).toContainText('Casa');
    await page.keyboard.press('End');
    await expect(compositionTip).toContainText('Entretenimento');
    await page.keyboard.press('Escape');
    await expect(compositionTip).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await casa.locator('.segment-fill').evaluate((el) => getComputedStyle(el).transitionProperty),
    ).toBe('none');
    await card('card-demo').focus();
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-nov');
    await expect(summary().locator('.invoice-amount')).toHaveText('R$ 283,24');
    await expect(summary()).toContainText('Valor conhecido');
    await expect(summary()).toContainText('Em formação');
    await expect(page.locator('.limit-values')).toHaveCount(0);
    await expect(page.locator('.limit-total')).toContainText('R$ 3.000,00');
    const used = page.locator('.limit-part.used'),
      available = page.locator('.limit-part.available');
    const tip = page.getByRole('tooltip');
    await used.hover();
    await expect(tip).toContainText('Utilizado');
    await expect(tip).toContainText('R$ 1.800,00');
    await available.hover();
    await expect(tip).toContainText('Disponível');
    await expect(tip).toContainText('R$ 1.200,00');
    const totalBox = (await page.locator('.limit-total').boundingBox())!,
      trackBox = (await page.locator('.limit-track').boundingBox())!;
    expect(totalBox.x).toBeGreaterThanOrEqual(trackBox.x + trackBox.width);
    const pointLimit = async (fraction: number) => {
      await page.mouse.move(
        trackBox.x + trackBox.width * fraction,
        trackBox.y + trackBox.height / 2,
      );
    };
    await pointLimit(0.25);
    await expect(tip).toContainText('Utilizado');
    const sharedTip = (await tip.elementHandle())!;
    const firstTipX = (await tip.boundingBox())!.x;
    await pointLimit(0.45);
    await expect
      .poll(async () => (await tip.boundingBox())!.x)
      .toBeCloseTo(firstTipX + trackBox.width * 0.2, 0);
    await pointLimit(0.59);
    await expect(tip).toContainText('Utilizado');
    await expect
      .poll(async () => (await tip.boundingBox())!.x)
      .toBeCloseTo(firstTipX + trackBox.width * 0.34, 0);
    const beforeBoundary = (await tip.boundingBox())!.x;
    await pointLimit(0.61);
    await expect(tip).toContainText('Disponível');
    expect((await tip.boundingBox())!.x - beforeBoundary).toBeCloseTo(trackBox.width * 0.02, 0);
    await page.screenshot({ path: 'test-results/f08a-limit-continuous.png' });
    await pointLimit(0.4);
    await expect(tip).toContainText('Utilizado');
    const cursor = (await page.locator('.limit-cursor').boundingBox())!;
    expect(cursor.x + cursor.width / 2).toBeCloseTo(trackBox.x + trackBox.width * 0.4, 0);
    const beforeClick = (await tip.boundingBox())!.x;
    await page.mouse.down();
    await page.mouse.up();
    await expect.poll(async () => (await tip.boundingBox())!.x).toBeCloseTo(beforeClick, 0);
    await page.keyboard.press('Tab');
    await expect(available).toBeFocused();
    await expect(tip).toContainText('Disponível');
    await pointLimit(0.41);
    await expect(tip).toContainText('Utilizado');
    expect(
      await sharedTip.evaluate((node) => node === document.querySelector('.limit-tooltip')),
    ).toBe(true);
    await sharedTip.dispose();
    await pointLimit(0.01);
    expect((await tip.boundingBox())!.x).toBeGreaterThanOrEqual(trackBox.x - 0.5);
    await pointLimit(0.99);
    await expect(tip).toContainText('Disponível');
    const lastTip = (await tip.boundingBox())!;
    expect(lastTip.x + lastTip.width).toBeLessThanOrEqual(trackBox.x + trackBox.width + 0.5);
    await page.keyboard.press('Escape');
    await pointLimit(0.98);
    await expect(tip).toHaveCount(0);
    await page.mouse.move(0, 0);
    await expect(tip).toHaveCount(0);
    await used.focus();
    await expect(tip).toContainText('R$ 1.800,00');
    await page.keyboard.press('Escape');
    await expect(tip).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(available).toBeFocused();
    await expect(tip).toContainText('R$ 1.200,00');
    await card('card-demo').focus();
    await expect(tip).toHaveCount(0);
    const resting = (await card('card-demo-extra').boundingBox())!;
    expect((await card('card-demo').boundingBox())!.y - resting.y).toBeCloseTo(58, 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await card('card-demo-extra').hover({ position: { x: 70, y: 20 } });
    await expect
      .poll(async () => (await card('card-demo-extra').boundingBox())!.y)
      .toBeCloseTo(resting.y - 24, 0);
    expect(
      await card('card-demo-extra').evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toContain('0.18s');
    await expect(card('card-demo')).toHaveAttribute('aria-pressed', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await card('card-demo-extra').evaluate((el) => getComputedStyle(el).transitionProperty),
    ).toBe('none');
    await page.mouse.move(0, 0);
    await expect(page.locator('.month-strip')).toHaveCount(0);
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    await expect(summary().locator('.invoice-amount')).toHaveText('R$ 260,00');
    await expect(summary()).toContainText('Paga');
    await expect(categories().locator('.category-segment')).toHaveCount(3);
    await expect(summary()).toContainText('Valor confirmado');
    await expect(page.getByRole('button', { name: 'Fatura anterior', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-nov');
    await card('card-demo-extra').click({ position: { x: 70, y: 35 } });
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-extra-nov');
    await expect(summary().locator('.invoice-amount')).toHaveText('R$ 89,90');
    await expect(categories().locator('.category-segment')).toHaveCount(1);
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-extra-dez');
    await expect(summary().locator('.invoice-amount')).toHaveText('Valor indisponível');
    await expect(summary()).toContainText('Futura');
    await expect(categories()).toContainText('Nenhum item conhecido nesta fatura');
    await card('card-demo-extra').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(card('card-demo')).toBeFocused();
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-nov');
    const extraBox = (await card('card-demo-extra').boundingBox())!;
    const start = { x: extraBox.x + 70, y: extraBox.y + 35 };
    await page.mouse.move(start.x, start.y);
    const beforeDrag = (await card('card-demo-extra').boundingBox())!;
    await page.mouse.down();
    expect(await card('card-demo-extra').evaluate((el) => getComputedStyle(el).cursor)).toBe(
      'default',
    );
    await page.mouse.move(start.x + 10, start.y + 45, { steps: 5 });
    await expect(card('card-demo-extra')).toHaveClass(/dragging/);
    expect((await card('card-demo-extra').boundingBox())!.y).toBeCloseTo(beforeDrag.y + 45, 0);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(card('card-demo-extra')).not.toHaveClass(/dragging/);
    await expect(card('card-demo')).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x, start.y + 50, { steps: 5 });
    await page.mouse.up();
    await expect(card('card-demo-extra')).toHaveAttribute('aria-pressed', 'true');
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-extra-dez');
    await page.getByRole('link', { name: 'Movimentações', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-extra-dez');
    await card('card-demo').click({ position: { x: 70, y: 35 } });
    await choose(page, 'Moeda', 'USD');
    await expect(summary().locator('.invoice-amount')).toHaveText('US$ 56,65');
    await expect(summary().locator('.original-amount')).toHaveText('Original: R$ 283,24');
    await categories().locator('[data-category="casa"]').hover();
    await expect(compositionTip).toContainText('US$ 46,67');
    await expect(compositionTip).toContainText('Original: R$ 233,34');
    await expect(compositionTip).toContainText('82,4%');
    await page.locator('.limit-part.used').hover();
    await expect(tip).toContainText('US$ 360,00');
    await expect(page.locator('.limit-total')).toContainText('US$ 600,00');
    await expect(page.locator('fd-card-page .conversion-note')).toContainText('Cotação fictícia');
    await choose(page, 'Moeda', 'original');
    await choose(page, 'Conta', 'demo-u');
    await expect(page.locator('.bank-card')).toHaveCount(0);
    await expect(page.locator('.empty-wallet')).toContainText('Nenhum cartão nesta conta');
    await choose(page, 'Conta', 'all');
    await expect(page.locator('.bank-card')).toHaveCount(2);
    await choose(page, 'Conta', 'demo-a');
    await expect.poll(() => page.locator('fd-period-control').textContent()).toBe(baseline.period);
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    expect(after.demo).toEqual(baseline.demo);
    expect(after.general).toEqual(baseline.general);
    expect(after.charts).toEqual(baseline.charts);
    expect(after.period).toEqual(baseline.period);
    expect(after.prefs.ok && after.prefs.value.cycleReferences).toEqual(
      baseline.prefs.ok && baseline.prefs.value.cycleReferences,
    );
    await app!.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setSize(1380, 900);
    });
    await page.screenshot({ path: 'test-results/f08a-wallet-wide.png' });
    await categories().locator('[data-category="casa"]').hover();
    await page.screenshot({ path: 'test-results/f08a-invoice-categories.png' });
    await page.locator('.limit-part.used').hover();
    await page.screenshot({ path: 'test-results/f08a-limit-used.png' });
    await page.locator('.limit-part.available').hover();
    await page.screenshot({ path: 'test-results/f08a-limit-available.png' });
    await card('card-demo-extra').hover({ position: { x: 70, y: 20 } });
    await page.screenshot({ path: 'test-results/f08a-wallet-hover.png' });
    await page.mouse.move(0, 0);
    await app!.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setSize(820, 920);
    });
    await expect
      .poll(() =>
        page
          .locator('.card-page')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      )
      .toBe(1);
    expect(
      await page.locator('.card-page').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/f08a-wallet-narrow.png', fullPage: true });
    await page.locator('.invoice-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f08a-invoice-narrow.png' });
    expect(errors).toEqual([]);
    await app!.close();
    page = await launch();
    await expect(summary()).toHaveAttribute('data-invoice-id', 'fat-nov');
    const reopened = await page.evaluate(() => window.finDesk!.storage.getDemo());
    expect(reopened).toEqual(baseline.demo);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
