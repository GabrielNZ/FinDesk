import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function launch(profile: string) {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.show();
    BrowserWindow.getAllWindows()[0]?.focus();
  });
  const page = await app.firstWindow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('link', { name: 'Finanças', exact: true }).click();
  await page.getByRole('link', { name: 'Movimentações', exact: true }).click();
  await expect(page.locator('.movement')).toHaveCount(10);
  return { app, page };
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-categories-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

test('F05b.1: catálogo, classificação individual, seleção, reabertura e restauração contextual', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-categories-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const before = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getStatementLayout(),
      general: await window.finDesk!.storage.getCardLayout(),
    }));
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar Transporte à seleção', exact: true }).click();
    await page.getByRole('button', { name: 'Categorias', exact: true }).click();
    await expect(page.locator('.selection-area')).toHaveCount(0);
    const panel = page.locator('fd-category-panel');
    await panel.getByRole('button', { name: 'Editar Transporte', exact: true }).click();
    await panel.getByLabel('Nome', { exact: true }).fill('Mobilidade');
    await panel
      .getByRole('group', { name: 'Ícone da categoria' })
      .getByRole('button', { name: 'Viagem', exact: true })
      .click();
    await panel
      .getByRole('group', { name: 'Cor da categoria' })
      .getByRole('button', { name: 'Turquesa', exact: true })
      .click();
    await panel.getByRole('button', { name: 'Salvar categoria', exact: true }).click();
    await expect(
      panel.getByRole('button', { name: 'Editar Mobilidade', exact: true }),
    ).toBeVisible();
    await panel.getByRole('button', { name: 'Nova categoria', exact: true }).click();
    await panel.getByLabel('Nome', { exact: true }).fill('Casa');
    await panel.getByRole('button', { name: 'Salvar categoria', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('Já existe uma categoria com esse nome.');
    await page.keyboard.press('Escape');
    await expect(panel.locator('form')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('.selected-group')).toHaveAttribute(
      'data-selected-group-label',
      'Mobilidade',
    );
    const group = page.locator('[data-group-label="Mobilidade"]');
    await expect(group.locator('.group-icon .pi')).toHaveClass(/pi-globe/);
    await expect(group.locator('.group-icon')).toHaveCSS('color', 'rgb(139, 201, 197)');
    await page.getByRole('button', { name: 'Expandir Mobilidade', exact: true }).click();
    await page.locator('[data-movement-id="mov-uber-1"] .movement-summary').click();
    await page
      .locator('#detail-mov-uber-1')
      .getByRole('button', { name: 'Alterar categoria de Uber', exact: true })
      .click();
    await panel.getByRole('button', { name: 'Nova categoria', exact: true }).click();
    await panel.getByLabel('Nome', { exact: true }).fill('Saúde');
    await panel
      .getByRole('group', { name: 'Ícone da categoria' })
      .getByRole('button', { name: 'Saúde', exact: true })
      .click();
    await panel.getByRole('button', { name: 'Salvar categoria', exact: true }).click();
    await panel.getByRole('button', { name: 'Classificar como Saúde', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 60,00');
    await expect(group.locator('.group-count')).toHaveText('1 lançamento');
    await expect(page.locator('.selected-group .selected-movement')).toHaveCount(1);
    await page.getByRole('button', { name: 'Recolher Mobilidade', exact: true }).click();
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('saude');
    await expect(page.locator('.movement')).toHaveCount(1);
    await expect(page.locator('.movement')).toHaveAttribute('data-movement-id', 'mov-uber-1');
    const after = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getStatementLayout(),
      general: await window.finDesk!.storage.getCardLayout(),
    }));
    expect(after).toEqual(before);
    await page.screenshot({
      path: 'test-results/categories-individual.png',
      animations: 'disabled',
    });
    await app.close();
    app = undefined;
    session = await launch(profile);
    app = session.app;
    page = session.page;
    const saved = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(saved.ok && saved.value.classifications).toHaveLength(1);
    expect(saved.ok && saved.value.classifications[0]?.movementId).toBe('mov-uber-1');
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await expect(page.locator('[data-group-label="Saúde"]')).toBeVisible();
    await page.getByRole('button', { name: 'Categorias', exact: true }).click();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    expect(
      await page
        .getByRole('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/categories-panel-narrow.png',
      animations: 'disabled',
    });
    await page.getByRole('link', { name: 'Configurações', exact: true }).click();
    const section = page.getByRole('region', { name: 'Dados de demonstração', exact: true });
    await section.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
    await expect(
      section.getByText('As categorias e classificações da demonstração também serão repostas.'),
    ).toBeVisible();
    await section.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(
      section.getByText('Dados de demonstração restaurados.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Finanças', exact: true }).click();
    await page.getByRole('link', { name: 'Movimentações', exact: true }).click();
    await expect(page.locator('[data-group-label="Transporte"]')).toBeVisible();
    await expect(page.locator('[data-group-label="Saúde"]')).toHaveCount(0);
    const restored = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(restored.ok && restored.value.classifications).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F05b.1: falha de escrita preserva estado e formulário; novo IPC rejeita outra janela', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-categories-'));
  let app: ElectronApplication | undefined;
  let db: DatabaseSync | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Categorias', exact: true }).click();
    const panel = page.locator('fd-category-panel');
    await panel.getByRole('button', { name: 'Editar Casa', exact: true }).click();
    await panel.getByLabel('Nome', { exact: true }).fill('Moradia');
    db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    db.exec(
      "CREATE TRIGGER fail_category BEFORE UPDATE ON category_state BEGIN SELECT RAISE(ABORT,'falha simulada'); END;",
    );
    await panel.getByRole('button', { name: 'Salvar categoria', exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText('Não foi possível salvar');
    await expect(panel.getByLabel('Nome', { exact: true })).toHaveValue('Moradia');
    await expect(page.locator('[data-group-label="Casa"]')).toBeVisible();
    const state = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(state.ok && state.value.categories.some((category) => category.name === 'Casa')).toBe(
      true,
    );
    db.exec('DROP TRIGGER fail_category');
    db.close();
    db = undefined;
    await panel.getByRole('button', { name: 'Salvar categoria', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Editar Moradia', exact: true })).toBeVisible();
    const rejected = await app.evaluate(async ({ BrowserWindow, app }) => {
      const other = new BrowserWindow({
        show: false,
        webPreferences: {
          preload: `${app.getAppPath()}/out/desktop/preload.js`,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      try {
        await other.loadURL('findesk://app/#/visao-geral');
        return await other.webContents.executeJavaScript(
          `Promise.all([window.finDesk.storage.getCategories(),window.finDesk.storage.classifyMovement({movementId:'mov-energia',categoryId:null}),window.finDesk.storage.saveCategory({id:null,name:'Outra',icon:'pi-tag',color:'#a9c8b5'})])`,
        );
      } finally {
        other.destroy();
      }
    });
    expect(rejected.every((result: { ok: boolean }) => !result.ok)).toBe(true);
    await panel.getByRole('button', { name: 'Fechar categorias', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Moradia', exact: true }).click();
    await page.locator('[data-movement-id="mov-energia"] .movement-summary').click();
    await page
      .locator('#detail-mov-energia')
      .getByRole('button', { name: 'Alterar categoria de Energia', exact: true })
      .click();
    await panel.getByRole('button', { name: 'Sem categoria', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('[data-group-label="Sem categoria"]')).toBeVisible();
  } finally {
    db?.close();
    await app?.close();
    await clean(profile);
  }
});
