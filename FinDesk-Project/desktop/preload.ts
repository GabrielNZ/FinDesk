import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi, DesktopRuntimeInfo } from '../shared/desktop-api';

// O preload com sandbox não carrega módulos locais. O contrato é importado somente como tipo.
const api: DesktopApi = Object.freeze({
  getRuntimeInfo: (): Promise<DesktopRuntimeInfo> => ipcRenderer.invoke('findesk:runtime-info'),
});

contextBridge.exposeInMainWorld('finDesk', api);
