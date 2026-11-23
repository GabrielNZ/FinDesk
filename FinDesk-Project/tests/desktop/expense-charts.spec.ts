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
  await expect(page.locator('fd-expense-charts .card-item')).toHaveCount(2);
  return { app, page };
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-charts-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function choose(page: Page, label: string, value: string) {
  const trigger = page.getByRole('button', { name: new RegExp(`^${label}:`) });
  await trigger.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  await trigger.click();
  await page
    .getByRole('listbox', { name: label, exact: true })
    .locator(`[data-value="${value}"]`)
    .click();
}

test('F07b: composição, modalidades, modal por categoria/data, teclado, layout, reabertura e IPC', async () => {
  test.setTimeout(180_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-charts-ui-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const charts = () => page.locator('fd-expense-charts');
    const card = (id: string) => charts().locator(`[data-card-id="${id}"]`);
    const initial = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      analysis: await window.finDesk!.storage.getExpenseAnalysisLayout(),
      statement: await window.finDesk!.storage.getStatementLayout(),
    }));
    expect((await card('evolution').boundingBox())!.width).toBeGreaterThan(
      (await card('categories').boundingBox())!.width,
    );
    expect((await card('evolution').boundingBox())!.height).toBeCloseTo(384, 1);
    await expect(charts().getByRole('button', { name: 'Por dia', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const evolution = card('evolution');
    await expect(evolution.locator('.period-ranges')).toHaveCount(0);
    await expect(evolution.locator('.day-action > span')).toHaveText(['Atual', 'Anterior']);
    for (const action of await evolution.locator('.day-action').allInnerTexts()) {
      expect(action).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    }
    const spentDays = await evolution
      .locator('.day-bar')
      .evaluateAll((bars) => [
        ...new Set(
          bars
            .filter((bar) => Number(bar.getAttribute('height')) > 0)
            .map((bar) => (bars.indexOf(bar) % 29) + 1),
        ),
      ]);
    for (const day of spentDays) {
      await expect(
        evolution.locator('.x-axis .expense-day').filter({ hasText: new RegExp(`^${day}$`) }),
      ).toHaveCount(1);
    }
    await expect(card('evolution').locator('.day-bar.current')).toHaveCount(29);
    await expect(card('evolution').locator('.day-bar.previous')).toHaveCount(29);
    for (const id of ['categories', 'evolution']) {
      await expect
        .poll(() =>
          card(id)
            .locator('.card-content')
            .evaluate((e) => e.scrollHeight <= e.clientHeight && e.scrollWidth <= e.clientWidth),
        )
        .toBe(true);
    }
    await page.locator('[data-movement-id="mov-uber-1"] .select-movement').click();
    const category = card('categories').getByRole('button', { name: /Ver extrato de Transporte/ });
    await category.scrollIntoViewIfNeeded();
    const scroll = await page.locator('.workspace').evaluate((e) => e.scrollTop);
    await category.click();
    const categoryModal = page.getByRole('dialog', { name: 'Extrato · Transporte', exact: true });
    await expect(categoryModal.locator('.preview-movement')).toHaveCount(2);
    await expect(categoryModal.locator('footer')).toContainText('R$ 60,00');
    await page.keyboard.press('Escape');
    await expect(categoryModal).toHaveCount(0);
    await expect(category).toBeFocused();
    expect(await page.locator('.workspace').evaluate((e) => e.scrollTop)).toBe(scroll);
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    const index = await card('evolution')
      .locator('.day-bar.current')
      .evaluateAll((nodes) => nodes.findIndex((e) => Number(e.getAttribute('height')) > 0));
    await card('evolution').locator('.day-bar.current').nth(index).click();
    const dayModal = page.getByRole('dialog', { name: 'Extrato · Despesas do dia', exact: true });
    await expect(dayModal).toBeVisible();
    await expect(dayModal.locator('#expense-statement-context')).toContainText(
      `${String(index + 1).padStart(2, '0')}/10/2026`,
    );
    await dayModal.getByRole('button', { name: 'Fechar extrato', exact: true }).click();
    const previousIndex = await card('evolution')
      .locator('.day-bar.previous')
      .evaluateAll((nodes) => nodes.findIndex((e) => Number(e.getAttribute('height')) > 0));
    await card('evolution').locator('.day-bar.previous').nth(previousIndex).click();
    await expect(dayModal.locator('#expense-statement-context')).toContainText(
      `${String(previousIndex + 1).padStart(2, '0')}/09/2026`,
    );
    await page.keyboard.press('Escape');
    await charts().getByRole('button', { name: 'Acumulado', exact: true }).click();
    await expect(card('evolution').locator('.day-bar')).toHaveCount(0);
    await expect(card('evolution').locator('.series-line')).toHaveCount(2);
    const chart = card('evolution').locator('figure');
    await chart.focus();
    await page.keyboard.press('Home');
    await expect(chart.locator('.day-number')).toHaveText('Dia 1 · Acumulado');
    await page.keyboard.press('ArrowRight');
    await expect(chart.locator('.day-number')).toHaveText('Dia 2 · Acumulado');
    await page.keyboard.press('Shift+Enter');
    await expect(dayModal.locator('#expense-statement-context')).toContainText('02/09/2026');
    await page.keyboard.press('Escape');
    await chart.focus();
    await page.keyboard.press('End');
    await expect(chart.locator('.day-number')).toHaveText('Dia 29 · Acumulado');
    await charts().screenshot({ path: 'test-results/expense-charts-wide.png' });
    const resize = card('evolution').getByRole('button', {
      name: 'Redimensionar Evolução',
      exact: true,
    });
    await resize.focus();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const r = await window.finDesk!.storage.getExpenseChartsLayout();
          return r.ok ? r.value?.cards.find((c) => c.id === 'evolution')?.rows : null;
        }),
      )
      .toBeGreaterThan(5);
    await expect(card('evolution')).toHaveAttribute('data-rows', '5.25');
    await expect
      .poll(async () => (await card('evolution').boundingBox())!.height)
      .toBeCloseTo(404, 1);
    const grown = (await card('evolution').boundingBox())!.height;
    const corner = (await resize.boundingBox())!;
    await page.mouse.move(corner.x + corner.width - 3, corner.y + corner.height - 3);
    await page.mouse.down();
    await page.mouse.move(corner.x + corner.width + 35, corner.y + corner.height + 55, {
      steps: 8,
    });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect((await card('evolution').boundingBox())!.height).toBeCloseTo(grown, 1);
    await card('categories').locator('.card-shell').focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const r = await window.finDesk!.storage.getExpenseChartsLayout();
          return r.ok ? r.value?.cards[0]?.id : null;
        }),
      )
      .toBe('evolution');
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    // O Agrupamento tem outra altura; concluir a troca antes de registrar a rolagem do foco.
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
    await card('evolution').locator('.card-shell').focus();
    const beforeFocusScroll = await page.locator('.workspace').evaluate((e) => e.scrollTop);
    await page.keyboard.press('Enter');
    await expect(card('evolution')).toHaveClass(/focused-card/);
    await expect
      .poll(async () => {
        const cardBox = await card('evolution').boundingBox();
        const workspaceBox = await page.locator('.workspace').boundingBox();
        return (
          !!cardBox &&
          !!workspaceBox &&
          cardBox.y >= workspaceBox.y &&
          cardBox.y + cardBox.height <= workspaceBox.y + workspaceBox.height
        );
      })
      .toBe(true);
    await expect(page.locator('.statement-toolbar')).toBeHidden();
    await charts().screenshot({ path: 'test-results/expense-charts-focus.png' });
    await card('evolution').locator('figure').focus();
    await page.keyboard.press('Escape');
    await expect(card('evolution')).not.toHaveClass(/focused-card/);
    await expect(page.locator('.statement-toolbar')).toBeVisible();
    await expect
      .poll(() => page.locator('.workspace').evaluate((e) => e.scrollTop))
      .toBe(beforeFocusScroll);
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    const saved = await page.evaluate(() => window.finDesk!.storage.getExpenseChartsLayout());
    const unchanged = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
      analysis: await window.finDesk!.storage.getExpenseAnalysisLayout(),
      statement: await window.finDesk!.storage.getStatementLayout(),
    }));
    expect(unchanged).toEqual(initial);
    expect(errors).toEqual([]);
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
          'Promise.all([window.finDesk.storage.getExpenseChartsLayout(),window.finDesk.storage.saveExpenseChartsLayout({})])',
        );
      } finally {
        other.destroy();
      }
    });
    expect(rejected.every((r: { ok: boolean }) => !r.ok)).toBe(true);
    await app.close();
    app = undefined;
    session = await launch(profile);
    app = session.app;
    page = session.page;
    expect(await page.evaluate(() => window.finDesk!.storage.getExpenseChartsLayout())).toEqual(
      saved,
    );
    await expect(charts().getByRole('button', { name: 'Por dia', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 800));
    await expect
      .poll(async () => {
        const a = await card('categories').boundingBox(),
          b = await card('evolution').boundingBox();
        return !!a && !!b && a.y >= b.y + b.height;
      })
      .toBe(true);
    expect(await page.getByRole('main').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await charts().screenshot({ path: 'test-results/expense-charts-narrow.png' });
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F07b: recálculo por cadastro/edição/exclusão/recuperação, busca e falha de layout recuperável', async () => {
  test.setTimeout(150_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-charts-ui-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const charts = page.locator('fd-expense-charts'),
      categories = charts.locator('[data-card-id="categories"]'),
      evolution = charts.locator('[data-card-id="evolution"]');
    const total = categories.locator('.report-summary strong');
    const before = await total.innerText();
    await page.getByRole('button', { name: 'Nova despesa', exact: true }).click();
    const panel = page.locator('fd-expense-panel');
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('400,00');
    await panel.getByLabel('Data da despesa', { exact: true }).fill('2026-10-20');
    await panel.getByLabel('Descrição', { exact: true }).fill('Despesa fictícia F07b');
    await panel.locator('.category-current').click();
    await panel.getByRole('button', { name: 'Casa', exact: true }).click();
    await panel.getByRole('button', { name: 'Salvar despesa', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Despesa salva');
    await page.keyboard.press('Escape');
    await expect(categories.locator('[data-category="casa"]')).toContainText('R$ 520,00');
    const row = page.locator('.movement').filter({ hasText: 'Despesa fictícia F07b' });
    await row.getByRole('button', { name: 'Editar despesa', exact: true }).click();
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('600,00');
    await panel.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Despesa atualizada');
    await page.keyboard.press('Escape');
    await expect(categories.locator('[data-category="casa"]')).toContainText('R$ 720,00');
    await row.getByRole('button', { name: 'Excluir despesa', exact: true }).click();
    const trash = page.locator('fd-expense-trash-panel');
    await trash.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await expect(total).toHaveText(before);
    await trash.getByRole('button', { name: 'Recuperar', exact: true }).click();
    await expect(categories.locator('[data-category="casa"]')).toContainText('R$ 720,00');
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Uber');
    await expect(categories.locator('.category-bar')).toHaveCount(1);
    await expect(total).toHaveText('R$ 60,00');
    await expect(evolution.locator('.series-labels .current-label')).toContainText('R$ 60,00');
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('');
    const resize = evolution.getByRole('button', { name: 'Redimensionar Evolução', exact: true });
    await resize.focus();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const r = await window.finDesk!.storage.getExpenseChartsLayout();
          return r.ok ? r.value?.cards.find((c) => c.id === 'evolution')?.rows : null;
        }),
      )
      .toBe(5.25);
    await expect(evolution).toHaveAttribute('data-rows', '5.25');
    const db = new DatabaseSync(join(profile, 'storage', 'preferences.sqlite'));
    try {
      db.exec(
        "CREATE TRIGGER fail_chart BEFORE UPDATE ON preferences WHEN NEW.key = 'layout.finance-charts.v1' BEGIN SELECT RAISE(ABORT, 'teste'); END",
      );
      await resize.focus();
      await expect(resize).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(evolution).toHaveAttribute('data-rows', '5.5');
      await expect(charts.getByRole('alert')).toContainText('Não foi possível salvar o layout');
      db.exec('DROP TRIGGER fail_chart');
      await charts.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
      await expect(charts.getByRole('alert')).toHaveCount(0);
    } finally {
      db.close();
    }
    await choose(page, 'Moeda', 'USD');
    await expect(total).toHaveText('US$ 247,96');
    await choose(page, 'Conta', 'all');
    await choose(page, 'Moeda', 'original');
    await expect(categories.locator('.report-lane')).toHaveCount(2);
    await expect(evolution.locator('.report-lane')).toHaveCount(2);
    expect(await charts.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await choose(page, 'Conta', 'demo-u');
    await expect(categories.locator('.report-lane')).toHaveCount(1);
    await expect(total).toHaveText('US$ 0,00');
    await expect(categories).toContainText('Nenhuma despesa na consulta');
    await expect(evolution.locator('.series-labels .previous-label')).toContainText('US$ 14,00');
  } finally {
    await app?.close();
    await clean(profile);
  }
});
