import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, basename, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

async function launch(profile: string): Promise<ElectronApplication> {
  const env: Record<string, string> = { FINDESK_TEST_MODE: '1' };
  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  return electron.launch({ args: ['.', `--user-data-dir=${profile}`], env });
}

async function clean(profile: string): Promise<void> {
  if (
    dirname(resolve(profile)) !== resolve(tmpdir()) ||
    !basename(profile).startsWith('findesk-storage-')
  )
    throw new Error('Limpeza fora do teste recusada.');
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

test('SQLite no Electron reabre preferências e restaura só a demonstração, com ponte restrita', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-storage-'));
  let application: ElectronApplication | undefined;
  try {
    application = await launch(profile);
    let page = await application.firstWindow();
    expect(await page.evaluate(() => window.finDesk!.storage.getStatus())).toEqual({
      ok: true,
      value: { environment: 'demo', schemaVersion: 1 },
    });
    const initial = await page.evaluate(() => window.finDesk!.storage.getDemo());
    expect(initial.ok).toBe(true);
    expect(
      await page.evaluate(() =>
        window.finDesk!.storage.savePreferences({
          version: 1,
          currencyMode: 'USD',
          periodMode: 'calendar-month',
        }),
      ),
    ).toEqual({
      ok: true,
      value: { version: 1, currencyMode: 'USD', periodMode: 'calendar-month' },
    });
    const invalid = await page.evaluate(() =>
      window.finDesk!.storage.savePreferences({
        version: 1,
        currencyMode: 'USD',
        periodMode: 'calendar-month',
        path: '/elsewhere',
      } as never),
    );
    expect(invalid.ok).toBe(false);
    expect(
      (await page.evaluate(() => window.finDesk!.storage.restoreDemoData('invalid' as never))).ok,
    ).toBe(false);
    const rejected = await application.evaluate(async ({ BrowserWindow, app }) => {
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
        return await other.webContents.executeJavaScript('window.finDesk.storage.getStatus()');
      } finally {
        other.destroy();
      }
    });
    expect(rejected.ok).toBe(false);
    await application.close();
    application = undefined;

    const db = new DatabaseSync(join(profile, 'storage', 'demo.sqlite'));
    try {
      const data = JSON.parse(
        db.prepare('SELECT payload FROM demo_state').get()!['payload'] as string,
      );
      data.facts.movements[0].description = 'alteração fictícia preservada';
      db.prepare('UPDATE demo_state SET payload = ?').run(JSON.stringify(data));
    } finally {
      db.close();
    }
    application = await launch(profile);
    page = await application.firstWindow();
    const preferences = await page.evaluate(() => window.finDesk!.storage.getPreferences());
    expect(preferences.ok && preferences.value.currencyMode).toBe('USD');
    const before = await page.evaluate(() => window.finDesk!.storage.getDemo());
    expect(before.ok && before.value.facts.movements[0]?.description).toBe(
      'alteração fictícia preservada',
    );
    const restored = await page.evaluate(() =>
      window.finDesk!.storage.restoreDemoData('restore-demo-data'),
    );
    expect(restored).toEqual(initial);
    expect(await page.evaluate(() => window.finDesk!.storage.getPreferences())).toEqual(
      preferences,
    );
    expect(await page.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe(
      'undefined',
    );
  } finally {
    await application?.close();
    await clean(profile);
  }
});

test('versão SQLite futura retorna falha sanitizada sem apagar e a casca continua abrindo', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'findesk-storage-'));
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
    const result = await page.evaluate(() => window.finDesk!.storage.getStatus());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('incompatible');
      expect(result.error.message).not.toContain(profile);
    }
    expect((await page.evaluate(() => window.finDesk!.getRuntimeInfo())).appVersion).toBe('0.1.0');
    await application.close();
    application = undefined;
    expect(await readFile(filename)).toEqual(before);
  } finally {
    await application?.close();
    await clean(profile);
  }
});
