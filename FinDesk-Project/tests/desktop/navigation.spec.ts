import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

type Edge = 'left' | 'right' | 'top' | 'bottom';
let application: ElectronApplication | undefined;
let page: Page;
let profile = '';
const tempRoot = resolve(tmpdir());
const errors: string[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  profile = await mkdtemp(join(tempRoot, 'findesk-navigation-'));
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  }
  application = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  page = await application.firstWindow();
  // Gestos e transições precisam de frames reais da janela no Windows.
  await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window?.show();
    window?.focus();
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
});

test.beforeEach(async () => {
  await page.goto('findesk://app/#/visao-geral');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'left');
});

test.afterAll(async () => {
  await application?.close();
  if (profile) {
    if (
      dirname(resolve(profile)) !== tempRoot ||
      !basename(profile).startsWith('findesk-navigation-')
    ) {
      throw new Error('Limpeza de perfil fora do escopo recusada.');
    }
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

async function panelSize(horizontal = false): Promise<number> {
  const box = await page.getByRole('complementary', { name: 'Painel de navegação' }).boundingBox();
  return Math.round((horizontal ? box?.height : box?.width) ?? 0);
}

async function dockTo(edge: Edge): Promise<void> {
  const panel = page.getByRole('complementary', { name: 'Painel de navegação' });
  const box = (await panel.boundingBox())!;
  const horizontal = ['top', 'bottom'].includes(
    (await page.locator('.app-frame').getAttribute('data-nav-position'))!,
  );
  const start = horizontal
    ? { x: box.x + box.width / 2, y: box.y + 4 }
    : { x: box.x + 4, y: box.y + box.height / 2 };
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  const targets = {
    left: { x: 110, y: viewport.height / 2 },
    right: { x: viewport.width - 110, y: viewport.height / 2 },
    top: { x: viewport.width / 2, y: 110 },
    bottom: { x: viewport.width / 2, y: viewport.height - 110 },
  };
  const target = targets[edge];
  const previousPosition = await page.locator('.app-frame').getAttribute('data-nav-position');
  await page.mouse.move(start.x, start.y);
  expect(await panel.evaluate((node) => getComputedStyle(node).cursor)).toBe('default');
  await page.mouse.down();
  expect(await panel.evaluate((node) => getComputedStyle(node).cursor)).toBe('default');
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await expect(page.locator('html')).toHaveClass(/fd-nav-dragging/);
  expect(await panel.evaluate((node) => getComputedStyle(node).cursor)).toBe('grabbing');
  await expect(page.locator('.dock-preview')).toHaveAttribute('data-edge', edge);
  expect(
    await page.locator('.dock-preview').evaluate((node) => getComputedStyle(node).borderColor),
  ).toBe('rgb(119, 217, 165)');
  await expect(page.locator('.dock-preview')).toHaveText('');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', previousPosition!);
  await page.mouse.up();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', edge);
  await expect(page.locator('.dock-preview')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/fd-nav-dragging/);
}

test('fundo encaixa nas quatro bordas sem três pontos; cursor aparece só ao arrastar', async () => {
  await expect(page.locator('.navigation-grip')).toHaveCount(0);
  for (const edge of ['right', 'top', 'bottom', 'left'] as const) {
    await dockTo(edge);
    const horizontal = edge === 'top' || edge === 'bottom';
    await expect.poll(() => panelSize(horizontal)).toBe(horizontal ? 88 : 228);
    const panel = await page.getByRole('complementary').boundingBox();
    const workspace = await page.locator('.workspace').boundingBox();
    if (!panel || !workspace) throw new Error('Painéis sem dimensões.');
    if (edge === 'left') expect(workspace.x).toBeGreaterThanOrEqual(panel.x + panel.width - 1);
    if (edge === 'right') expect(panel.x).toBeGreaterThanOrEqual(workspace.x + workspace.width - 1);
    if (edge === 'top') expect(workspace.y).toBeGreaterThanOrEqual(panel.y + panel.height - 1);
    if (edge === 'bottom')
      expect(panel.y).toBeGreaterThanOrEqual(workspace.y + workspace.height - 1);
    await page.getByRole('button', { name: 'Recolher navegação' }).click();
    await expect.poll(() => panelSize(horizontal)).toBe(horizontal ? 56 : 72);
    await page.getByRole('button', { name: 'Expandir navegação' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => panelSize(horizontal)).toBe(horizontal ? 88 : 228);
  }
});

test('horizontal recolhe pelo botão e mantém os links acessíveis', async () => {
  await dockTo('top');
  await page.getByRole('button', { name: 'Recolher navegação' }).click();
  await expect.poll(() => panelSize(true)).toBe(56);
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Investimentos' })
    .click();
  await expect(page.getByRole('heading', { name: 'Investimentos.' })).toBeVisible();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'top');
  await page.getByRole('button', { name: 'Expandir navegação' }).click();
  await expect.poll(() => panelSize(true)).toBe(88);
});

test('Escape cancela o encaixe e soltar no centro mantém a posição', async () => {
  const panel = (await page.getByRole('complementary').boundingBox())!;
  const start = { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(viewport.width / 2, 12, { steps: 8 });
  await expect(page.locator('.dock-preview')).toHaveAttribute('data-edge', 'top');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).not.toHaveClass(/fd-nav-dragging/);
  await page.mouse.up();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'left');
  await expect(page.locator('.dock-preview')).toHaveCount(0);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 8 });
  await expect(page.locator('.app-frame')).toHaveClass(/layout-dragging/);
  expect(
    await page.getByRole('complementary').evaluate((node) => getComputedStyle(node).boxShadow),
  ).toContain('rgb(119, 217, 165)');
  await page.mouse.up();
  expect(
    await page.getByRole('complementary').evaluate((node) => getComputedStyle(node).boxShadow),
  ).toBe('none');
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'left');
});

test('borda não redimensiona; menu pelo painel e janela menor preservam os controles', async () => {
  await expect(page.getByRole('separator')).toHaveCount(0);
  const panel = await page.getByRole('complementary').boundingBox();
  if (!panel) throw new Error('Navegação ausente.');
  await page.mouse.move(panel.x + panel.width - 1, 200);
  await page.mouse.down();
  await page.mouse.move(panel.x + panel.width + 80, 200, { steps: 6 });
  await page.mouse.up();
  expect(await panelSize()).toBe(228);
  const navigationPanel = page.getByRole('complementary');
  await navigationPanel.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem', { name: 'Direita' }).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'right');
  await page.getByRole('button', { name: 'Recolher navegação' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => panelSize()).toBe(72);
  await page.keyboard.press('Enter');
  await expect.poll(() => panelSize()).toBe(228);
  await application?.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
  );
  await dockTo('bottom');
  await expect(page.getByRole('link', { name: 'Configurações', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recolher navegação' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.app-frame')
      .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
  ).toBeLessThan(0.001);
  expect(errors).toEqual([]);
});

test('links e botões não iniciam arraste; fundo aceita menu contextual e perda de foco cancela', async () => {
  const panel = page.getByRole('complementary');
  const box = (await panel.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Em cima' }).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'top');
  await panel.focus();
  await page.keyboard.press('Space');
  await page.getByRole('menuitem', { name: 'Esquerda' }).click();
  await page.getByRole('link', { name: 'Finanças', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Finanças.' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/fd-nav-dragging/);
  await page.getByRole('link', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações.' })).toBeVisible();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'left');
  await page.getByRole('button', { name: 'Recolher navegação' }).click();
  await expect(page.locator('html')).not.toHaveClass(/fd-nav-dragging/);
  await expect.poll(() => panelSize()).toBe(72);
  const collapsed = (await panel.boundingBox())!;
  await page.mouse.move(collapsed.x + 4, collapsed.y + collapsed.height / 2);
  await page.mouse.down();
  await page.mouse.move(500, 10, { steps: 5 });
  await expect(page.locator('html')).toHaveClass(/fd-nav-dragging/);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.up();
  await expect(page.locator('html')).not.toHaveClass(/fd-nav-dragging/);
  await expect(page.locator('.dock-preview')).toHaveCount(0);
  await expect(page.locator('.app-frame')).toHaveAttribute('data-nav-position', 'left');
});
