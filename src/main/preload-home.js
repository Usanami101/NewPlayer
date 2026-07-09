const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newplayer', {
  enterMode: (mode) => ipcRenderer.invoke('app:enterMode', mode),
  getMeta: () => ipcRenderer.invoke('meta:get'),
  setMeta: (p) => ipcRenderer.invoke('meta:set', p),
  openSettings: () => ipcRenderer.invoke('app:openHomeSettings'),
  getInfo: () => ipcRenderer.invoke('app:getInfo'),
});
