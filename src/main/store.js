const Store = require('electron-store');
const { getDefaults } = require('../settings/catalog');

const defaults = getDefaults();

const store = new Store({
  name: 'newtube-settings',
  defaults: {
    settings: defaults,
    meta: {
      firstRun: true,
      lastUrl: '',
      windowBounds: null,
      version: 1,
      lastMode: 'home',
      rememberMode: false,
    },
    iptvFavorites: [],
    musicFavorites: [],
  },
});

/** Hot-path cache — getSettings is called often from network/layout code */
let _settingsCache = null;
let _settingsCacheAt = 0;
const SETTINGS_TTL_MS = 500;

// Migrations for existing installs
(function migrateSettings() {
  try {
    const meta = store.get('meta') || {};
    const ver = meta.perfScaleVersion || 0;
    const cur = { ...defaults, ...store.get('settings', {}) };
    let changed = false;

    if (ver < 2) {
      cur['display.scaleMode'] = cur['display.scaleMode'] || 'auto';
      cur['perf.diskCacheSizeMb'] = Math.max(Number(cur['perf.diskCacheSizeMb'] || 0), 1024);
      cur['ads.skipIntervalMs'] = Math.max(Number(cur['ads.skipIntervalMs'] || 0), 750);
      cur['appearance.splashDurationMs'] = Math.min(Number(cur['appearance.splashDurationMs'] ?? 900), 400);
      cur['perf.ignoreGpuBlocklist'] = true;
      if (
        (cur['video.brightness'] ?? 100) === 100 &&
        (cur['video.contrast'] ?? 100) === 100 &&
        (cur['video.saturation'] ?? 100) === 100
      ) {
        cur['experimental.cssFilterPipeline'] = false;
      }
      changed = true;
    }

    // v3: stop trapping users in fullscreen / Esc-to-quit
    if (ver < 3) {
      cur['window.startFullscreen'] = false;
      cur['behavior.doubleEscQuit'] = false;
      changed = true;
    }

    // v4: normal draggable Windows window (not frameless + max that looks like FS)
    if (ver < 4) {
      cur['window.startFullscreen'] = false;
      cur['window.startMaximized'] = false;
      cur['window.frameless'] = false;
      cur['behavior.doubleEscQuit'] = false;
      changed = true;
    }

    if (changed) {
      store.set('settings', cur);
      store.set('meta', { ...meta, perfScaleVersion: 4 });
      _settingsCache = null;
    }
  } catch {
    /* ignore */
  }
})();

function getSettings() {
  const now = Date.now();
  if (_settingsCache && now - _settingsCacheAt < SETTINGS_TTL_MS) {
    return _settingsCache;
  }
  _settingsCache = { ...defaults, ...store.get('settings', {}) };
  _settingsCacheAt = now;
  return _settingsCache;
}

function invalidateSettingsCache() {
  _settingsCache = null;
  _settingsCacheAt = 0;
}

function getSetting(id) {
  const all = getSettings();
  return all[id] !== undefined ? all[id] : defaults[id];
}

function setSetting(id, value) {
  const settings = { ...getSettings(), [id]: value };
  store.set('settings', settings);
  invalidateSettingsCache();
  return getSettings();
}

function setSettings(partial) {
  const settings = { ...getSettings(), ...partial };
  store.set('settings', settings);
  invalidateSettingsCache();
  return getSettings();
}

function resetSettings() {
  store.set('settings', { ...defaults });
  invalidateSettingsCache();
  return getSettings();
}

function getMeta() {
  return store.get('meta');
}

function setMeta(partial) {
  store.set('meta', { ...getMeta(), ...partial });
  return getMeta();
}

function getIptvFavorites() {
  return store.get('iptvFavorites') || [];
}

function setIptvFavorites(list) {
  store.set('iptvFavorites', list || []);
  return getIptvFavorites();
}

function toggleIptvFavorite(ch) {
  const list = getIptvFavorites();
  const idx = list.findIndex((x) => x.id === ch.id || x.url === ch.url);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(ch);
  return setIptvFavorites(list.slice(0, 500));
}

function getMusicFavorites() {
  return store.get('musicFavorites') || [];
}

function setMusicFavorites(list) {
  store.set('musicFavorites', list || []);
  return getMusicFavorites();
}

function toggleMusicFavorite(st) {
  const list = getMusicFavorites();
  const idx = list.findIndex((x) => x.id === st.id);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(st);
  return setMusicFavorites(list.slice(0, 500));
}

module.exports = {
  store,
  getSettings,
  getSetting,
  setSetting,
  setSettings,
  resetSettings,
  getMeta,
  setMeta,
  defaults,
  invalidateSettingsCache,
  getIptvFavorites,
  setIptvFavorites,
  toggleIptvFavorite,
  getMusicFavorites,
  setMusicFavorites,
  toggleMusicFavorite,
};
