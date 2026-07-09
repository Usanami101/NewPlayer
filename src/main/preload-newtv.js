const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newtv', {
  goHome: () => ipcRenderer.invoke('app:enterMode', 'home'),
  getCatalog: () => ipcRenderer.invoke('iptv:catalog'),
  loadCountry: (code) => ipcRenderer.invoke('iptv:country', code),
  loadGenre: (id) => ipcRenderer.invoke('iptv:genre', id),
  loadCustom: (url) => ipcRenderer.invoke('iptv:custom', url),
  getFavorites: () => ipcRenderer.invoke('iptv:favorites'),
  toggleFavorite: (ch) => ipcRenderer.invoke('iptv:toggleFavorite', ch),
  clearCache: () => ipcRenderer.invoke('iptv:clearCache'),
});
