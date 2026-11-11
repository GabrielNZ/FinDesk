import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const requireApp = createRequire(join(process.cwd(), 'package.json'));
const { DemoStore } = requireApp('./out/desktop/storage/store.js');

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
  await expect(page.locator('.movement')).toHaveCount(10);
  await expect(page.locator('fd-expense-analyses .card-item')).toHaveCount(4);
  return { app, page };
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-analysis-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
test('F07a: demo, investigação/filtros/Seleção, organização/foco/reabertura, janela estreita e IPC', async () => {
  test.setTimeout(180_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-analysis-ui-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const initial = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
    }));
    const board = () => page.locator('fd-expense-analyses');
    const card = (id: string) => board().locator(`[data-card-id="${id}"]`);
    await expect(card('largest')).toContainText('Entretenimento');
    await expect(card('largest')).toContainText('R$ 279,80');
    await expect(card('increase')).toContainText('Alimentação');
    await expect(card('decrease')).toContainText('Entretenimento');
    await expect(card('usual')).toContainText('Histórico insuficiente');
    expect((await card('largest').boundingBox())!.height).toBeCloseTo(284, 1);
    for (const id of ['largest', 'increase', 'decrease']) {
      await expect
        .poll(() =>
          card(id)
            .locator('.card-content')
            .evaluate((e) => e.scrollHeight <= e.clientHeight && e.scrollWidth <= e.clientWidth),
        )
        .toBe(true);
    }
    await board().screenshot({ path: 'test-results/expense-analysis-compact.png' });
    const chartSize = () =>
      card('largest')
        .locator('.insight-chart')
        .evaluate((e) => ({
          height: e.querySelector('svg')!.getBoundingClientRect().height,
          gap: parseFloat(getComputedStyle(e).marginTop),
        }));
    const initialChart = await chartSize();
    expect(initialChart.height).toBeGreaterThanOrEqual(76);
    const corner = await card('largest').locator('.resize-handle').boundingBox();
    await page.mouse.move(corner!.x + corner!.width - 5, corner!.y + corner!.height - 5);
    await page.mouse.down();
    await page.mouse.move(corner!.x + corner!.width - 5, corner!.y + corner!.height + 75, {
      steps: 8,
    });
    await expect
      .poll(async () => {
        const next = await chartSize();
        return next.height > initialChart.height + 30 && next.gap > initialChart.gap;
      })
      .toBe(true);
    await page.screenshot({ path: 'test-results/expense-analysis-resize.png' });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect((await card('largest').boundingBox())!.height).toBeCloseTo(284, 1);
    await expect(card('largest').locator('.y-tick')).toHaveCount(3);
    await expect(card('largest').locator('.x-axis, figcaption')).toHaveCount(0);
    await expect(board().getByText('Ver cálculo', { exact: true })).toHaveCount(0);
    const chart = card('largest').locator('.insight-chart');
    const svg = chart.locator('svg');
    const svgBox = await svg.boundingBox();
    await page.mouse.move(svgBox!.x + svgBox!.width * (232 / 240), svgBox!.y + svgBox!.height / 2);
    await expect(chart.locator('.hover-day')).toHaveText('Dia 29');
    await expect(chart.locator('.current-period')).toContainText('Atual');
    await expect(chart.locator('.previous-period')).toContainText('Anterior');
    expect(
      (await chart.locator('.hover-period').allTextContents()).every((row) => !row.includes('/')),
    ).toBe(true);
    await expect(chart.locator('.hover-tooltip')).toContainText('R$ 320,00');
    await expect(chart.locator('.hover-marker')).toHaveCount(2);
    await chart.screenshot({ path: 'test-results/expense-analysis-hover.png' });
    await page.mouse.move(
      svgBox!.x + svgBox!.width * (232 / 240),
      svgBox!.y + svgBox!.height * (6 / 64),
    );
    await expect(chart.locator('.hover-day')).toHaveText('Dia 29');
    await expect(card('largest').locator('.bar-track')).toHaveCount(0);
    await expect(card('largest').locator('.previous-trend')).toHaveAttribute(
      'marker-end',
      /previous/,
    );
    await expect(card('largest').locator('.previous-trend')).toHaveCSS(
      'stroke',
      'rgb(220, 137, 132)',
    );
    await expect(card('largest').locator('.current-trend')).toHaveAttribute(
      'marker-end',
      /expense-trend-arrow-largest-BRL/,
    );
    await expect(card('largest').locator('.current-trend')).toHaveAttribute('d', /^M.* L/);
    expect(await card('largest').locator('.current-trend').getAttribute('d')).not.toMatch(/[HV]/);
    await expect(chart.locator('.hover-tooltip')).toContainText('R$ 279,80');
    await chart.focus();
    await page.keyboard.press('Home');
    await expect(chart.locator('.hover-day')).toHaveText('Dia 1');
    await page.keyboard.press('ArrowRight');
    await expect(chart.locator('.hover-day')).toHaveText('Dia 2');
    await page.keyboard.press('End');
    await expect(chart.locator('.hover-day')).toHaveText('Dia 29');
    await page.keyboard.press('Escape');
    await expect(chart.locator('.hover-tooltip')).toHaveCount(0);
    await page.locator('[data-movement-id="mov-uber-1"] .select-movement').click();
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    const trigger = card('largest').getByRole('button', { name: /Ver extrato de Entretenimento/ });
    await trigger.scrollIntoViewIfNeeded();
    const scrollBefore = await page.locator('.workspace').evaluate((e) => e.scrollTop);
    await trigger.click();
    const modal = page.getByRole('dialog', { name: 'Extrato · Entretenimento', exact: true });
    await expect(modal).toBeVisible();
    expect(await modal.evaluate((e) => e.matches(':modal'))).toBe(true);
    await expect(modal.locator('.preview-movement')).toHaveCount(2);
    await expect(modal.locator('footer')).toContainText('R$ 279,80');
    await expect(modal.getByRole('button', { name: 'Fechar extrato', exact: true })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Agrupamento', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await expect(page.locator('.active-filters')).toHaveCount(0);
    await modal.locator('summary').first().click();
    await expect(modal).toContainText('Valor original');
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    }
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).evaluate((e) => e.focus());
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    await page.screenshot({ path: 'test-results/expense-statement-modal.png' });
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect
      .poll(() => page.locator('.workspace').evaluate((e) => e.scrollTop))
      .toBe(scrollBefore);
    await expect(card('largest')).toContainText('R$ 279,80');
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(10);
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Uber');
    await expect(card('largest')).toContainText('R$ 60,00');
    await card('largest')
      .getByRole('button', { name: /Ver extrato de Transporte/ })
      .click();
    const transportModal = page.getByRole('dialog', { name: 'Extrato · Transporte', exact: true });
    await expect(transportModal.locator('.preview-movement')).toHaveCount(2);
    await expect(transportModal.locator('footer')).toContainText('R$ 60,00');
    await transportModal.getByRole('button', { name: 'Fechar extrato', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: 'Buscar movimentações' })).toHaveValue('Uber');
    await expect(card('largest')).toContainText('R$ 60,00');
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('');
    await expect(
      page.getByRole('button', { name: 'Remover investigação', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('.movement')).toHaveCount(10);
    await card('largest').locator('.card-shell').focus();
    await page.keyboard.press('ArrowRight');
    await card('largest')
      .getByRole('button', { name: 'Redimensionar Maior gasto', exact: true })
      .focus();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(async () => {
        const next = await chartSize();
        return next.height > initialChart.height && next.gap > initialChart.gap;
      })
      .toBe(true);
    await expect
      .poll(async () => {
        const v = await page.evaluate(() => window.finDesk!.storage.getExpenseAnalysisLayout());
        return v.ok ? v.value?.cards[0]?.id : null;
      })
      .toBe('increase');
    const saved = await page.evaluate(() => window.finDesk!.storage.getExpenseAnalysisLayout());
    await card('largest').locator('.card-shell').focus();
    await page.keyboard.press('Enter');
    await expect(card('largest')).toHaveClass(/focused-card/);
    await page.keyboard.press('Escape');
    await expect(card('largest')).not.toHaveClass(/focused-card/);
    await expect(board().locator('.card-item:visible')).toHaveCount(4);
    await expect
      .poll(async () => {
        const left = await card('increase').boundingBox(),
          right = await card('largest').boundingBox();
        return !!left && !!right && right.x >= left.x + left.width;
      })
      .toBe(true);
    await expect
      .poll(async () => page.evaluate(() => window.finDesk!.storage.getExpenseAnalysisLayout()))
      .toEqual(saved);
    const unchanged = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      general: await window.finDesk!.storage.getCardLayout(),
    }));
    expect(unchanged).toEqual(initial);
    const layout = saved.ok ? saved.value : null;
    expect(layout).not.toBeNull();
    const rejected = await app.evaluate(async ({ BrowserWindow, app }, layout) => {
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
          `Promise.all([window.finDesk.storage.getExpenseAnalysisLayout(),window.finDesk.storage.saveExpenseAnalysisLayout(${JSON.stringify(layout)})])`,
        );
      } finally {
        other.destroy();
      }
    }, layout);
    expect(rejected.every((r: { ok: boolean }) => !r.ok)).toBe(true);
    await page.screenshot({ path: 'test-results/expense-analysis-wide.png' });
    await app.close();
    app = undefined;
    session = await launch(profile);
    app = session.app;
    page = session.page;
    expect(await page.evaluate(() => window.finDesk!.storage.getExpenseAnalysisLayout())).toEqual(
      saved,
    );
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 800));
    await expect
      .poll(() => page.getByRole('main').evaluate((e) => e.scrollWidth <= e.clientWidth))
      .toBe(true);
    await page.screenshot({ path: 'test-results/expense-analysis-narrow.png' });
    await card('largest')
      .getByRole('button', { name: /Ver extrato de Entretenimento/ })
      .click();
    const narrowModal = page.getByRole('dialog', { name: 'Extrato · Entretenimento', exact: true });
    await expect(narrowModal).toBeVisible();
    expect(await narrowModal.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/expense-statement-modal-narrow.png' });
    await narrowModal.getByRole('button', { name: 'Fechar extrato', exact: true }).click();
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F07a: referências numéricas temporárias, clique preserva destaques e fatos manuais recalculam', async () => {
  test.setTimeout(180_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-analysis-ui-'));
  let app: ElectronApplication | undefined;
  try {
    const store = new DemoStore(join(profile, 'storage'));
    try {
      const snapshot = store.readDemo(),
        base = snapshot.facts.movements.find((m: { id: string }) => m.id === 'mov-uber-1');
      const old = ['07', '08', '09'].flatMap((month) =>
        [
          ['transporte', 1000],
          ['alimentacao', 10000],
          ['casa', 10000],
          ['entretenimento', 50000],
        ].map(([categoryId, amount]) => ({
          ...base,
          id: `history-${month}-${categoryId}`,
          on: `2026-${month}-08`,
          categoryId,
          delta: { minorUnits: -Number(amount), currency: 'BRL' },
          origin: {
            kind: 'file',
            sourceId: 'demo-statement',
            externalId: `history-${month}-${categoryId}`,
          },
        })),
      );
      store.saveDemo({
        ...snapshot,
        facts: {
          ...snapshot.facts,
          accounts: snapshot.facts.accounts.map((a: object) => ({ ...a, openingOn: '2026-06-30' })),
          movements: [
            ...snapshot.facts.movements.filter(
              (m: { id: string }) => !m.id.startsWith('demo-september-2026-'),
            ),
            ...old,
          ],
          coverage: snapshot.facts.coverage.map((c: object) => ({
            ...c,
            range: { start: '2026-07-01', end: snapshot.asOf },
          })),
        },
      });
    } finally {
      store.close();
    }
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const card = (id: string) => page.locator(`fd-expense-analyses [data-card-id="${id}"]`);
    await expect(card('increase')).toContainText('Alimentação');
    await expect(card('increase')).toContainText('+R$ 80,00');
    await expect(card('decrease')).toContainText('Entretenimento');
    await expect(card('decrease')).toContainText('-R$ 220,20');
    await expect(card('usual')).toContainText('vs média de 3');
    await card('usual').locator('.insight-chart').focus();
    await page.keyboard.press('End');
    await expect(card('usual').locator('.hover-tooltip')).toContainText('R$ 500,00');
    await expect(card('usual').locator('.previous-trend')).toHaveCount(1);
    await expect(card('usual').locator('.current-trend')).toHaveCount(1);
    await expect(card('usual').locator('.hover-tooltip')).toContainText('R$ 279,80');
    await card('usual').locator('.insight-chart').focus();
    await expect(card('usual').locator('.insight-chart')).toHaveAttribute(
      'aria-label',
      /Anterior do gráfico: R\$ 500,00/,
    );
    await page
      .locator('fd-expense-analyses')
      .screenshot({ path: 'test-results/expense-analysis-charts.png' });
    const unchanged = await card('decrease').innerText();
    await card('increase')
      .getByRole('button', { name: /Ver extrato de Alimentação/ })
      .click();
    const modal = page.getByRole('dialog', { name: 'Extrato · Alimentação', exact: true });
    await expect(modal.locator('.preview-movement')).toHaveCount(1);
    await expect(page.locator('.movement')).toHaveCount(10);
    expect(await card('decrease').innerText()).toBe(unchanged);
    await modal.getByRole('button', { name: 'Fechar extrato', exact: true }).click();
    await page.getByRole('button', { name: 'Nova despesa', exact: true }).click();
    const panel = page.locator('fd-expense-panel');
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('400,00');
    await panel.getByLabel('Data da despesa', { exact: true }).fill('2026-10-20');
    await panel.getByLabel('Descrição', { exact: true }).fill('Manual análise fictícia');
    await panel.locator('.category-current').click();
    await panel.getByRole('button', { name: 'Casa', exact: true }).click();
    await panel.getByRole('button', { name: 'Salvar despesa', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Despesa salva');
    await page.keyboard.press('Escape');
    await expect(card('largest')).toContainText('R$ 520,00');
    const row = page.locator('.movement').filter({ hasText: 'Manual análise fictícia' });
    await row.getByRole('button', { name: 'Editar despesa', exact: true }).click();
    await panel.getByLabel('Valor · BRL', { exact: true }).fill('600,00');
    await panel.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Despesa atualizada');
    await page.keyboard.press('Escape');
    await expect(card('largest')).toContainText('R$ 720,00');
    await row.getByRole('button', { name: 'Excluir despesa', exact: true }).click();
    const trash = page.locator('fd-expense-trash-panel');
    await trash.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await expect(card('largest')).toContainText('Entretenimento');
    await trash.getByRole('button', { name: 'Recuperar', exact: true }).click();
    await expect(card('largest')).toContainText('R$ 720,00');
    await page.screenshot({ path: 'test-results/expense-analysis-comparison.png' });
  } finally {
    await app?.close();
    await clean(profile);
  }
});
