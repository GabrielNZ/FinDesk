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

async function openMerchant(page: Page, id = 'mov-uber-1') {
  await page
    .locator(`[data-movement-id="${id}"]`)
    .getByRole('button', { name: 'Reclassificar estabelecimento', exact: true })
    .click();
  return page.locator('fd-merchant-category-panel');
}
async function savedContext(page: Page) {
  return page.evaluate(async () => ({
    facts: await window.finDesk!.storage.getDemo(),
    prefs: await window.finDesk!.storage.getPreferences(),
    layout: await window.finDesk!.storage.getStatementLayout(),
    general: await window.finDesk!.storage.getCardLayout(),
  }));
}

test('F05b.2: prévia, preservação manual, inclusão explícita, seleção, teclado, janela estreita e reabertura', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-categories-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const before = await savedContext(page);
    const initialRow = page.locator('[data-movement-id="mov-uber-1"]');
    const chevron = await initialRow.locator('.detail-chevron').boundingBox();
    const action = await initialRow.locator('.merchant-action').boundingBox();
    const plus = await initialRow.locator('.select-movement').boundingBox();
    expect(action!.x).toBeGreaterThan(chevron!.x);
    expect(action!.x + action!.width).toBeLessThanOrEqual(plus!.x);
    await initialRow.screenshot({ path: 'test-results/merchant-icon-cards.png' });
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar Transporte à seleção', exact: true }).click();
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await page.locator('[data-movement-id="mov-uber-1"] .movement-summary').click();
    await page
      .locator('#detail-mov-uber-1')
      .getByRole('button', { name: 'Alterar categoria de Uber', exact: true })
      .click();
    await page
      .locator('fd-category-panel')
      .getByRole('button', { name: 'Sem categoria', exact: true })
      .click();
    let panel = await openMerchant(page);
    await expect(
      panel.getByRole('heading', { name: 'Reclassificar estabelecimento' }),
    ).toBeFocused();
    await expect(panel.getByRole('button', { name: 'Aplicar a 0 despesas' })).toBeDisabled();
    await panel.getByRole('button', { name: 'Casa', exact: true }).click();
    await expect(panel.locator('[data-status="change"]')).toHaveCount(1);
    await expect(panel.locator('[data-status="preserved"]')).toHaveCount(1);
    await expect(panel.locator('.batch-totals strong')).toHaveText('-R$ 30,00');
    await panel.getByRole('checkbox', { name: 'Incluir classificações manuais' }).check();
    await expect(panel.locator('[data-status="change"]')).toHaveCount(2);
    await expect(panel.locator('.batch-totals strong')).toHaveText('-R$ 60,00');
    const notApplied = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(notApplied.ok && notApplied.value.classifications).toEqual([
      { movementId: 'mov-uber-1', categoryId: null },
    ]);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    panel = await openMerchant(page);
    await panel.getByRole('button', { name: 'Casa', exact: true }).click();
    await expect(panel.getByRole('checkbox')).not.toBeChecked();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await panel.scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.getByRole('main').evaluate((e) => e.scrollWidth <= e.clientWidth))
      .toBe(true);
    await panel
      .getByRole('heading', { name: 'Reclassificar estabelecimento' })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'test-results/merchant-preview-narrow.png',
      animations: 'disabled',
    });
    await panel.getByRole('button', { name: 'Aplicar a 1 despesa', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 60,00');
    const saved = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(
      saved.ok &&
        saved.value.classifications.find((c) => c.movementId === 'mov-uber-1')?.categoryId,
    ).toBeNull();
    expect(
      saved.ok &&
        saved.value.classifications.find((c) => c.movementId === 'mov-uber-2')?.categoryId,
    ).toBe('casa');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1380, 900));
    await page
      .locator('[data-selected-id="mov-uber-1"]')
      .getByRole('button', { name: 'Reclassificar estabelecimento' })
      .click();
    panel = page.locator('fd-merchant-category-panel');
    await panel.getByRole('button', { name: 'Alimentação', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Aplicar a 0 despesas' })).toBeDisabled();
    await panel.getByRole('checkbox').check();
    await panel.screenshot({
      path: 'test-results/merchant-preview-wide.png',
      animations: 'disabled',
    });
    await panel.getByRole('button', { name: 'Aplicar a 2 despesas', exact: true }).click();
    await expect(panel).toHaveCount(0);
    expect(await savedContext(page)).toEqual(before);
    await app.close();
    app = undefined;
    session = await launch(profile);
    app = session.app;
    page = session.page;
    const reopened = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(reopened.ok && reopened.value.classifications).toHaveLength(2);
    expect(
      reopened.ok && reopened.value.classifications.every((c) => c.categoryId === 'alimentacao'),
    ).toBe(true);
    expect(await savedContext(page)).toEqual(before);
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Alimentação', exact: true }).click();
    await openMerchant(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('fd-merchant-category-panel')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await page.getByRole('button', { name: 'Visualizar como lista' }).click();
    const listRow = page.locator('.statement-table [data-movement-id="mov-uber-1"]');
    await expect(listRow).toBeVisible();
    await listRow.screenshot({ path: 'test-results/merchant-icon-list.png' });
    await listRow.getByRole('button', { name: 'Reclassificar estabelecimento' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('fd-merchant-category-panel')).toBeVisible();
    await page.keyboard.press('Escape');
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F05b.2: filtros, prévia obsoleta, falha atômica, repetição e rejeição de outra janela IPC', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-categories-'));
  let app: ElectronApplication | undefined;
  let db: DatabaseSync | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await savedContext(page);
    const panel = await openMerchant(page);
    await panel.getByRole('button', { name: 'Casa', exact: true }).click();
    await expect(panel.locator('.batch-items li')).toHaveCount(2);
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('energia');
    await expect(panel.getByRole('button', { name: 'Aplicar a 0 despesas' })).toBeDisabled();
    await search.fill('uber');
    await expect(panel.getByRole('button', { name: 'Aplicar a 2 despesas' })).toBeEnabled();
    await page.getByRole('button', { name: 'Categoria', exact: true }).click();
    await page
      .getByRole('group', { name: 'Filtrar por categoria' })
      .getByRole('button', { name: 'Casa', exact: true })
      .click();
    await expect(panel.locator('.batch-items li')).toHaveCount(0);
    await page.getByRole('button', { name: 'Remover filtro de categoria' }).click();
    await expect(panel.locator('.batch-items li')).toHaveCount(2);
    await page.evaluate(() =>
      window.finDesk!.storage.classifyMovement({ movementId: 'mov-uber-1', categoryId: null }),
    );
    await panel.getByRole('button', { name: 'Aplicar a 2 despesas' }).click();
    await expect(panel.getByRole('alert')).toContainText('Não foi possível aplicar');
    await expect(panel.locator('[data-status="preserved"]')).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'Casa', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const state = await page.evaluate(() => window.finDesk!.storage.getCategories());
    db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    db.exec(
      "CREATE TRIGGER fail_batch AFTER UPDATE ON category_state BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    await panel.getByRole('button', { name: 'Aplicar a 1 despesa' }).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Aplicar a 1 despesa' })).toBeEnabled();
    expect(await page.evaluate(() => window.finDesk!.storage.getCategories())).toEqual(state);
    db.exec('DROP TRIGGER fail_batch');
    db.close();
    db = undefined;
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
          `window.finDesk.storage.classifyMerchant({merchantId:'uber',categoryId:'casa',includeManual:true,query:{accountId:'demo-a',start:'2026-10-01',end:'2026-10-31',search:'',kind:null,category:null},expected:[{movementId:'mov-uber-2',categoryId:'transporte',manual:false},{movementId:'mov-uber-1',categoryId:null,manual:true}]})`,
        );
      } finally {
        other.destroy();
      }
    });
    expect(rejected).toMatchObject({ ok: false, error: { code: 'invalid-request' } });
    await panel.getByRole('button', { name: 'Aplicar a 1 despesa' }).click();
    await expect(panel).toHaveCount(0);
    expect(await savedContext(page)).toEqual(before);
    // A Lista também oferece a ação; Cancelar preserva a categoria salva.
    await page.getByRole('button', { name: 'Visualizar como lista' }).click();
    await page.locator('[data-movement-id="mov-uber-2"] .movement-summary').click();
    await page
      .locator('[data-movement-id="mov-uber-2"]')
      .getByRole('button', { name: 'Reclassificar estabelecimento' })
      .click();
    await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(panel).toHaveCount(0);
  } finally {
    db?.close();
    await app?.close();
    await clean(profile);
  }
});

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
