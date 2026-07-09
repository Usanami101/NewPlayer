const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ntPlayer', {
  getState: () => ipcRenderer.invoke('player:getState'),
  mute: (muted) => ipcRenderer.invoke('player:mute', muted),
  toggleMute: () => ipcRenderer.invoke('player:toggleMute'),
  alwaysOnTop: (v) => ipcRenderer.invoke('player:alwaysOnTop', v),
  loadUrl: (url) => ipcRenderer.invoke('player:loadUrl', url),
  home: () => ipcRenderer.invoke('player:home'),
  reload: () => ipcRenderer.invoke('player:reload'),
  close: () => ipcRenderer.invoke('player:close'),
  fullscreen: () => ipcRenderer.invoke('player:fullscreen'),
  moveToDisplay: (index) => ipcRenderer.invoke('player:moveToDisplay', index),
  getDisplays: () => ipcRenderer.invoke('multiview:displays'),
  minimize: () => ipcRenderer.invoke('player:minimize'),
  onState: (fn) => {
    const h = (_e, data) => fn(data);
    ipcRenderer.on('player-state', h);
    return () => ipcRenderer.removeListener('player-state', h);
  },
  // frameless drag is CSS -webkit-app-region
});
