import { app, BrowserWindow, ipcMain, Menu, nativeTheme, net, protocol, session } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RUNTIME_INFO_CHANNEL, type DesktopRuntimeInfo } from '../shared/desktop-api';
import { PRODUCT } from '../shared/product';
import {
  APP_PAGE,
  DEVELOPMENT_ORIGIN,
  contentSecurityPolicy,
  isTrustedPageUrl,
  resolveAssetPath,
} from './security';

protocol.registerSchemesAsPrivileged([
  { scheme: 'findesk', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const development = !app.isPackaged && process.argv.includes('--dev');
const smokeTest = !app.isPackaged && process.env['FINDESK_TEST_MODE'] === '1';
let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    title: PRODUCT.name,
    icon: join(
      app.getAppPath(),
      development ? 'public/brand/app-icon.ico' : 'dist/renderer/browser/brand/app-icon.ico',
    ),
    width: 1380,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#111416',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      devTools: development || smokeTest,
      // Testes ocultos precisam continuar pintando as transições da interface.
      backgroundThrottling: !smokeTest,
      spellcheck: false,
    },
  });
  mainWindow = window;

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedPageUrl(url, development)) event.preventDefault();
  });
  window.webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame || !isTrustedPageUrl(event.url, development)) event.preventDefault();
  });
  window.once('ready-to-show', () => {
    if (!smokeTest) window.show();
  });
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  if (development) await window.loadURL(DEVELOPMENT_ORIGIN);
  else await window.loadURL(APP_PAGE);
}

async function start(): Promise<void> {
  nativeTheme.themeSource = 'dark';
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on('will-download', (event) => event.preventDefault());

  const policy = contentSecurityPolicy(development);
  if (development) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [policy] },
      });
    });
  }

  protocol.handle('findesk', async (request) => {
    const target = resolveAssetPath(request.url, join(app.getAppPath(), 'dist/renderer/browser'));
    if (!target || request.method !== 'GET')
      return new Response('Acesso recusado', { status: 403 });

    try {
      const file = await net.fetch(pathToFileURL(target).href);
      const headers = new Headers(file.headers);
      headers.set('Content-Security-Policy', policy);
      return new Response(file.body, { status: file.status, headers });
    } catch {
      return new Response('Arquivo não encontrado', { status: 404 });
    }
  });

  ipcMain.handle(RUNTIME_INFO_CHANNEL, (event, ...args: unknown[]): DesktopRuntimeInfo => {
    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== event.sender.mainFrame ||
      !isTrustedPageUrl(event.senderFrame.url, development) ||
      args.length !== 0
    ) {
      throw new Error('Solicitação não autorizada');
    }

    return { appVersion: app.getVersion(), platform: process.platform };
  });

  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow().catch(() => app.exit(1));
    }
  });
}

app
  .whenReady()
  .then(start)
  .catch(() => {
    console.error(
      'Não foi possível iniciar o FinDesk. Confira o build e a porta de desenvolvimento.',
    );
    app.exit(1);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
