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
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Finanças', exact: true })
    .click();
  await submenu(page, 'Movimentações');
  await expect(page.getByRole('region', { name: 'Extrato de movimentações' })).toBeVisible();
  return { app, page };
}
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-statement-')
  )
    throw new Error('Perfil de teste inválido.');
  await rm(profile, { recursive: true, force: true });
}
async function submenu(page: Page, label: string) {
  const link = page
    .getByRole('navigation', { name: 'Submenus de Finanças' })
    .getByRole('link', { name: label, exact: true });
  await link.click();
  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.finance-submenus a.active')).toHaveCount(1);
  await expect(page.locator('.finance-submenus a.active')).toHaveText(label);
}
async function choose(page: Page, label: string, value: string) {
  const trigger = page.getByRole('button', { name: new RegExp(`^${label}:`) });
  await trigger.scrollIntoViewIfNeeded();
  // A rolagem do conteúdo fecha os seletores; concluir o retorno ao cabeçalho antes de abrir.
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

async function dragMovement(
  page: Page,
  id: string,
  finish: 'drop' | 'outside' | 'escape' = 'drop',
) {
  const source = page.locator(`[data-movement-id="${id}"] .movement-summary`);
  await source.scrollIntoViewIfNeeded();
  const box = (await source.boundingBox())!;
  const area = (await page.getByRole('region', { name: 'Análise da seleção' }).boundingBox())!;
  await page.mouse.move(box.x + 65, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(area.x + area.width / 2, Math.min(area.y + 80, 600), { steps: 8 });
  await expect(page.locator('.fd-statement-ghost:popover-open')).toBeVisible();
  await expect(page.locator('.selection-area')).toHaveClass(/drop-ready/);
  if (finish === 'escape') await page.keyboard.press('Escape');
  if (finish === 'outside') await page.mouse.move(10, 80, { steps: 4 });
  await page.mouse.up();
  await page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
  await expect(page.locator('.fd-statement-ghost')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/fd-statement-dragging/);
  await expect(page.locator('.selection-area')).not.toHaveClass(/drop-ready|dragging/);
}

async function resizeList(page: Page, dx: number, dy: number, cancel = false) {
  const corner = page.getByRole('button', { name: 'Redimensionar lista de movimentações' });
  await corner.scrollIntoViewIfNeeded();
  const box = (await corner.boundingBox())!;
  await page.mouse.move(box.x + box.width - 4, box.y + box.height - 4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4 + dx, box.y + box.height - 4 + dy, { steps: 4 });
  await expect(page.locator('body')).toHaveClass(/fd-statement-resizing/);
  if (cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveClass(/fd-statement-resizing/);
  await expect(page.locator('.table-panel')).not.toHaveClass(/resizing/);
}

async function dragGroup(
  page: Page,
  label: string,
  finish: 'drop' | 'outside' | 'escape' = 'drop',
) {
  const source = page.locator(`.group-card[data-group-label="${label}"] .group-summary`);
  await source.scrollIntoViewIfNeeded();
  const box = (await source.boundingBox())!;
  const zone = (await page.locator('.selection-area').boundingBox())!;
  await page.mouse.move(box.x + 45, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(zone.x + zone.width / 2, Math.min(zone.y + 60, 600), { steps: 8 });
  await expect(page.locator('.fd-statement-ghost:popover-open')).toBeVisible();
  await expect(page.locator('.selection-area')).toHaveClass(/drop-ready/);
  if (finish === 'escape') await page.keyboard.press('Escape');
  if (finish === 'outside') await page.mouse.move(10, 70, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator('.fd-statement-ghost')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/fd-statement-dragging/);
  await expect(page.locator('.selection-area')).not.toHaveClass(/drop-ready|dragging/);
}

test('F05a/D99–D100: limpar seleção preserva rolagem e switch mantém altura, contexto, arraste e teclado', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    await page.locator('#select-mov-energia').click();
    await page.locator('#select-mov-uber-1').click();
    const main = page.locator('.workspace');
    await main.evaluate((element) => {
      element.scrollTop = 100;
    });
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
    const scroll = await main.evaluate((element) => element.scrollTop);
    expect(scroll).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    const samples = await main.evaluate(async (element) => {
      const values = [];
      for (let i = 0; i < 8; i++) {
        await new Promise(requestAnimationFrame);
        values.push(element.scrollTop);
      }
      return values;
    });
    expect(samples.every((value) => Math.abs(value - scroll) < 2)).toBe(true);
    await expect(page.locator('.selection-area')).toBeFocused();
    await page.locator('#select-mov-uber-1').click();
    const control = page.getByRole('tablist', { name: 'Conteúdo de Movimentações' });
    await control.scrollIntoViewIfNeeded();
    const dimensions = await control.evaluate((element) => {
      const reference = document.createElement('div');
      reference.style.cssText =
        'position:absolute;left:-9999px;display:flex;gap:14px;width:max-content';
      for (const button of Array.from(element.querySelectorAll('button'))) {
        const clone = document.createElement('button');
        clone.textContent = button.textContent;
        clone.style.cssText = `font:${getComputedStyle(button).font};padding:6px 0;border:0;border-bottom:2px solid transparent;white-space:nowrap`;
        reference.append(clone);
      }
      document.body.append(reference);
      const actual = element.getBoundingClientRect(),
        old = reference.getBoundingClientRect();
      const result = {
        width: actual.width,
        height: actual.height,
        oldWidth: old.width,
        oldHeight: old.height,
      };
      reference.remove();
      return result;
    });
    expect(dimensions.width).toBeGreaterThan(dimensions.oldWidth);
    expect(dimensions.height).toBeCloseTo(dimensions.oldHeight, 0);
    const statementTab = page.getByRole('tab', { name: 'Extrato', exact: true });
    const groupingTab = page.getByRole('tab', { name: 'Agrupamento', exact: true });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const motion = await control.evaluate(
      (element) =>
        new Promise<{ start: number; middle: number; end: number; duration: number }>(
          (resolve, reject) => {
            const thumb = element.querySelector<HTMLElement>('.source-thumb')!;
            const start = thumb.getBoundingClientRect().left;
            const timeout = setTimeout(() => {
              observer.disconnect();
              reject(new Error('Transição do switch ausente.'));
            }, 5000);
            const observer = new MutationObserver(() => {
              // Busca a transição real após a atualização Angular, antes de um frame eventualmente limitado pelo Windows.
              const animation = thumb
                .getAnimations()
                .find(
                  (animation) =>
                    animation instanceof CSSTransition &&
                    animation.transitionProperty === 'transform',
                );
              if (!animation) return;
              observer.disconnect();
              clearTimeout(timeout);
              const duration = Number(animation.effect!.getComputedTiming().duration);
              animation.pause();
              animation.currentTime = duration / 2;
              const middle = thumb.getBoundingClientRect().left;
              animation.currentTime = duration;
              const end = thumb.getBoundingClientRect().left;
              animation.finish();
              resolve({ start, middle, end, duration });
            });
            observer.observe(thumb, { attributes: true, attributeFilter: ['style'] });
            element.querySelector<HTMLButtonElement>('#finance-source-grouping')!.click();
          },
        ),
    );
    expect(motion.duration).toBeGreaterThan(0);
    expect(motion.end).toBeGreaterThan(motion.start + 20);
    expect(motion.middle).toBeGreaterThan(motion.start + 1);
    expect(motion.middle).toBeLessThan(motion.end - 1);
    await expect(groupingTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    let from = (await groupingTab.boundingBox())!,
      to = (await statementTab.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
    await expect(control).toHaveClass(/dragging/);
    await expect(groupingTab).toHaveAttribute('aria-selected', 'true');
    await page.mouse.up();
    await expect(statementTab).toHaveAttribute('aria-selected', 'true');
    await expect(control).not.toHaveClass(/dragging/);
    await expect(page.locator('.movement')).toHaveCount(10);
    from = (await statementTab.boundingBox())!;
    to = (await groupingTab.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
    await expect(control).toHaveClass(/dragging/);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(control).not.toHaveClass(/dragging/);
    await expect(statementTab).toHaveAttribute('aria-selected', 'true');
    await statementTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(groupingTab).toBeFocused();
    await expect(groupingTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(statementTab).toBeFocused();
    await page.keyboard.press('End');
    await expect(groupingTab).toBeFocused();
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page
        .locator('.source-thumb')
        .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
    ).toBe(0);
    await page.screenshot({
      path: 'test-results/statement-source-switch.png',
      fullPage: true,
      animations: 'disabled',
    });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    expect(
      await page
        .getByRole('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a/D88: quatro itens exibem total, subtotais e atualizam a soma ao remover/filtrar', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    for (const id of ['mov-aporte', 'mov-energia', 'mov-mensal', 'mov-fat-out'])
      await page.locator(`#select-${id}`).click();
    const total = page.locator('[data-grand-currency="BRL"]');
    await expect(page.locator('.selected-movement')).toHaveCount(4);
    await expect(total).toHaveText('-R$ 619,90');
    await expect(page.locator('[data-total-kind="expense"] strong')).toHaveText('R$ 159,90');
    await expect(page.locator('[data-total-kind="invoice-payment"] strong')).toHaveText(
      'R$ 260,00',
    );
    await expect(page.locator('[data-total-kind="investment-contribution"] strong')).toHaveText(
      'R$ 200,00',
    );
    await page.locator('.selection-header').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/statement-grand-total.png', fullPage: true });
    await page.locator('[data-selected-id="mov-fat-out"] .remove-selection').click();
    await expect(total).toHaveText('-R$ 359,90');
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('Energia');
    await expect(total).toHaveText('-R$ 120,00');
    await search.fill('');
    await page.locator('#select-mov-sal').click();
    await expect(total).toHaveText('R$ 2.880,00');
    await expect(total).toHaveCSS('color', 'rgb(101, 214, 173)');
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

async function listLayout(page: Page) {
  return page.evaluate(async () => {
    const result = await window.finDesk!.storage.getStatementLayout();
    if (!result.ok) throw new Error(result.error.code);
    return result.value;
  });
}

test('F05a/D94–D96: grade expande extrato por estabelecimento sem filtrar consulta ou seleção', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getStatementLayout(),
      cards: await window.finDesk!.storage.getCardLayout(),
    }));
    const source = (await page.locator('.movement-list').boundingBox())!;
    const selection = (await page.locator('.selection-area').boundingBox())!;
    expect(source.width / (source.width + selection.width)).toBeCloseTo(0.7, 2);
    await page.locator('#select-mov-energia').click();
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Agrupamento', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const grid = page.locator('.group-grid');
    await expect(grid).toHaveCSS('display', 'grid');
    await expect(page.locator('.group-card[data-group-level="category"]')).toHaveCount(4);
    const tiles = await page.locator('.group-card').evaluateAll((cards) =>
      cards.map((card) => ({
        x: card.getBoundingClientRect().x,
        y: card.getBoundingClientRect().y,
        width: card.getBoundingClientRect().width,
      })),
    );
    expect(tiles[1]!.x).toBeGreaterThan(tiles[0]!.x);
    expect(tiles[1]!.y).toBeCloseTo(tiles[0]!.y, 0);
    await expect(page.locator('[data-group-label="Casa"] .group-icon .pi')).toHaveClass(/pi-home/);
    await expect(page.locator('.pi-folder')).toHaveCount(0);
    await page.screenshot({
      path: 'test-results/statement-group-cards.png',
      fullPage: true,
      animations: 'disabled',
    });
    for (const label of [
      'Recebimentos',
      'Transferências próprias',
      'Pagamentos de fatura',
      'Aportes',
    ])
      await expect(
        page.locator(`.group-card[data-group-level="kind"][data-group-label="${label}"]`),
      ).toBeVisible();
    await expect(page.locator('.movement')).toHaveCount(0);
    await page.getByRole('button', { name: 'Expandir Transporte', exact: true }).click();
    const transport = page.locator('.group-card[data-group-label="Transporte"]');
    await expect(page.locator('.group-card.expanded')).toHaveCount(1);
    expect((await transport.boundingBox())!.width).toBeGreaterThan(
      (await grid.boundingBox())!.width - 10,
    );
    await expect(transport.locator('.group-count')).toHaveText('2 lançamentos');
    await expect(transport.locator('.group-values')).toHaveText('-R$ 60,00');
    const uber = transport.getByRole('region', { name: 'Uber', exact: true });
    await expect(uber.locator('.merchant-total')).toHaveText('-R$ 60,00');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await expect(page.locator('.movement')).toHaveCount(2);
    await page.locator('[data-movement-id="mov-uber-1"] .movement-summary').click();
    await expect(page.locator('#detail-mov-uber-1')).toBeVisible();
    await expect(page.locator('#detail-mov-uber-1')).toContainText('Arquivo');
    await dragMovement(page, 'mov-uber-1');
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('#detail-mov-uber-1')).toBeVisible();
    await page.locator('#select-mov-uber-2').click();
    await expect(page.locator('.selected-movement')).toHaveCount(3);
    await page.locator('#select-mov-uber-2').click();
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'Agrupamento', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 150,00');
    await page.getByRole('button', { name: 'Recolher Transporte', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Casa', exact: true }).click();
    await expect(page.locator('.group-card.expanded')).toHaveCount(1);
    await expect(
      page.getByRole('button', { name: 'Expandir Transporte', exact: true }),
    ).toBeHidden();
    await expect(page.locator('.movement')).toHaveCount(1);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: 'Remover filtro de grupo', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('tab', { name: 'Extrato', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(10);
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Movimentações por data' })).toBeVisible();
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Recolher Casa', exact: true })).toBeVisible();
    await page.screenshot({
      path: 'test-results/statement-grouping-wide.png',
      fullPage: true,
      animations: 'disabled',
    });
    await submenu(page, 'Geral');
    await submenu(page, 'Movimentações');
    await expect(page.getByRole('tab', { name: 'Agrupamento', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Recolher Casa', exact: true })).toBeVisible();
    expect(
      await page.evaluate(async () => ({
        facts: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        layout: await window.finDesk!.storage.getStatementLayout(),
        cards: await window.finDesk!.storage.getCardLayout(),
      })),
    ).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F05a: foco temporário, teclado e janela estreita mantêm consulta e layout salvo', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await listLayout(page);
    const statementTab = page.getByRole('tab', { name: 'Extrato', exact: true });
    await statementTab.focus();
    await page.keyboard.press('ArrowRight');
    const groupingTab = page.getByRole('tab', { name: 'Agrupamento', exact: true });
    await expect(groupingTab).toBeFocused();
    await expect(groupingTab).toHaveAttribute('aria-selected', 'true');
    const corner = page.getByRole('button', { name: 'Redimensionar agrupamento de movimentações' });
    await expect(corner).toBeEnabled();
    const width = (await page.locator('.movement-list').boundingBox())!.width;
    await page.getByRole('button', { name: 'Focar agrupamento', exact: true }).click();
    await expect(page.locator('.selection-area')).toBeHidden();
    expect((await page.locator('.movement-list').boundingBox())!.width).toBeGreaterThan(
      width + 100,
    );
    await expect(page.locator('.statement-resize-handle')).toBeDisabled();
    await expect(page.getByRole('button', { name: /^Conta:/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.selection-area')).toBeVisible();
    expect(await listLayout(page)).toEqual(before);
    await page.getByRole('button', { name: 'Focar seleção', exact: true }).click();
    await expect(page.locator('.movement-list')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Finanças', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.movement-list')).toBeVisible();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await expect
      .poll(() =>
        page.getByRole('main').evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    const entertainment = page.getByRole('button', {
      name: 'Expandir Entretenimento',
      exact: true,
    });
    await entertainment.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.group-card.expanded')).toHaveCount(1);
    await expect(page.locator('.merchant-section')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(page.locator('.group-card.expanded')).toHaveCount(0);
    await expect(entertainment).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('.group-card.expanded')).toHaveCount(1);
    await page.getByRole('button', { name: 'Recolher Entretenimento', exact: true }).click();
    await expect(page.locator('.group-card.expanded')).toHaveCount(0);
    await entertainment.click();
    expect(
      await page
        .locator('.movement-list')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/statement-grouping-narrow.png',
      fullPage: true,
      animations: 'disabled',
    });
    expect(await listLayout(page)).toEqual(before);
    await expect(corner).toBeDisabled();
    await page.getByRole('button', { name: 'Recolher Entretenimento', exact: true }).click();
    await expect(corner).toBeEnabled();
    const height = (await page.locator('.statement-group-scroll').boundingBox())!.height;
    await corner.focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await listLayout(page))?.listHeight).toBeCloseTo(height + 16, 0);
    const adjusted = await listLayout(page);
    await statementTab.click();
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    await expect
      .poll(async () => (await page.locator('.statement-table-scroll').boundingBox())!.height)
      .toBeCloseTo(height + 16, 0);
    expect(await listLayout(page)).toEqual(adjusted);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F05a/D97–D98: arraste de agrupamento cria bloco único, expansão preenche a área e contexto remove membros', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getStatementLayout(),
      cards: await window.finDesk!.storage.getCardLayout(),
    }));
    await page.locator('#select-mov-uber-1').click();
    await page.getByRole('tab', { name: 'Agrupamento', exact: true }).click();
    await dragGroup(page, 'Transporte', 'escape');
    await expect(page.locator('.selected-group')).toHaveCount(0);
    await dragGroup(page, 'Transporte', 'outside');
    await expect(page.locator('.selected-group')).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await dragGroup(page, 'Transporte');
    const block = page.locator('.selected-group[data-selected-group-label="Transporte"]');
    await expect(block).toBeVisible();
    await expect(block.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 60,00');
    await expect(block.locator('.selected-group-total')).toHaveText('-R$ 60,00');
    await expect(page.locator('.group-card.expanded')).toHaveCount(0);
    await dragGroup(page, 'Transporte');
    await expect(page.locator('.selected-group')).toHaveCount(1);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await page.getByRole('button', { name: 'Recolher seleção Transporte', exact: true }).click();
    await expect(block.locator('.selected-group-items')).toBeHidden();
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 60,00');
    await page.getByRole('button', { name: 'Expandir seleção Transporte', exact: true }).click();
    await page.getByRole('button', { name: 'Expandir Transporte', exact: true }).click();
    const expanded = page.locator('.group-card.expanded');
    await expect(page.locator('.group-card:visible')).toHaveCount(1);
    await expect(page.locator('.selection-area')).toBeVisible();
    await expect
      .poll(async () => {
        const box = (await expanded.boundingBox())!;
        return Math.abs(box.y + box.height - (await page.evaluate(() => window.innerHeight)) + 31);
      })
      .toBeLessThan(5);
    const emptySpace = await expanded.evaluate((element) => {
      const body = element.querySelector('.group-body')!;
      const detail = element.querySelector('.group-detail')!;
      return body.getBoundingClientRect().bottom - detail.getBoundingClientRect().bottom;
    });
    expect(emptySpace).toBeGreaterThan(40);
    await expect(
      page.getByRole('button', { name: 'Redimensionar agrupamento de movimentações' }),
    ).toBeDisabled();
    await page.screenshot({
      path: 'test-results/statement-group-selection.png',
      fullPage: true,
      animations: 'disabled',
    });
    await block.locator('[data-selected-id="mov-uber-1"] .remove-selection').click();
    await expect(block.locator('.selected-movement')).toHaveCount(1);
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 30,00');
    await page.getByRole('button', { name: 'Adicionar Transporte à seleção', exact: true }).click();
    await expect(block.locator('.selected-movement')).toHaveCount(2);
    await page.getByRole('button', { name: 'Recolher Transporte', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar Casa à seleção', exact: true }).click();
    await expect(page.locator('.selected-group')).toHaveCount(2);
    await expect(page.locator('.selected-movement')).toHaveCount(3);
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 180,00');
    await page.getByRole('button', { name: 'Remover agrupamento Transporte', exact: true }).click();
    await expect(page.locator('.selected-group')).toHaveCount(1);
    await expect(page.locator('[data-grand-currency="BRL"]')).toHaveText('-R$ 120,00');
    await page.getByRole('button', { name: 'Remover agrupamento Casa', exact: true }).click();
    await expect(page.locator('.selected-group')).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    await page.getByRole('button', { name: 'Adicionar Casa à seleção', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.selected-group[data-selected-group-label="Casa"]')).toBeVisible();
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('Uber');
    await expect(page.locator('.selected-group')).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    await search.fill('');
    await expect(page.locator('.selected-group')).toHaveCount(0);
    await page.getByRole('button', { name: 'Adicionar Transporte à seleção', exact: true }).click();
    await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
    await expect(page.locator('.selected-group')).toHaveCount(0);
    expect(
      await page.evaluate(async () => ({
        facts: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        layout: await window.finDesk!.storage.getStatementLayout(),
        cards: await window.finDesk!.storage.getCardLayout(),
      })),
    ).toEqual(before);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a: busca/filtros combinados, detalhes por teclado e contexto entre submenus sem gravar fatos', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getCardLayout(),
    }));
    await expect(page.locator('.movement')).toHaveCount(10);
    await page.screenshot({ path: 'test-results/statement-wide.png', fullPage: true });
    await expect(page.locator('.movement').first()).toHaveAttribute(
      'data-movement-id',
      'mov-aporte',
    );
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('UBER');
    await expect(page.locator('.movement')).toHaveCount(2);
    await page.getByRole('button', { name: 'Tipo', exact: true }).click();
    await page
      .getByRole('group', { name: 'Filtrar por tipo' })
      .getByRole('button', { name: 'Despesa', exact: true })
      .click();
    await page.getByRole('button', { name: 'Categoria', exact: true }).click();
    await page
      .getByRole('group', { name: 'Filtrar por categoria' })
      .getByRole('button', { name: 'Transporte', exact: true })
      .click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Categoria', exact: true })).toBeFocused();
    const summary = page.locator('[data-movement-id="mov-uber-1"] .movement-summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await expect(summary).toBeFocused();
    await expect(page.locator('#detail-mov-uber-1')).toContainText('Arquivo');
    await expect(page.locator('#detail-mov-uber-1')).toContainText('mov-uber-1');
    await submenu(page, 'Geral');
    await submenu(page, 'Movimentações');
    await expect(search).toHaveValue('UBER');
    await expect(page.locator('.movement')).toHaveCount(2);
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Remover busca', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(2);
    await page.getByRole('button', { name: 'Remover filtro de categoria', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(6);
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(10);
    await search.fill('SALARIO');
    await expect(page.locator('.movement')).toHaveCount(1);
    await search.fill('sem resultado');
    await expect(
      page.getByText('Nenhuma movimentação corresponde aos filtros.', { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(async () => ({
        facts: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        layout: await window.finDesk!.storage.getCardLayout(),
      })),
    ).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a: conta/moeda/ciclos atualizam lista, conversão identificada e apresentação ampla/estreita', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await page.screenshot({ path: 'test-results/statement-wide.png', fullPage: true });
    await page.getByRole('button', { name: 'Entre salários', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(9);
    await page.getByRole('button', { name: 'Entre fechamentos', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(9);
    await page.getByRole('button', { name: 'Mês calendário', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(10);
    await choose(page, 'Moeda', 'USD');
    await expect(page.locator('[data-movement-id="mov-aporte"] .movement-value')).toHaveText(
      '-US$ 40,00',
    );
    await expect(page.locator('.exchange-note')).toContainText('Cotação fictícia');
    await page.locator('[data-movement-id="mov-aporte"] .movement-summary').click();
    await expect(page.locator('#detail-mov-aporte')).toContainText('-R$ 200,00');
    await choose(page, 'Conta', 'all');
    await expect(page.locator('.movement')).toHaveCount(11);
    await expect(
      page.locator('.movement').filter({ hasText: 'Transferência própria' }),
    ).toHaveCount(2);
    await choose(page, 'Conta', 'demo-u');
    await expect(
      page.getByText('Nenhuma movimentação registrada neste período.', { exact: true }),
    ).toBeVisible();
    await choose(page, 'Conta', 'demo-a');
    await choose(page, 'Moeda', 'original');
    await page.getByRole('button', { name: 'Expandir seleção do mês', exact: true }).click();
    await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mês anterior', exact: true }).click();
    await expect(page.locator('.movement')).toHaveCount(10);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await expect
      .poll(() => page.getByRole('main').evaluate((node) => node.scrollWidth <= node.clientWidth))
      .toBe(true);
    await page.locator('.statement').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/statement-narrow.png', fullPage: true });
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a/D80–D82: arrastar reúne itens sem mover originais, soma, evita repetição e cancela fora/Escape', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Uber');
    await expect(
      page.getByRole('button', { name: 'Visualizar como cards', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    const source = page.locator('[data-movement-id="mov-uber-1"] .movement-summary');
    const originalBox = (await source.boundingBox())!;
    await source.click();
    await expect(source).toHaveAttribute('aria-expanded', 'true');
    await source.click();
    await expect(source).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    expect(await source.evaluate((element) => getComputedStyle(element).cursor)).toBe('default');
    await dragMovement(page, 'mov-uber-1');
    await expect(source).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('[data-movement-id="mov-uber-1"]')).toHaveClass(/selected/);
    expect((await source.boundingBox())!.x).toBeCloseTo(originalBox.x, 0);
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await dragMovement(page, 'mov-uber-2');
    await expect(page.locator('.movement')).toHaveCount(2);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('[data-total-kind="expense"] strong')).toHaveText('R$ 60,00');
    await expect(page.locator('[data-selected-id="mov-uber-1"]')).toContainText('Arquivo');
    await dragMovement(page, 'mov-uber-1');
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await page.screenshot({ path: 'test-results/statement-selection-wide.png', fullPage: true });
    await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
    await dragMovement(page, 'mov-uber-1', 'outside');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    await dragMovement(page, 'mov-uber-2', 'escape');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    const select = page.locator('#select-mov-uber-1');
    await select.focus();
    await page.keyboard.press('Space');
    await expect(select).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-selected-id="mov-uber-1"] .remove-selection').click();
    await expect(select).toBeFocused();
    await expect(select).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a/D82: modos preservam seleção, filtros a reduzem e subtotais financeiros mantêm tipos separados', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const before = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getCardLayout(),
    }));
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('Uber');
    await page.locator('#select-mov-uber-1').click();
    await page.locator('#select-mov-uber-2').click();
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Movimentações por data' })).toBeVisible();
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await submenu(page, 'Geral');
    await submenu(page, 'Movimentações');
    await expect(page.getByRole('table', { name: 'Movimentações por data' })).toBeVisible();
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await search.fill('mov-uber-1');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await search.fill('');
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await page.locator('#select-mov-fat-out').click();
    await page.locator('#select-mov-tr-a').click();
    await expect(page.locator('[data-total-kind="expense"] strong')).toHaveText('R$ 30,00');
    await expect(page.locator('[data-total-kind="invoice-payment"] strong')).toHaveText(
      'R$ 260,00',
    );
    await expect(page.locator('[data-total-kind="transfer-out"] strong')).toHaveText('R$ 400,00');
    const after = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      layout: await window.finDesk!.storage.getCardLayout(),
    }));
    expect(after).toEqual(before);
    await choose(page, 'Moeda', 'USD');
    await expect(page.locator('[data-total-kind="expense"] strong')).toHaveText('US$ 6,00');
    await expect(page.locator('.selected-movement')).toHaveCount(3);
    await expect(page.locator('.exchange-note')).toContainText('Cotação fictícia');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await expect
      .poll(() =>
        page.getByRole('main').evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    await page.locator('.selection-area').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/statement-selection-narrow.png', fullPage: true });
    await choose(page, 'Conta', 'demo-b');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    await choose(page, 'Conta', 'demo-a');
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    await page.getByRole('button', { name: 'Visualizar como cards', exact: true }).click();
    await page.locator('#select-mov-aporte').click();
    await expect(page.locator('[data-total-kind="investment-contribution"] strong')).toHaveText(
      'US$ 40,00',
    );
    await page.getByRole('button', { name: 'Expandir seleção do mês', exact: true }).click();
    await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    await expect(page.locator('.selected-movement')).toHaveCount(0);
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before.facts);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a/D84–D85: lista em tabela, cores pelo fluxo, detalhes e arraste por célula preservam seleção', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await choose(page, 'Conta', 'all');
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    const table = page.getByRole('table', { name: 'Movimentações por data' });
    await expect(table).toBeVisible();
    for (const label of ['Data', 'Descrição', 'Categoria', 'Conta', 'Valor']) {
      await expect(table.getByRole('columnheader', { name: label, exact: true })).toBeVisible();
    }
    await expect(page.locator('.movement')).toHaveCount(11);
    const out = page.locator('[data-movement-id="mov-uber-1"] .movement-value');
    const income = page.locator('[data-movement-id="mov-sal"] .movement-value');
    const transferIn = page.locator('[data-movement-id="mov-tr-b"] .movement-value');
    const transferOut = page.locator('[data-movement-id="mov-tr-a"] .movement-value');
    await expect(out).toHaveCSS('color', 'rgb(242, 139, 130)');
    await expect(income).toHaveCSS('color', 'rgb(101, 214, 173)');
    await expect(transferIn).toHaveCSS('color', 'rgb(101, 214, 173)');
    await expect(transferOut).toHaveCSS('color', 'rgb(242, 139, 130)');
    await page.screenshot({ path: 'test-results/statement-table-wide.png', fullPage: true });
    await page.getByRole('searchbox', { name: 'Buscar movimentações' }).fill('Uber');
    const row = page.locator('[data-movement-id="mov-uber-1"]');
    const summary = row.locator('.movement-summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#detail-mov-uber-1')).toBeVisible();
    await expect(page.locator('#detail-mov-uber-1 .fd-flow-out')).toHaveCSS(
      'color',
      'rgb(242, 139, 130)',
    );
    await page.keyboard.press('Space');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
    const cell = (await row.locator('td').first().boundingBox())!;
    const area = (await page.locator('.selection-area').boundingBox())!;
    await page.mouse.move(cell.x + cell.width / 2, cell.y + cell.height / 2);
    await page.mouse.down();
    await page.mouse.move(area.x + 60, Math.min(area.y + 90, 600), { steps: 4 });
    await expect(page.locator('.selection-area')).toHaveClass(/drop-ready/);
    await expect(page.locator('.fd-statement-ghost span')).toHaveCSS('color', 'rgb(242, 139, 130)');
    await page.mouse.up();
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await expect(row).toHaveClass(/selected/);
    await expect(page.locator('.selected-amount')).toHaveCSS('color', 'rgb(242, 139, 130)');
    await page.locator('#select-mov-uber-2').click();
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('[data-total-kind="expense"] strong')).toHaveText('R$ 60,00');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await expect
      .poll(() =>
        page.getByRole('main').evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    await page.locator('.statement-table-scroll').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/statement-table-narrow.png', fullPage: true });
    await page.getByRole('button', { name: 'Visualizar como cards', exact: true }).click();
    await expect(table).toHaveCount(0);
    await expect(page.locator('.selected-movement')).toHaveCount(2);
    await expect(page.locator('[data-movement-id="mov-uber-1"] .movement-value')).toHaveCSS(
      'color',
      'rgb(242, 139, 130)',
    );
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a/D86–D87: resize fluido salva só ao soltar, cancela por Escape e reabre sem alterar fatos/preferências', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    let session = await launch(profile);
    app = session.app;
    let page = session.page;
    const before = await page.evaluate(async () => ({
      facts: await window.finDesk!.storage.getDemo(),
      prefs: await window.finDesk!.storage.getPreferences(),
      cards: await window.finDesk!.storage.getCardLayout(),
    }));
    await expect(page.locator('[data-movement-id="mov-aporte"] .movement-icon')).toHaveCSS(
      'color',
      'rgb(163, 172, 169)',
    );
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    const corner = page.getByRole('button', { name: 'Redimensionar lista de movimentações' });
    await expect(corner).toBeEnabled();
    expect(await listLayout(page)).toBeNull();
    const invalid = await page.evaluate(() =>
      window.finDesk!.storage.saveStatementLayout({
        version: 1,
        area: 'finance-statement',
        listShare: 0.5,
        listHeight: null,
        sql: 'recusado',
      } as never),
    );
    expect(!invalid.ok && invalid.error.code).toBe('invalid-request');
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('Uber');
    await page.locator('#select-mov-uber-1').click();
    const scroll = page.locator('.statement-table-scroll');
    expect(
      await scroll.evaluate(
        (element) =>
          element.scrollWidth <= element.clientWidth &&
          element.scrollHeight <= element.clientHeight,
      ),
    ).toBe(true);
    await corner.scrollIntoViewIfNeeded();
    const original = (await scroll.boundingBox())!;
    const box = (await corner.boundingBox())!;
    await page.mouse.move(box.x + 26, box.y + 26);
    await page.mouse.down();
    await page.mouse.move(box.x + 56, box.y + 61, { steps: 3 });
    await expect
      .poll(async () => (await scroll.boundingBox())!.height)
      .toBeGreaterThan(original.height + 25);
    expect(await listLayout(page)).toBeNull();
    await page.mouse.move(box.x + 96, box.y + 106, { steps: 3 });
    await expect
      .poll(async () => (await scroll.boundingBox())!.width)
      .toBeGreaterThan(original.width + 55);
    const preview = (await scroll.boundingBox())!;
    await page.mouse.up();
    await expect.poll(() => listLayout(page)).not.toBeNull();
    const saved = (await listLayout(page))!;
    expect((await scroll.boundingBox())!.height).toBeCloseTo(preview.height, 0);
    await expect(page.locator('.selected-movement')).toHaveCount(1);
    await expect(page.locator('[data-selected-id="mov-uber-1"] .movement-icon')).toHaveCSS(
      'color',
      'rgb(163, 172, 169)',
    );
    await resizeList(page, -40, -35, true);
    expect(await listLayout(page)).toEqual(saved);
    expect((await scroll.boundingBox())!.height).toBeCloseTo(saved.listHeight!, 0);
    await corner.focus();
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(async () => (await listLayout(page))?.listHeight)
      .toBeCloseTo(saved.listHeight! + 16, 0);
    const keyboard = (await listLayout(page))!;
    await search.fill('');
    await expect(page.locator('.movement')).toHaveCount(10);
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);
    await page.screenshot({ path: 'test-results/statement-resize-wide.png', fullPage: true });
    expect(
      await page.evaluate(async () => ({
        facts: await window.finDesk!.storage.getDemo(),
        prefs: await window.finDesk!.storage.getPreferences(),
        cards: await window.finDesk!.storage.getCardLayout(),
      })),
    ).toEqual(before);
    await app.close();
    app = undefined;
    session = await launch(profile);
    app = session.app;
    page = session.page;
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Redimensionar lista de movimentações' }),
    ).toBeEnabled();
    expect(await listLayout(page)).toEqual(keyboard);
    await expect
      .poll(async () => (await page.locator('.statement-table-scroll').boundingBox())!.height)
      .toBeCloseTo(keyboard.listHeight!, 0);
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before.facts);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('F04a/D86–D87: rolagem só com excesso real, tamanho estreito e falha de gravação recuperável', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-statement-'));
  let app: ElectronApplication | undefined;
  try {
    const session = await launch(profile);
    app = session.app;
    const page = session.page;
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setSize(960, 720));
    await page.getByRole('button', { name: 'Visualizar como lista', exact: true }).click();
    const corner = page.getByRole('button', { name: 'Redimensionar lista de movimentações' });
    await expect(corner).toBeEnabled();
    const search = page.getByRole('searchbox', { name: 'Buscar movimentações' });
    await search.fill('Uber');
    const scroll = page.locator('.statement-table-scroll');
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true);
    await resizeList(page, -220, 45);
    await expect.poll(() => listLayout(page)).not.toBeNull();
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollWidth > element.clientWidth))
      .toBe(true);
    await resizeList(page, 220, 0);
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true);
    await page.screenshot({ path: 'test-results/statement-resize-narrow.png', fullPage: true });
    const saved = (await listLayout(page))!;
    const path = join(profile, 'storage', 'preferences.sqlite');
    const db = new DatabaseSync(path);
    try {
      db.exec(
        "CREATE TRIGGER reject_statement_size BEFORE UPDATE ON preferences WHEN NEW.key = 'layout.finance-statement.v1' BEGIN SELECT RAISE(ABORT, 'falha ficticia'); END",
      );
      await corner.focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('alert')).toHaveText('Tamanho aplicado, mas não foi salvo.');
      expect(await listLayout(page)).toEqual(saved);
    } finally {
      db.exec('DROP TRIGGER IF EXISTS reject_statement_size');
      db.close();
    }
    await page.getByRole('button', { name: 'Tentar salvar', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect
      .poll(async () => (await listLayout(page))?.listHeight)
      .toBeCloseTo(saved.listHeight! + 16, 0);
    expect(
      await page
        .getByRole('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  } finally {
    await app?.close();
    await clean(profile);
  }
});
