const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMachineCode: () => ipcRenderer.invoke('get-machine-code'),
  submitActivation: (code) => ipcRenderer.invoke('submit-activation', code)
});
