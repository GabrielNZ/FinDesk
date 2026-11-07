import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopApi, DesktopRuntimeInfo } from '../shared/desktop-api';
import type { StorageApi } from '../shared/storage-api';

// O preload com sandbox não carrega módulos locais. O contrato é importado somente como tipo.
const api: DesktopApi = Object.freeze({
  getRuntimeInfo: (): Promise<DesktopRuntimeInfo> => ipcRenderer.invoke('findesk:runtime-info'),
  storage: Object.freeze<StorageApi>({
    getCategories: () => ipcRenderer.invoke('findesk:categories-read'),
    saveCategory: (value) => ipcRenderer.invoke('findesk:category-save', value),
    classifyMovement: (value) => ipcRenderer.invoke('findesk:movement-classify', value),
    classifyMerchant: (value) => ipcRenderer.invoke('findesk:merchant-classify', value),
    getStatus: () => ipcRenderer.invoke('findesk:storage-status'),
    getDemo: () => ipcRenderer.invoke('findesk:demo-read'),
    getPreferences: () => ipcRenderer.invoke('findesk:preferences-read'),
    savePreferences: (value) => ipcRenderer.invoke('findesk:preferences-save', value),
    restoreDemoData: (confirmation) => ipcRenderer.invoke('findesk:demo-restore', confirmation),
    getCardLayout: () => ipcRenderer.invoke('findesk:card-layout-read'),
    getStatementLayout: () => ipcRenderer.invoke('findesk:statement-layout-read'),
    saveStatementLayout: (layout) => ipcRenderer.invoke('findesk:statement-layout-save', layout),
    saveCardLayout: (layout) => ipcRenderer.invoke('findesk:card-layout-save', layout),
    restoreCardLayout: (confirmation) =>
      ipcRenderer.invoke('findesk:card-layout-restore', confirmation),
  }),
});

contextBridge.exposeInMainWorld('finDesk', api);
