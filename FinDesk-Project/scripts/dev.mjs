import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const children = new Set();
let stopping = false;

function runNode(script, args = []) {
  const child = spawn(process.execPath, [resolve(script), ...args], {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
  });
  children.add(child);
  child.on('error', (error) => {
    console.error('Falha ao iniciar processo de desenvolvimento:', error.message);
    stop(1);
  });
  child.once('exit', () => children.delete(child));
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

try {
  const compiler = runNode('node_modules/typescript/bin/tsc', ['-p', 'desktop/tsconfig.json']);
  const [compileExit] = await once(compiler, 'exit');
  if (compileExit !== 0) throw new Error('A compilação do Electron falhou.');

  const server = runNode('node_modules/@angular/cli/bin/ng.js', [
    'serve',
    '--host',
    '127.0.0.1',
    '--port',
    '4200',
    '--hmr=false',
  ]);
  server.once('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });

  const deadline = Date.now() + 90_000;
  let ready = false;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:4200', { signal: AbortSignal.timeout(1000) });
      ready = response.ok;
      await response.body?.cancel();
      if (ready) break;
    } catch {
      /* O servidor ainda está compilando. */
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  if (!ready) throw new Error('O servidor Angular não ficou disponível na porta 4200.');

  const electronEnv = { ...process.env };
  delete electronEnv['ELECTRON_RUN_AS_NODE'];
  const electron = spawn(require('electron'), ['.', '--dev'], {
    stdio: 'inherit',
    // Esta é a janela interativa do aplicativo; apenas os processos auxiliares ficam ocultos.
    windowsHide: false,
    env: electronEnv,
  });
  children.add(electron);
  electron.once('error', () => stop(1));
  electron.once('exit', (code) => {
    children.delete(electron);
    stop(code ?? 0);
  });
  console.log(
    'FinDesk em desenvolvimento. Alterações na interface recarregam; para Electron, reinicie.',
  );
} catch (error) {
  console.error(error.message);
  stop(1);
}
