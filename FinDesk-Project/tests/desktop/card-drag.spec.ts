import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename, dirname, resolve } from 'node:path';

// Somente posições/dimensões do caso relatado; nenhum dado financeiro pessoal.
const layout = {
  version: 3 as const,
  area: 'finance-general' as const,
  priority: 'categories' as const,
  cards: [
    { id: 'categories' as const, columns: 4, rows: 4.563, align: 0.024297 },
    { id: 'evolution' as const, columns: 4, rows: 4.575, align: 0.785892 },
    { id: 'upcoming' as const, columns: 12, rows: 4 },
  ],
  rowStarts: ['categories', 'evolution', 'upcoming'] as const,
};
async function launch(profile: string) {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const args = ['.', `--user-data-dir=${profile}`];
  if (process.env['FINDESK_TEST_DEV'] === '1') args.push('--dev');
  const app = await electron.launch({ args, env });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]!;
    win.show();
    win.focus();
    win.setSize(1920, 900);
  });
  expect(
    (await page.evaluate((layout) => window.finDesk!.storage.saveCardLayout(layout), layout)).ok,
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Finanças', exact: true })
    .click();
  await expect
    .poll(async () => (await page.locator('.card-board').boundingBox())?.height ?? 0)
    .toBeGreaterThan(1000);
  return { app, page };
}
async function saved(page: Page) {
  return page.evaluate(async () => {
    const result = await window.finDesk!.storage.getCardLayout();
    return result.ok ? result.value : null;
  });
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-card-drag-')
  )
    throw new Error('Limpeza fora do teste recusada.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function frames(page: Page, count = 12) {
  return page.evaluate(
    (count) =>
      new Promise<{ scroll: number; height: number; top: number; floating: number }[]>(
        (resolve) => {
          const result: { scroll: number; height: number; top: number; floating: number }[] = [];
          const capture = () => {
            const box = document.querySelector('.card-board')!.getBoundingClientRect();
            result.push({
              scroll: document.querySelector('.workspace')!.scrollTop,
              height: box.height,
              top: box.top,
              floating: document.querySelectorAll('.card-item:popover-open').length,
            });
            if (result.length < count) requestAnimationFrame(capture);
            else resolve(result);
          };
          requestAnimationFrame(capture);
        },
      ),
    count,
  );
}

test('F03a: arraste para espaço vazio de outra linha não muda rolagem nem oscila a área durante a prévia', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-card-drag-'));
  let app: ElectronApplication | undefined;
  try {
    const opened = await launch(profile);
    app = opened.app;
    const page = opened.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.workspace')!.scrollTop = 400;
    });
    const before = (await frames(page, 2))[1]!;
    const source = (await page.locator('[data-card-id="categories"]').boundingBox())!;
    const target = (await page.locator('[data-card-id="evolution"]').boundingBox())!;
    const board = (await page.locator('.card-board').boundingBox())!;
    await page.mouse.move(source.x + 100, Math.max(80, source.y + 100));
    await page.mouse.down();
    await page.mouse.move(board.x + 80, target.y + 70, { steps: 20 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'insert');
    const samples = await frames(page);
    for (const sample of samples) {
      expect(sample.scroll).toBeCloseTo(before.scroll, 0);
      expect(sample.top).toBeCloseTo(before.top, 0);
      expect(sample.height).toBeGreaterThanOrEqual(before.height);
      expect(sample.floating).toBe(1);
    }
    // Inserir antes de Evolução altera a composição da linha, mesmo sem trocar a ordem dos IDs.
    const evolution = (await page.locator('[data-card-id="evolution"]').boundingBox())!;
    const slot = (await page.locator('.drop-slot').boundingBox())!;
    expect(evolution.y).toBeCloseTo(slot.y, 0);
    expect(slot.x).toBeLessThan(evolution.x);
    expect(await saved(page)).toEqual(layout);
    await page.screenshot({ path: 'test-results/cards-downward-stable.png', fullPage: true });
    await page.mouse.up();
    await expect.poll(async () => (await saved(page))?.rowStarts).toBe(undefined);
    await expect(page.locator('.card-item[popover], .drop-slot')).toHaveCount(0);
    expect((await page.locator('[data-card-id="categories"]').boundingBox())!.y).toBeCloseTo(
      slot.y,
      0,
    );
    expect((await page.locator('[data-card-id="evolution"]').boundingBox())!.y).toBeCloseTo(
      evolution.y,
      0,
    );
    expect((await page.locator('.card-board').boundingBox())!.height).toBeLessThan(before.height);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: segurar junto da borda continua rolando e permite levar Categorias até depois do último card', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-card-drag-'));
  let app: ElectronApplication | undefined;
  try {
    const opened = await launch(profile);
    app = opened.app;
    const page = opened.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const source = (await page.locator('[data-card-id="categories"]').boundingBox())!;
    const viewport = (await page.locator('.workspace').boundingBox())!;
    const board = (await page.locator('.card-board').boundingBox())!;
    await page.mouse.move(source.x + 100, source.y + 100);
    await page.mouse.down();
    await page.mouse.move(board.x + 120, viewport.y + viewport.height - 12, { steps: 12 });
    const samples = await frames(page, 30);
    expect(samples.at(-1)!.scroll - samples[0]!.scroll).toBeGreaterThan(40);
    for (let index = 1; index < samples.length; index++) {
      expect(samples[index]!.scroll).toBeGreaterThanOrEqual(samples[index - 1]!.scroll);
      expect(samples[index]!.height).toBeGreaterThanOrEqual(samples[index - 1]!.height);
      expect(samples[index]!.floating).toBe(1);
    }
    await page.mouse.move(board.x + 120, viewport.y + 12, { steps: 8 });
    const upward = await frames(page, 24);
    expect(upward[0]!.scroll - upward.at(-1)!.scroll).toBeGreaterThan(40);
    for (let index = 1; index < upward.length; index++)
      expect(upward[index]!.scroll).toBeLessThanOrEqual(upward[index - 1]!.scroll);
    await page.mouse.move(board.x + 120, viewport.y + viewport.height - 12, { steps: 8 });
    const downward = await frames(page, 20);
    const limit = await page
      .locator('.workspace')
      .evaluate((node) => node.scrollHeight - node.clientHeight);
    expect(downward.at(-1)!.scroll).toBeGreaterThanOrEqual(
      Math.min(downward[0]!.scroll + 32, limit - 1),
    );
    await page.evaluate(() => {
      const workspace = document.querySelector<HTMLElement>('.workspace')!;
      workspace.scrollTop = workspace.scrollHeight;
    });
    const currentBoard = (await page.locator('.card-board').boundingBox())!;
    await page.mouse.move(currentBoard.x + 120, currentBoard.y + board.height + 12, { steps: 8 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'insert');
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.cards.map((card) => card.id))
      .toEqual(['evolution', 'upcoming', 'categories']);
    await expect(page.locator('.card-item[popover], .drop-slot')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveClass(/fd-card-dragging/);
    const released = await frames(page, 8);
    for (const sample of released) expect(sample.scroll).toBe(released[0]!.scroll);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
