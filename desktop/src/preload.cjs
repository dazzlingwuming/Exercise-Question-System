const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xiaojingDesktop', {
  version: () => ipcRenderer.invoke('desktop:version'),
  openLibrary: () => ipcRenderer.invoke('desktop:open-library'),
  backupLibrary: () => ipcRenderer.invoke('desktop:backup-library'),
  importLibrary: () => ipcRenderer.invoke('desktop:import-library'),
});
