const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newtube', {
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  getCatalog: () => ipcRenderer.invoke('settings:getCatalog'),
  setSetting: (id, value) => ipcRenderer.invoke('settings:set', id, value),
  setMany: (partial) => ipcRenderer.invoke('settings:setMany', partial),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  importSettings: () => ipcRenderer.invoke('settings:import'),
  toggleSettings: (force) => ipcRenderer.invoke('app:toggleSettings', force),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('app:isFullscreen'),
  home: () => ipcRenderer.invoke('app:home'),
  reload: () => ipcRenderer.invoke('app:reload'),
  quit: () => ipcRenderer.invoke('app:quit'),
  openLogs: () => ipcRenderer.invoke('app:openLogs'),
  clearCache: () => ipcRenderer.invoke('app:clearCache'),
  getInfo: () => ipcRenderer.invoke('app:getInfo'),
  notify: (payload) => ipcRenderer.invoke('app:notify', payload),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  getMeta: () => ipcRenderer.invoke('meta:get'),
  setMeta: (partial) => ipcRenderer.invoke('meta:set', partial),
  focusTv: () => ipcRenderer.invoke('tv:focus'),
  ready: () => ipcRenderer.send('shell:ready'),
  // Multi Desk
  multiList: () => ipcRenderer.invoke('multiview:list'),
  multiDisplays: () => ipcRenderer.invoke('multiview:displays'),
  multiOpen: (opts) => ipcRenderer.invoke('multiview:open', opts || {}),
  multiClose: (id) => ipcRenderer.invoke('multiview:close', id),
  multiCloseAll: () => ipcRenderer.invoke('multiview:closeAll'),
  multiMute: (id, muted) => ipcRenderer.invoke('multiview:mute', id, muted),
  multiToggleMute: (id) => ipcRenderer.invoke('multiview:toggleMute', id),
  multiMuteAll: (muted) => ipcRenderer.invoke('multiview:muteAll', muted),
  multiFocus: (id) => ipcRenderer.invoke('multiview:focus', id),
  multiMoveToDisplay: (id, index) => ipcRenderer.invoke('multiview:moveToDisplay', id, index),
  multiTile: (mode) => ipcRenderer.invoke('multiview:tile', mode),
  multiCascade: () => ipcRenderer.invoke('multiview:cascade'),
  multiLoadUrl: (id, url) => ipcRenderer.invoke('multiview:loadUrl', id, url),
  multiAlwaysOnTop: (id, value) => ipcRenderer.invoke('multiview:alwaysOnTop', id, value),
  multiSetPanelOpen: (open) => ipcRenderer.invoke('multiview:setPanelOpen', open),
  on: (channel, fn) => {
    const valid = [
      'bootstrap',
      'settings-visibility',
      'settings-updated',
      'toast',
      'volume-hud',
      'tv-loaded',
      'tv-fail',
      'fullscreen-changed',
      'command-palette',
      'clipboard-youtube',
      'multiview-updated',
      'multidesk-open',
    ];
    if (!valid.includes(channel)) return () => {};
    const handler = (_e, data) => fn(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
