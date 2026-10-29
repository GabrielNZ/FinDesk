import { app } from 'electron';
import { Worker } from 'node:worker_threads';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';

const probeRoot = resolve(process.env.FINDESK_SQLITE_PROBE_ROOT ?? '.');
if (
  dirname(probeRoot) !== resolve(tmpdir()) ||
  !basename(probeRoot).startsWith('findesk-sqlite-probe-')
)
  throw new Error('Avaliação permitida somente em perfil temporário próprio.');
mkdirSync(join(probeRoot, 'profile'), { recursive: true });
app.setPath('userData', join(probeRoot, 'profile'));
app.setPath('sessionData', join(probeRoot, 'profile'));
app.disableHardwareAcceleration();

async function runProbe() {
  const worker = new Worker(new URL('worker.mjs', import.meta.url), { workerData: { probeRoot } });
  try {
    const result = await new Promise((resolveResult, reject) => {
      let outcome;
      const timer = setTimeout(() => reject(new Error('Tempo excedido no worker SQLite.')), 20_000);
      worker.once('message', (message) => {
        outcome = message;
      });
      worker.once('error', reject);
      worker.once('exit', (code) => {
        clearTimeout(timer);
        if (code !== 0 || !outcome)
          reject(new Error('Worker SQLite encerrou sem resultado válido.'));
        else resolveResult(outcome);
      });
    });
    console.log(
      `FINDESK_SQLITE_PROBE=${JSON.stringify({ mainElectron: process.versions.electron, mainNode: process.versions.node, ...result })}`,
    );
    app.quit();
  } catch (error) {
    await worker.terminate();
    console.error(error.message);
    app.exit(1);
  }
}

app
  .whenReady()
  .then(runProbe)
  .catch((error) => {
    console.error(error.message);
    app.exit(1);
  });
