import { test, expect, _electron as electron, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';

async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-merchants-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

async function choose(page: Page, label: string, value: string) {
  const button = page.getByRole('button', { name: new RegExp(`^${label}:`) });
  await button.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  await button.click();
  await page
    .getByRole('listbox', { name: label, exact: true })
    .locator(`[data-value="${value}"]`)
    .click();
}
test('F09d: alternância, dica, filtro/remoção, contexto, expansão, moeda e tamanho dos cards', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-merchants-ui-'));
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
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    const composition = page.locator('fd-invoice-categories');
    const list = page.locator('fd-invoice-purchases');
    const rows = list.locator('.purchase-row');
    const main = page.locator('.workspace');
    const merchant = (id: string) => composition.locator(`[data-merchant="${id}"]`);
    const baseline = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getInvoiceCardsLayout(),
      general: await window.finDesk!.storage.getCardLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    await expect(
      composition.getByRole('button', { name: 'Categorias', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await composition.getByRole('button', { name: 'Estabelecimentos', exact: true }).click();
    await expect(composition.locator('[data-merchant]')).toHaveCount(2);
    const width = (await merchant('loja').boundingBox())!.width;
    await merchant('loja').hover();
    await expect(composition.getByRole('tooltip')).toContainText('Loja');
    await expect(composition.getByRole('tooltip')).toContainText('R$ 233,34');
    await expect(composition.getByRole('tooltip')).toContainText('82,4%');
    await composition.screenshot({ path: 'test-results/f09d-merchants-tip.png' });
    expect((await merchant('loja').boundingBox())!.width).toBeCloseTo(width, 1);
    const scroll = await main.evaluate((node) => node.scrollTop);
    await merchant('loja').click();
    await expect(rows).toHaveCount(3);
    await expect(list.locator('.known-total')).toContainText('Subtotal filtrado');
    await expect(list.locator('.known-total strong')).toHaveText('R$ 183,34');
    await expect(merchant('loja')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.invoice-amount')).toHaveText('R$ 233,24');
    expect(await main.evaluate((node) => node.scrollTop)).toBe(scroll);
    await page.mouse.move(0, 0);
    await list.locator('h2').evaluate((node) => node.focus({ preventScroll: true }));
    await page.locator('.card-page').screenshot({ path: 'test-results/f09d-merchants-wide.png' });
    await list.locator('[data-purchase-id="compra-6x"] .purchase-toggle').click();
    await expect(list.locator('.purchase-details')).toHaveCount(1);
    await choose(page, 'Moeda', 'USD');
    await expect(list.locator('.known-total strong')).toHaveText('US$ 36,67');
    await expect(list.locator('.purchase-details')).toHaveCount(1);
    await merchant('loja').hover();
    await expect(composition.getByRole('tooltip')).toContainText('Original: R$ 233,34');
    await list.locator('.purchase-toggle').first().focus();
    await page.keyboard.press('Escape');
    await expect(list.locator('.purchase-details')).toHaveCount(0);
    await expect(list.locator('.merchant-filter')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(rows).toHaveCount(4);
    await expect(list.locator('h2')).toBeFocused();
    await choose(page, 'Moeda', 'original');
    await merchant('loja').focus();
    await page.keyboard.press('End');
    await expect(merchant('netflix')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(1);
    await expect(list.locator('.known-total strong')).toHaveText('R$ 49,90');
    await list.getByRole('button', { name: 'Remover filtro de estabelecimento: Netflix' }).click();
    await expect(rows).toHaveCount(4);
    await expect(list.locator('h2')).toBeFocused();
    await merchant('loja').click();
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(list.locator('.merchant-filter')).toHaveCount(0);
    await expect(rows).toHaveCount(2);
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    await expect(rows).toHaveCount(4);
    await merchant('loja').click();
    await page.locator('[data-wallet-id="card-demo-extra"]').click({ position: { x: 70, y: 20 } });
    await expect(list.locator('.merchant-filter')).toHaveCount(0);
    await expect(rows).toHaveCount(1);
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(composition).toContainText('Nenhum item conhecido nesta fatura');
    await page.locator('[data-wallet-id="card-demo"]').click({ position: { x: 70, y: 20 } });
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-nov');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(900, 920));
    await composition.scrollIntoViewIfNeeded();
    await merchant('loja').click();
    await composition.screenshot({ path: 'test-results/f09d-merchants-composition-narrow.png' });
    await expect(rows).toHaveCount(3);
    for (const item of [composition, list, main])
      expect(await item.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await list.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f09d-merchants-narrow.png' });
    await composition.getByRole('button', { name: 'Categorias', exact: true }).click();
    await expect(composition.locator('[data-category]')).toHaveCount(2);
    await list.locator('.merchant-filter').click();
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getInvoiceCardsLayout(),
      general: await window.finDesk!.storage.getCardLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    expect(after).toEqual({
      ...baseline,
      prefs: baseline.prefs.ok
        ? { ...baseline.prefs, value: { ...baseline.prefs.value, lastAccountId: 'demo-a' } }
        : baseline.prefs,
    });
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await clean(profile);
  }
});
