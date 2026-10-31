import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function launch(profile: string): Promise<ElectronApplication> {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const args = ['.', `--user-data-dir=${profile}`];
  if (process.env['FINDESK_TEST_DEV'] === '1') args.push('--dev');
  const app = await electron.launch({ args, env });
  await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.show();
    BrowserWindow.getAllWindows()[0]?.focus();
  });
  return app;
}
async function open(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Finanças', exact: true })
    .click();
  await expect(page.locator('.card-item')).toHaveCount(3);
}
async function saved(page: Page) {
  const result = await page.evaluate(() => window.finDesk!.storage.getCardLayout());
  return result.ok ? result.value : null;
}
async function clean(profile: string): Promise<void> {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-cards-')
  )
    throw new Error('Limpeza fora do perfil de teste recusada.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

test('F03a: arraste, redimensionamento, foco com filtros e reabertura preservam layout', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    let page = await app.firstWindow();
    await open(page);
    const initialFacts = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await page.screenshot({ path: 'test-results/cards-default-wide.png', fullPage: true });
    const move = page.locator('[data-move-id="categories"]');
    await move.scrollIntoViewIfNeeded();
    const handle = await move.boundingBox();
    const target = await page.locator('[data-card-id="evolution"]').boundingBox();
    await page.mouse.move(handle!.x + handle!.width * 0.4, handle!.y + handle!.height * 0.55);
    expect(await move.evaluate((node) => getComputedStyle(node).cursor)).toBe('default');
    await page.mouse.down();
    expect(await move.evaluate((node) => getComputedStyle(node).cursor)).toBe('default');
    await page.mouse.move(target!.x + target!.width / 2, target!.y + 70, { steps: 12 });
    await expect(page.locator('html')).toHaveClass(/fd-card-dragging/);
    expect(await move.evaluate((node) => getComputedStyle(node).cursor)).toBe('grabbing');
    await page.mouse.up();
    await expect(page.locator('html')).not.toHaveClass(/fd-card-dragging/);
    expect(await move.evaluate((node) => getComputedStyle(node).cursor)).toBe('default');
    await expect
      .poll(async () => (await saved(page))?.cards.map((card) => card.id))
      .toEqual(['evolution', 'categories', 'upcoming']);
    const resize = page.locator('[data-resize-id="evolution"]');
    await resize.scrollIntoViewIfNeeded();
    const resizeBox = await resize.boundingBox();
    const boardBox = await page.locator('.card-board').boundingBox();
    await page.mouse.move(resizeBox!.x + 15, resizeBox!.y + 15);
    await page.mouse.down();
    await page.mouse.move(boardBox!.x + boardBox!.width + 30, resizeBox!.y + 80, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => (await saved(page))?.cards[0]?.columns).toBe(12);
    await expect.poll(async () => (await saved(page))?.cards[0]?.rows).toBeGreaterThan(4);
    const changed = await saved(page);
    const content = await page
      .locator('[data-card-id="evolution"] .prototype-content')
      .elementHandle();
    await page.locator('[data-focus-id="evolution"]').dblclick({ position: { x: 150, y: 100 } });
    await expect(page.locator('.card-item:visible')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Finanças.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Finanças.' })).toBeInViewport();
    const currency = page.getByRole('button', { name: /^Moeda:/ });
    await currency.click();
    await page.locator('[role="option"][data-value="USD"]').click();
    await expect(currency).toHaveAttribute('data-value', 'USD');
    await expect(currency).toBeInViewport();
    await page.screenshot({ path: 'test-results/cards-focus.png', fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.locator('.card-item:visible')).toHaveCount(3);
    await expect(page.locator('[data-focus-id="evolution"]')).toBeFocused();
    expect(
      await content!.evaluate(
        (node) => node === document.querySelector('[data-card-id="evolution"] .prototype-content'),
      ),
    ).toBe(true);
    expect(await saved(page)).toEqual(changed);
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initialFacts);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.workspace')!.scrollTop = 0;
    });
    await page.screenshot({ path: 'test-results/cards-wide.png', fullPage: true });
    await app.close();
    app = await launch(profile);
    page = await app.firstWindow();
    await open(page);
    expect(await saved(page)).toEqual(changed);
    await expect(page.locator('.card-item').first()).toHaveAttribute('data-card-id', 'evolution');
    await expect(page.getByRole('button', { name: /^Moeda:/ })).toHaveAttribute(
      'data-value',
      'USD',
    );
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: troca sobre outro card e empurra depois da borda, sem saltar ao abrir a camada de arraste', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    const seeded = await page.evaluate(() =>
      window.finDesk!.storage.saveCardLayout({
        version: 3,
        area: 'finance-general',
        priority: null,
        cards: [
          { id: 'categories', columns: 4, rows: 4.5 },
          { id: 'evolution', columns: 4, rows: 4.5 },
          { id: 'upcoming', columns: 4, rows: 4 },
        ],
      }),
    );
    expect(seeded.ok).toBe(true);
    await open(page);
    const card = page.locator('[data-card-id="categories"]');
    const middle = page.locator('[data-card-id="evolution"]');
    const target = page.locator('[data-card-id="upcoming"]');
    const source = (await card.boundingBox())!;
    const middleBox = (await middle.boundingBox())!;
    const targetBox = (await target.boundingBox())!;
    const initial = await saved(page);
    await page.evaluate(() => {
      const probe = window as unknown as {
        startFrames: { x: number; y: number; width: number; height: number; position: string }[];
      };
      probe.startFrames = [];
      const original = HTMLElement.prototype.showPopover;
      HTMLElement.prototype.showPopover = function (
        this: HTMLElement,
        ...args: Parameters<HTMLElement['showPopover']>
      ) {
        original.apply(this, args);
        if (!this.matches('.card-item')) return;
        const capture = () => {
          const rect = this.getBoundingClientRect();
          probe.startFrames.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            position: getComputedStyle(this).position,
          });
        };
        capture();
        requestAnimationFrame(capture);
      };
    });
    await page.mouse.move(source.x + 80, source.y + 80);
    await page.mouse.down();
    await page.mouse.move(source.x + 90, source.y + 90);
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { startFrames: unknown[] }).startFrames.length),
      )
      .toBe(2);
    const frames = await page.evaluate(
      () =>
        (
          window as unknown as {
            startFrames: {
              x: number;
              y: number;
              width: number;
              height: number;
              position: string;
            }[];
          }
        ).startFrames,
    );
    for (const frame of frames) {
      expect(frame.position).toBe('fixed');
      expect(frame.x).toBeCloseTo(source.x + 10, 0);
      expect(frame.y).toBeCloseTo(source.y + 10, 0);
      expect(frame.width).toBeCloseTo(source.width, 0);
      expect(frame.height).toBeCloseTo(source.height, 0);
    }
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 80, { steps: 12 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'swap');
    await expect.poll(async () => (await middle.boundingBox())!.x).toBeCloseTo(middleBox.x, 0);
    await expect.poll(async () => (await target.boundingBox())!.x).toBeCloseTo(source.x, 0);
    expect(await saved(page)).toEqual(initial);
    await page.screenshot({ path: 'test-results/cards-swap-preview.png', fullPage: true });
    await page.mouse.move(targetBox.x + targetBox.width + 10, targetBox.y + 80, { steps: 6 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'insert');
    await expect.poll(async () => (await middle.boundingBox())!.x).toBeCloseTo(source.x, 0);
    await expect.poll(async () => (await target.boundingBox())!.x).toBeCloseTo(middleBox.x, 0);
    expect(await saved(page)).toEqual(initial);
    await page.screenshot({ path: 'test-results/cards-push-preview.png', fullPage: true });
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 80, { steps: 6 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'swap');
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.cards.map((card) => card.id))
      .toEqual(['upcoming', 'evolution', 'categories']);
    await expect(page.locator('.card-item[popover], .moving-card, .drop-slot')).toHaveCount(0);
    await expect.poll(async () => (await target.boundingBox())!.x).toBeCloseTo(source.x, 0);
    await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(targetBox.x, 0);
    // Repetir a captura inicial sem movimento reduzido e confirmar inserção pela esquerda.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      (window as unknown as { startFrames: unknown[] }).startFrames = [];
    });
    const moved = (await card.boundingBox())!;
    await page.mouse.move(moved.x + 80, moved.y + 80);
    await page.mouse.down();
    await page.mouse.move(moved.x + 90, moved.y + 90);
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { startFrames: unknown[] }).startFrames.length),
      )
      .toBe(2);
    const normalFrames = await page.evaluate(
      () =>
        (
          window as unknown as {
            startFrames: { x: number; y: number; width: number; height: number }[];
          }
        ).startFrames,
    );
    for (const frame of normalFrames) {
      expect(frame.x).toBeCloseTo(moved.x + 10, 0);
      expect(frame.y).toBeCloseTo(moved.y + 10, 0);
      expect(frame.width).toBeCloseTo(moved.width, 0);
      expect(frame.height).toBeCloseTo(moved.height, 0);
    }
    await page.mouse.move(source.x - 10, source.y + 80, { steps: 12 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'insert');
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.cards.map((card) => card.id))
      .toEqual(['categories', 'upcoming', 'evolution']);
    await expect(page.locator('.card-item[popover], .moving-card, .drop-slot')).toHaveCount(0);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: posição livre na linha persiste e soltura mantém todos os frames no destino sem salto', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    let page = await app.firstWindow();
    expect(
      (
        await page.evaluate(() =>
          window.finDesk!.storage.saveCardLayout({
            version: 3,
            area: 'finance-general',
            priority: null,
            cards: [
              { id: 'evolution', columns: 6, rows: 4.5 },
              { id: 'upcoming', columns: 12, rows: 4 },
              { id: 'categories', columns: 6, rows: 4.5 },
            ],
          }),
        )
      ).ok,
    ).toBe(true);
    await open(page);
    const card = page.locator('[data-card-id="evolution"]');
    const board = page.locator('.card-board');
    const source = (await card.boundingBox())!;
    const initialBoard = (await board.boundingBox())!;
    const other = await page.locator('[data-card-id="upcoming"]').boundingBox();
    const slack = initialBoard.width - source.width;
    await page.evaluate(() => {
      const probe = window as unknown as {
        releaseFrames: { x: number; y: number; top: number; width: number; popover: boolean }[];
      };
      probe.releaseFrames = [];
      window.addEventListener(
        'pointerup',
        () => {
          const capture = () => {
            const card = document.querySelector<HTMLElement>('[data-card-id="evolution"]')!;
            const rect = card.getBoundingClientRect();
            probe.releaseFrames.push({
              x: rect.x,
              y: rect.y,
              top: document.querySelector('.card-board')!.getBoundingClientRect().top,
              width: rect.width,
              popover: card.matches(':popover-open'),
            });
            if (probe.releaseFrames.length < 12) requestAnimationFrame(capture);
          };
          requestAnimationFrame(capture);
        },
        { once: true },
      );
    });
    await page.mouse.move(source.x + 100, source.y + 80);
    await page.mouse.down();
    await page.mouse.move(source.x + 100 + slack / 2, source.y + 80, { steps: 12 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'place');
    expect(await saved(page)).toEqual(expect.objectContaining({ version: 3 }));
    await expect
      .poll(async () => (await page.locator('.drop-slot').boundingBox())!.x)
      .toBeCloseTo(initialBoard.x + slack / 2, 0);
    const destination = (await page.locator('.drop-slot').boundingBox())!;
    expect(destination.x).toBeCloseTo(initialBoard.x + slack / 2, 0);
    await page.mouse.up();
    await expect.poll(async () => (await saved(page))?.cards[0]?.align).toBeCloseTo(0.5, 4);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { releaseFrames: unknown[] }).releaseFrames.length,
        ),
      )
      .toBe(12);
    const frames = await page.evaluate(
      () =>
        (
          window as unknown as {
            releaseFrames: { x: number; y: number; top: number; width: number; popover: boolean }[];
          }
        ).releaseFrames,
    );
    for (const frame of frames) {
      expect(frame.x).toBeCloseTo(destination.x, 0);
      expect(frame.y).toBeCloseTo(destination.y, 0);
      expect(frame.top).toBeCloseTo(initialBoard.y, 0);
      expect(frame.width).toBeCloseTo(source.width, 0);
      expect(frame.popover).toBe(false);
    }
    expect(await page.locator('[data-card-id="upcoming"]').boundingBox()).toEqual(other);
    await page.screenshot({ path: 'test-results/cards-centered-free-space.png', fullPage: true });
    await card.locator('article').focus();
    await page.keyboard.press('Alt+ArrowRight');
    await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(destination.x + 20, 0);
    await page.keyboard.press('Alt+ArrowLeft');
    await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(destination.x, 0);
    // Direita e esquerda na mesma linha, sem alterar ordem, tamanho ou linha seguinte.
    for (const align of [1, 0, 0.5]) {
      const current = (await card.boundingBox())!;
      await page.mouse.move(current.x + 100, current.y + 80);
      await page.mouse.down();
      await page.mouse.move(initialBoard.x + slack * align + 100, current.y + 80, { steps: 8 });
      await page.mouse.up();
      await expect.poll(async () => (await saved(page))?.cards[0]?.align).toBeCloseTo(align, 4);
      expect((await saved(page))?.cards.map((card) => card.id)).toEqual([
        'evolution',
        'upcoming',
        'categories',
      ]);
    }
    await app.close();
    app = await launch(profile);
    page = await app.firstWindow();
    await open(page);
    const reopened = (await page.locator('[data-card-id="evolution"]').boundingBox())!;
    const reopenedBoard = (await page.locator('.card-board').boundingBox())!;
    expect(reopened.x - reopenedBoard.x).toBeCloseTo((reopenedBoard.width - reopened.width) / 2, 0);
    // Um card de outra linha continua reformatando e empurrando.
    const lower = page.locator('[data-card-id="categories"]');
    await lower.scrollIntoViewIfNeeded();
    const lowerBox = (await lower.boundingBox())!;
    await page.mouse.move(lowerBox.x + 100, lowerBox.y + 80);
    await page.mouse.down();
    await page.mouse.move(lowerBox.x + 110, lowerBox.y + 80);
    await expect(lower).toHaveAttribute('popover', 'manual');
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.workspace')!.scrollTop = 0;
    });
    const top = (await page.locator('.card-board').boundingBox())!;
    await page.mouse.move(top.x + 80, top.y + 80, { steps: 12 });
    await expect(page.locator('.drop-slot')).toHaveAttribute('data-mode', 'insert');
    const expected = (await page.locator('.drop-slot').boundingBox())!;
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.cards.map((card) => card.id))
      .toEqual(['categories', 'evolution', 'upcoming']);
    expect((await lower.boundingBox())!.x).toBeCloseTo(expected.x, 0);
    expect((await lower.boundingBox())!.y).toBeCloseTo(expected.y, 0);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: card flutua sobre toda a janela e insere ao lado do vizinho com espaço prévio sem gravar durante o gesto', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    await open(page);
    const card = page.locator('[data-card-id="categories"]');
    const neighbor = page.locator('[data-card-id="evolution"]');
    const source = (await card.boundingBox())!;
    const content = await card.locator('.prototype-content').elementHandle();
    const start = { x: source.x + 100, y: source.y + 80 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(100, 150, { steps: 8 });
    await expect(card).toHaveAttribute('popover', 'manual');
    expect(await card.evaluate((node) => node.matches(':popover-open'))).toBe(true);
    expect((await card.boundingBox())!.x).toBeCloseTo(source.x + 100 - start.x, 0);
    expect((await card.boundingBox())!.y).toBeCloseTo(source.y + 150 - start.y, 0);
    expect(
      await page.evaluate(() =>
        document
          .elementFromPoint(100, 150)
          ?.closest('[data-card-id]')
          ?.getAttribute('data-card-id'),
      ),
    ).toBe('categories');
    await expect(page.locator('.drop-slot')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/cards-free-over-navbar.png', fullPage: true });
    await page.mouse.up();
    expect(await saved(page)).toBe(null);
    await expect(card).not.toHaveAttribute('popover');
    expect((await card.boundingBox())!.x).toBe(source.x);
    const target = (await neighbor.boundingBox())!;
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width + 10, target.y + 80, { steps: 12 });
    await expect(page.locator('.drop-slot')).toHaveCount(1);
    await expect.poll(async () => (await neighbor.boundingBox())!.x).toBe(source.x);
    const slot = (await page.locator('.drop-slot').boundingBox())!;
    expect(slot.x).toBeGreaterThan(source.x);
    expect(await saved(page)).toBe(null);
    expect(await card.evaluate((node) => node.matches(':popover-open'))).toBe(true);
    await page.screenshot({ path: 'test-results/cards-insertion-preview.png', fullPage: true });
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.cards.map((card) => card.id))
      .toEqual(['evolution', 'categories', 'upcoming']);
    expect(
      await content!.evaluate(
        (node) => node === document.querySelector('[data-card-id="categories"] .prototype-content'),
      ),
    ).toBe(true);
    await expect(page.locator('.drop-slot, .card-item[popover]')).toHaveCount(0);
    const changed = await saved(page);
    const next = (await card.boundingBox())!;
    await page.mouse.move(next.x + 100, next.y + 80);
    await page.mouse.down();
    await page.mouse.move(source.x + 5, source.y + 80, { steps: 8 });
    await expect.poll(async () => (await neighbor.boundingBox())!.x).toBeGreaterThan(source.x);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(await saved(page)).toEqual(changed);
    await expect(page.locator('.drop-slot, .card-item[popover]')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveClass(/fd-card-dragging/);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: diminuir largura ou altura não comprime vizinhos nem puxa compromissos da linha seguinte', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(1920, 1080),
    );
    let page = await app.firstWindow();
    await open(page);
    const card = page.locator('[data-card-id="categories"]');
    const evolution = page.locator('[data-card-id="evolution"]');
    const upcoming = page.locator('[data-card-id="upcoming"]');
    const original = (await card.boundingBox())!;
    const neighbor = (await evolution.boundingBox())!;
    const nextRow = (await upcoming.boundingBox())!;
    const corner = (await page.locator('[data-resize-id="categories"]').boundingBox())!;
    await page.mouse.move(corner.x + 15, corner.y + 15);
    await page.mouse.down();
    await page.mouse.move(corner.x - 3, corner.y - 25, { steps: 10 });
    await expect
      .poll(async () => (await card.boundingBox())!.width)
      .toBeCloseTo(original.width - 18, 0);
    for (const [locator, expected] of [
      [evolution, neighbor],
      [upcoming, nextRow],
    ] as const) {
      const actual = (await locator.boundingBox())!;
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(actual[key]).toBeCloseTo(expected[key], 0);
    }
    await page.mouse.up();
    await expect
      .poll(async () => (await saved(page))?.rowStarts)
      .toEqual(['categories', 'upcoming']);
    const current = (await page.locator('[data-resize-id="categories"]').boundingBox())!;
    await page.mouse.move(current.x + 15, current.y + 15);
    await page.mouse.down();
    await page.mouse.move(current.x + 15, current.y - 15, { steps: 8 });
    await page.mouse.up();
    for (const [locator, expected] of [
      [evolution, neighbor],
      [upcoming, nextRow],
    ] as const) {
      const actual = (await locator.boundingBox())!;
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(actual[key]).toBeCloseTo(expected[key], 0);
    }
    await page.screenshot({
      path: 'test-results/cards-shrink-keeps-neighbors.png',
      fullPage: true,
    });
    const layout = await saved(page);
    await app.close();
    app = await launch(profile);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(1920, 1080),
    );
    page = await app.firstWindow();
    await open(page);
    expect(await saved(page)).toEqual(layout);
    expect((await page.locator('[data-card-id="upcoming"]').boundingBox())!.y).toBeGreaterThan(
      (await page.locator('[data-card-id="evolution"]').boundingBox())!.y,
    );
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: cabeçalho compacto centraliza períodos e restauração fica na mesma linha dos submenus', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await open(page);
    const title = (await page.getByRole('heading', { name: 'Finanças.' }).boundingBox())!;
    const about = (await page.getByRole('button', { name: 'Sobre esta versão' }).boundingBox())!;
    expect(title.y).toBeLessThan(30);
    expect(about.y + about.height / 2).toBeCloseTo(24, 0);
    const balance = (await page.locator('.balance-block').boundingBox())!;
    const modes = (await page.locator('.period-modes').boundingBox())!;
    expect(balance.y + balance.height / 2).toBeCloseTo(modes.y + modes.height / 2, 0);
    const menus = (await page.locator('.finance-submenus').boundingBox())!;
    const restore = (await page.locator('[data-restore-layout]').boundingBox())!;
    expect(restore.y + restore.height / 2).toBeCloseTo(menus.y + menus.height / 2, 0);
    const toolbar = (await page.locator('.finance-toolbar').boundingBox())!;
    expect(
      (await page.locator('.card-board').boundingBox())!.y - toolbar.y - toolbar.height,
    ).toBeCloseTo(16, 0);
    await expect(page.locator('.board-toolbar')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/finance-compact-header-wide.png', fullPage: true });
    await page
      .locator('.finance-submenus')
      .getByRole('link', { name: 'Movimentações', exact: true })
      .click();
    await expect(page.locator('[data-restore-layout]')).toHaveCount(0);
    await page
      .locator('.finance-submenus')
      .getByRole('link', { name: 'Geral', exact: true })
      .click();
    await expect(page.locator('[data-restore-layout]')).toBeVisible();
    await page.getByRole('button', { name: 'Sobre esta versão' }).click();
    await expect(page.getByRole('dialog', { name: 'Sobre o FinDesk' })).toBeVisible();
    await page.keyboard.press('Escape');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await expect
      .poll(() => page.getByRole('main').evaluate((node) => node.scrollWidth <= node.clientWidth))
      .toBe(true);
    await page.locator('[data-restore-layout]').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-results/finance-compact-header-narrow.png',
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: altura encaixa suavemente no vizinho e sai do encaixe sem alterar o outro card', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    expect(
      (
        await page.evaluate(() =>
          window.finDesk!.storage.saveCardLayout({
            version: 3,
            area: 'finance-general',
            priority: null,
            cards: [
              { id: 'categories', columns: 6, rows: 5 },
              { id: 'evolution', columns: 6, rows: 4.5 },
              { id: 'upcoming', columns: 12, rows: 4 },
            ],
          }),
        )
      ).ok,
    ).toBe(true);
    await open(page);
    const card = page.locator('[data-card-id="categories"]');
    const neighbor = page.locator('[data-card-id="evolution"]');
    const corner = page.locator('[data-resize-id="categories"]');
    await corner.scrollIntoViewIfNeeded();
    const handle = (await corner.boundingBox())!;
    const original = (await card.boundingBox())!;
    const target = (await neighbor.boundingBox())!;
    const x = handle.x + 15,
      y = handle.y + 15;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + target.height + 6 - original.height, { steps: 10 });
    await expect.poll(async () => (await card.boundingBox())!.height).toBeCloseTo(target.height, 0);
    await expect(page.locator('.height-guide')).toBeVisible();
    await page.screenshot({ path: 'test-results/cards-height-assistance.png', fullPage: true });
    await page.mouse.move(x, y + target.height + 11 - original.height);
    await expect.poll(async () => (await card.boundingBox())!.height).toBeCloseTo(target.height, 0);
    await page.mouse.move(x, y + target.height + 14 - original.height);
    await expect
      .poll(async () => (await card.boundingBox())!.height)
      .toBeCloseTo(target.height + 14, 0);
    await expect(page.locator('.height-guide')).toHaveCount(0);
    await page.mouse.move(x, y + target.height + 6 - original.height);
    await expect.poll(async () => (await card.boundingBox())!.height).toBeCloseTo(target.height, 0);
    await page.mouse.up();
    await expect.poll(async () => (await saved(page))?.cards[0]?.rows).toBe(4.5);
    expect((await neighbor.boundingBox())!.height).toBe(target.height);
    await expect(page.locator('.height-guide')).toHaveCount(0);
    const next = (await corner.boundingBox())!;
    await page.mouse.move(next.x + 15, next.y + 15);
    await page.mouse.down();
    await page.mouse.move(next.x + 35, next.y + 15, { steps: 6 });
    await expect(page.locator('.height-guide')).toHaveCount(0);
    await page.mouse.up();
    expect((await card.boundingBox())!.height).toBe(target.height);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: tamanho acompanha o mouse, vizinho cede antes de quebrar e controles internos ficam preservados', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    await open(page);
    const category = page.locator('[data-card-id="categories"]');
    const evolution = page.locator('[data-card-id="evolution"]');
    const corner = page.locator('[data-resize-id="categories"]');
    await corner.scrollIntoViewIfNeeded();
    const original = (await category.boundingBox())!;
    const neighbor = (await evolution.boundingBox())!;
    const board = (await page.locator('.card-board').boundingBox())!;
    const handle = (await corner.boundingBox())!;
    const x = handle.x + 15,
      y = handle.y + 15;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (const delta of [12, 24, 100]) {
      await page.mouse.move(x + delta, y);
      await expect
        .poll(async () => (await category.boundingBox())!.width)
        .toBeCloseTo(original.width + delta, 0);
      const adapted = (await evolution.boundingBox())!;
      expect(adapted.y).toBeCloseTo(original.y, 0);
      expect(adapted.width).toBeCloseTo(neighbor.width - delta, 0);
    }
    expect(await saved(page)).toBe(null);
    await page.screenshot({ path: 'test-results/cards-adapting.png', fullPage: true });
    const wrapDelta = board.width - original.width - 280;
    await page.mouse.move(x + wrapDelta, y);
    await expect
      .poll(async () => (await evolution.boundingBox())!.y)
      .toBeGreaterThan(original.y + original.height);
    expect((await evolution.boundingBox())!.width).toBeCloseTo(neighbor.width, 0);
    await page.screenshot({ path: 'test-results/cards-wrapped.png', fullPage: true });
    await page.mouse.move(x + 60, y);
    await expect.poll(async () => (await evolution.boundingBox())!.y).toBeCloseTo(original.y, 0);
    await page.mouse.up();
    await expect.poll(async () => (await saved(page))?.priority).toBe('categories');
    expect((await saved(page))!.cards.find((card) => card.id === 'evolution')!.columns).toBe(6);
    const before = await saved(page);
    await category.locator('.card-content').evaluate((node) => {
      const input = document.createElement('input');
      input.setAttribute('data-test-control', '');
      input.value = 'Texto selecionável';
      node.append(input);
    });
    const control = page.locator('[data-test-control]');
    const controlBox = (await control.boundingBox())!;
    await page.mouse.move(controlBox.x + 10, controlBox.y + 10);
    await page.mouse.down();
    await page.mouse.move(controlBox.x + 60, controlBox.y + 10, { steps: 4 });
    await page.mouse.up();
    await control.press('ArrowRight');
    await control.dblclick();
    expect(await saved(page)).toEqual(before);
    await expect(page.locator('.card-item:visible')).toHaveCount(3);
    await control.evaluate((node) => node.remove());
    await category.locator('article').dblclick({ position: { x: 140, y: 100 } });
    await expect(page.locator('.card-item:visible')).toHaveCount(1);
    await category.locator('article').dblclick({ position: { x: 140, y: 100 } });
    await expect(page.locator('.card-item:visible')).toHaveCount(3);
    expect(await saved(page)).toEqual(before);
    await expect(page.locator('.card-menu, .move-handle, .card-actions')).toHaveCount(0);
    await expect(corner.locator('.pi')).toHaveCount(0);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: canto externo captura resize e restauração confirma no mesmo botão sem deslocar cards', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    await open(page);
    const card = page.locator('[data-card-id="categories"]');
    expect((await card.boundingBox())!.height).toBe(344);
    expect((await page.locator('[data-card-id="evolution"]').boundingBox())!.height).toBe(344);
    expect((await page.locator('[data-card-id="upcoming"]').boundingBox())!.height).toBe(304);
    const corner = page.locator('[data-resize-id="categories"]');
    await corner.scrollIntoViewIfNeeded();
    const handle = (await corner.boundingBox())!;
    const before = (await card.boundingBox())!;
    const x = handle.x + handle.width - 3,
      y = handle.y + handle.height - 3;
    expect(
      await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-resize-id'),
        { x, y },
      ),
    ).toBe('categories');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 45, y + 30, { steps: 6 });
    await expect
      .poll(async () => (await card.boundingBox())!.width)
      .toBeCloseTo(before.width + 45, 0);
    await expect
      .poll(async () => (await card.boundingBox())!.height)
      .toBeCloseTo(before.height + 30, 0);
    await expect(card).not.toHaveClass(/moving-card/);
    await page.mouse.up();
    await expect.poll(async () => (await saved(page))?.priority).toBe('categories');
    const changed = await saved(page);
    const restore = page.locator('[data-restore-layout]');
    await restore.scrollIntoViewIfNeeded();
    const boardTop = (await page.locator('.card-board').boundingBox())!.y;
    await restore.click();
    await expect(restore).toHaveText('Restaurar layout?');
    await expect(restore).toBeFocused();
    await expect(page.locator('.restore-confirmation')).toHaveCount(0);
    expect((await page.locator('.card-board').boundingBox())!.y).toBe(boardTop);
    expect(await saved(page)).toEqual(changed);
    await page.screenshot({ path: 'test-results/cards-confirm-button.png', fullPage: true });
    await page.keyboard.press('Escape');
    await expect(restore).toHaveText('Restaurar layout');
    await restore.click();
    await page.getByRole('heading', { name: 'Finanças.' }).click();
    await expect(restore).toHaveText('Restaurar layout');
    expect(await saved(page)).toEqual(changed);
    await restore.click();
    await page.keyboard.press('Tab');
    await expect(restore).toHaveText('Restaurar layout');
    await expect(restore).not.toBeFocused();
    await restore.click();
    await restore.click();
    await expect.poll(async () => (await saved(page))?.cards[0]?.rows).toBe(4.5);
    await expect(restore).toHaveText('Restaurar layout');
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: teclado, cancelamento do gesto, restauração confirmada e adaptação estreita', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    const page = await app.firstWindow();
    await open(page);
    const preferences = await page.evaluate(() => window.finDesk!.storage.getPreferences());
    const mover = page.locator('[data-move-id="categories"]');
    await mover.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await saved(page))?.cards[0]?.id).toBe('evolution');
    await expect(mover).toBeFocused();
    await page.getByRole('button', { name: 'Redimensionar Categorias', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(async () => (await saved(page))?.cards.find((card) => card.id === 'categories')?.rows)
      .toBe(4.75);
    await mover.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect
      .poll(
        async () => (await saved(page))?.cards.find((card) => card.id === 'categories')?.columns,
      )
      .toBe(6.25);
    await expect(page.locator('.card-menu, .move-handle, .card-actions')).toHaveCount(0);
    const beforeCancel = await saved(page);
    const resizer = page.getByRole('button', { name: 'Redimensionar Categorias', exact: true });
    await resizer.scrollIntoViewIfNeeded();
    const box = await resizer.boundingBox();
    await page.mouse.move(box!.x + 15, box!.y + 15);
    await page.mouse.down();
    await page.mouse.move(box!.x - 100, box!.y - 100, { steps: 5 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(await saved(page)).toEqual(beforeCancel);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await expect
      .poll(() => page.getByRole('main').evaluate((node) => node.scrollWidth <= node.clientWidth))
      .toBe(true);
    const items = await page.locator('.card-item').evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      }),
    );
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!,
          b = items[j]!;
        expect(
          a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1,
        ).toBe(true);
      }
    expect(await saved(page)).toEqual(beforeCancel);
    await page.screenshot({ path: 'test-results/cards-compact.png', fullPage: true });
    await page.getByRole('button', { name: 'Restaurar layout', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Restaurar layout?', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    expect(await saved(page)).toEqual(beforeCancel);
    await page.getByRole('button', { name: 'Restaurar layout', exact: true }).click();
    await page.getByRole('button', { name: 'Restaurar layout?', exact: true }).click();
    await expect
      .poll(async () =>
        (await saved(page))?.cards.map((card) => [card.id, card.columns, card.rows]),
      )
      .toEqual([
        ['categories', 6, 4.5],
        ['evolution', 6, 4.5],
        ['upcoming', 12, 4],
      ]);
    expect(await page.evaluate(() => window.finDesk!.storage.getPreferences())).toEqual(
      preferences,
    );
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F03a: erro de gravação permite repetir, leitura futura exige restauração explícita e IPC é restrito', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-cards-'));
  let app: ElectronApplication | undefined;
  try {
    app = await launch(profile);
    let page = await app.firstWindow();
    await open(page);
    const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
    const filename = join(profile, 'storage', 'preferences.sqlite');
    const db = new DatabaseSync(filename);
    try {
      db.exec(
        "CREATE TRIGGER reject_card_layout BEFORE INSERT ON preferences WHEN NEW.key = 'layout.finance-general.v3' BEGIN SELECT RAISE(ABORT, 'SQL privado'); END",
      );
      await page.locator('[data-move-id="categories"]').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('alert')).toHaveText(
        'Não foi possível salvar o layout. Alterações valem apenas nesta execução.',
      );
      expect(await saved(page)).toBe(null);
      db.exec('DROP TRIGGER reject_card_layout');
      await page.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
      await expect.poll(async () => (await saved(page))?.cards[0]?.id).toBe('evolution');
    } finally {
      db.close();
    }
    const invalid = await page.evaluate(() =>
      window.finDesk!.storage.saveCardLayout({
        version: 1,
        area: 'finance-general',
        cards: [],
        sql: 'privado',
      } as never),
    );
    expect(invalid.ok).toBe(false);
    expect(
      (await page.evaluate(() => window.finDesk!.storage.restoreCardLayout('invalid' as never))).ok,
    ).toBe(false);
    const other = await app.evaluate(async ({ BrowserWindow, app }) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          preload: `${app.getAppPath()}/out/desktop/preload.js`,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      try {
        await win.loadURL('findesk://app/#/visao-geral');
        return await win.webContents.executeJavaScript('window.finDesk.storage.getCardLayout()');
      } finally {
        win.destroy();
      }
    });
    expect(other.ok).toBe(false);
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
    await app.close();
    const corrupt = new DatabaseSync(filename);
    corrupt
      .prepare("UPDATE preferences SET payload = ? WHERE key = 'layout.finance-general.v3'")
      .run(JSON.stringify({ version: 99 }));
    corrupt.close();
    const before = await readFile(filename);
    app = await launch(profile);
    page = await app.firstWindow();
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Finanças', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText('incompatível');
    await expect(page.locator('.card-item')).toHaveCount(0);
    expect(await readFile(filename)).toEqual(before);
    await page.getByRole('button', { name: 'Restaurar layout', exact: true }).click();
    await page.getByRole('button', { name: 'Restaurar layout?', exact: true }).click();
    await expect(page.locator('.card-item')).toHaveCount(3);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
