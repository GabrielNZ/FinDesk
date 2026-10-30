import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { StorageFailure } from './contracts';

/** Somente main chama esta função; o renderer nunca escolhe diretórios. */
export function storageDirectory(
  testMode: boolean,
  userData: string,
  localAppData: string | undefined,
): string {
  if (testMode) {
    const profile = resolve(userData);
    if (dirname(profile) !== resolve(tmpdir()) || !basename(profile).startsWith('findesk-'))
      throw new StorageFailure('unavailable');
    return join(profile, 'storage');
  }
  if (!localAppData || !isAbsolute(localAppData)) throw new StorageFailure('unavailable');
  return join(localAppData, 'FinDesk', 'data');
}
