import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Avaliação isolada: nenhum arquivo do aplicativo ou de usuário é usado como banco.
const require = createRequire(import.meta.url);
const temporaryRoot = resolve(tmpdir());
const probeRoot = await mkdtemp(join(temporaryRoot, 'findesk-sqlite-probe-'));
const resolvedRoot = resolve(probeRoot);
if (
  dirname(resolvedRoot) !== temporaryRoot ||
  !basename(resolvedRoot).startsWith('findesk-sqlite-probe-')
) {
  throw new Error('Destino temporário próprio inválido; execução e limpeza recusadas.');
}
try {
  const env = { ...process.env, FINDESK_SQLITE_PROBE_ROOT: probeRoot };
  delete env.ELECTRON_RUN_AS_NODE;
  const { stdout } = await promisify(execFile)(
    require('electron'),
    [
      fileURLToPath(new URL('sqlite-probe/main.mjs', import.meta.url)),
      `--user-data-dir=${join(probeRoot, 'profile')}`,
    ],
    { env, windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 },
  );
  const line = stdout.split(/\r?\n/).find((value) => value.startsWith('FINDESK_SQLITE_PROBE='));
  if (!line) throw new Error('Electron não retornou o resultado da avaliação SQLite.');
  console.log(JSON.stringify(JSON.parse(line.slice('FINDESK_SQLITE_PROBE='.length)), null, 2));
} finally {
  await rm(resolvedRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
