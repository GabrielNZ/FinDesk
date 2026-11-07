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
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  env['FINDESK_TEST_MODE'] = '1';
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
async function seedManual(page: Page, rule = true) {
  const id = await page.evaluate(async (rule) => {
    const data = await window.finDesk!.storage.getDemo();
    if (!data.ok) throw new Error('Sem demonstração.');
    if (rule)
      await window.finDesk!.storage.saveCategoryRule({
        merchantId: 'uber',
        categoryId: 'casa',
        active: true,
        expectedRevision: null,
      });
    const result = await window.finDesk!.storage.createExpense({
      requestId: crypto.randomUUID(),
      accountId: 'demo-a',
      on: '2026-10-20' as typeof data.value.asOf,
      amountMinor: 2000,
      description: 'Manual fictícia',
      merchant: { mode: 'existing', id: 'uber' },
      classification: { mode: 'automatic' },
    });
    if (!result.ok) throw new Error('Sem despesa de teste.');
    return result.value.movementId;
  }, rule);
  await page.reload();
  await expect(page.locator('.movement')).toHaveCount(11);
  return id;
}
const balanceMinor = async (page: Page) =>
  Number((await page.locator('.balance-value').innerText()).replace(/[^\d-]/gu, ''));

test('F06c: prévia/cancelamento, lixeira nas quatro áreas, saldo/Seleção, recuperação após reabrir e restauração', async () => {
  test.setTimeout(180_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-expenses-ui-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await expect(page.locator('.delete-expense')).toHaveCount(0);
    const id = await seedManual(page),
      beforeBalance = await balanceMinor(page),
      prefs = await preferences(page);
    const saved = await page.evaluate(() => window.finDesk!.storage.getDemo());
    let row = page.locator(`[data-movement-id="${id}"]`);
    await row.locator('.select-movement').click();
    await page.locator('[data-movement-id="mov-uber-1"]').locator('.select-movement').click();
    await row.getByRole('button', { name: 'Excluir despesa', exact: true }).click();
    let panel = page.locator('fd-expense-trash-panel');
    await expect(
      panel.getByRole('heading', { name: 'Excluir despesa', exact: true }),
    ).toBeFocused();
    await expect(panel).toContainText('Efeito no saldo da conta: +R$ 20,00');
    await expect(panel).toContainText('Casa');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(saved);
    await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Excluir despesa', exact: true })).toBeFocused();
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    await expect(page.locator('.statement-table')).toBeVisible();
    const pencil = await row.locator('.edit-expense').boundingBox(),
      trash = await row.locator('.delete-expense').boundingBox(),
      plus = await row.locator('.select-movement').boundingBox();
    expect(trash!.x).toBeGreaterThan(pencil!.x);
    expect(trash!.x + trash!.width).toBeLessThanOrEqual(plus!.x);
    await row.getByRole('button', { name: 'Excluir despesa', exact: true }).click();
    await panel
      .getByRole('heading', { name: 'Excluir despesa', exact: true })
      .scrollIntoViewIfNeeded();
    await panel.screenshot({ path: 'test-results/expense-delete-preview.png' });
    await panel.getByRole('button', { name: 'Confirmar exclusão', exact: true }).focus();
    await expect(
      panel.getByRole('button', { name: 'Confirmar exclusão', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('status')).toHaveText('Despesa excluída.');
    await expect.poll(() => balanceMinor(page)).toBe(beforeBalance + 2000);
    await expect(row).toHaveCount(0);
    await expect(panel.locator(`[data-deleted-id="${id}"]`)).toContainText('Casa');
    await page.keyboard.press('Escape');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await page.evaluate(() =>
      window.finDesk!.storage.saveCategoryRule({
        merchantId: 'uber',
        categoryId: 'transporte',
        active: true,
        expectedRevision: 1,
      }),
    );
    await app.close();
    app = undefined;
    session = await launch(profile);
    app = session.app;
    page = session.page;
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Uber');
    await expect(page.locator('.movement')).toHaveCount(2);
    await page.getByRole('button', { name: 'Excluídas', exact: true }).click();
    panel = page.locator('fd-expense-trash-panel');
    await expect(panel.locator(`[data-deleted-id="${id}"]`)).toContainText('Casa');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1180, 800));
    await panel.getByRole('heading', { name: 'Excluídas', exact: true }).scrollIntoViewIfNeeded();
    await panel.screenshot({ path: 'test-results/expense-trash-narrow.png' });
    expect(await page.getByRole('main').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await panel
      .locator(`[data-deleted-id="${id}"]`)
      .getByRole('button', { name: 'Recuperar', exact: true })
      .click();
    await expect(panel.getByRole('status')).toHaveText(
      'Despesa recuperada fora dos filtros atuais.',
    );
    await expect(page.getByRole('searchbox', { name: 'Buscar movimentações' })).toHaveValue('Uber');
    await expect.poll(() => balanceMinor(page)).toBe(beforeBalance);
    await panel.getByRole('button', { name: 'Ver lançamento' }).click();
    row = page.locator(`[data-movement-id="${id}"]`);
    await expect(row).toContainText('Casa');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    const restored = await page.evaluate(() => window.finDesk!.storage.getDemo());
    expect(restored).toEqual(saved);
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Casa', exact: true }).click();
    await page
      .locator(`[data-movement-id="${id}"]`)
      .getByRole('button', { name: 'Excluir despesa', exact: true })
      .click();
    await expect(
      panel.getByRole('heading', { name: 'Excluir despesa', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await row.locator('.select-movement').click();
    await page
      .locator(`[data-selected-id="${id}"]`)
      .getByRole('button', { name: 'Excluir despesa', exact: true })
      .click();
    await panel.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa excluída.');
    expect(await preferences(page)).toEqual(prefs);
    await page.getByRole('link', { name: 'Configurações', exact: true }).click();
    const data = page.getByRole('region', { name: 'Dados de demonstração', exact: true });
    await data.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
    await expect(data.getByText('A lista de Excluídas será esvaziada.')).toBeVisible();
    await data.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(
      data.getByText('Dados de demonstração restaurados.', { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
    const empty = await page.evaluate(() => window.finDesk!.storage.getExpenseTrash());
    expect(empty.ok && empty.value.trash).toEqual([]);
    expect(await preferences(page)).toEqual(prefs);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F06c: prévia obsoleta, falha/repetição na exclusão/recuperação e IPC recusa outra janela', async () => {
  test.setTimeout(150_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-expenses-ui-'));
  let app: ElectronApplication | undefined;
  let db: DatabaseSync | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const id = await seedManual(page, false);
    await page
      .locator(`[data-movement-id="${id}"]`)
      .getByRole('button', { name: 'Excluir despesa', exact: true })
      .click();
    const panel = page.locator('fd-expense-trash-panel');
    await expect(
      panel.getByRole('heading', { name: 'Excluir despesa', exact: true }),
    ).toBeFocused();
    await page.evaluate(async (id) => {
      const draft = await window.finDesk!.storage.getExpenseEdit(id);
      if (!draft.ok) throw new Error();
      const movement = draft.value.snapshot.facts.movements.find((m) => m.id === id)!;
      const result = await window.finDesk!.storage.editExpense({
        requestId: crypto.randomUUID(),
        movementId: id,
        expectedToken: draft.value.token,
        accountId: movement.accountId,
        on: movement.on,
        amountMinor: 3500,
        description: 'Prévia atualizada fictícia',
        merchant: { mode: 'none' },
        classification: { mode: 'keep' },
      });
      if (!result.ok) throw new Error();
    }, id);
    await panel.getByRole('button', { name: 'Confirmar exclusão' }).click();
    await expect(panel.getByRole('alert')).toContainText('Este lançamento foi alterado');
    await expect(panel.getByRole('button', { name: 'Confirmar exclusão' })).toBeDisabled();
    await panel.getByRole('button', { name: 'Recarregar prévia' }).click();
    await expect(panel).toContainText('Prévia atualizada fictícia');
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    db.exec(
      "CREATE TRIGGER fail_lifecycle_ui AFTER INSERT ON expense_lifecycle_requests BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    await panel.getByRole('button', { name: 'Confirmar exclusão' }).click();
    await expect(panel.getByRole('alert')).toContainText('Não foi possível excluir');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    db.exec('DROP TRIGGER fail_lifecycle_ui');
    await panel.getByRole('button', { name: 'Confirmar exclusão' }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa excluída.');
    db.exec(
      "CREATE TRIGGER fail_lifecycle_ui AFTER INSERT ON expense_lifecycle_requests BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    await panel.getByRole('button', { name: 'Recuperar', exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText('Não foi possível recuperar');
    await expect(panel.locator(`[data-deleted-id="${id}"]`)).toBeVisible();
    db.exec('DROP TRIGGER fail_lifecycle_ui');
    db.close();
    db = undefined;
    await panel.getByRole('button', { name: 'Recuperar', exact: true }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa recuperada.');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    const requests = await page.evaluate(async (id) => {
      const draft = await window.finDesk!.storage.getExpenseEdit(id);
      if (!draft.ok) throw new Error();
      const remove = {
        requestId: crypto.randomUUID(),
        movementId: id,
        expectedToken: draft.value.token,
      };
      const deleted = await window.finDesk!.storage.deleteExpense(remove);
      if (!deleted.ok) throw new Error();
      const item = deleted.value.trash.find((item) => item.movement.id === id)!;
      const active = await window.finDesk!.storage.createExpense({
        requestId: crypto.randomUUID(),
        accountId: item.movement.accountId,
        on: item.movement.on,
        amountMinor: 1000,
        description: 'Outra manual fictícia',
        merchant: { mode: 'none' },
        classification: { mode: 'automatic' },
      });
      if (!active.ok) throw new Error();
      const activeDraft = await window.finDesk!.storage.getExpenseEdit(active.value.movementId);
      if (!activeDraft.ok) throw new Error();
      return {
        remove: {
          requestId: crypto.randomUUID(),
          movementId: active.value.movementId,
          expectedToken: activeDraft.value.token,
        },
        recover: { requestId: crypto.randomUUID(), movementId: id, expectedToken: item.token },
      };
    }, id);
    const rejected = await app.evaluate(async ({ BrowserWindow, app }, requests) => {
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
          `Promise.all([window.finDesk.storage.getExpenseTrash(),window.finDesk.storage.deleteExpense(${JSON.stringify(requests.remove)}),window.finDesk.storage.recoverExpense(${JSON.stringify(requests.recover)})])`,
        );
      } finally {
        other.destroy();
      }
    }, requests);
    expect(rejected.every((r: { ok: boolean }) => !r.ok)).toBe(true);
    const end = await page.evaluate(() => window.finDesk!.storage.getExpenseTrash());
    expect(end.ok && end.value.trash).toHaveLength(1);
  } finally {
    db?.close();
    await app?.close();
    await clean(profile);
  }
});

test('F06b: lápis em Cards/Lista/Agrupamento/Seleção, edição mantém ID/categoria e move saldo sem duplicar', async () => {
  test.setTimeout(180_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-expenses-ui-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await expect(page.locator('.edit-expense')).toHaveCount(0);
    const id = await seedManual(page);
    const original = await page.evaluate(() => window.finDesk!.storage.getDemo());
    const savedPreferences = await preferences(page),
      beforeBalance = await balanceMinor(page);
    const row = page.locator(`[data-movement-id="${id}"]`);
    await row.locator('.select-movement').click();
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    await expect(page.locator('.statement-table')).toBeVisible();
    const tags = await row.locator('.merchant-action').first().boundingBox(),
      pencil = await row.locator('.edit-expense').boundingBox(),
      plus = await row.locator('.select-movement').boundingBox();
    expect(pencil!.x).toBeGreaterThan(tags!.x);
    expect(pencil!.x + pencil!.width).toBeLessThanOrEqual(plus!.x);
    await row.getByRole('button', { name: 'Editar despesa', exact: true }).click();
    const panel = page.locator('fd-expense-panel');
    await expect(panel.getByRole('heading', { name: 'Editar despesa', exact: true })).toBeVisible();
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toHaveValue('20,00');
    await expect(panel.getByRole('button', { name: /Nomad/u })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(row.getByRole('button', { name: 'Editar despesa', exact: true })).toBeFocused();
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await page.getByRole('button', { name: 'Visualizar como cards', exact: true }).click();
    await row.getByRole('button', { name: 'Editar despesa', exact: true }).click();
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toBeFocused();
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('35,00');
    await panel.getByLabel('Data da despesa').fill('2026-10-19');
    await panel.getByLabel('Descrição', { exact: true }).fill('Manual corrigida fictícia');
    await panel.getByRole('button', { name: 'Remover estabelecimento' }).click();
    await panel
      .getByRole('textbox', { name: 'Buscar estabelecimento' })
      .fill('Padaria editável fictícia');
    await panel.getByRole('button', { name: 'Criar estabelecimento' }).click();
    await expect(
      panel.getByRole('button', { name: 'Manter categoria atual · Casa', exact: true }),
    ).toBeVisible();
    await panel.screenshot({ path: 'test-results/expense-edit-wide.png' });
    await panel.getByRole('button', { name: 'Salvar alterações' }).focus();
    await expect(panel.getByRole('button', { name: 'Salvar alterações' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('status')).toHaveText('Despesa atualizada.');
    await expect.poll(() => balanceMinor(page)).toBe(beforeBalance - 1500);
    await page.keyboard.press('Escape');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await expect(row).toContainText('Casa');
    const edited = await page.evaluate(() => window.finDesk!.storage.getDemo());
    expect(edited.ok && edited.value.facts.movements.length).toBe(
      original.ok ? original.value.facts.movements.length : -1,
    );
    const old = original.ok ? original.value.facts.movements.find((m) => m.id === id)! : null;
    expect(edited.ok && edited.value.facts.movements.find((m) => m.id === id)).toMatchObject({
      id,
      origin: old!.origin,
      on: '2026-10-19',
      description: 'Manual corrigida fictícia',
      delta: { minorUnits: -3500, currency: 'BRL' },
    });
    expect(await preferences(page)).toEqual(savedPreferences);
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Casa', exact: true }).click();
    await page
      .locator(`[data-movement-id="${id}"]`)
      .getByRole('button', { name: 'Editar despesa', exact: true })
      .click();
    await expect(panel.getByLabel('Descrição', { exact: true })).toHaveValue(
      'Manual corrigida fictícia',
    );
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await page
      .locator(`[data-selected-id="${id}"]`)
      .getByRole('button', { name: 'Editar despesa', exact: true })
      .click();
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toHaveValue('35,00');
    await panel.getByRole('button', { name: /Conta auxiliar.*BRL/u }).click();
    await panel.getByRole('button', { name: 'Manter categoria atual · Casa', exact: true }).click();
    await panel.getByRole('button', { name: 'Sem categoria', exact: true }).click();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(1180, 800));
    await panel.screenshot({ path: 'test-results/expense-edit-narrow.png' });
    expect(await page.getByRole('main').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await panel.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(panel.getByRole('status')).toHaveText(
      'Despesa atualizada fora dos filtros atuais.',
    );
    await expect.poll(() => balanceMinor(page)).toBe(beforeBalance + 2000);
    await panel.getByRole('button', { name: 'Ver lançamento' }).click();
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    await expect(page.locator(`[data-movement-id="${id}"]`)).toContainText('Sem categoria');
    const final = await page.evaluate(() => window.finDesk!.storage.getDemo());
    const count = final.ok
      ? final.value.facts.movements.filter(
          (m) => m.accountId === 'demo-b' && m.on >= '2026-10-01' && m.on <= '2026-10-31',
        ).length
      : -1;
    await app.close();
    app = undefined;
    session = await launch(profile, count);
    app = session.app;
    page = session.page;
    await expect(page.locator(`[data-movement-id="${id}"]`)).toContainText(
      'Manual corrigida fictícia',
    );
    const beforeReset = await preferences(page);
    await page.getByRole('link', { name: 'Configurações', exact: true }).click();
    const data = page.getByRole('region', { name: 'Dados de demonstração', exact: true });
    await data.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
    await data.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(
      data.getByText('Dados de demonstração restaurados.', { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
    expect(await preferences(page)).toEqual(beforeReset);
    expect((await page.evaluate((id) => window.finDesk!.storage.getExpenseEdit(id), id)).ok).toBe(
      false,
    );
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F06b: validação, falha/repetição, conflito mantém campos, recarga explícita e outra janela IPC', async () => {
  test.setTimeout(150_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-expenses-ui-'));
  let app: ElectronApplication | undefined;
  let db: DatabaseSync | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const id = await seedManual(page, false);
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await page
      .locator(`[data-movement-id="${id}"]`)
      .getByRole('button', { name: 'Editar despesa', exact: true })
      .click();
    const panel = page.locator('fd-expense-panel');
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toHaveValue('20,00');
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('0');
    await panel.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(panel.getByRole('alert')).toContainText('Valor fora do limite');
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('22,22');
    await panel.getByLabel('Data da despesa').fill('2026-10-30');
    await panel.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(panel.getByRole('alert')).toContainText('intervalo informado');
    await panel.getByLabel('Data da despesa').fill('2026-10-20');
    db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    db.exec(
      "CREATE TRIGGER fail_edit_ui AFTER INSERT ON expense_edits BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
    );
    await panel.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(panel.getByRole('alert')).toContainText('Seus campos foram mantidos');
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toHaveValue('22,22');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    db.exec('DROP TRIGGER fail_edit_ui');
    db.close();
    db = undefined;
    await panel.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(panel.getByRole('status')).toHaveText('Despesa atualizada.');
    await panel.getByRole('button', { name: 'Editar novamente' }).click();
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toHaveValue('22,22');
    await panel.getByLabel('Descrição', { exact: true }).fill('Meu rascunho fictício');
    const command = await page.evaluate(async (id) => {
      const draft = await window.finDesk!.storage.getExpenseEdit(id);
      if (!draft.ok) throw new Error('Sem rascunho.');
      const movement = draft.value.snapshot.facts.movements.find((m) => m.id === id)!;
      const command = {
        requestId: crypto.randomUUID(),
        movementId: id,
        expectedToken: draft.value.token,
        accountId: movement.accountId,
        on: movement.on,
        amountMinor: 3400,
        description: 'Edição concorrente fictícia',
        merchant: { mode: 'none' as const },
        classification: { mode: 'keep' as const },
      };
      const result = await window.finDesk!.storage.editExpense(command);
      if (!result.ok) throw new Error('Sem edição concorrente.');
      return command;
    }, id);
    await panel.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(panel.getByRole('alert')).toContainText('Este lançamento foi alterado');
    await expect(panel.getByLabel('Descrição', { exact: true })).toHaveValue(
      'Meu rascunho fictício',
    );
    await expect(panel.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    await panel.getByRole('button', { name: 'Recarregar lançamento' }).click();
    await expect(panel.getByLabel('Descrição', { exact: true })).toHaveValue(
      'Edição concorrente fictícia',
    );
    await expect(panel.getByLabel('Valor · BRL', { exact: true })).toHaveValue('34,00');
    const rejected = await app.evaluate(
      async ({ BrowserWindow, app }, { id, command }) => {
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
            `Promise.all([window.finDesk.storage.getExpenseEdit(${JSON.stringify(id)}),window.finDesk.storage.editExpense(${JSON.stringify(command)})])`,
          );
        } finally {
          other.destroy();
        }
      },
      { id, command },
    );
    expect(rejected.every((r: { ok: boolean }) => !r.ok)).toBe(true);
    const invalid = await page.evaluate(async (id) => {
      const draft = await window.finDesk!.storage.getExpenseEdit(id);
      if (!draft.ok) throw new Error();
      const movement = draft.value.snapshot.facts.movements.find((m) => m.id === id)!;
      return window.finDesk!.storage.editExpense({
        requestId: crypto.randomUUID(),
        movementId: id,
        expectedToken: draft.value.token,
        accountId: 'demo-u',
        on: movement.on,
        amountMinor: 3400,
        description: movement.description,
        merchant: { mode: 'none' },
        classification: { mode: 'keep' },
      });
    }, id);
    expect(invalid.ok).toBe(false);
  } finally {
    db?.close();
    await app?.close();
    await clean(profile);
  }
});

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
