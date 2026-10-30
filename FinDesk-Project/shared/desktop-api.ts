/** Contrato público da ponte. Não importar Electron, Angular ou banco aqui. */
import type { StorageApi } from './storage-api';
export interface DesktopRuntimeInfo {
  readonly appVersion: string;
  readonly platform: string;
}

export interface DesktopApi {
  getRuntimeInfo(): Promise<DesktopRuntimeInfo>;
  readonly storage: StorageApi;
}

export const RUNTIME_INFO_CHANNEL = 'findesk:runtime-info';
