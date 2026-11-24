import { test, expect, _electron as electron, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-evolution-')
  )
    throw new Error('Perfil temporário inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function choose(page: Page, label: string, value: string) {
  const trigger = page.getByRole('button', { name: new RegExp(`^${label}:`) });
  await trigger.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await trigger.click();
  await page
    .getByRole('listbox', { name: label, exact: true })
    .locator(`[data-value="${value}"]`)
    .click();
}
test('F09b: colunas ao lado/abaixo, valores, seleção sem rolar, teclado, contexto e ausência', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-evolution-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0]!;
      w.setSize(1800, 1000);
      w.show();
      w.focus();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    const chart = page.locator('fd-invoice-evolution'),
      summary = page.locator('.invoice-summary'),
      purchases = page.locator('fd-invoice-purchases'),
      main = page.locator('.workspace');
    const column = (id: string) => chart.locator(`[data-invoice-id="${id}"]`);
    await expect(chart.locator('.invoice-column')).toHaveCount(7);
    const state = () =>
      page.evaluate(async () => ({
        demo: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        layout: await window.finDesk!.storage.getCardLayout(),
        charts: await window.finDesk!.storage.getExpenseChartsLayout(),
        period: document.querySelector('fd-period-control')?.textContent,
      }));
    const before = await state();

    const chartBox = (await chart.boundingBox())!,
      invoiceBox = (await page.locator('.invoice-panel').boundingBox())!;
    expect(chartBox.x).toBeGreaterThan(invoiceBox.x + invoiceBox.width);
    expect(chartBox.y).toBeCloseTo(invoiceBox.y, 0);
    expect(invoiceBox.height).toBeLessThan(460);
    await expect(chart.locator('.column-fill.known')).toHaveCount(6);
    await expect(chart.locator('.selected-summary')).toContainText('R$ 283,24');
    await column('fat-out').hover();
    await expect(chart.getByRole('tooltip')).toContainText('R$ 260,00 · Confirmado');
    await expect(chart.getByRole('tooltip')).toContainText('Paga');
    await page.keyboard.press('Escape');
    await expect(chart.getByRole('tooltip')).toHaveCount(0);
    await main.evaluate((el) => {
      el.scrollTop = 100;
    });
    const scroll = await main.evaluate((el) => el.scrollTop);
    await column('fat-dez').click();
    await expect(summary).toHaveAttribute('data-invoice-id', 'fat-dez');
    await expect(purchases.locator('.purchase-row')).toHaveCount(2);
    await expect(column('fat-dez')).toHaveAttribute('aria-pressed', 'true');
    expect(await main.evaluate((el) => el.scrollTop)).toBe(scroll);
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    await expect(column('fat-nov')).toHaveAttribute('aria-pressed', 'true');
    await column('fat-nov').focus();
    const keyboardScroll = await main.evaluate((el) => el.scrollTop);
    await page.keyboard.press('End');
    await expect(column('fat-abr')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(summary).toHaveAttribute('data-invoice-id', 'fat-abr');
    expect(await main.evaluate((el) => el.scrollTop)).toBe(keyboardScroll);
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('data-invoice-id', 'fat-nov');
    await choose(page, 'Moeda', 'USD');
    await expect(chart.locator('.selected-summary strong')).toHaveText('US$ 56,65');
    await column('fat-nov').hover();
    await expect(chart.getByRole('tooltip')).toContainText('Original: R$ 283,24');
    await choose(page, 'Moeda', 'original');
    await page.mouse.move(0, 0);
    await main.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({ path: 'test-results/f09b-evolution-wide.png' });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(1380, 960));

    expect((await chart.boundingBox())!.y).toBeGreaterThan(
      (await page.locator('.invoice-panel').boundingBox())!.y +
        (await page.locator('.invoice-panel').boundingBox())!.height,
    );
    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f09b-evolution-below.png' });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(820, 920));

    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f09b-evolution-narrow.png' });
    for (const el of [page.locator('.card-page'), chart, main])
      expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await column('fat-nov').click();
    await purchases.locator('[data-purchase-id="compra-6x"] .purchase-toggle').click();
    await expect(purchases.locator('.purchase-details')).toHaveCount(1);
    await chart.scrollIntoViewIfNeeded();
    const beforeCollapse = await main.evaluate((el) => el.scrollTop);
    await column('fat-abr').click();
    await expect(purchases.locator('.purchase-details')).toHaveCount(0);
    expect(await main.evaluate((el) => el.scrollTop)).toBe(beforeCollapse);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setSize(1800, 1000),
    );
    await page.locator('[data-wallet-id="card-demo-extra"]').click({ position: { x: 70, y: 20 } });
    await expect(chart.locator('.invoice-column')).toHaveCount(2);
    await expect(chart.locator('.selected-summary')).toContainText('R$ 89,90');
    await column('fat-extra-dez').click();
    await expect(column('fat-extra-dez').locator('.column-fill')).toHaveCount(0);
    await expect(column('fat-extra-dez').locator('.column-missing')).toHaveText('—');
    await expect(chart.getByRole('tooltip')).toContainText('Sem itens ou total confirmado');
    await expect(purchases).toContainText('Nenhuma compra conhecida');
    await choose(page, 'Conta', 'demo-u');
    await expect(chart).toHaveCount(0);
    await choose(page, 'Conta', 'demo-a');
    const after = await state();
    expect(after).toEqual({
      ...before,
      prefs: before.prefs.ok
        ? { ...before.prefs, value: { ...before.prefs.value, lastAccountId: 'demo-a' } }
        : before.prefs,
    });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await clean(profile);
  }
});
