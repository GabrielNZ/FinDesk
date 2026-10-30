import { parentPort, workerData } from 'node:worker_threads';
import { failure, validateRequest } from './contracts';
import { DemoStore } from './store';

const port = parentPort;
if (!port) throw new Error('Armazenamento exige worker dedicado.');
let store: DemoStore;
try {
  store = new DemoStore((workerData as { directory: string }).directory);
  port.postMessage({ id: 0, result: { ok: true, value: store.info() } });
  port.on('message', (raw: unknown) => {
    let id = -1;
    try {
      if (raw && typeof raw === 'object' && 'id' in raw && Number.isSafeInteger(raw.id))
        id = raw.id as number;
      const request = validateRequest(raw);
      id = request.id;
      let value: unknown;
      switch (request.operation) {
        case 'read-demo':
          value = store.readDemo();
          break;
        case 'read-preferences':
          value = store.readPreferences();
          break;
        case 'save-preferences':
          value = store.savePreferences(request.payload);
          break;
        case 'restore-demo':
          value = store.restoreDemo();
          break;
        case 'close':
          store.close();
          value = null;
          break;
      }
      port.postMessage({ id, result: { ok: true, value } });
      if (request.operation === 'close') port.close();
    } catch (error) {
      port.postMessage({ id, result: failure(error) });
    }
  });
} catch (error) {
  port.postMessage({ id: 0, result: failure(error) });
  port.close();
}
