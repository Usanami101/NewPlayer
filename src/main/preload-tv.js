// Bridge for YouTube TV page — fullscreen controls must work even when YT has focus
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newtubeTv', {
  platform: 'newtube',
  version: '1.0.0',
  exitFullscreen: () => ipcRenderer.invoke('app:exitFullscreen'),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('app:isFullscreen'),
});
