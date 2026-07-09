/**
 * Unified preload for NewPlayer (home, NewTube, NewTV, NewRadio, NewWeather, New(s)).
 */
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => {
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
    'weather-alert',
  ];
  if (!valid.includes(channel)) return () => {};
  const handler = (_e, data) => fn(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

// Shared
contextBridge.exposeInMainWorld('newplayer', {
  enterMode: (mode) => ipcRenderer.invoke('app:enterMode', mode),
  getMeta: () => ipcRenderer.invoke('meta:get'),
  setMeta: (p) => ipcRenderer.invoke('meta:set', p),
  openSettings: () => ipcRenderer.invoke('app:openHomeSettings'),
  getInfo: () => ipcRenderer.invoke('app:getInfo'),
  quit: () => ipcRenderer.invoke('app:quit'),
});

// NewTube shell (legacy name window.newtube)
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
  goAppHome: () => ipcRenderer.invoke('app:enterMode', 'home'),
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
  on,
});

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

const radioApi = {
  goHome: () => ipcRenderer.invoke('app:enterMode', 'home'),
  getCatalog: () => ipcRenderer.invoke('music:catalog'),
  getGenres: () => ipcRenderer.invoke('music:genres'),
  byGenre: (g, opts) => ipcRenderer.invoke('music:byGenre', g, opts || {}),
  search: (q, opts) => ipcRenderer.invoke('music:search', q, opts || {}),
  top: (limit) => ipcRenderer.invoke('music:top', limit || 100),
  byCountry: (code, limit) => ipcRenderer.invoke('music:country', code, limit || 80),
  byReligion: (id, limit) => ipcRenderer.invoke('music:religion', id, limit || 100),
  filter: (opts) => ipcRenderer.invoke('music:filter', opts || {}),
  getFavorites: () => ipcRenderer.invoke('music:favorites'),
  toggleFavorite: (st) => ipcRenderer.invoke('music:toggleFavorite', st),
  clickStation: (id) => ipcRenderer.invoke('music:click', id),
};
contextBridge.exposeInMainWorld('newradio', radioApi);
// legacy alias
contextBridge.exposeInMainWorld('newmusi', radioApi);

contextBridge.exposeInMainWorld('newweather', {
  goHome: () => ipcRenderer.invoke('app:enterMode', 'home'),
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSettings: (partial) => ipcRenderer.invoke('settings:setMany', partial),
  getBundle: () => ipcRenderer.invoke('weather:bundle'),
  getAlerts: () => ipcRenderer.invoke('weather:alerts'),
  startBackground: () => ipcRenderer.invoke('weather:startBackground'),
  stopBackground: () => ipcRenderer.invoke('weather:stopBackground'),
  getStatus: () => ipcRenderer.invoke('weather:status'),
  testEAS: () => ipcRenderer.invoke('weather:testEAS'),
  onAlert: (fn) => {
    const h = (_e, data) => fn(data);
    ipcRenderer.on('weather-alert', h);
    return () => ipcRenderer.removeListener('weather-alert', h);
  },
});

contextBridge.exposeInMainWorld('news', {
  goHome: () => ipcRenderer.invoke('app:enterMode', 'home'),
  getCatalog: () => ipcRenderer.invoke('news:catalog'),
  getHeadlines: (opts) => ipcRenderer.invoke('news:headlines', opts || {}),
  openLink: (url) => ipcRenderer.invoke('news:open', url),
});
