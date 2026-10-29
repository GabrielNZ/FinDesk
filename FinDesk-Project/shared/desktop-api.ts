/** Contrato público da ponte. Não importar Electron, Angular ou banco aqui. */
export interface DesktopRuntimeInfo {
  readonly appVersion: string;
  readonly platform: string;
}

export interface DesktopApi {
  getRuntimeInfo(): Promise<DesktopRuntimeInfo>;
}

export const RUNTIME_INFO_CHANNEL = 'findesk:runtime-info';
