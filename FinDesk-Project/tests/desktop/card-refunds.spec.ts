import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function temporary() {
  return mkdtemp(join(tmpdir(), 'findesk-refunds-ui-'));
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-refunds-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function launch(profile: string) {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]!;
    window.setSize(1800, 1000);
    window.show();
    window.focus();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('link', { name: 'Finanças', exact: true }).click();
  await page.getByRole('link', { name: 'Cartão', exact: true }).click();
  return { app, page };
}

test('F09f: estorno observado, bruto/líquido, vínculo, filtro, expansão natural e reabertura', async () => {
  test.setTimeout(90_000);
  const profile = await temporary();
  let app: ElectronApplication | undefined;
  try {
    const initial = await launch(profile);
    app = initial.app;
    const page = initial.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const list = page.locator('fd-invoice-purchases');
    const panel = page.locator('.invoice-panel');
    await expect(panel.locator('.invoice-amount')).toHaveText('R$ 233,24');
    await expect(panel.locator('.invoice-refunds')).toContainText('Compras R$ 283,24');
    await expect(panel.locator('.invoice-refunds')).toContainText('Estornos −R$ 50,00');
    await expect(page.locator('fd-invoice-categories')).toContainText('Compras brutas');
    await expect(list.locator('.purchase-row')).toHaveCount(4);
    const before = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      layout: await window.finDesk!.storage.getInvoiceCardsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    const credit = list.locator('[data-refund-id="refund-loja-nov-demo"]');
    await expect(credit).toContainText('-R$ 50,00');
    await credit.locator('button').focus();
    await page.keyboard.press('Enter');
    await expect(list.locator('.purchase-details')).toContainText('Compra original');
    await expect(list.locator('.purchase-details')).toContainText('20/10/2026');
    await expect(list.locator('.purchase-details')).toContainText('28/10/2026');
    await expect(list.locator('.purchase-details')).toContainText('compra-6x');
    await expect(list.locator('.purchase-details')).toContainText('demo-statement');
    await expect(list.locator('.installment-table tbody tr')).toHaveCount(6);
    const card = page.locator('[data-card-id="invoice-purchases"]');
    await expect
      .poll(() =>
        card
          .locator('.card-content')
          .evaluate(
            (node) =>
              node.scrollHeight <= node.clientHeight + 1 &&
              getComputedStyle(node).overflowY === 'visible',
          ),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(credit.locator('button')).toBeFocused();
    const composition = page.locator('fd-invoice-categories');
    await composition.getByRole('button', { name: 'Estabelecimentos', exact: true }).click();
    await composition.locator('[data-merchant="loja"]').click();
    await expect(list.locator('.purchase-row')).toHaveCount(3);
    await expect(list.locator('.known-total strong')).toHaveText('R$ 183,34');
    await expect(panel.locator('.invoice-amount')).toHaveText('R$ 233,24');
    await list.locator('h2').focus();
    await page.keyboard.press('Escape');
    await expect(list.locator('.purchase-row')).toHaveCount(4);
    await page.locator('.workspace').evaluate((node) => {
      node.scrollTop = 0;
    });
    await page.screenshot({ path: 'test-results/f09f-refund-wide.png' });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(900, 920));
    await expect
      .poll(() => list.locator('.invoice-purchases').evaluate((node) => node.clientWidth))
      .toBeGreaterThan(500);
    await credit.locator('button').click();
    await expect(list.locator('.purchase-details')).toContainText('Compra original');
    await expect
      .poll(() =>
        card
          .locator('.card-content')
          .evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
      )
      .toBe(true);
    await card.screenshot({ path: 'test-results/f09f-refund-narrow.png' });
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      layout: await window.finDesk!.storage.getInvoiceCardsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    expect(after).toEqual(before);
    expect(errors).toEqual([]);
    await app.close();
    app = undefined;
    const reopened = await launch(profile);
    app = reopened.app;
    await expect(reopened.page.locator('.refund-row')).toHaveCount(1);
    await expect(reopened.page.locator('.invoice-amount')).toHaveText('R$ 233,24');
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F09f: crédito líquido fica abaixo do zero na evolução e no futuro, com detalhes locais', async () => {
  test.setTimeout(90_000);
  const profile = await temporary();
  let app: ElectronApplication | undefined;
  try {
    const first = await launch(profile);
    await first.app.close();
    const db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    try {
      const data = JSON.parse(
        db.prepare('SELECT payload FROM demo_state').get()!['payload'] as string,
      );
      data.facts.cardRefunds[0].amount.minorUnits = 30000;
      db.prepare('UPDATE demo_state SET payload=?').run(JSON.stringify(data));
    } finally {
      db.close();
    }
    const next = await launch(profile);
    app = next.app;
    const page = next.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.locator('.invoice-amount')).toHaveText('-R$ 16,76');
    await expect(page.locator('.invoice-panel')).toContainText('Crédito na fatura');
    const chart = page.locator('fd-invoice-evolution');
    const credit = chart.locator('[data-invoice-id="fat-nov"] .column-fill');
    await expect(credit).toHaveClass(/credit/);
    expect(
      await credit.evaluate((node) => {
        const bar = node.getBoundingClientRect();
        const plot = node.parentElement!.getBoundingClientRect();
        return Math.abs(bar.top - (plot.top + plot.height / 2)) < 2 && bar.height > 0;
      }),
    ).toBe(true);
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    const future = page.locator('fd-card-future');
    await expect(future.locator('.future-bars')).toHaveClass(/signed/);
    const nextCredit = future.locator('[data-future-invoice="fat-nov"]');
    await expect(nextCredit).toContainText('-R$ 16,76');
    await expect(nextCredit).toContainText('Crédito');
    expect(
      await nextCredit.locator('.future-fill').evaluate((node) => {
        const bar = node.getBoundingClientRect();
        const track = node.parentElement!.getBoundingClientRect();
        return Math.abs(bar.top - (track.top + track.height / 2)) < 2 && bar.height > 0;
      }),
    ).toBe(true);
    await nextCredit.click();
    await expect(future.locator('.future-detail')).toContainText('Estorno');
    await expect(future.locator('.future-detail')).toContainText('-R$ 300,00');
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-out');
    await future.screenshot({ path: 'test-results/f09f-credit-future.png' });
    await chart.screenshot({ path: 'test-results/f09f-credit-evolution.png' });
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
