import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
async function clean(profile: string) {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-commitments-ui-')
  )
    throw new Error('Perfil inválido.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
async function launch(profile: string) {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]!;
    window.setSize(1800, 1400);
    window.show();
    window.focus();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('link', { name: 'Finanças', exact: true }).click();
  await page.getByRole('link', { name: 'Compromissos', exact: true }).click();
  await expect(page.locator('.period-range')).toBeVisible();
  return { app, page };
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

test('D182–D184: calendário maior à esquerda, detalhes grandes, histórico, pendências e contexto', async () => {
  test.setTimeout(90_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-commitments-ui-'));
  let app: ElectronApplication | undefined;
  try {
    const initial = await launch(profile);
    app = initial.app;
    const page = initial.page,
      parent = page.locator('fd-commitment-page');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const calendar = page.locator('[data-card-id="commitment-calendar"]'),
      panel = page.locator('[data-card-id="commitment-agenda"]'),
      info = page.locator('fd-commitment-detail');
    const left = (await calendar.boundingBox())!,
      right = (await panel.boundingBox())!;
    expect(left.x).toBeLessThan(right.x);
    expect(left.width).toBeGreaterThan(right.width * 1.5);
    await expect(info).toContainText('Selecione um dia');
    await expect(parent.locator('table, .commitment-row')).toHaveCount(0);
    const baseline = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      general: await window.finDesk!.storage.getCardLayout(),
      invoices: await window.finDesk!.storage.getInvoiceCardsLayout(),
      layout: await window.finDesk!.storage.getCommitmentCardsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    const day = parent.locator('[data-calendar-date="2026-10-15"]');
    await day.focus();
    await page.keyboard.press('Enter');
    await expect(info.locator('.commitment-value')).toHaveText('R$ 120,00');
    await expect(info).toContainText('Energia — demonstração');
    await expect(info).toContainText('Casa');
    await expect(info).toContainText('Mensal');
    await expect(info).toContainText('10 pagamentos registrados');
    await expect(info.locator('.variation-section')).toContainText('+R$ 10,00');
    await expect(info.locator('.variation-section')).toContainText('+9,1%');
    await expect(info.locator('.variation-section')).toContainText('15/07/2026');
    await expect(info.locator('.variation-section')).toContainText('15/10/2026');
    await expect(info.locator('.variation-section')).toContainText('R$ 110,00');
    await expect
      .poll(() =>
        panel
          .locator('.card-content')
          .evaluate(
            (node) =>
              getComputedStyle(node).overflowY === 'visible' &&
              node.scrollHeight <= node.clientHeight + 1,
          ),
      )
      .toBe(true);
    await page.locator('.workspace').evaluate((node) => {
      node.scrollTop = 0;
    });
    await parent.screenshot({ path: 'test-results/f10a-detail-wide.png' });
    await choose(page, 'Moeda', 'USD');
    await expect(info.locator('.commitment-value')).toHaveText('US$ 24,00');
    await expect(info.locator('.variation-section')).toContainText('+US$ 2,00');
    await expect(info).toContainText('10 pagamentos registrados');
    await choose(page, 'Moeda', 'original');
    const pending = parent.locator('[data-pending-id="bill:commitment-previous-demo"]');
    await pending.click();
    await expect(info.locator('.commitment-value')).toHaveText('R$ 75,00');
    await expect(info).toContainText('Não informado');
    await expect(info).toContainText('Vencido — pagamento não identificado');
    await expect(parent.locator('.period-range')).toHaveText('01/10/2026 — 31/10/2026');
    await expect(pending).toHaveAttribute('aria-pressed', 'true');
    await parent.locator('[data-calendar-date="2026-10-16"]').click();
    await expect(info).toContainText('Nenhum compromisso neste dia e filtro');
    await parent.getByRole('button', { name: 'Próximos 30 dias', exact: true }).click();
    await expect(parent.locator('.interval-total')).toContainText('R$ 1.373,14');
    await expect(parent.locator('.interval-total')).toContainText('2 valores parciais conhecidos');
    await expect(pending).toBeVisible();
    await parent.getByRole('button', { name: 'Próximo mês no calendário', exact: true }).click();
    await parent.locator('[data-calendar-date="2026-11-05"]').click();
    await expect(info.locator('.commitment-value')).toHaveText('R$ 900,00');
    await expect(info.locator('h3')).toHaveText('Aluguel');
    const after = await page.evaluate(async () => ({
      demo: await window.finDesk!.storage.getDemo(),
      general: await window.finDesk!.storage.getCardLayout(),
      invoices: await window.finDesk!.storage.getInvoiceCardsLayout(),
      layout: await window.finDesk!.storage.getCommitmentCardsLayout(),
      period: document.querySelector('fd-period-control')?.textContent,
    }));
    expect(after).toEqual(baseline);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setSize(900, 920));
    await expect.poll(async () => (await calendar.boundingBox())!.width).toBeGreaterThan(500);
    expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(
      (await calendar.boundingBox())!.y + (await calendar.boundingBox())!.height,
    );
    expect(await parent.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await panel.screenshot({ path: 'test-results/f10a-detail-narrow.png' });
    expect(errors).toEqual([]);
  } finally {
    await app?.close();
    await clean(profile);
  }
});

test('D183: um compromisso por vez, setas/teclado, reorganização, persistência e erro recuperável', async () => {
  test.setTimeout(120_000);
  const profile = await mkdtemp(join(tmpdir(), 'findesk-commitments-ui-'));
  let app: ElectronApplication | undefined;
  try {
    const first = await launch(profile);
    await first.app.close();
    const demo = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    try {
      const data = JSON.parse(
        demo.prepare('SELECT payload FROM demo_state').get()!['payload'] as string,
      );
      data.facts.commitments.find(
        (row: { id: string }) => row.id === 'commitment-one-off-demo',
      ).dueOn = '2026-11-05';
      demo.prepare('UPDATE demo_state SET payload=?').run(JSON.stringify(data));
    } finally {
      demo.close();
    }
    const current = await launch(profile);
    app = current.app;
    const page = current.page,
      parent = page.locator('fd-commitment-page'),
      info = page.locator('fd-commitment-detail');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await parent.getByRole('button', { name: 'Próximos 30 dias', exact: true }).click();
    await parent.getByRole('button', { name: 'Próximo mês no calendário', exact: true }).click();
    await parent.locator('[data-calendar-date="2026-11-05"]').click();
    await expect(parent.locator('.selection-navigation')).toContainText('1 de 2');
    await expect(info).toHaveCount(1);
    await expect(info.locator('.commitment-value')).toHaveText('R$ 150,00');
    await parent.getByRole('button', { name: 'Próximo compromisso', exact: true }).click();
    await expect(parent.locator('.selection-navigation')).toContainText('2 de 2');
    await expect(info.locator('.commitment-value')).toHaveText('R$ 900,00');
    await parent.getByRole('button', { name: 'Compromisso anterior', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(info.locator('.commitment-value')).toHaveText('R$ 150,00');
    await page.keyboard.press('Escape');
    await expect(parent.locator('[data-calendar-date="2026-11-05"]')).toBeFocused();
    await expect(info).toContainText('Selecione um dia');
    const calendar = page.locator('[data-card-id="commitment-calendar"]'),
      detail = page.locator('[data-card-id="commitment-agenda"]');
    const same = await info.elementHandle(),
      source = (await calendar.boundingBox())!,
      target = (await detail.boundingBox())!;
    await page.mouse.move(source.x + 30, source.y + 25);
    await page.mouse.down();
    await page.mouse.move(target.x + 80, target.y + 35, { steps: 12 });
    await page.mouse.up();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.finDesk!.storage.getCommitmentCardsLayout();
          return result.ok ? result.value?.cards.map((card) => card.id) : null;
        }),
      )
      .toEqual(['commitment-agenda', 'commitment-calendar']);
    expect(
      await same!.evaluate((node) => node === document.querySelector('fd-commitment-detail')),
    ).toBe(true);
    await detail.locator('.card-shell').focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const result = await window.finDesk!.storage.getCommitmentCardsLayout();
          return result.ok
            ? result.value?.cards.find((card) => card.id === 'commitment-agenda')?.rows
            : 0;
        }),
      )
      .toBeGreaterThan(7.5);
    await parent.getByRole('button', { name: 'Calendário', exact: true }).click();
    await expect(detail).toBeHidden();
    await parent.locator('[data-calendar-date="2026-11-05"]').click();
    await expect(detail).toBeVisible();
    const db = new DatabaseSync(join(profile, 'storage', 'preferences.sqlite'));
    try {
      await expect
        .poll(() => page.evaluate(async () => window.finDesk!.storage.getCommitmentPreferences()))
        .toMatchObject({ ok: true, value: { view: 'split' } });
      db.exec(
        "CREATE TRIGGER fail_details_preferences BEFORE UPDATE ON preferences WHEN NEW.key='commitments.v1' BEGIN SELECT RAISE(ABORT,'falha simulada'); END",
      );
      await parent.getByRole('button', { name: 'Detalhes', exact: true }).click();
      await expect(parent.getByRole('alert')).toContainText('escolha vale apenas nesta execução');
      db.exec('DROP TRIGGER fail_details_preferences');
      await parent.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
      await expect(parent.getByRole('alert')).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(async () => window.finDesk!.storage.getCommitmentPreferences()))
        .toMatchObject({ ok: true, value: { view: 'list' } });
    } finally {
      db.close();
    }
    expect(errors).toEqual([]);
    await app.close();
    app = undefined;
    const reopened = await launch(profile);
    app = reopened.app;
    await expect(reopened.page.locator('[data-card-id="commitment-calendar"]')).toBeHidden();
    await expect(reopened.page.locator('fd-commitment-detail')).toContainText('Selecione um dia');
  } finally {
    await app?.close();
    await clean(profile);
  }
});
