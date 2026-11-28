import {
  test,
  expect,
  _electron as electron,
  type Page,
  type ElectronApplication,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-future-ui-')
  )
    throw Error('Perfil inválido');
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
test('F09e: legado preservado, futuro registrado, detalhes locais, moeda, filtro, ausência e layout v4', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-future-ui-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  let app: ElectronApplication | undefined;
  const errors: string[] = [];
  const launch = async () => {
    app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
    const page = await app.firstWindow();
    page.on('pageerror', (e) => errors.push(e.message));
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0]!;
      w.setSize(1800, 1000);
      w.show();
      w.focus();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    return page;
  };
  const bytes = () => {
    const db = new DatabaseSync(join(profile, 'storage', 'preferences.sqlite'), { readOnly: true });
    try {
      return db
        .prepare("SELECT payload FROM preferences WHERE key='layout.finance-invoices.v1'")
        .get()?.['payload'];
    } finally {
      db.close();
    }
  };
  try {
    let page = await launch();
    const legacy = {
      version: 3 as const,
      area: 'finance-invoices' as const,
      priority: 'invoice-evolution' as const,
      rowStarts: ['wallet' as const, 'invoice-purchases' as const],
      cards: [
        { id: 'wallet' as const, columns: 3.2, rows: 5.2 },
        { id: 'invoice' as const, columns: 3.676, rows: 6.1 },
        { id: 'invoice-evolution' as const, columns: 5.146, rows: 5.2, align: 1 },
        { id: 'invoice-purchases' as const, columns: 12, rows: 4.5 },
      ],
    };
    expect(
      await page.evaluate(
        async (layout) => (await window.finDesk!.storage.saveInvoiceCardsLayout(layout)).ok,
        legacy,
      ),
    ).toBe(true);
    const beforeBytes = bytes();
    const state = () =>
      page.evaluate(async () => ({
        demo: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        general: await window.finDesk!.storage.getCardLayout(),
        charts: await window.finDesk!.storage.getExpenseChartsLayout(),
      }));
    const before = await state();
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(page.locator('fd-card-page .card-item')).toHaveCount(5);
    for (const placement of legacy.cards) {
      await expect(page.locator(`[data-card-id="${placement.id}"]`)).toHaveAttribute(
        'data-rows',
        String(placement.rows),
      );
      await expect(page.locator(`[data-card-id="${placement.id}"]`)).toHaveAttribute(
        'data-columns',
        String(placement.columns),
      );
    }
    expect(bytes()).toBe(beforeBytes);
    const panel = page.locator('fd-card-future');
    const futureCard = page.locator('[data-card-id="invoice-future"]');
    const future = (id: string) => panel.locator(`[data-future-invoice="${id}"]`);
    const main = page.locator('.workspace');
    await expect(panel.locator('.future-total strong')).toHaveText('R$ 1.066,66');
    await expect(panel.locator('.future-invoice')).toHaveCount(5);
    await expect(panel.locator('footer')).toContainText('Ainda não projetadas');
    expect((await futureCard.boundingBox())!.y).toBeGreaterThanOrEqual(
      (await page.locator('[data-card-id="invoice-purchases"]').boundingBox())!.y +
        (await page.locator('[data-card-id="invoice-purchases"]').boundingBox())!.height,
    );
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: 'test-results/f09e-future-wide.png' });
    const height = (await futureCard.boundingBox())!.height;
    const scroll = await main.evaluate((node) => node.scrollTop);
    await future('fat-dez').click();
    await expect(panel.locator('[data-future-item]')).toHaveCount(2);
    await expect(panel.locator('.future-detail')).toContainText('Vencimento 10/12/2026');
    await expect(panel.locator('.future-detail')).toContainText('Parcelamento');
    await expect.poll(async () => (await futureCard.boundingBox())!.height).toBeGreaterThan(height);
    expect(await main.evaluate((node) => node.scrollTop)).toBe(scroll);
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-nov');
    await expect(page.locator('fd-invoice-purchases .purchase-row')).toHaveCount(3);
    expect(bytes()).toBe(beforeBytes);
    await choose(page, 'Moeda', 'USD');
    await expect(panel.locator('.future-total strong')).toHaveText('US$ 213,33');
    await expect(panel.locator('.future-total small')).toContainText('R$ 1.066,66');
    await expect(panel.locator('[data-future-item]')).toHaveCount(2);
    await choose(page, 'Moeda', 'original');
    await page
      .locator('fd-invoice-categories')
      .getByRole('button', { name: 'Estabelecimentos', exact: true })
      .click();
    await page.locator('fd-invoice-categories [data-merchant="loja"]').click();
    await expect(page.locator('fd-invoice-purchases .purchase-row')).toHaveCount(2);
    await expect(panel.locator('.future-total strong')).toHaveText('R$ 1.066,66');
    await expect(panel.locator('[data-future-item]')).toHaveCount(2);
    await page.getByRole('button', { name: 'Fatura anterior', exact: true }).click();
    await expect(panel.locator('.future-detail')).toHaveCount(0);
    await expect(panel.locator('.future-total strong')).toHaveText('R$ 1.349,90');
    await future('fat-nov').click();
    await expect(panel.locator('.future-detail')).toContainText('Recorrência registrada');
    await page.getByRole('button', { name: 'Próxima fatura', exact: true }).click();
    await page.locator('[data-wallet-id="card-demo-extra"]').click({ position: { x: 70, y: 20 } });
    await expect(panel.locator('.future-total strong')).toHaveText('Valor indisponível');
    await expect(panel.locator('.future-invoice')).toHaveCount(1);
    await future('fat-extra-dez').click();
    await expect(panel.locator('.future-detail')).toContainText('Nenhum item conhecido');
    await page.locator('[data-wallet-id="card-demo"]').click({ position: { x: 70, y: 20 } });
    await future('fat-dez').focus();
    await page.keyboard.press('End');
    await expect(future('fat-abr')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel.locator('[data-future-item]')).toHaveCount(1);
    await panel.locator('.future-detail').focus();
    await page.keyboard.press('Escape');
    await expect(panel.locator('.future-detail')).toHaveCount(0);
    await expect(future('fat-abr')).toBeFocused();
    await app!.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(900, 920));
    await panel.scrollIntoViewIfNeeded();
    await future('fat-dez').click();
    await panel.scrollIntoViewIfNeeded();
    for (const node of [panel, futureCard, main])
      expect(await node.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect
      .poll(() =>
        futureCard
          .locator('.card-content')
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      )
      .toBe(true);
    await page.screenshot({ path: 'test-results/f09e-future-narrow.png' });
    await futureCard.locator('.card-shell').focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expect
      .poll(async () => {
        const r = await page.evaluate(() => window.finDesk!.storage.getInvoiceCardsLayout());
        return r.ok ? r.value?.version : null;
      })
      .toBe(4);
    const saved = await page.evaluate(() => window.finDesk!.storage.getInvoiceCardsLayout());
    expect(saved.ok && saved.value?.cards.slice(0, 4)).toEqual(legacy.cards);
    const same = await panel.elementHandle();
    await page.keyboard.press('Home');
    await expect
      .poll(async () => {
        const r = await page.evaluate(() => window.finDesk!.storage.getInvoiceCardsLayout());
        return r.ok ? r.value?.cards[0]?.id : null;
      })
      .toBe('invoice-future');
    expect(await same!.evaluate((el) => el === document.querySelector('fd-card-future'))).toBe(
      true,
    );
    const after = await state();
    expect(after).toEqual({
      ...before,
      prefs: before.prefs.ok
        ? { ...before.prefs, value: { ...before.prefs.value, lastAccountId: 'demo-a' } }
        : before.prefs,
    });
    await app!.close();
    page = await launch();
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(page.locator('fd-card-page .card-item')).toHaveCount(5);
    const read = await page.evaluate(() => window.finDesk!.storage.getInvoiceCardsLayout());
    expect(read.ok && read.value?.cards[0]?.id).toBe('invoice-future');
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
