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

async function launch(profile: string, count = 10) {
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
  await expect(page.locator('.movement')).toHaveCount(count);
  return { app, page };
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-expenses-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function preferences(page: Page) {
  return page.evaluate(async () => ({
    prefs: await window.finDesk!.storage.getPreferences(),
    layout: await window.finDesk!.storage.getStatementLayout(),
    general: await window.finDesk!.storage.getCardLayout(),
  }));
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Nova despesa', exact: true }).click();
  return page.locator('fd-expense-panel');
}
async function fill(page: Page, description: string) {
  const panel = page.locator('fd-expense-panel');
  await panel.getByLabel('Valor · BRL', { exact: true }).fill('20,00');
  await panel.getByLabel('Data da despesa', { exact: true }).fill('2026-10-20');
  await panel.getByLabel('Descrição', { exact: true }).fill(description);
  return panel;
}

test('F06a: novo estabelecimento, filtros/Seleção preservados, Ver lançamento, regra futura, reabertura e restauração', async () => {
  test.setTimeout(160_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-expenses-ui-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    const savedPreferences = await preferences(page);
    const initialBalance = Number(
      (await page.locator('.balance-value').innerText()).replace(/[^\d-]/gu, ''),
    );
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Uber');
    await expect(page.locator('.movement')).toHaveCount(2);
    await page.locator('[data-movement-id="mov-uber-1"]').locator('.select-movement').click();
    let panel = await open(page);
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toBeFocused();
    await expect(panel.getByLabel('Data da despesa')).toHaveValue('2026-10-29');
    await fill(page, 'Café fictício');
    await panel.getByRole('textbox', { name: 'Buscar estabelecimento' }).fill('Padaria fictícia');
    await panel.getByRole('button', { name: 'Criar estabelecimento', exact: true }).click();
    await expect(panel.getByText('Será criado ao salvar a despesa.')).toBeVisible();
    await panel.getByRole('button', { name: 'Sem regra · Sem categoria', exact: true }).click();
    await panel.getByRole('button', { name: 'Alimentação', exact: true }).click();
    await panel.screenshot({ path: 'test-results/expense-form.png' });
    await panel.getByRole('button', { name: 'Salvar despesa', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa salva fora dos filtros atuais.');
    await expect
      .poll(async () =>
        Number((await page.locator('.balance-value').innerText()).replace(/[^\d-]/gu, '')),
      )
      .toBe(initialBalance - 2000);
    await expect(page.getByRole('searchbox', { name: 'Buscar movimentações' })).toHaveValue('Uber');
    await expect(page.locator('.movement')).toHaveCount(2);
    expect(await preferences(page)).toEqual(savedPreferences);
    const saved = await page.evaluate(() => window.finDesk!.storage.getDemo());
    expect(saved.ok && saved.value.facts.movements.length).toBe(
      before.ok ? before.value.facts.movements.length + 1 : -1,
    );
    const first = saved.ok ? saved.value.facts.movements.at(-1)! : undefined;
    expect(first).toMatchObject({
      description: 'Café fictício',
      delta: { minorUnits: -2000, currency: 'BRL' },
      origin: { kind: 'manual' },
      categoryId: null,
    });
    await panel.getByRole('button', { name: 'Ver lançamento', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: 'Buscar movimentações' })).toHaveValue('');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    const firstRow = page.locator(`[data-movement-id="${first!.id}"]`);
    await expect(firstRow).toContainText('Alimentação');
    await firstRow.getByRole('button', { name: 'Reclassificar estabelecimento' }).click();
    const rulePanel = page.locator('fd-merchant-category-panel');
    await expect(rulePanel).toContainText('Padaria fictícia');
    await rulePanel.getByRole('button', { name: 'Próximos lançamentos' }).click();
    await rulePanel.getByRole('button', { name: 'Casa', exact: true }).click();
    await rulePanel.getByRole('button', { name: 'Salvar regra' }).click();
    await expect(rulePanel.getByRole('status')).toHaveText('Regra salva.');
    await page.keyboard.press('Escape');
    panel = await open(page);
    await fill(page, 'Segundo café fictício');
    await panel.getByRole('textbox', { name: 'Buscar estabelecimento' }).fill('Padaria');
    await panel.getByRole('button', { name: 'Padaria fictícia', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Regra: Casa', exact: true })).toBeVisible();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1180, 800));
    await panel.screenshot({ path: 'test-results/expense-form-narrow.png' });
    expect(await page.getByRole('main').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await panel.getByRole('button', { name: 'Salvar despesa', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa salva.');
    await panel.getByRole('button', { name: 'Ver lançamento' }).click();
    const categories = await page.evaluate(() => window.finDesk!.storage.getCategoryRules());
    expect(categories.ok && categories.value.assignments).toHaveLength(1);
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Casa', exact: true }).click();
    await expect(page.getByText('Padaria fictícia', { exact: true }).first()).toBeVisible();
    expect(await preferences(page)).toEqual(savedPreferences);
    await app.close();
    app = undefined;
    session = await launch(profile, 12);
    app = session.app;
    page = session.page;
    await expect(page.locator(`[data-movement-id="${first!.id}"]`)).toContainText('Alimentação');
    const merchants = await page.evaluate(() => window.finDesk!.storage.getMerchants());
    expect(
      merchants.ok && merchants.value.merchants.some((m) => m.name === 'Padaria fictícia'),
    ).toBe(true);
    await page.getByRole('link', { name: 'Configurações', exact: true }).click();
    const data = page.getByRole('region', { name: 'Dados de demonstração', exact: true });
    await data.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
    await expect(
      data.getByText(
        'Despesas manuais e novos estabelecimentos da demonstração também serão repostos.',
      ),
    ).toBeVisible();
    await data.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(
      data.getByText('Dados de demonstração restaurados.', { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    expect(await preferences(page)).toEqual(savedPreferences);
    const reset = await page.evaluate(() => window.finDesk!.storage.getMerchants());
    expect(reset.ok && reset.value.merchants.some((m) => m.name === 'Padaria fictícia')).toBe(
      false,
    );
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F06a: validações, cancelamento sem órfão, USD/manual null, falha/repetição e IPC de outra janela', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-expenses-ui-'));
  let app: ElectronApplication | undefined;
  let db: DatabaseSync | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    let panel = await open(page);
    await fill(page, 'Cancelar café fictício');
    await panel
      .getByRole('textbox', { name: 'Buscar estabelecimento' })
      .fill('Não salvar fictício');
    await panel.getByRole('button', { name: 'Criar estabelecimento' }).click();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    const names = await page.evaluate(() => window.finDesk!.storage.getMerchants());
    expect(names.ok && names.value.merchants.some((m) => m.name === 'Não salvar fictício')).toBe(
      false,
    );
    panel = await open(page);
    await fill(page, 'Despesa USD fictícia');
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('0');
    await panel.getByRole('button', { name: 'Salvar despesa' }).click();
    await expect(panel.getByRole('alert')).toContainText('Valor fora do limite');
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('12,34');
    await panel.getByLabel('Data da despesa').fill('2026-10-30');
    await panel.getByRole('button', { name: 'Salvar despesa' }).click();
    await expect(panel.getByRole('alert')).toContainText('intervalo informado');
    await panel.getByLabel('Data da despesa').fill('2026-10-20');
    await panel.getByRole('button', { name: /Nomad.*USD/u }).click();
    await panel.getByRole('button', { name: 'Uber', exact: true }).click();
    await panel.getByRole('button', { name: 'Sem regra · Sem categoria', exact: true }).click();
    await panel.getByRole('button', { name: 'Sem categoria', exact: true }).click();
    db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    db.exec(
      "CREATE TRIGGER fail_expense AFTER INSERT ON expense_requests BEGIN SELECT RAISE(ABORT, 'falha simulada'); END",
    );
    await panel.getByRole('button', { name: 'Salvar despesa' }).click();
    await expect(panel.getByRole('alert')).toContainText('Seus campos foram mantidos');
    await expect(panel.getByLabel('Valor · USD', { exact: true })).toHaveValue('12,34');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    db.exec('DROP TRIGGER fail_expense');
    db.close();
    db = undefined;
    await panel.getByRole('button', { name: 'Salvar despesa' }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa salva fora dos filtros atuais.');
    await panel.getByRole('button', { name: 'Ver lançamento' }).click();
    await expect(page.locator('.movement')).toHaveCount(1);
    const row = page.locator('.movement').filter({ hasText: 'Despesa USD fictícia' });
    await expect(row).toContainText('-US$ 12,34');
    await expect(row).toContainText('Sem categoria');
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
          `Promise.all([window.finDesk.storage.getMerchants(),window.finDesk.storage.createExpense({requestId:'00000000-0000-4000-8000-000000000001',accountId:'demo-a',on:'2026-10-20',amountMinor:1,description:'Não deve ser criada',merchant:{mode:'none'},classification:{mode:'automatic'}})])`,
        );
      } finally {
        other.destroy();
      }
    });
    expect(rejected.every((r: { ok: boolean }) => !r.ok)).toBe(true);
    const manual = await page.evaluate(() => window.finDesk!.storage.getCategories());
    expect(manual.ok && manual.value.classifications.at(-1)?.categoryId).toBe(null);
  } finally {
    db?.close();
    await app?.close();
    await clean(profile);
  }
});
