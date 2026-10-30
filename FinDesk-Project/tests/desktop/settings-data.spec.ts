import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function openSettings(
  profile: string,
): Promise<{ application: ElectronApplication; page: Page }> {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  const application = await electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
  const page = await application.firstWindow();
  await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window?.show();
    window?.focus();
  });
  await page.getByRole('link', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações.' })).toBeVisible();
  return { application, page };
}

async function clean(profile: string): Promise<void> {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-settings-')
  )
    throw new Error('Limpeza fora do teste recusada.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

test('Configurações: confirmação inline cancela por clique/Escape e restaura uma vez preservando preferências', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-settings-'));
  let application: ElectronApplication | undefined;
  try {
    const opened = await openSettings(profile);
    application = opened.application;
    const page = opened.page;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const section = page.getByRole('region', { name: 'Dados de demonstração' });
    await expect(section.getByText('Armazenamento disponível', { exact: true })).toBeVisible();
    const headings = await page.locator('main h2').allTextContents();
    expect(headings.indexOf('Dados de demonstração')).toBeGreaterThan(
      headings.indexOf('Integrações'),
    );
    expect(headings.indexOf('Dados de demonstração')).toBeLessThan(
      headings.indexOf('Identidade do FinDesk'),
    );
    const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
    await page.evaluate(() =>
      window.finDesk!.storage.savePreferences({
        version: 1,
        currencyMode: 'USD',
        periodMode: 'calendar-month',
      }),
    );
    const db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    let locked = false;
    try {
      const data = JSON.parse(
        db.prepare('SELECT payload FROM demo_state').get()!['payload'] as string,
      );
      data.facts.movements[0].description = 'Alteração fictícia antes da restauração';
      db.prepare('UPDATE demo_state SET payload = ?').run(JSON.stringify(data));
      db.exec(
        'CREATE TABLE restore_audit (id INTEGER PRIMARY KEY); CREATE TRIGGER audit_restore AFTER UPDATE ON demo_state BEGIN INSERT INTO restore_audit (id) VALUES (NULL); END;',
      );
      const restore = section.getByRole('button', { name: 'Restaurar dados', exact: true });
      await restore.click();
      await expect(section.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(section.getByText('Preferências e layout serão mantidos.')).toBeVisible();
      await section.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(restore).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(section.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(restore).toBeFocused();
      expect(db.prepare('SELECT COUNT(*) AS count FROM restore_audit').get()!['count']).toBe(0);
      expect((await page.evaluate(() => window.finDesk!.storage.getDemo())).ok).toBe(true);
      await page.screenshot({ path: 'test-results/settings-demo.png', fullPage: true });
      await restore.click();
      db.exec('BEGIN IMMEDIATE');
      locked = true;
      const confirm = section.getByRole('button', { name: 'Restaurar', exact: true });
      await confirm.click();
      await expect(section.getByText('Restaurando dados…', { exact: true })).toBeVisible();
      await expect(
        section.getByRole('button', { name: 'Restaurando…', exact: true }),
      ).toBeDisabled();
      await expect(section.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
      await section
        .getByRole('button', { name: 'Restaurando…', exact: true })
        .dispatchEvent('click');
      db.exec('COMMIT');
      locked = false;
      await expect(
        section.getByText('Dados de demonstração restaurados.', { exact: true }),
      ).toBeVisible();
      await expect(restore).toBeFocused();
      expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
      expect(await page.evaluate(() => window.finDesk!.storage.getPreferences())).toEqual({
        ok: true,
        value: { version: 1, currencyMode: 'USD', periodMode: 'calendar-month' },
      });
      expect(db.prepare('SELECT COUNT(*) AS count FROM restore_audit').get()!['count']).toBe(1);
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.setSize(960, 720),
      );
      await restore.click();
      await expect(section.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: 'test-results/settings-demo-confirmation.png',
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      expect(errors).toEqual([]);
    } finally {
      if (locked) db.exec('ROLLBACK');
      db.close();
    }
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('Configurações: falha de restauração é informada sem SQL/caminho e verificar novamente não restaura dados', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-settings-'));
  let application: ElectronApplication | undefined;
  try {
    const opened = await openSettings(profile);
    application = opened.application;
    const page = opened.page;
    const section = page.getByRole('region', { name: 'Dados de demonstração' });
    await expect(section.getByText('Armazenamento disponível', { exact: true })).toBeVisible();
    const db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    try {
      const changed = JSON.parse(
        db.prepare('SELECT payload FROM demo_state').get()!['payload'] as string,
      );
      changed.facts.movements[0].description = 'Preservar sem nova confirmação';
      db.prepare('UPDATE demo_state SET payload = ?').run(JSON.stringify(changed));
      const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
      db.exec(
        "CREATE TRIGGER reject_restore BEFORE UPDATE ON demo_state BEGIN SELECT RAISE(ABORT, 'detalhe SQL privado'); END;",
      );
      await section.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
      await section.getByRole('button', { name: 'Restaurar', exact: true }).click();
      await expect(section.getByRole('alert')).toBeVisible();
      await expect(section.getByRole('alert')).not.toContainText('detalhe SQL privado');
      await expect(section.getByRole('alert')).not.toContainText(profile);
      await expect(
        section.getByRole('button', { name: 'Restaurar dados', exact: true }),
      ).toBeDisabled();
      await expect(section.getByRole('button', { name: 'Verificar novamente' })).toBeFocused();
      expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
      db.exec('DROP TRIGGER reject_restore');
      await section.getByRole('button', { name: 'Verificar novamente' }).click();
      await expect(
        section.getByRole('button', { name: 'Restaurar dados', exact: true }),
      ).toBeFocused();
      await expect(section.getByRole('alert')).toHaveCount(0);
      await expect(section.getByRole('group', { name: 'Repor os dados fictícios?' })).toHaveCount(
        0,
      );
      expect(await page.evaluate(() => window.finDesk!.storage.getDemo())).toEqual(initial);
    } finally {
      db.close();
    }
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('Configurações: versão futura fica indisponível sem apagar; janela sem ponte identifica a prévia', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-settings-'));
  let application: ElectronApplication | undefined;
  try {
    await mkdir(join(profile, 'storage'));
    const filename = join(profile, 'storage', 'demo.sqlite');
    const db = new DatabaseSync(filename);
    db.exec('PRAGMA user_version = 99');
    db.close();
    const before = await readFile(filename);
    const opened = await openSettings(profile);
    application = opened.application;
    const section = opened.page.getByRole('region', { name: 'Dados de demonstração' });
    await expect(section.getByRole('alert')).toContainText('incompatível');
    await expect(
      section.getByRole('button', { name: 'Restaurar dados', exact: true }),
    ).toBeDisabled();
    await section.getByRole('button', { name: 'Verificar novamente' }).click();
    await expect(section.getByRole('alert')).toContainText('incompatível');
    const previewEvent = application.waitForEvent('window');
    await application.evaluate(async ({ BrowserWindow }) => {
      const preview = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      });
      await preview.loadURL('findesk://app/#/configuracoes');
    });
    const preview = await previewEvent;
    const previewSection = preview.getByRole('region', { name: 'Dados de demonstração' });
    await expect(
      previewSection.getByText('Disponível no aplicativo desktop.', { exact: true }),
    ).toBeVisible();
    await expect(
      previewSection.getByRole('button', { name: 'Restaurar dados', exact: true }),
    ).toBeDisabled();
    await expect(previewSection.getByRole('alert')).toHaveCount(0);
    expect(await readFile(filename)).toEqual(before);
  } finally {
    await application?.close();
    await clean(profile);
  }
});
