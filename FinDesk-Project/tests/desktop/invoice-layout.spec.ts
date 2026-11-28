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
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-invoice-layout-ui-')
  )
    throw Error('Perfil inválido');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function saved(page: Page) {
  const r = await page.evaluate(() => window.finDesk!.storage.getInvoiceCardsLayout());
  return r.ok ? r.value : null;
}
test('D164/D165: cards do cartão movem, redimensionam, preservam instância/fatos, reabrem e restauram isolados', async () => {
  test.setTimeout(150_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-invoice-layout-ui-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [k, v] of Object.entries(process.env))
    if (v !== undefined && k !== 'ELECTRON_RUN_AS_NODE') env[k] = v;
  let app: ElectronApplication | undefined;
  const launch = async () => {
    app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0]!;
      w.setSize(1800, 1000);
      w.show();
      w.focus();
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Cartão', exact: true }).click();
    await expect(page.locator('fd-card-page .card-item')).toHaveCount(5);
    return page;
  };
  try {
    let page = await launch();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const card = (id: string) => page.locator(`fd-card-page [data-card-id="${id}"]`);
    const baseline = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      analysis: await window.finDesk!.storage.getExpenseAnalysisLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
    }));
    expect((await card('invoice').boundingBox())!.height).toBeCloseTo(
      (await card('invoice-evolution').boundingBox())!.height,
      0,
    );
    await expect(page.locator('.invoice-panel')).not.toContainText(
      'Itens já conhecidos. O valor final ainda não foi confirmado.',
    );
    await expect(page.locator('.invoice-panel')).not.toContainText('Valor confirmado');
    await expect(page.locator('.invoice-status')).toHaveText('Em formação');
    const sameChart = await page.locator('fd-invoice-evolution').elementHandle();
    await page.screenshot({ path: 'test-results/f09b-layout-default.png' });
    const source = (await card('invoice').boundingBox())!,
      target = (await card('invoice-evolution').boundingBox())!;
    await page.mouse.move(source.x + 40, source.y + 28);
    await page.mouse.down();
    await page.mouse.move(target.x + 120, target.y + 80, { steps: 10 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'swap');
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.cards.map((c) => c.id))
      .toEqual(['wallet', 'invoice-evolution', 'invoice', 'invoice-purchases', 'invoice-future']);
    expect(
      await sameChart!.evaluate((node) => node === document.querySelector('fd-invoice-evolution')),
    ).toBe(true);
    await expect(page.locator('html')).not.toHaveClass(/fd-card-dragging/);
    const beforePlot = (await page.locator('.column-plot').first().boundingBox())!.height;
    const resize = page.locator('[data-resize-id="invoice-evolution"]');
    await resize.scrollIntoViewIfNeeded();
    const handle = (await resize.boundingBox())!;
    await page.mouse.move(handle.x + handle.width - 2, handle.y + handle.height - 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width + 25, handle.y + handle.height + 88, {
      steps: 12,
    });
    await page.mouse.up();
    await expect
      .poll(
        async () => (await saved(page))?.cards.find((c) => c.id === 'invoice-evolution')?.rows ?? 0,
      )
      .toBeGreaterThan(5.2);
    expect((await page.locator('.column-plot').first().boundingBox())!.height).toBeGreaterThan(
      beforePlot + 30,
    );
    await page.locator('fd-invoice-evolution [data-invoice-id="fat-dez"]').click();
    await expect(page.locator('.invoice-summary')).toHaveAttribute('data-invoice-id', 'fat-dez');
    await card('invoice-purchases').locator('.card-shell').focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expect
      .poll(async () => (await saved(page))?.cards.find((c) => c.id === 'invoice-purchases')?.rows)
      .toBe(4.75);
    await card('invoice').locator('.card-shell').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect
      .poll(async () => (await saved(page))?.cards.find((c) => c.id === 'invoice')?.columns)
      .toBe(3.926);
    const custom = await saved(page);
    await card('invoice-evolution').locator('.card-shell').focus();
    await page.keyboard.press('Enter');
    await expect(card('invoice-evolution')).toHaveClass(/focused-card/);
    await page.keyboard.press('Escape');
    await expect(card('invoice-evolution')).not.toHaveClass(/focused-card/);
    expect(await saved(page)).toEqual(custom);
    const cancel = (await card('invoice').boundingBox())!;
    await card('invoice').scrollIntoViewIfNeeded();
    const cancelBox = (await card('invoice').boundingBox())!;
    await page.mouse.move(cancelBox.x + 30, cancelBox.y + 25);
    await page.mouse.down();
    await page.mouse.move(cancel.x + 80, cancelBox.y + 80, { steps: 5 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(await saved(page)).toEqual(custom);
    await page.screenshot({ path: 'test-results/f09b-layout-custom.png' });
    await app!.close();
    page = await launch();
    expect(await saved(page)).toEqual(custom);
    await app!.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(820, 920));
    await expect
      .poll(() => card('invoice').evaluate((el) => Math.round(el.getBoundingClientRect().width)))
      .toBe(
        await page.locator('fd-card-page .card-board').evaluate((el) => Math.round(el.clientWidth)),
      );
    expect(await saved(page)).toEqual(custom);
    await page.screenshot({ path: 'test-results/f09b-layout-narrow.png' });
    const restore = page.locator('fd-card-page [data-restore-layout]');
    await restore.click();
    await expect(restore).toHaveText('Restaurar layout?');
    await page.keyboard.press('Escape');
    expect(await saved(page)).toEqual(custom);
    await restore.click();
    await restore.click();
    await expect
      .poll(async () => (await saved(page))?.cards.map((c) => c.id))
      .toEqual(['wallet', 'invoice', 'invoice-evolution', 'invoice-purchases', 'invoice-future']);
    // D172: expansão é um mínimo visual; reorganização/resize não a gravam como altura preferida.
    await app!.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setSize(1800, 1000),
    );
    const list = page.locator('fd-invoice-purchases');
    const sizeBeforeExpansion = await saved(page);
    await list.locator('[data-purchase-id="compra-6x"] .purchase-toggle').click();
    await expect
      .poll(async () => (await card('invoice-purchases').boundingBox())!.height)
      .toBeGreaterThan(600);
    expect(await saved(page)).toEqual(sizeBeforeExpansion);
    await card('invoice-purchases').locator('.card-shell').focus();
    await page.keyboard.press('Home');
    await expect.poll(async () => (await saved(page))?.cards[0]?.id).toBe('invoice-purchases');
    await expect
      .poll(async () => {
        const top = (await card('invoice-purchases').boundingBox())!;
        return (await card('wallet').boundingBox())!.y >= top.y + top.height;
      })
      .toBe(true);
    const purchasesRows = (await saved(page))!.cards.find(
      (c) => c.id === 'invoice-purchases',
    )!.rows;
    const purchaseResize = page.locator('[data-resize-id="invoice-purchases"]');
    await purchaseResize.scrollIntoViewIfNeeded();
    const purchaseHandle = (await purchaseResize.boundingBox())!;
    await page.mouse.move(
      purchaseHandle.x + purchaseHandle.width - 2,
      purchaseHandle.y + purchaseHandle.height - 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      purchaseHandle.x + purchaseHandle.width - 82,
      purchaseHandle.y + purchaseHandle.height - 2,
      { steps: 10 },
    );
    await page.mouse.up();
    await expect
      .poll(
        async () =>
          (await saved(page))?.cards.find((c) => c.id === 'invoice-purchases')?.columns ?? 12,
      )
      .toBeLessThan(12);
    expect((await saved(page))!.cards.find((c) => c.id === 'invoice-purchases')!.rows).toBe(
      purchasesRows,
    );
    await list.locator('[data-purchase-id="compra-6x"] .purchase-toggle').click();
    await expect
      .poll(async () => (await card('invoice-purchases').boundingBox())!.height)
      .toBeLessThan(500);
    await restore.click();
    await restore.click();
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      analysis: await window.finDesk!.storage.getExpenseAnalysisLayout(),
      charts: await window.finDesk!.storage.getExpenseChartsLayout(),
    }));
    expect(after).toEqual(baseline);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
