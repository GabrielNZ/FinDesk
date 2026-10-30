import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

test('casca abre o build local com ponte isolada, navega e responde em janela menor', async () => {
  const tempRoot = resolve(tmpdir());
  const profile = await mkdtemp(join(tempRoot, 'findesk-smoke-'));
  if (dirname(resolve(profile)) !== tempRoot || !basename(profile).startsWith('findesk-smoke-')) {
    throw new Error('Diretório temporário fora do escopo do teste; limpeza recusada.');
  }
  const environment: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') environment[key] = value;
  }
  const application = await electron.launch({
    args: ['.', `--user-data-dir=${profile}`],
    env: environment,
  });
  const errors: string[] = [];

  try {
    const page = await application.firstWindow();
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.show());
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(page.url()).toMatch(/^findesk:\/\/app\/#/);
    expect(
      await page.evaluate(() => ({
        require: typeof (globalThis as { require?: unknown }).require,
        process: typeof (globalThis as { process?: unknown }).process,
      })),
    ).toEqual({ require: 'undefined', process: 'undefined' });

    const sandboxed = await application.evaluate(({ app, BrowserWindow }) => {
      const pid = BrowserWindow.getAllWindows()[0]?.webContents.getOSProcessId();
      return app.getAppMetrics().find((metric) => metric.pid === pid)?.sandboxed;
    });
    expect(sandboxed).toBe(true);
    expect(await page.evaluate(() => Object.keys(window.finDesk ?? {}))).toEqual([
      'getRuntimeInfo',
      'storage',
    ]);
    const info = await page.evaluate(() => window.finDesk?.getRuntimeInfo());
    expect(info?.appVersion).toBe('0.1.0');

    const sidebar = page.getByRole('complementary', { name: 'Painel de navegação' });
    const main = page.getByRole('main');
    const expandedSidebarWidth = Math.round((await sidebar.boundingBox())?.width ?? 0);
    const expandedContentWidth = (await main.boundingBox())?.width ?? 0;
    const collapseButton = page.getByRole('button', { name: 'Recolher navegação' });
    const settingsBox = await page
      .getByRole('link', { name: 'Configurações', exact: true })
      .boundingBox();
    const toggleBox = await collapseButton.boundingBox();
    expect(toggleBox?.y).toBeGreaterThan((settingsBox?.y ?? 0) + (settingsBox?.height ?? 0));

    await collapseButton.click();
    const expandButton = page.getByRole('button', { name: 'Expandir navegação' });
    await expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(72);
    expect((await main.boundingBox())?.width ?? 0).toBeGreaterThan(expandedContentWidth);
    await page.getByRole('navigation').getByRole('link', { name: 'Finanças' }).click();
    await expect(page.getByRole('heading', { name: 'Finanças.' })).toBeVisible();
    expect(Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(72);
    await page.screenshot({ path: 'test-results/sidebar-collapsed.png', fullPage: true });

    await expandButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Recolher navegação' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect
      .poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0))
      .toBe(expandedSidebarWidth);

    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Finanças' })
      .click();
    await expect(page.getByRole('heading', { name: 'Finanças.' })).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Investimentos' }).click();
    await expect(page.getByRole('heading', { name: 'Investimentos.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Investimentos.' })).toBeVisible();

    await page.getByRole('link', { name: 'Configurações', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Integrações', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver logo', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Logo.', exact: true })).toBeVisible();
    expect(
      await page
        .locator('img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/identity-proposals.png', fullPage: true });

    await page.getByRole('button', { name: 'Sobre esta versão' }).click();
    await expect(page.getByRole('dialog', { name: 'Sobre o FinDesk' })).toBeVisible();
    await expect(page.getByText('Aplicativo desktop', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('link', { name: 'Visão geral', exact: true }).click();
    await page.screenshot({ path: 'test-results/shell-desktop.png', fullPage: true });
    await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
    );
    await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/shell-compact.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await application.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
