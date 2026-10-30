import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function launch(profile: string): Promise<ElectronApplication> {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const application = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  await application.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.show();
    BrowserWindow.getAllWindows()[0]?.focus();
  });
  return application;
}

async function openFinance(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Finanças', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Finanças.' })).toBeVisible();
}

function picker(page: Page, label: 'Conta' | 'Moeda') {
  return page.getByRole('button', { name: new RegExp(`^${label}:`) });
}

async function choose(page: Page, label: 'Conta' | 'Moeda', value: string): Promise<void> {
  await picker(page, label).click();
  await page
    .getByRole('listbox', { name: label, exact: true })
    .locator(`[role="option"][data-value="${value}"]`)
    .click();
}

async function openCalendarSelection(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /^(Expandir|Recolher) seleção do mês$/ });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await expect(page.locator('.calendar-panel')).toBeVisible();
}

async function openCycleSelection(page: Page, mode: 'salário' | 'cartão'): Promise<void> {
  const toggle = page.getByRole('button', {
    name:
      mode === 'salário'
        ? /^(Expandir|Recolher) intervalo salarial$/
        : /^(Expandir|Recolher) intervalo do cartão$/,
  });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await expect(page.locator('.period-panel')).toBeVisible();
}

async function expectCalendarRange(page: Page, range: string): Promise<void> {
  await openCalendarSelection(page);
  await expect(page.locator('.calendar-panel')).toHaveAttribute('aria-description', range);
}

async function clean(profile: string): Promise<void> {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-finance-')
  )
    throw new Error('Limpeza fora do teste recusada.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

test('D41: expansão conserva altura e desloca seta separada nos três modos', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    const page = await application.firstWindow();
    await openFinance(page);
    await expect(page.locator('.balance-value')).toHaveText(['R$ 2.500,20']);
    const wrapper = page.locator('.period-expander');
    const original = await wrapper.elementHandle();
    const panel = page.locator('.period-panel');
    const toggle = page.locator('.expansion-toggle');
    for (const [name, range] of [
      ['Mês calendário', '01/10/2026 – 31/10/2026'],
      ['Entre salários', '05/10/2026 – 04/11/2026'],
      ['Entre fechamentos', '03/10/2026 – 02/11/2026'],
    ] as const) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      const closed = await wrapper.boundingBox();
      const arrowBefore = await toggle.boundingBox();
      expect(closed && Math.round(closed.width) === 20 && Math.round(closed.height) === 44).toBe(
        true,
      );
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute('aria-description', range);
      await expect(page.locator('.period-range')).toHaveCount(0);
      const opened = await wrapper.boundingBox();
      const arrowAfter = await toggle.boundingBox();
      const panelBox = await panel.boundingBox();
      expect(panelBox && arrowAfter && Math.round(arrowAfter.x - panelBox.x - panelBox.width)).toBe(
        8,
      );
      expect(opened && Math.round(opened.width) === 258 && Math.round(opened.height) === 44).toBe(
        true,
      );
      expect(
        opened &&
          arrowAfter &&
          Math.abs(opened.x + opened.width - arrowAfter.x - arrowAfter.width) <= 2,
      ).toBe(true);
      expect(arrowAfter && arrowBefore && arrowAfter.x > arrowBefore.x + 200).toBe(true);
      expect(
        await original?.evaluate(
          (element) => element === document.querySelector('.period-expander'),
        ),
      ).toBe(true);
      await toggle.click();
      await expect(panel).toBeHidden();
      await expect(panel).toHaveAttribute('aria-description', range);
    }
    await page.getByRole('button', { name: 'Mês calendário', exact: true }).click();
    expect(
      await page
        .locator('.finance-submenus')
        .evaluate((element) => getComputedStyle(element).borderBottomWidth),
    ).toBe('0px');
    await page.mouse.move(500, 90);
    await page.screenshot({ path: 'test-results/finance-calendar-collapsed.png', fullPage: true });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.mouse.move(500, 90);
    await page.screenshot({ path: 'test-results/finance-periods-wide.png', fullPage: true });
    await page.getByRole('button', { name: 'Mês anterior', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
    await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
    );
    await page.getByRole('button', { name: 'Entre salários', exact: true }).click();
    await toggle.click();
    await expect(panel).toHaveAttribute('aria-description', '05/10/2026 – 04/11/2026');
    expect(
      await page
        .getByRole('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.mouse.move(500, 90);
    await page.screenshot({ path: 'test-results/finance-periods-compact.png', fullPage: true });
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('F02a: saldo atual, submenus e contexto persistido sem salvar mês histórico; layout amplo/compacto', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    let page = await application.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openFinance(page);
    const header = () => page.getByRole('region', { name: 'Contexto financeiro' });
    const period = () => page.getByRole('region', { name: 'Período consultado' });
    await expect(header().getByText('R$ 2.500,20', { exact: true })).toBeVisible();
    await expect(picker(page, 'Conta')).toHaveAttribute('data-value', 'demo-a');
    await expectCalendarRange(page, '01/10/2026 – 31/10/2026');
    await expect(page.getByRole('button', { name: 'Importar dados', exact: true })).toBeDisabled();
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await page.getByRole('button', { name: 'Mês anterior' }).click();
    await expectCalendarRange(page, '01/09/2026 – 30/09/2026');
    await expect(header().getByText('R$ 2.500,20', { exact: true })).toBeVisible();
    await expect(header().getByText('Saldo na referência fictícia de 29/10/2026')).toHaveCount(0);
    await choose(page, 'Conta', 'demo-u');
    await expect(header().getByText('US$ 300,00', { exact: true })).toBeVisible();
    await choose(page, 'Moeda', 'BRL');
    await expect(header().getByText('R$ 1.500,00', { exact: true })).toBeVisible();
    await expect(header().getByText('Cotação fictícia · 1 USD = 5 BRL · 29/10/2026')).toBeVisible();
    await header().getByText('Valores originais por conta', { exact: true }).click();
    await expect(header().getByText('US$ 300,00', { exact: true })).toBeVisible();
    for (const submenu of ['Movimentações', 'Cartão', 'Compromissos', 'Assinaturas', 'Geral']) {
      await page
        .getByRole('navigation', { name: 'Submenus de Finanças' })
        .getByRole('link', { name: submenu, exact: true })
        .click();
      await expect(page.getByRole('heading', { name: submenu, exact: true })).toBeVisible();
      await expect(picker(page, 'Conta')).toHaveAttribute('data-value', 'demo-u');
      await expect(picker(page, 'Moeda')).toHaveAttribute('data-value', 'BRL');
      await expectCalendarRange(page, '01/09/2026 – 30/09/2026');
      await expect(header().getByText('R$ 1.500,00', { exact: true })).toBeVisible();
      if (submenu === 'Cartão')
        await expect(page.getByText('Esta conta não possui cartão na demonstração.')).toBeVisible();
    }
    await choose(page, 'Conta', 'all');
    await expect(header().getByText('R$ 4.600,20', { exact: true })).toBeVisible();
    await choose(page, 'Moeda', 'original');
    await expect(header().locator('.balance-value')).toHaveText(['R$ 3.100,20', 'US$ 300,00']);
    await choose(page, 'Moeda', 'USD');
    await expect(header().locator('.balance-value')).toHaveText(['US$ 920,04']);
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Investimentos' })
      .click();
    await expect(page.getByRole('heading', { name: 'Investimentos.' })).toBeVisible();
    await openFinance(page);
    await expectCalendarRange(page, '01/09/2026 – 30/09/2026');
    await expect(header().locator('.balance-value')).toHaveText(['US$ 920,04']);
    await expect(
      page
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('link', { name: 'Finanças', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: 'test-results/finance-wide.png', fullPage: true });
    await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const boxes = await Promise.all([
      header().boundingBox(),
      picker(page, 'Conta').boundingBox(),
      period().boundingBox(),
    ]);
    expect(boxes.every((box) => box && box.x >= 0 && box.width > 0)).toBe(true);
    await page.getByRole('button', { name: 'Mês anterior' }).focus();
    await page.keyboard.press('Enter');
    await expectCalendarRange(page, '01/08/2026 – 31/08/2026');
    await page.screenshot({ path: 'test-results/finance-compact.png', fullPage: true });
    await expect
      .poll(async () => await page.evaluate(() => window.finDesk!.storage.getPreferences()))
      .toEqual({
        ok: true,
        value: {
          version: 2,
          currencyMode: 'USD',
          periodMode: 'calendar-month',
          lastAccountId: 'all',
        },
      });
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    await application.close();
    application = undefined;
    application = await launch(profile);
    page = await application.firstWindow();
    await openFinance(page);
    await expect(picker(page, 'Conta')).toHaveAttribute('data-value', 'all');
    await expect(picker(page, 'Moeda')).toHaveAttribute('data-value', 'USD');
    await expectCalendarRange(page, '01/10/2026 – 31/10/2026');
    await expect(header().locator('.balance-value')).toHaveText(['US$ 920,04']);
    expect(errors).toEqual([]);
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('F02a: conta salva ausente exige seleção e preferência de ciclo não é substituída silenciosamente', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    const page = await application.firstWindow();
    await page.evaluate(() =>
      window.finDesk!.storage.savePreferences({
        version: 2,
        currencyMode: 'original',
        periodMode: 'salary-cycle',
        lastAccountId: 'conta-ausente',
      }),
    );
    await openFinance(page);
    await expect(picker(page, 'Conta')).toHaveAttribute('data-value', '');
    await expect(page.getByText('Selecione uma conta para continuar.')).toBeVisible();
    await expect(page.locator('.balance-value')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mês calendário', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Entre salários', exact: true })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(
      page.getByRole('button', { name: 'Entre fechamentos', exact: true }),
    ).toHaveAttribute('aria-disabled', 'true');
    await choose(page, 'Conta', 'demo-b');
    await expect(page.locator('.balance-value')).toHaveText(['R$ 600,00']);
    await expect
      .poll(async () => await page.evaluate(() => window.finDesk!.storage.getPreferences()))
      .toEqual({
        ok: true,
        value: {
          version: 2,
          currencyMode: 'original',
          periodMode: 'salary-cycle',
          lastAccountId: 'demo-b',
        },
      });
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('F02a: falha ao salvar mantém contexto local, informa limite e não altera fatos', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    const page = await application.firstWindow();
    await openFinance(page);
    await expect(page.locator('.balance-value')).toHaveText(['R$ 2.500,20']);
    const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
    const db = new DatabaseSync(join(profile, 'storage', 'preferences.sqlite'));
    try {
      db.exec(
        "CREATE TRIGGER reject_preferences BEFORE UPDATE ON preferences BEGIN SELECT RAISE(ABORT, 'SQL privado'); END",
      );
      await choose(page, 'Conta', 'demo-u');
      await expect(page.getByRole('alert')).toHaveText(
        'Não foi possível salvar a seleção. Ela vale apenas nesta execução.',
      );
      await expect(page.locator('.balance-value')).toHaveText(['US$ 300,00']);
      const persisted = await page.evaluate(() => window.finDesk!.storage.getPreferences());
      expect(persisted.ok && persisted.value.lastAccountId).toBe(null);
      await page
        .getByRole('navigation', { name: 'Submenus de Finanças' })
        .getByRole('link', { name: 'Cartão', exact: true })
        .click();
      await expect(page.getByText('Esta conta não possui cartão na demonstração.')).toBeVisible();
      db.exec('DROP TRIGGER reject_preferences');
      await choose(page, 'Moeda', 'BRL');
      await expect
        .poll(async () => await page.evaluate(() => window.finDesk!.storage.getPreferences()))
        .toEqual({
          ok: true,
          value: {
            version: 2,
            currencyMode: 'BRL',
            periodMode: 'calendar-month',
            lastAccountId: 'demo-u',
          },
        });
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
    } finally {
      db.close();
    }
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('F02a: armazenamento incompatível e prévia sem ponte não inventam saldo nem apagam dados', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    await mkdir(join(profile, 'storage'));
    const filename = join(profile, 'storage', 'demo.sqlite');
    const db = new DatabaseSync(filename);
    db.exec('PRAGMA user_version = 99');
    db.close();
    const before = await readFile(filename);
    application = await launch(profile);
    const page = await application.firstWindow();
    await openFinance(page);
    await expect(page.getByRole('alert')).toContainText('incompatível');
    await expect(page.locator('.balance-value')).toHaveCount(0);
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('incompatível');
    const event = application.waitForEvent('window');
    await application.evaluate(async ({ BrowserWindow }) => {
      const preview = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      });
      await preview.loadURL('findesk://app/#/financas/geral');
    });
    const preview = await event;
    await expect(
      preview.getByText('Dados locais disponíveis no aplicativo desktop.'),
    ).toBeVisible();
    await expect(preview.locator('.balance-value')).toHaveCount(0);
    expect(await readFile(filename)).toEqual(before);
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('D34/D35: círculos soltos revelam nomes lateralmente, teclado/fechamento e movimento reduzido', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    const page = await application.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openFinance(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('.balance-value')).toHaveText(['R$ 2.500,20']);
    await expect(page.locator('.balance-icon')).toBeVisible();
    await expect(page.locator('.finance-header select')).toHaveCount(0);
    await page.mouse.move(500, 90);
    const account = picker(page, 'Conta');
    const closed = await account.boundingBox();
    expect(Math.round(closed?.width ?? 0)).toBe(44);
    await account.hover();
    expect(Math.round((await account.boundingBox())?.width ?? 0)).toBe(44);
    const contentWidth = await page.getByRole('main').evaluate((element) => element.clientWidth);
    await account.click();
    const list = page.getByRole('listbox', { name: 'Conta', exact: true });
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(3);
    await expect(list.getByRole('option', { name: 'Nubank', exact: true })).toHaveCount(0);
    const style = await list.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      border: getComputedStyle(element).borderTopWidth,
    }));
    expect(style).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px' });
    const nomad = list.getByRole('option', { name: 'Nomad', exact: true });
    await nomad.hover();
    await expect.poll(async () => (await nomad.boundingBox())?.width ?? 0).toBeGreaterThan(90);
    const symbol = await nomad.locator('fd-choice-symbol').boundingBox();
    expect(
      Math.abs((symbol?.x ?? 0) + (symbol?.width ?? 0) - (closed?.x ?? 0) - (closed?.width ?? 0)),
    ).toBeLessThan(3);
    expect(await page.getByRole('main').evaluate((element) => element.clientWidth)).toBe(
      contentWidth,
    );
    await page.screenshot({ path: 'test-results/finance-controls-wide.png', fullPage: true });
    await nomad.click();
    await expect(account).toHaveAttribute('data-value', 'demo-u');
    await expect(account).toBeFocused();
    await expect(list).toBeHidden();
    const currency = picker(page, 'Moeda');
    await currency.focus();
    await page.keyboard.press('ArrowDown');
    const currencyList = page.getByRole('listbox', { name: 'Moeda', exact: true });
    await expect(
      currencyList.getByRole('option', { name: 'Real · BRL', exact: true }),
    ).toBeFocused();
    await expect(currencyList.getByRole('option', { name: 'Original', exact: true })).toHaveCount(
      0,
    );
    await page.keyboard.press('End');
    await expect(
      currencyList.getByRole('option', { name: 'Dólar · USD', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(currency).toHaveAttribute('data-value', 'USD');
    await expect(currency).toBeFocused();
    await currency.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(currencyList).toBeHidden();
    await expect(currency).toBeFocused();
    await account.click();
    await currency.click();
    await expect(list).toBeHidden();
    await expect(currencyList).toBeVisible();
    await page.getByRole('button', { name: 'Expandir seleção do mês', exact: true }).click();
    await expect(currencyList).toBeHidden();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
    );
    await account.click();
    await expect(list).toBeVisible();
    expect(
      await list
        .locator('.choice-row')
        .first()
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe('none');
    await list.getByRole('option', { name: 'Todas as contas', exact: true }).hover();
    const expanded = await list
      .getByRole('option', { name: 'Todas as contas', exact: true })
      .boundingBox();
    expect(
      expanded &&
        expanded.x >= 0 &&
        expanded.x + expanded.width <= (await page.evaluate(() => innerWidth)),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/finance-controls-compact.png', fullPage: true });
    await page.keyboard.press('Escape');
    await currency.focus();
    await page.keyboard.press('ArrowDown');
    await expect(currencyList.getByRole('option', { name: 'Original', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(currencyList).toBeHidden();
    const badImages = await page
      .locator('fd-choice-symbol img')
      .evaluateAll(
        (images) =>
          images.filter(
            (image) =>
              !(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth === 0,
          ).length,
      );
    expect(badImages).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('D36–D38: três modos exclusivos, ciclos salvos, navegação e retorno silencioso ao calendário', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-finance-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    const page = await application.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openFinance(page);
    await expect(page.locator('.balance-value')).toHaveText(['R$ 2.500,20']);
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    const region = page.getByRole('region', { name: 'Período consultado' });
    const modes = page.getByRole('group', { name: 'Modo do período' });
    const calendar = modes.getByRole('button', { name: 'Mês calendário', exact: true });
    const salary = modes.getByRole('button', { name: 'Entre salários', exact: true });
    const card = modes.getByRole('button', { name: 'Entre fechamentos', exact: true });
    await expect(modes.getByRole('button')).toHaveCount(3);
    await expect(calendar).toHaveAttribute('aria-pressed', 'true');
    const expand = page.getByRole('button', { name: 'Expandir seleção do mês', exact: true });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.period-panel')).toBeHidden();
    const expander = page.locator('.period-expander');
    const originalExpander = await expander.elementHandle();
    const collapsedBox = await expander.boundingBox();
    expect(
      collapsedBox &&
        Math.round(collapsedBox.width) === 20 &&
        Math.round(collapsedBox.height) === 44,
    ).toBe(true);
    await page.screenshot({ path: 'test-results/finance-calendar-collapsed.png', fullPage: true });
    await expand.focus();
    await page.keyboard.press('Enter');
    await expectCalendarRange(page, '01/10/2026 – 31/10/2026');
    await expect(region.getByText('Outubro de 2026', { exact: true })).toBeVisible();
    await expect(region.getByText('01/10/2026 – 31/10/2026')).toHaveCount(0);
    expect(
      await originalExpander?.evaluate(
        (element) => element === document.querySelector('.period-expander'),
      ),
    ).toBe(true);
    const monthPanelBox = await expander.boundingBox();
    const monthButtonBox = await calendar.boundingBox();
    expect(
      monthPanelBox &&
        monthButtonBox &&
        Math.round(monthPanelBox.height) === Math.round(monthButtonBox.height) &&
        Math.round(monthPanelBox.y) === Math.round(monthButtonBox.y),
    ).toBe(true);
    await region.getByRole('button', { name: 'Mês anterior', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.period-panel')).toBeHidden();
    await expect(expand).toBeFocused();
    await expectCalendarRange(page, '01/10/2026 – 31/10/2026');
    const [balanceBox, calendarBox, salaryBox, cardBox, panelBox, actionBox] = await Promise.all([
      page.locator('.balance-block').boundingBox(),
      calendar.boundingBox(),
      salary.boundingBox(),
      card.boundingBox(),
      page.locator('.period-panel').boundingBox(),
      picker(page, 'Conta').boundingBox(),
    ]);
    expect(balanceBox && balanceBox.width <= 520 && balanceBox.height >= 156).toBe(true);
    expect(calendarBox && balanceBox && calendarBox.x > balanceBox.x + balanceBox.width).toBe(true);
    expect(
      calendarBox &&
        salaryBox &&
        cardBox &&
        Math.round(calendarBox.x) === Math.round(salaryBox.x) &&
        Math.round(salaryBox.x) === Math.round(cardBox.x) &&
        calendarBox.y < salaryBox.y &&
        salaryBox.y < cardBox.y,
    ).toBe(true);
    expect(panelBox && calendarBox && panelBox.x > calendarBox.x + calendarBox.width).toBe(true);
    expect(actionBox && panelBox && actionBox.x > panelBox.x + panelBox.width).toBe(true);
    await calendar.focus();
    await page.keyboard.press('ArrowRight');
    await expect(salary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(salary).toHaveAttribute('aria-pressed', 'true');
    await expect(calendar).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.period-panel')).toBeHidden();
    await openCycleSelection(page, 'salário');
    await expect(page.locator('.period-panel')).toHaveAttribute(
      'aria-description',
      '05/10/2026 – 04/11/2026',
    );
    await expect(region.getByText('05/10/2026 – 04/11/2026')).toHaveCount(0);
    await expect(region.getByRole('button', { name: 'Ciclo anterior' })).toBeDisabled();
    await expect(region.getByRole('button', { name: 'Próximo ciclo' })).toBeDisabled();
    await card.click();
    await expect(page.locator('.period-panel')).toBeHidden();
    await openCycleSelection(page, 'cartão');
    await expect(page.locator('.period-panel')).toHaveAttribute(
      'aria-description',
      '03/10/2026 – 02/11/2026',
    );
    await expect(modes.locator('[aria-pressed="true"]')).toHaveCount(1);
    await region.getByRole('button', { name: 'Próximo ciclo' }).click();
    await expect(page.locator('.period-panel')).toHaveAttribute(
      'aria-description',
      '03/11/2026 – 02/12/2026',
    );
    await calendar.click();
    await expect(
      page.getByRole('button', { name: 'Expandir seleção do mês', exact: true }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.period-panel')).toBeHidden();
    await openCalendarSelection(page);
    await region.getByRole('button', { name: 'Mês anterior' }).click();
    await expectCalendarRange(page, '01/09/2026 – 30/09/2026');
    await card.click();
    await openCycleSelection(page, 'cartão');
    await expect(page.locator('.period-panel')).toHaveAttribute(
      'aria-description',
      '03/11/2026 – 02/12/2026',
    );
    await expect(page.locator('.balance-value')).toHaveText(['R$ 2.500,20']);
    await choose(page, 'Conta', 'demo-u');
    await expect(calendar).toHaveAttribute('aria-pressed', 'true');
    await expect(card).toHaveAttribute('aria-disabled', 'true');
    await expect(salary).toHaveAttribute('aria-disabled', 'true');
    await expectCalendarRange(page, '01/09/2026 – 30/09/2026');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await salary.focus();
    await expect(
      page.getByRole('tooltip', { name: 'Sem duas datas previstas de salário nesta conta.' }),
    ).toBeVisible();
    await salary.dispatchEvent('click');
    await expect(calendar).toHaveAttribute('aria-pressed', 'true');
    await choose(page, 'Conta', 'all');
    await expect(card).toHaveAttribute('aria-disabled', 'true');
    await expect(salary).toHaveAttribute('aria-disabled', 'true');
    await choose(page, 'Conta', 'demo-a');
    await expect(card).toHaveAttribute('aria-disabled', 'false');
    await page.mouse.move(500, 90);
    await page.screenshot({ path: 'test-results/finance-periods-wide.png', fullPage: true });
    await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
    );
    await card.click();
    await openCycleSelection(page, 'cartão');
    await expect(page.locator('.period-panel')).toHaveAttribute(
      'aria-description',
      '03/11/2026 – 02/12/2026',
    );
    expect(
      await page
        .getByRole('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page
        .locator('.period-panel')
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe('none');
    const help = await page.locator('#period-help-card-cycle').boundingBox();
    const mainBox = await page.getByRole('main').boundingBox();
    expect(
      help && mainBox && help.x >= mainBox.x && help.x + help.width <= mainBox.x + mainBox.width,
    ).toBe(true);
    await page.mouse.move(300, 90);
    await page.screenshot({ path: 'test-results/finance-periods-compact.png', fullPage: true });
    expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(before);
    const preferences = await page.evaluate(() => window.finDesk!.storage.getPreferences());
    expect(preferences.ok && preferences.value.periodMode).toBe('calendar-month');
    expect(errors).toEqual([]);
  } finally {
    await application?.close();
    await clean(profile);
  }
});
