import { test, expect, _electron as electron, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';

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

async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-purchases-ui-')
  )
    throw new Error('Perfil temporário inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

test('F09a: compras, agenda exata, expansão por teclado, moeda, contexto e janela estreita', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-purchases-ui-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.show();
      BrowserWindow.getAllWindows()[0]?.focus();
      BrowserWindow.getAllWindows()[0]?.setSize(1380, 960);
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    const list = page.locator('fd-invoice-purchases');
    const rows = list.locator('.purchase-row');
    const details = list.locator('.purchase-details');
    const six = list.locator('[data-purchase-id="compra-6x"] .purchase-toggle');
    const three = list.locator('[data-purchase-id="compra-3x"] .purchase-toggle');
    await expect(rows).toHaveCount(3);
    await expect(list.locator('.known-total strong')).toHaveText('R$ 283,24');
    const baseline = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    await list.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f09a-purchases-wide.png' });
    await six.focus();
    await page.keyboard.press('Enter');
    await expect(six).toHaveAttribute('aria-expanded', 'true');
    await expect(details).toHaveCount(1);
    await expect(details.locator('.installment-table tbody tr')).toHaveCount(6);
    await expect(details.locator('.purchase-summary')).toContainText('R$ 1.200,00');
    await expect(details.locator('.purchase-summary')).toContainText('5 parcelas · R$ 1.000,00');
    await expect(details.locator('.current-invoice')).toHaveCount(1);
    await expect(details.locator('.current-invoice')).toContainText('1 de 6');
    await details.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f09a-schedule-wide.png' });
    await three.click();
    await expect(six).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toHaveCount(1);
    await expect(details.locator('.installment-table tbody tr')).toHaveCount(3);
    await expect(details.locator('.purchase-summary')).toContainText('2 parcelas · R$ 66,66');
    await expect(
      details.locator('.installment-table .amount-column').filter({ hasText: 'R$ 33,33' }),
    ).toHaveCount(2);
    await details.focus();
    const main = page.locator('.workspace');
    // Posição válida também após recolher, sem confundir o ajuste do fim da página com foco.
    await main.evaluate((el) => {
      el.scrollTop = 200;
    });
    const scroll = await main.evaluate((el) => el.scrollTop);
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(three).toBeFocused();
    expect(await main.evaluate((el) => el.scrollTop)).toBe(scroll);
    await page.keyboard.press('Space');
    await expect(details).toHaveCount(1);
    await choose(page, 'Moeda', 'USD');
    await expect(three).toHaveAttribute('aria-expanded', 'true');
    await expect(list.locator('.known-total strong')).toHaveText('US$ 56,65');
    await expect(list.locator('[data-purchase-id="compra-6x"] .amount-column')).toContainText(
      'US$ 40,00',
    );
    await expect(list.locator('[data-purchase-id="compra-6x"] .amount-column small')).toHaveText(
      'R$ 200,00',
    );
    await expect(details.locator('.purchase-summary')).toContainText('Original: R$ 100,00');
    await choose(page, 'Moeda', 'original');
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(details).toHaveCount(0);
    await expect(rows).toHaveCount(2);
    await expect(list.locator('.known-total strong')).toHaveText('R$ 233,33');
    await expect(rows.first().locator('.installment-column')).toContainText('2 de');
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    await expect(list.locator('.known-total strong')).toHaveText('R$ 260,00');
    await expect(rows).toHaveCount(3);
    await rows.first().locator('.purchase-toggle').click();
    await expect(details.locator('.invoice-state')).toHaveText('Paga');
    await expect(details).toContainText('Nenhuma parcela posterior');
    await page.locator('[data-wallet-id="card-demo-extra"]').click({ position: { x: 70, y: 20 } });
    await expect(details).toHaveCount(0);
    await expect(list.locator('.known-total strong')).toHaveText('R$ 89,90');
    await expect(rows).toHaveCount(1);
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(rows).toHaveCount(0);
    await expect(list).toContainText('Nenhuma compra conhecida nesta fatura');
    await expect(list.locator('.known-total strong')).toHaveText('Valor indisponível');
    await choose(page, 'Conta', 'demo-u');
    await expect(list).toHaveCount(0);
    await choose(page, 'Conta', 'demo-a');
    await page.locator('[data-wallet-id="card-demo"]').click({ position: { x: 70, y: 20 } });
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await expect(rows).toHaveCount(3);
    await six.click();
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setSize(820, 920);
    });
    await details.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/f09a-schedule-narrow.png' });
    for (const element of [
      page.locator('.card-page'),
      list,
      list.locator('.purchase-table-wrap'),
      details,
    ])
      expect(await element.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(details.locator('.installment-table tbody tr')).toHaveCount(6);
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    // A seleção explícita da conta continua lembrada pela preferência já existente (D31).
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
