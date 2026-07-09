/**
 * NewPlayer — NewTube · NewTV · NewRadio · NewWeather · New(s)
 */
const path = require('path');
const fs = require('fs');
const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  globalShortcut,
  session,
  shell,
  Menu,
  Tray,
  nativeImage,
  powerSaveBlocker,
  dialog,
  screen,
  clipboard,
  Notification,
} = require('electron');

// Settings must load before flags
const {
  getSettings,
  getSetting,
  setSetting,
  setSettings,
  resetSettings,
  getMeta,
  setMeta,
  getIptvFavorites,
  toggleIptvFavorite,
  getMusicFavorites,
  toggleMusicFavorite,
} = require('./store');
const { applyEarlyFlags } = require('./applyFlags');
const { resolveUserAgent } = require('./userAgents');
const {
  attachNetworkAdblock,
  getAdHideCss,
  getAdSkipScript,
} = require('./adblock');
const multi = require('./multiplayer');
const { computeTvZoom } = require('./scale');
const iptv = require('./iptv-service');
const music = require('./music-service');
const weatherSvc = require('./weather-service');
const weatherAlerts = require('./weather-alerts');
const easWindow = require('./eas-window');
const newsSvc = require('./news-service');
const { CATEGORIES, SETTINGS, COUNT } = require('../settings/catalog');

applyEarlyFlags();

const isDev = !app.isPackaged;
let mainWindow = null;
let tvView = null;
let currentMode = 'home'; // home | newtube | newtv | newmusi
let settingsOpen = false;
let multiDeskOpen = false;
let tray = null;
let powerBlockerId = null;
let escPressTimes = [];
let clipboardTimer = null;
let quitting = false;
let layoutTimer = null;
let lastAppliedZoom = 0;
let injectTimer = null;
let lastInjectKey = '';
let boundsBeforeFullscreen = null;
let shellInputAttached = false;
let tvInputAttached = false;

const ICON_PNG = path.join(__dirname, '../../assets/icon.png');
const ICON_ICO = path.join(__dirname, '../../build/icon.ico');

function iconPath() {
  if (fs.existsSync(ICON_ICO)) return ICON_ICO;
  if (fs.existsSync(ICON_PNG)) return ICON_PNG;
  return undefined;
}

function createNativeIcon() {
  const p = iconPath();
  if (!p) return undefined;
  return nativeImage.createFromPath(p);
}

// ── Single instance ──────────────────────────────────────────
const settings0 = getSettings();
if (settings0['startup.singleInstance'] !== false) {
  const got = app.requestSingleInstanceLock();
  if (!got) {
    app.quit();
  } else {
    app.on('second-instance', (_e, argv) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      handleDeepLink(argv);
    });
  }
}

function handleDeepLink(argv = []) {
  const link = (argv || []).find((a) => typeof a === 'string' && a.startsWith('newtube://'));
  if (!link || !tvView) return;
  try {
    const u = new URL(link);
    if (u.hostname === 'watch' || u.pathname.includes('watch')) {
      const v = u.searchParams.get('v');
      if (v) {
        tvView.webContents.loadURL(`https://www.youtube.com/tv#/watch/video/control?v=${v}`);
      }
    } else {
      tvView.webContents.loadURL(getSetting('network.tvEntryUrl') || 'https://www.youtube.com/tv');
    }
  } catch {
    /* ignore */
  }
}

// ── Window bounds helpers ────────────────────────────────────
function resolveDisplay(index) {
  const displays = screen.getAllDisplays();
  return displays[Math.min(Math.max(0, index || 0), displays.length - 1)] || screen.getPrimaryDisplay();
}

function initialBounds(settings) {
  const display = resolveDisplay(settings['window.displayIndex'] || 0);
  const wa = display.workArea;
  const meta = getMeta();
  if (settings['window.rememberBounds'] && meta.windowBounds) {
    return meta.windowBounds;
  }
  const width = settings['window.width'] || 1600;
  const height = settings['window.height'] || 900;
  let x = wa.x + Math.round((wa.width - width) / 2);
  let y = wa.y + Math.round((wa.height - height) / 2);
  if (!settings['window.centerOnLaunch'] && meta.windowBounds) {
    x = meta.windowBounds.x;
    y = meta.windowBounds.y;
  }
  return { x, y, width, height };
}

// ── Create main window + TV BrowserView ──────────────────────
function createWindow() {
  const settings = getSettings();
  const bounds = initialBounds(settings);
  const frameless = settings['window.frameless'] !== false;
  const kiosk = !!settings['behavior.kioskMode'];

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: settings['window.minWidth'] || 960,
    minHeight: settings['window.minHeight'] || 540,
    title: 'NewPlayer',
    icon: iconPath(),
    backgroundColor: settings['theme.customBg'] || '#0A0A0B',
    show: false,
    autoHideMenuBar: true,
    fullscreenable: true,
    frame: kiosk ? false : !frameless,
    transparent: !!settings['window.transparent'],
    alwaysOnTop: !!settings['window.alwaysOnTop'],
    webPreferences: {
      preload: path.join(__dirname, 'preload-app.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Media players need http streams / permissive CORS for public IPTV & radio
      webSecurity: false,
      sandbox: settings['privacy.sandbox'] !== false,
      backgroundThrottling: !!settings['perf.backgroundThrottling'],
      spellcheck: !!settings['privacy.spellcheck'],
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    const s = getSettings();
    if (s['startup.startMinimized']) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      // Normal floating window by default (maximize only if user enabled it)
      if (s['window.startMaximized'] === true && s['window.startFullscreen'] !== true) {
        mainWindow.maximize();
      }
    }
    const opacity = (s['window.opacity'] ?? 100) / 100;
    mainWindow.setOpacity(Math.min(1, Math.max(0.4, opacity)));
    applyPriority(s);
    updatePowerBlocker(s);
  });

  // Start at launcher (or remembered mode)
  const meta = getMeta();
  if (meta.rememberMode && meta.lastMode && meta.lastMode !== 'home') {
    enterMode(meta.lastMode);
  } else {
    enterMode('home');
  }

  mainWindow.on('close', (e) => {
    if (quitting) return;
    const s = getSettings();
    if (s['window.rememberBounds'] && !mainWindow.isFullScreen()) {
      setMeta({ windowBounds: mainWindow.getBounds() });
    }
    // Weather background mode: close hides to tray; only "Quit NewPlayer" stops alerts
    if (isWeatherBackgroundEnabled()) {
      e.preventDefault();
      mainWindow.hide();
      ensureWeatherWatcher();
      if (tray) {
        try {
          tray.displayBalloon?.({
            title: 'NewPlayer Weather',
            content: 'Running in tray for NWS alerts. Right-click tray icon to quit.',
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (s['behavior.closeToTray'] && s['behavior.trayIcon'] !== false) {
      e.preventDefault();
      mainWindow.hide();
      return;
    }
    if (s['behavior.confirmQuit'] || s['playback.confirmExitWhilePlaying']) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Quit', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title: 'NewPlayer',
        message: 'Quit NewPlayer?',
      });
      if (choice === 1) e.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    tvView = null;
  });

  mainWindow.on('enter-full-screen', () => {
    layoutViews();
    broadcast('fullscreen-changed', true);
    broadcast('toast', { message: 'Fullscreen — press Esc or F11 to exit', type: 'info' });
  });
  mainWindow.on('leave-full-screen', () => {
    // Force a real floating window — not maximized edge-to-edge (looks like FS)
    setTimeout(() => restoreFloatingWindow(), 40);
    broadcast('fullscreen-changed', false);
  });
  mainWindow.on('resize', () => scheduleLayout());
  mainWindow.on('maximize', () => scheduleLayout());
  mainWindow.on('unmaximize', () => scheduleLayout());

  mainWindow.on('blur', () => {
    if (getSetting('playback.pauseOnBlur') && !getSetting('playback.continueInBackground')) {
      sendToTv('newtube-pause');
    }
  });
  mainWindow.on('minimize', () => {
    if (getSetting('playback.pauseOnMinimize') && !getSetting('playback.continueInBackground')) {
      sendToTv('newtube-pause');
    }
    if (getSetting('audio.muteOnMinimize')) {
      if (tvView) tvView.webContents.setAudioMuted(true);
    }
  });
  mainWindow.on('restore', () => {
    if (getSetting('audio.muteOnMinimize') && tvView) {
      tvView.webContents.setAudioMuted(!!getSetting('audio.muteOnStart') ? false : tvView.webContents.isAudioMuted());
      // only unmute if user hadn't manually muted — keep simple: unmute on restore unless start-muted
      if (!getSetting('audio.muteOnStart')) tvView.webContents.setAudioMuted(false);
    }
  });

  createTray();
  registerShortcuts();
  setupClipboardWatch();
}

// ── Mode switcher: home / newtube / newtv / newmusi ─────────
function detachTvView() {
  const view = tvView;
  tvView = null; // clear first so layout/zoom never touch a dying view
  tvInputAttached = false;
  if (!mainWindow || !view) return;
  try {
    if (!mainWindow.isDestroyed()) mainWindow.removeBrowserView(view);
  } catch {
    /* ignore */
  }
  try {
    const wc = view.webContents;
    if (wc && !wc.isDestroyed()) wc.destroy();
  } catch {
    /* ignore */
  }
}

function isWeatherBackgroundEnabled() {
  const s = getSettings();
  return s['weather.enabled'] !== false && !!s['weather.backgroundAlerts'] && s['weather.alertsEnabled'] !== false;
}

function shouldTriggerEAS(alert, settings) {
  if (!alert) return false;
  if (settings['weather.easEnabled'] === false) return false;
  const min = settings['weather.easMinSeverity'] || settings['weather.minSeverity'] || 'Severe';
  return weatherSvc.severityAtLeast(alert.severity, min);
}

function fireEAS(alert) {
  if (!alert || alert.__open) return;
  try {
    // Bring app alive so EAS can paint over everything
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) mainWindow.show();
    }
    easWindow.showEAS(alert, { source: 'nws' });
  } catch (err) {
    console.error('EAS failed', err);
  }
}

function ensureWeatherWatcher() {
  if (getSetting('weather.enabled') === false) {
    weatherAlerts.stop();
    return;
  }
  // Need either toast alerts, EAS, or background tray mode
  const wantAlerts =
    getSetting('weather.alertsEnabled') !== false ||
    getSetting('weather.easEnabled') !== false ||
    isWeatherBackgroundEnabled();
  if (!wantAlerts) {
    weatherAlerts.stop();
    return;
  }

  weatherAlerts.start(getSettings, {
    notifyOnStart: !!getSetting('weather.notifyOnStart'),
    onAlert: (a) => {
      broadcast('weather-alert', a);
      const s = getSettings();
      // Full-screen TV EAS for severe+
      if (shouldTriggerEAS(a, s)) {
        fireEAS(a);
      }
      if (a && a.__open && mainWindow) {
        mainWindow.show();
        enterMode('newweather');
      }
      createTray();
    },
  });
  createTray();
}

function enterMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  // Alias legacy mode name
  if (mode === 'newmusi') mode = 'newradio';
  const next = ['home', 'newtube', 'newtv', 'newradio', 'newweather', 'news'].includes(mode)
    ? mode
    : 'home';
  currentMode = next;
  setMeta({ lastMode: next === 'home' ? getMeta().lastMode : next });

  settingsOpen = false;
  multiDeskOpen = false;

  if (next !== 'newtube') {
    detachTvView();
  }

  const titles = {
    home: 'NewPlayer',
    newtube: 'NewTube — NewPlayer',
    newtv: 'NewTV — NewPlayer',
    newradio: 'NewRadio — NewPlayer',
    newweather: 'NewWeather — NewPlayer',
    news: 'New(s) — NewPlayer',
  };
  mainWindow.setTitle(titles[next] || 'NewPlayer');

  if (next === 'home') {
    mainWindow.loadFile(path.join(__dirname, '../renderer/home.html'));
  } else if (next === 'newtube') {
    mainWindow.loadFile(path.join(__dirname, '../renderer/shell.html'));
    mainWindow.webContents.once('did-finish-load', () => {
      if (currentMode !== 'newtube') return;
      if (!tvView) createTvView();
      else {
        mainWindow.setBrowserView(tvView);
        layoutViews();
      }
      const s = getSettings();
      if (s['behavior.kioskMode'] === true) {
        mainWindow.setFullScreen(true);
      } else if (s['window.startFullscreen'] === true) {
        mainWindow.setFullScreen(true);
      } else if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      }
    });
  } else if (next === 'newtv') {
    mainWindow.loadFile(path.join(__dirname, '../renderer/newtv.html'));
  } else if (next === 'newradio') {
    mainWindow.loadFile(path.join(__dirname, '../renderer/newradio.html'));
  } else if (next === 'newweather') {
    mainWindow.loadFile(path.join(__dirname, '../renderer/newweather.html'));
  } else if (next === 'news') {
    mainWindow.loadFile(path.join(__dirname, '../renderer/news.html'));
  }

  createTray();
  return true;
}

function createTvView() {
  const settings = getSettings();
  let partition = settings['privacy.partition'] || 'persist:newtube';
  if (settings['privacy.incognitoLaunch']) partition = 'temp:newtube-' + Date.now();

  const ses = session.fromPartition(partition);
  const ua = resolveUserAgent(settings);
  ses.setUserAgent(ua);

  // Permissions
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const s = getSettings();
    if (permission === 'notifications') {
      return callback(!!s['privacy.allowNotifications']);
    }
    if (s['privacy.permissionsAutoDeny'] !== false) {
      if (['media', 'mediaKeySystem', 'midi', 'midiSysex', 'pointerLock', 'fullscreen'].includes(permission)) {
        // allow media / fullscreen for video
        if (permission === 'media' || permission === 'mediaKeySystem' || permission === 'fullscreen') {
          return callback(true);
        }
        return callback(false);
      }
    }
    callback(true);
  });

  // Ad Shield — network layer always attached; respects ads.enabled / ads.networkBlock live
  attachNetworkAdblock(ses, getSettings);

  // DNT only on document navigations (not every media chunk)
  if (settings['privacy.doNotTrack'] !== false) {
    ses.webRequest.onBeforeSendHeaders(
      {
        urls: ['*://*.youtube.com/*', '*://*.google.com/*', '*://*.googleapis.com/*'],
        types: ['mainFrame', 'subFrame'],
      },
      (details, callback) => {
        details.requestHeaders['DNT'] = '1';
        callback({ requestHeaders: details.requestHeaders });
      }
    );
  }

  tvView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload-tv.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: settings['privacy.sandbox'] !== false,
      // Keep TV responsive; multi-view needs unthrottled timers
      backgroundThrottling: settings['perf.backgroundThrottling'] === true,
      partition,
      spellcheck: false,
      v8CacheOptions: 'code',
      enableWebSQL: false,
      images: true,
      webgl: true,
    },
  });

  mainWindow.setBrowserView(tvView);
  layoutViews();

  const wc = tvView.webContents;
  wc.setUserAgent(ua);
  wc.setAudioMuted(!!settings['audio.muteOnStart']);
  try {
    wc.setVisualZoomLevelLimits(1, 1);
  } catch {
    /* ignore */
  }

  applyTvZoom(true);

  // Navigation: keep YouTube; open others externally
  wc.setWindowOpenHandler(({ url }) => {
    handleOutboundUrl(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!isYoutubeUrl(url)) {
      e.preventDefault();
      handleOutboundUrl(url);
    }
  });

  wc.on('did-finish-load', () => {
    scheduleInject(true);
    applyTvZoom(true);
    const url = wc.getURL();
    if (getSetting('session.saveLastUrl')) setMeta({ lastUrl: url });
    broadcast('tv-loaded', { url });
  });
  // SPA navigations — light re-arm (debounced)
  wc.on('did-navigate-in-page', () => scheduleInject(false));
  wc.on('dom-ready', () => scheduleInject(true));

  wc.on('did-fail-load', (_e, code, desc, url, isMain) => {
    if (!isMain || code === -3) return; // -3 aborted
    broadcast('tv-fail', { code, desc, url });
    maybeRetryLoad();
  });

  wc.on('render-process-gone', (_e, details) => {
    if (getSetting('perf.quitOnGpuCrash') !== false) {
      setTimeout(() => loadTvEntry(), 500);
    }
    broadcast('toast', { message: `Renderer gone (${details.reason}) — recovering…`, type: 'warn' });
  });

  // Keys while YouTube has focus (must re-attach on every new BrowserView)
  attachTvInputHandlers(wc);

  // Context menu
  wc.on('context-menu', (_e, params) => {
    if (!getSetting('input.rightClickMenu')) return;
    const menu = Menu.buildFromTemplate([
      { label: 'Back', click: () => wc.canGoBack() && wc.goBack() },
      { label: 'Forward', click: () => wc.canGoForward() && wc.goForward() },
      { label: 'Reload', click: () => wc.reload() },
      { type: 'separator' },
      { label: 'Home', click: () => loadTvEntry(true) },
      {
        label: mainWindow.isFullScreen() ? 'Exit Fullscreen (Esc / F11)' : 'Enter Fullscreen (F11)',
        click: () => toggleAppFullscreen(),
      },
      { label: 'Settings', click: () => toggleSettings(true) },
      { type: 'separator' },
      {
        label: 'Open in Browser',
        click: () => shell.openExternal(params.linkURL || wc.getURL()),
      },
      {
        label: 'Copy URL',
        click: () => clipboard.writeText(params.linkURL || wc.getURL()),
      },
    ]);
    menu.popup({ window: mainWindow });
  });

  // Media keys via chrome
  if (settings['input.mediaKeys'] !== false) {
    // Electron handles some via media keys on webContents
  }

  loadTvEntry();
}

let retryCount = 0;
function maybeRetryLoad() {
  const s = getSettings();
  if (!s['network.retryOnFail']) return;
  const max = s['network.retryCount'] ?? 3;
  if (retryCount >= max) return;
  retryCount += 1;
  const delay = s['network.retryDelayMs'] ?? 2000;
  setTimeout(() => loadTvEntry(), delay);
}

function isYoutubeUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.endsWith('youtube.com') ||
      u.hostname.endsWith('youtu.be') ||
      u.hostname.endsWith('youtube-nocookie.com') ||
      u.hostname.endsWith('googlevideo.com') ||
      u.hostname.endsWith('ytimg.com') ||
      u.hostname.endsWith('ggpht.com') ||
      u.hostname.endsWith('google.com') ||
      u.hostname.endsWith('gstatic.com') ||
      u.hostname === 'accounts.google.com'
    );
  } catch {
    return false;
  }
}

function handleOutboundUrl(url) {
  if (isYoutubeUrl(url) && tvView) {
    tvView.webContents.loadURL(url);
    return;
  }
  if (getSetting('integrations.openLinksExternally') !== false) {
    shell.openExternal(url);
  }
}

function loadTvEntry(forceHome = false) {
  if (!tvView) return;
  const s = getSettings();
  const entry = s['network.tvEntryUrl'] || 'https://www.youtube.com/tv';
  const meta = getMeta();
  let url = entry;
  if (!forceHome && s['startup.restoreSession'] && s['playback.resumeLast'] && meta.lastUrl && isYoutubeUrl(meta.lastUrl)) {
    url = meta.lastUrl;
  }
  retryCount = 0;
  tvView.webContents.loadURL(url);
}

function scheduleLayout() {
  if (layoutTimer) return;
  layoutTimer = setTimeout(() => {
    layoutTimer = null;
    layoutViews();
  }, 32); // ~1 frame — avoid thrashing during drag-resize
}

function layoutViews() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!tvView || currentMode !== 'newtube') return;
  let wc;
  try {
    wc = tvView.webContents;
  } catch {
    return;
  }
  if (!wc || wc.isDestroyed()) return;

  try {
    const [w, h] = mainWindow.getContentSize();
    // BrowserView paints above the shell HTML. Reserve chrome / settings space
    // so NewTube UI stays clickable. Integer bounds = sharper on DPI displays.
    const fs = mainWindow.isFullScreen();
    const topBar = fs ? 0 : 44;
    let x = 0;
    let y = topBar;
    let tw = w;
    let th = Math.max(120, h - topBar);

    if (settingsOpen || multiDeskOpen) {
      const panelW = Math.min(
        Number(getSetting('appearance.settingsWidth') || 440),
        Math.floor(w * 0.55)
      );
      tw = Math.max(320, w - panelW);
    }

    tvView.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(tw),
      height: Math.round(th),
    });
    tvView.setAutoResize({ width: !(settingsOpen || multiDeskOpen), height: true });
    applyTvZoom(false);
  } catch {
    /* view may have been destroyed mid-layout */
  }
}

function applyTvZoom(force) {
  if (!tvView || currentMode !== 'newtube') return;
  let wc;
  try {
    wc = tvView.webContents;
  } catch {
    return;
  }
  if (!wc || typeof wc.isDestroyed !== 'function' || wc.isDestroyed()) return;

  const s = getSettings();
  let size;
  try {
    size = tvView.getBounds();
  } catch {
    return;
  }
  const zoom = computeTvZoom({ width: size.width, height: size.height }, s);
  // Skip tiny changes (reduces layout thrash / blur)
  if (!force && Math.abs(zoom - lastAppliedZoom) < 0.02) return;
  lastAppliedZoom = zoom;
  try {
    wc.setZoomFactor(zoom);
  } catch {
    /* ignore */
  }
}

function scheduleInject(force) {
  if (injectTimer) clearTimeout(injectTimer);
  injectTimer = setTimeout(() => {
    injectTimer = null;
    injectTvEnhancements(force);
  }, force ? 50 : 200);
}

function injectTvEnhancements(force = false) {
  if (!tvView || tvView.webContents.isDestroyed()) return;
  const s = getSettings();

  // Only apply expensive CSS filters when user actually changed them
  const b = s['video.brightness'] ?? 100;
  const c = s['video.contrast'] ?? 100;
  const sat = s['video.saturation'] ?? 100;
  const sharp = s['video.sharpnessBoost'] ?? 0;
  const night = s['display.nightLight'] ?? 0;
  const vig = s['display.vignette'] ?? 0;
  const filters = [];
  if (
    s['experimental.cssFilterPipeline'] === true &&
    (b !== 100 || c !== 100 || sat !== 100 || sharp > 0)
  ) {
    filters.push(`brightness(${b}%)`);
    filters.push(`contrast(${c}%)`);
    filters.push(`saturate(${sat}%)`);
    if (sharp > 0) filters.push(`contrast(${100 + sharp * 0.3}%)`);
  }

  const letter = s['display.letterboxColor'] || '#000000';
  const adCss =
    s['ads.enabled'] !== false && s['ads.hideOverlays'] !== false ? getAdHideCss() : '';
  const css = `
    html, body { background: ${letter} !important; }
    ${filters.length ? `video { filter: ${filters.join(' ')} !important; }` : ''}
    ${night > 0 ? `html::after { content:''; pointer-events:none; position:fixed; inset:0; z-index:2147483646; background:rgba(255,160,60,${(night / 100) * 0.35}); mix-blend-mode:multiply; }` : ''}
    ${vig > 0 ? `html::before { content:''; pointer-events:none; position:fixed; inset:0; z-index:2147483645; background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vig / 100}) 100%); }` : ''}
    ${s['display.crtScanlines'] ? `body::after { content:''; pointer-events:none; position:fixed; inset:0; z-index:2147483644; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px); opacity:0.5; }` : ''}
    ${s['video.cinemaBars'] ? `body { box-shadow: inset 0 10vh 0 #000, inset 0 -10vh 0 #000 !important; }` : ''}
    ${s['input.cursorStyle'] === 'none' ? `* { cursor: none !important; }` : ''}
    ${adCss}
  `;
  const custom = s['appearance.injectCssIntoTv'] ? s['appearance.customCss'] || '' : '';
  const fullCss = css + '\n' + custom;
  const injectKey = fullCss.length + '|' + (s['ads.pageSkipper'] !== false) + '|' + (s['ads.skipIntervalMs'] || 750);

  // Avoid re-inserting identical CSS / re-running scripts on every SPA tick
  if (!force && injectKey === lastInjectKey) return;
  lastInjectKey = injectKey;

  tvView.webContents.insertCSS(fullCss).catch(() => {});

  const hideDelay = s['input.cursorHideDelay'] ?? 2500;
  const hideCursor = s['input.hideCursor'] !== false;
  const adShieldOn = s['ads.enabled'] !== false && s['ads.pageSkipper'] !== false;
  const adSkipScript = adShieldOn
    ? getAdSkipScript({
        intervalMs: s['ads.skipIntervalMs'] ?? 750,
        muteAds: s['ads.muteAds'] !== false,
        speedThrough: s['ads.speedThrough'] !== false,
        clickSkip: s['ads.clickSkip'] !== false,
        seekPast: s['ads.seekPast'] !== false,
      })
    : '';

  tvView.webContents
    .executeJavaScript(
      `
    (function(){
      if (!window.__newtubeInit) {
        window.__newtubeInit = true;
        let t;
        const hide = ${hideCursor};
        const delay = ${hideDelay};
        if (hide) {
          const arm = () => {
            document.body && (document.body.style.cursor = 'default');
            clearTimeout(t);
            t = setTimeout(() => { document.body && (document.body.style.cursor = 'none'); }, delay);
          };
          window.addEventListener('mousemove', arm, { passive: true });
          arm();
        }
        window.addEventListener('newtube-pause', () => {
          const v = document.querySelector('video');
          if (v && !v.paused) v.pause();
        });
        window.addEventListener('newtube-play', () => {
          const v = document.querySelector('video');
          if (v && v.paused) v.play().catch(()=>{});
        });
        window.addEventListener('newtube-set-volume', (e) => {
          const v = document.querySelector('video');
          if (v && e.detail != null) v.volume = Math.min(1, Math.max(0, e.detail));
        });

        // Fullscreen exit when YouTube TV has keyboard focus
        window.addEventListener('keydown', function(e) {
          try {
            if (e.key === 'F11') {
              e.preventDefault();
              e.stopPropagation();
              if (window.newtubeTv && window.newtubeTv.toggleFullscreen) {
                window.newtubeTv.toggleFullscreen();
              }
              return;
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
              if (window.newtubeTv && window.newtubeTv.exitFullscreen) {
                window.newtubeTv.exitFullscreen();
              }
            }
          } catch (err) {}
        }, true);
      }
    })();
    ${adSkipScript}
  `,
      true
    )
    .catch(() => {});
}

function sendToTv(eventName) {
  if (!tvView) return;
  tvView.webContents
    .executeJavaScript(`window.dispatchEvent(new Event('${eventName}'))`, true)
    .catch(() => {});
}

// ── Tray ─────────────────────────────────────────────────────
function createTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  // Always show tray when weather background is on
  if (getSetting('behavior.trayIcon') === false && !isWeatherBackgroundEnabled()) return;
  const img = createNativeIcon();
  if (!img || img.isEmpty()) {
    // 16x16 fallback red square
    const empty = nativeImage.createEmpty();
    tray = new Tray(empty);
  } else {
    tray = new Tray(img.resize({ width: 16, height: 16 }));
  }
  const wxStatus = weatherAlerts.getStatus();
  const wxBg = isWeatherBackgroundEnabled();
  tray.setToolTip(
    wxBg
      ? `NewPlayer · Weather alerts${wxStatus.lastAlertCount ? ` · ${wxStatus.lastAlertCount} active` : ''}`
      : 'NewPlayer'
  );
  const playerItems =
    getSetting('multiview.showInTray') === false
      ? []
      : multi.listPlayers().flatMap((p) => [
          {
            label: `${p.muted ? '🔇' : '🔊'} ${p.label}`,
            click: () => multi.focusPlayer(p.id),
          },
          {
            label: `   ${p.muted ? 'Unmute' : 'Mute'} ${p.label}`,
            click: () => {
              multi.toggleMute(p.id, broadcast);
              createTray();
            },
          },
        ]);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show NewPlayer',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { label: 'Home', click: () => { if (mainWindow) { mainWindow.show(); enterMode('home'); } } },
    { label: 'NewTube', click: () => { if (mainWindow) { mainWindow.show(); enterMode('newtube'); } } },
    { label: 'NewTV', click: () => { if (mainWindow) { mainWindow.show(); enterMode('newtv'); } } },
    { label: 'NewRadio', click: () => { if (mainWindow) { mainWindow.show(); enterMode('newradio'); } } },
    { label: 'NewWeather', click: () => { if (mainWindow) { mainWindow.show(); enterMode('newweather'); } } },
    { label: 'New(s)', click: () => { if (mainWindow) { mainWindow.show(); enterMode('news'); } } },
    { type: 'separator' },
    {
      label: wxBg ? '✓ NewWeather background + EAS' : 'Enable NewWeather background + EAS',
      click: () => {
        setSetting('weather.backgroundAlerts', !wxBg);
        setSetting('weather.alertsEnabled', true);
        setSetting('weather.easEnabled', true);
        setSetting('weather.enabled', true);
        ensureWeatherWatcher();
        createTray();
      },
    },
    {
      label: 'Check NWS alerts now',
      click: async () => {
        const res = await weatherAlerts.poll(getSettings, { silent: false });
        // If silent skipped EAS path inside onAlert only for new — force EAS for highest active
        const s = getSettings();
        if (res?.alerts?.length) {
          const top = res.alerts[0];
          if (shouldTriggerEAS(top, s) && !easWindow.isOpen()) fireEAS(top);
        }
        createTray();
      },
    },
    {
      label: 'Test EAS screen',
      click: () => {
        fireEAS({
          id: 'test-eas-' + Date.now(),
          event: 'SEVERE THUNDERSTORM WARNING',
          headline:
            'The National Weather Service has issued a Severe Thunderstorm Warning for your area until further notice.',
          description:
            'At 3:15 PM, a severe thunderstorm was located nearby, moving east at 35 mph. Hazard: 60 mph wind gusts and half-dollar size hail. Source: radar indicated. Impact: hail damage to vehicles is expected. Expect wind damage to roofs, siding, and trees.',
          instruction:
            'For your protection move to an interior room on the lowest floor of a building. Avoid windows.',
          severity: 'Severe',
          urgency: 'Immediate',
          certainty: 'Observed',
          areaDesc: 'Your County and Vicinity',
          senderName: 'NATIONAL WEATHER SERVICE',
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (currentMode !== 'newtube') enterMode('newtube');
          setTimeout(() => toggleSettings(true), 400);
        }
      },
    },
    {
      label: 'New multi player',
      click: () => {
        if (currentMode !== 'newtube') enterMode('newtube');
        setTimeout(() => openMultiPlayer(), 500);
      },
    },
    ...(playerItems.length
      ? [{ type: 'separator' }, { label: 'Players', enabled: false }, ...playerItems]
      : []),
    { type: 'separator' },
    {
      label: wxBg ? 'Quit NewPlayer (stop weather alerts)' : 'Quit',
      click: () => {
        quitting = true;
        weatherAlerts.stop();
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── Shortcuts ────────────────────────────────────────────────
/** Capture a floating (non-max, non-FS) rect so exit never sticks edge-to-edge */
function captureFloatingBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    if (typeof mainWindow.getNormalBounds === 'function') {
      const nb = mainWindow.getNormalBounds();
      if (nb && nb.width > 400 && nb.height > 300) return { ...nb };
    }
  } catch {
    /* ignore */
  }
  if (!mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
    return { ...mainWindow.getBounds() };
  }
  return defaultFloatingBounds();
}

function defaultFloatingBounds() {
  const display =
    mainWindow && !mainWindow.isDestroyed()
      ? screen.getDisplayMatching(mainWindow.getBounds())
      : screen.getPrimaryDisplay();
  const wa = display.workArea;
  const width = Math.min(1280, Math.max(960, Math.round(wa.width * 0.72)));
  const height = Math.min(800, Math.max(600, Math.round(wa.height * 0.72)));
  return {
    x: wa.x + Math.round((wa.width - width) / 2),
    y: wa.y + Math.round((wa.height - height) / 2),
    width,
    height,
  };
}

/** After leaving FS/max — always a normal resizable/movable window with margins */
function restoreFloatingWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
  } catch {
    /* ignore */
  }
  try {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
  } catch {
    /* ignore */
  }

  let b = boundsBeforeFullscreen || defaultFloatingBounds();
  // Reject “fullscreen-like” bounds (covers whole work area)
  try {
    const display = screen.getDisplayMatching(b);
    const wa = display.workArea;
    const coversWorkArea =
      b.width >= wa.width - 8 &&
      b.height >= wa.height - 8 &&
      Math.abs(b.x - wa.x) < 16 &&
      Math.abs(b.y - wa.y) < 16;
    if (coversWorkArea || b.width < 400 || b.height < 300) {
      b = defaultFloatingBounds();
    }
  } catch {
    b = defaultFloatingBounds();
  }

  try {
    mainWindow.setResizable(true);
    mainWindow.setMovable(true);
    mainWindow.setMinimizable(true);
    mainWindow.setMaximizable(true);
    mainWindow.setBounds({
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.round(b.width),
      height: Math.round(b.height),
    });
    // Ensure not still stuck maximized after setBounds on some Windows builds
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
  } catch {
    /* ignore */
  }
  layoutViews();
  broadcast('fullscreen-changed', false);
  broadcast('toast', { message: 'Windowed mode — drag the title bar to move', type: 'info' });
}

/** Reliable app-window fullscreen (not HTML5 video fullscreen alone) */
function toggleAppFullscreen(force) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const goingFs = force !== undefined ? !!force : !mainWindow.isFullScreen();
  try {
    if (goingFs) {
      if (!mainWindow.isFullScreen()) {
        boundsBeforeFullscreen = captureFloatingBounds();
      }
      mainWindow.setFullScreen(true);
    } else {
      exitAppFullscreen();
    }
  } catch {
    /* ignore */
  }
  return mainWindow.isFullScreen();
}

function exitAppFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  try {
    // Exit HTML5 fullscreen inside TV first
    if (tvView) {
      try {
        const wc = tvView.webContents;
        if (wc && !wc.isDestroyed()) {
          wc
            .executeJavaScript(
              `(function(){ try { if (document.fullscreenElement) document.exitFullscreen(); } catch(e){} try { if (document.webkitFullscreenElement) document.webkitExitFullscreen(); } catch(e){} })();`,
              true
            )
            .catch(() => {});
        }
      } catch {
        /* ignore */
      }
    }
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      // leave-full-screen handler also restores; still force floating state
      setTimeout(() => restoreFloatingWindow(), 60);
    } else if (mainWindow.isMaximized()) {
      // User thought maximize was fullscreen — still restore floating
      restoreFloatingWindow();
    } else {
      restoreFloatingWindow();
    }
  } catch {
    try {
      restoreFloatingWindow();
    } catch {
      /* ignore */
    }
  }
  return false;
}

function attachShellInputHandlers() {
  if (!mainWindow || mainWindow.isDestroyed() || shellInputAttached) return;
  shellInputAttached = true;
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    handleShellKey(input, event);
  });
}

function attachTvInputHandlers(wc) {
  if (!wc || wc.isDestroyed()) return;
  // Always attach (new BrowserView each time) — use a flag on the wc object
  if (wc.__newtubeKeysAttached) return;
  wc.__newtubeKeysAttached = true;
  tvInputAttached = true;
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    handleShellKey(input, event);
  });
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const s = getSettings();
  const map = [
    ['shortcut.settings', () => toggleSettings()],
    ['shortcut.fullscreen', () => toggleAppFullscreen()],
    ['shortcut.home', () => loadTvEntry(true)],
    ['shortcut.reload', () => tvView && tvView.webContents.reload()],
    [
      'shortcut.devTools',
      () => {
        if (getSetting('advanced.devtoolsAllowed') !== false && tvView) {
          tvView.webContents.toggleDevTools();
        }
      },
    ],
    [
      'shortcut.mute',
      () => {
        if (!tvView) return;
        tvView.webContents.setAudioMuted(!tvView.webContents.isAudioMuted());
        broadcast('toast', {
          message: tvView.webContents.isAudioMuted() ? 'Muted' : 'Unmuted',
          type: 'info',
        });
      },
    ],
    ['shortcut.volumeUp', () => bumpVolume(1)],
    ['shortcut.volumeDown', () => bumpVolume(-1)],
    ['shortcut.screenshot', () => takeScreenshot()],
    ['shortcut.pip', () => togglePip()],
    [
      'shortcut.quit',
      () => {
        quitting = true;
        app.quit();
      },
    ],
    ['shortcut.commandPalette', () => broadcast('command-palette')],
    ['shortcut.newPlayer', () => openMultiPlayer()],
    [
      'shortcut.multiDesk',
      () => {
        if (mainWindow) {
          mainWindow.show();
          broadcast('multidesk-open');
        }
      },
    ],
    ['shortcut.tilePlayers', () => multi.tilePlayers('active', broadcast)],
  ];

  for (const [keyId, fn] of map) {
    const accel = s[keyId];
    if (!accel) continue;
    try {
      globalShortcut.register(accel, fn);
    } catch {
      /* invalid accelerator */
    }
  }

  // Hard guarantee: F11 always toggles fullscreen while NewPlayer is focused
  // (re-register if settings used a different accel)
  try {
    if (!globalShortcut.isRegistered('F11')) {
      globalShortcut.register('F11', () => toggleAppFullscreen());
    }
  } catch {
    /* ignore */
  }

  attachShellInputHandlers();
  if (tvView) {
    try {
      attachTvInputHandlers(tvView.webContents);
    } catch {
      /* ignore */
    }
  }
}

function handleShellKey(input, event) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const s = getSettings();
  const key = input.key;

  // Esc — always can leave fullscreen; never quits by default
  if (key === 'Escape' || key === 'Esc') {
    if (settingsOpen || multiDeskOpen) {
      if (settingsOpen) toggleSettings(false);
      if (multiDeskOpen) {
        multiDeskOpen = false;
        layoutViews();
        broadcast('multidesk-open'); // shell may ignore; panel close via IPC later
        try {
          mainWindow.webContents.send('settings-visibility', { open: false });
        } catch {
          /* ignore */
        }
      }
      escPressTimes = [];
      event.preventDefault();
      return;
    }
    if (s['input.escapeExitsFullscreen'] !== false && mainWindow.isFullScreen()) {
      exitAppFullscreen();
      escPressTimes = [];
      event.preventDefault();
      return;
    }
    // Double-Esc quit only if user enabled it (default off)
    if (s['behavior.doubleEscQuit'] === true) {
      const now = Date.now();
      escPressTimes = escPressTimes.filter((t) => now - t < 800);
      escPressTimes.push(now);
      if (escPressTimes.length >= 2) {
        quitting = true;
        app.quit();
      }
    }
    return;
  }

  // F11 — toggle window fullscreen (works even when YT has focus via before-input)
  if ((key === 'F11' || key === 'f11') && s['input.f11Fullscreen'] !== false) {
    toggleAppFullscreen();
    event.preventDefault();
    return;
  }

  if (input.control && (key === ',' || key === 'Comma')) {
    toggleSettings();
    event.preventDefault();
  }
}

function bumpVolume(dir) {
  const step = (getSetting('audio.volumeStep') || 5) / 100;
  const cur = getSetting('audio.masterVolume') ?? 100;
  const next = Math.min(100, Math.max(0, cur + dir * (getSetting('audio.volumeStep') || 5)));
  setSetting('audio.masterVolume', next);
  applyMasterVolume(next);
  if (getSetting('audio.showVolumeHud') !== false) {
    broadcast('volume-hud', { volume: next });
  }
}

function applyMasterVolume(pct) {
  if (!tvView) return;
  const v = (pct ?? 100) / 100;
  tvView.webContents
    .executeJavaScript(
      `window.dispatchEvent(new CustomEvent('newtube-set-volume', { detail: ${v} }))`,
      true
    )
    .catch(() => {});
}

async function takeScreenshot() {
  if (!tvView) return;
  try {
    const img = await tvView.webContents.capturePage();
    const folder =
      getSetting('integrations.screenshotFolder') ||
      path.join(app.getPath('pictures'), 'NewTube');
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, `newtube-${Date.now()}.png`);
    fs.writeFileSync(file, img.toPNG());
    broadcast('toast', { message: `Screenshot saved`, type: 'success' });
  } catch (err) {
    broadcast('toast', { message: 'Screenshot failed', type: 'error' });
  }
}

let pipMode = false;
let prePipBounds = null;
function togglePip() {
  if (!mainWindow) return;
  if (!pipMode) {
    prePipBounds = mainWindow.getBounds();
    mainWindow.setFullScreen(false);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setBounds({ width: 480, height: 270, x: 40, y: 40 });
    pipMode = true;
    broadcast('toast', { message: 'Picture-in-picture window', type: 'info' });
  } else {
    mainWindow.setAlwaysOnTop(!!getSetting('window.alwaysOnTop'));
    if (prePipBounds) mainWindow.setBounds(prePipBounds);
    pipMode = false;
  }
}

function toggleSettings(force) {
  settingsOpen = force !== undefined ? force : !settingsOpen;
  layoutViews();
  if (settingsOpen) {
    if (mainWindow) mainWindow.webContents.focus();
  } else {
    if (tvView) tvView.webContents.focus();
  }
  broadcast('settings-visibility', { open: settingsOpen });
}

function broadcast(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
  // Keep tray player list fresh
  if (channel === 'multiview-updated') {
    try {
      createTray();
    } catch {
      /* ignore */
    }
  }
}

function openMultiPlayer(opts = {}) {
  if (getSetting('multiview.enabled') === false) {
    broadcast('toast', { message: 'Multi Desk is disabled in settings', type: 'warn' });
    return null;
  }
  const slot = multi.createPlayer({
    ...opts,
    broadcast,
    iconPng: ICON_PNG,
    iconIco: ICON_ICO,
  });
  if (slot && getSetting('multiview.tileOnOpen') && multi.count() > 1) {
    multi.tilePlayers('active', broadcast);
  }
  // Solo audio: mute others when opening unmuted? optional via startMuted
  if (slot && getSetting('multiview.muteOthersOnFocus')) {
    for (const p of multi.listPlayers()) {
      if (p.id !== slot.id) multi.setMuted(p.id, true, broadcast);
    }
  }
  createTray();
  return slot ? { id: slot.id, label: slot.label } : null;
}

function applyPriority(s) {
  // Best-effort: not fully exposed on all platforms in Electron
  try {
    if (process.platform === 'win32' && s['perf.processPriority'] === 'high') {
      // os module priority if available
    }
  } catch {
    /* ignore */
  }
}

function updatePowerBlocker(s) {
  if (powerBlockerId != null && powerSaveBlocker.isStarted(powerBlockerId)) {
    powerSaveBlocker.stop(powerBlockerId);
    powerBlockerId = null;
  }
  if (s['behavior.preventSystemSleep'] || s['behavior.preventDisplaySleep']) {
    const type = s['behavior.preventDisplaySleep'] !== false ? 'prevent-display-sleep' : 'prevent-app-suspension';
    powerBlockerId = powerSaveBlocker.start(type);
  }
}

function setupClipboardWatch() {
  if (clipboardTimer) clearInterval(clipboardTimer);
  if (!getSetting('integrations.clipboardWatch')) return;
  let last = '';
  clipboardTimer = setInterval(() => {
    try {
      const t = clipboard.readText().trim();
      if (!t || t === last) return;
      last = t;
      if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(t)) {
        broadcast('clipboard-youtube', { url: t });
      }
    } catch {
      /* ignore */
    }
  }, 1500);
}

// ── IPC ──────────────────────────────────────────────────────
function setupIpc() {
  ipcMain.handle('settings:getAll', () => getSettings());
  ipcMain.handle('settings:getCatalog', () => ({ categories: CATEGORIES, settings: SETTINGS, count: COUNT }));
  ipcMain.handle('settings:set', (_e, id, value) => {
    const all = setSetting(id, value);
    onSettingChanged(id, value);
    return all;
  });
  ipcMain.handle('settings:setMany', (_e, partial) => {
    const all = setSettings(partial);
    for (const [k, v] of Object.entries(partial || {})) onSettingChanged(k, v);
    return all;
  });
  ipcMain.handle('settings:reset', () => {
    const all = resetSettings();
    broadcast('toast', { message: 'Settings reset to defaults — restart recommended', type: 'warn' });
    return all;
  });
  ipcMain.handle('settings:export', async () => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export NewTube settings',
      defaultPath: 'newtube-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return null;
    fs.writeFileSync(filePath, JSON.stringify(getSettings(), null, 2), 'utf8');
    return filePath;
  });
  ipcMain.handle('settings:import', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import NewTube settings',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!filePaths?.[0]) return null;
    try {
      const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
      const all = setSettings(data);
      broadcast('toast', { message: 'Settings imported — restart for full effect', type: 'success' });
      return all;
    } catch {
      broadcast('toast', { message: 'Import failed', type: 'error' });
      return null;
    }
  });

  ipcMain.handle('app:toggleSettings', (_e, force) => {
    toggleSettings(force);
    return settingsOpen;
  });
  ipcMain.handle('app:toggleFullscreen', () => toggleAppFullscreen());
  ipcMain.handle('app:exitFullscreen', () => {
    exitAppFullscreen();
    return false;
  });
  ipcMain.handle('app:isFullscreen', () => !!(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFullScreen()));
  ipcMain.handle('app:home', () => {
    if (currentMode === 'newtube') loadTvEntry(true);
    else enterMode('home');
  });
  ipcMain.handle('app:enterMode', (_e, mode) => enterMode(mode));
  ipcMain.handle('app:openHomeSettings', () => {
    enterMode('newtube');
    setTimeout(() => toggleSettings(true), 500);
  });
  ipcMain.handle('app:reload', () => tvView && tvView.webContents.reload());
  ipcMain.handle('app:quit', () => {
    quitting = true;
    app.quit();
  });
  ipcMain.handle('app:openLogs', () => {
    shell.openPath(app.getPath('userData'));
  });
  ipcMain.handle('app:clearCache', async () => {
    if (tvView) {
      await tvView.webContents.session.clearCache();
      broadcast('toast', { message: 'Cache cleared', type: 'success' });
    }
  });
  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    settingsCount: COUNT,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: process.platform,
    userData: app.getPath('userData'),
  }));
  ipcMain.handle('app:notify', (_e, { title, body }) => {
    if (getSetting('notify.enabled') === false) return;
    if (Notification.isSupported()) {
      new Notification({ title: title || 'NewPlayer', body: body || '' }).show();
    }
  });
  ipcMain.handle('app:openExternal', (_e, url) => shell.openExternal(url));
  ipcMain.handle('meta:get', () => getMeta());
  ipcMain.handle('meta:set', (_e, partial) => setMeta(partial));
  ipcMain.handle('tv:focus', () => {
    if (tvView) tvView.webContents.focus();
  });

  // ── NewTV IPTV ───────────────────────────────────────────
  ipcMain.handle('iptv:catalog', () => iptv.getCatalog());
  ipcMain.handle('iptv:country', async (_e, code) => iptv.loadByCountry(code));
  ipcMain.handle('iptv:genre', async (_e, id) => iptv.loadByGenre(id));
  ipcMain.handle('iptv:custom', async (_e, url) => {
    if (!url || !/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
    return iptv.loadCustomM3U(url);
  });
  ipcMain.handle('iptv:favorites', () => getIptvFavorites());
  ipcMain.handle('iptv:toggleFavorite', (_e, ch) => toggleIptvFavorite(ch));
  ipcMain.handle('iptv:clearCache', () => {
    iptv.clearCache();
    return true;
  });

  // ── NewRadio ─────────────────────────────────────────────
  ipcMain.handle('music:catalog', () => music.getCatalog());
  ipcMain.handle('music:genres', () => music.getGenres());
  ipcMain.handle('music:byGenre', async (_e, g, opts) => music.getStationsByGenre(g, opts));
  ipcMain.handle('music:search', async (_e, q, opts) => music.searchStations(q, opts));
  ipcMain.handle('music:top', async (_e, limit) => music.topStations(limit));
  ipcMain.handle('music:country', async (_e, code, limit) => music.stationsByCountry(code, limit));
  ipcMain.handle('music:religion', async (_e, id, limit) => music.stationsByReligion(id, limit));
  ipcMain.handle('music:filter', async (_e, opts) => music.filterStations(opts || {}));
  ipcMain.handle('music:favorites', () => getMusicFavorites());
  ipcMain.handle('music:toggleFavorite', (_e, st) => toggleMusicFavorite(st));
  ipcMain.handle('music:click', async (_e, id) => id);

  // ── Weather (NWS) ────────────────────────────────────────
  ipcMain.handle('weather:bundle', async () => {
    const s = getSettings();
    return weatherSvc.getBundle(s);
  });
  ipcMain.handle('weather:alerts', async () => {
    const s = getSettings();
    const loc = await weatherSvc.resolveLocation(s);
    return weatherSvc.getAlerts(loc.lat, loc.lon);
  });
  ipcMain.handle('weather:startBackground', () => {
    setSetting('weather.backgroundAlerts', true);
    setSetting('weather.alertsEnabled', true);
    setSetting('weather.enabled', true);
    // Ensure tray exists for background-only mode
    if (getSetting('behavior.trayIcon') === false) setSetting('behavior.trayIcon', true);
    ensureWeatherWatcher();
    createTray();
    return weatherAlerts.getStatus();
  });
  ipcMain.handle('weather:stopBackground', () => {
    setSetting('weather.backgroundAlerts', false);
    weatherAlerts.stop();
    createTray();
    return weatherAlerts.getStatus();
  });
  ipcMain.handle('weather:status', () => weatherAlerts.getStatus());
  ipcMain.handle('weather:testEAS', () => {
    fireEAS({
      id: 'test-eas-' + Date.now(),
      event: 'TORNADO WARNING',
      headline: 'The National Weather Service has issued a Tornado Warning.',
      description:
        'A tornado warning means a tornado has been sighted or indicated by weather radar. Take cover immediately.',
      instruction: 'Move to an interior room on the lowest floor. Stay away from windows.',
      severity: 'Extreme',
      urgency: 'Immediate',
      certainty: 'Observed',
      areaDesc: 'Your County',
      senderName: 'NATIONAL WEATHER SERVICE',
      effective: new Date().toISOString(),
      expires: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    });
    return true;
  });

  // EAS window
  ipcMain.handle('eas:setLocked', (_e, locked) => {
    easWindow.setLocked(!!locked);
    return true;
  });
  ipcMain.handle('eas:dismiss', (_e, force) => {
    easWindow.closeEAS(!!force);
    return true;
  });
  ipcMain.handle('eas:openWeather', () => {
    easWindow.closeEAS(true);
    if (mainWindow) {
      mainWindow.show();
      enterMode('newweather');
    }
    return true;
  });

  // New(s)
  ipcMain.handle('news:catalog', () => newsSvc.getCatalog());
  ipcMain.handle('news:headlines', async (_e, opts) => newsSvc.getHeadlines(opts || {}));
  ipcMain.handle('news:open', (_e, url) => {
    if (url && /^https?:\/\//i.test(url)) shell.openExternal(url);
    return true;
  });

  // ── Multi Desk IPC ───────────────────────────────────────
  ipcMain.handle('multiview:list', () => multi.listPlayers());
  ipcMain.handle('multiview:displays', () => multi.getDisplayInfo());
  ipcMain.handle('multiview:open', (_e, opts = {}) => {
    return openMultiPlayer(opts);
  });
  ipcMain.handle('multiview:close', (_e, id) => multi.closePlayer(id, broadcast));
  ipcMain.handle('multiview:closeAll', () => multi.closeAll(broadcast));
  ipcMain.handle('multiview:mute', (_e, id, muted) => multi.setMuted(id, muted, broadcast));
  ipcMain.handle('multiview:toggleMute', (_e, id) => multi.toggleMute(id, broadcast));
  ipcMain.handle('multiview:muteAll', (_e, muted) => multi.muteAll(!!muted, broadcast));
  ipcMain.handle('multiview:focus', (_e, id) => multi.focusPlayer(id));
  ipcMain.handle('multiview:moveToDisplay', (_e, id, index) =>
    multi.moveToDisplay(id, index, broadcast)
  );
  ipcMain.handle('multiview:tile', (_e, mode) => multi.tilePlayers(mode || 'active', broadcast));
  ipcMain.handle('multiview:cascade', () => multi.cascadePlayers(broadcast));
  ipcMain.handle('multiview:loadUrl', (_e, id, url) => multi.loadUrl(id, url));
  ipcMain.handle('multiview:alwaysOnTop', (_e, id, value) =>
    multi.setAlwaysOnTop(id, value, broadcast)
  );
  ipcMain.handle('multiview:setPanelOpen', (_e, open) => {
    multiDeskOpen = !!open;
    layoutViews();
    return multiDeskOpen;
  });

  // Per floating-player chrome IPC (identify by sender window)
  const playerIdFromEvent = (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return null;
    for (const p of multi.listPlayers()) {
      const slot = multi.getSlot(p.id);
      if (slot && slot.win === win) return p.id;
    }
    return null;
  };
  ipcMain.handle('player:getState', (e) => {
    const id = playerIdFromEvent(e);
    const slot = multi.getSlot(id);
    return slot
      ? {
          id: slot.id,
          label: slot.label,
          muted: slot.muted,
          alwaysOnTop: slot.alwaysOnTop,
          url: slot.url,
        }
      : null;
  });
  ipcMain.handle('player:mute', (e, muted) => {
    const id = playerIdFromEvent(e);
    return multi.setMuted(id, muted, broadcast);
  });
  ipcMain.handle('player:toggleMute', (e) => {
    const id = playerIdFromEvent(e);
    const ok = multi.toggleMute(id, broadcast);
    createTray();
    return ok;
  });
  ipcMain.handle('player:alwaysOnTop', (e, v) => {
    const id = playerIdFromEvent(e);
    return multi.setAlwaysOnTop(id, v, broadcast);
  });
  ipcMain.handle('player:loadUrl', (e, url) => {
    const id = playerIdFromEvent(e);
    return multi.loadUrl(id, url);
  });
  ipcMain.handle('player:home', (e) => {
    const id = playerIdFromEvent(e);
    return multi.loadUrl(id, getSetting('network.tvEntryUrl') || 'https://www.youtube.com/tv');
  });
  ipcMain.handle('player:reload', (e) => {
    const id = playerIdFromEvent(e);
    const slot = multi.getSlot(id);
    if (slot) slot.view.webContents.reload();
    return !!slot;
  });
  ipcMain.handle('player:close', (e) => {
    const id = playerIdFromEvent(e);
    const ok = multi.closePlayer(id, broadcast);
    createTray();
    return ok;
  });
  ipcMain.handle('player:fullscreen', (e) => {
    const id = playerIdFromEvent(e);
    return multi.setFullscreen(id);
  });
  ipcMain.handle('player:moveToDisplay', (e, index) => {
    const id = playerIdFromEvent(e);
    return multi.moveToDisplay(id, index, broadcast);
  });
  ipcMain.handle('player:minimize', (e) => {
    const id = playerIdFromEvent(e);
    const slot = multi.getSlot(id);
    if (slot && !slot.win.isDestroyed()) slot.win.minimize();
    return !!slot;
  });

  ipcMain.on('shell:ready', () => {
    broadcast('bootstrap', {
      settings: getSettings(),
      categories: CATEGORIES,
      catalog: SETTINGS,
      count: COUNT,
      meta: getMeta(),
      players: multi.listPlayers(),
      displays: multi.getDisplayInfo(),
      info: {
        version: app.getVersion(),
        settingsCount: COUNT,
      },
    });
    // Mark first run complete after shell ready
    if (getMeta().firstRun) setMeta({ firstRun: false });
  });
}

function onSettingChanged(id, value) {
  // Live-apply where possible
  if (id === 'window.alwaysOnTop' && mainWindow) {
    mainWindow.setAlwaysOnTop(!!value);
  }
  if (id === 'window.opacity' && mainWindow) {
    mainWindow.setOpacity(Math.min(1, Math.max(0.4, value / 100)));
  }
  if (
    id === 'display.zoomFactor' ||
    id === 'display.scaleMode' ||
    id === 'display.densityBias'
  ) {
    applyTvZoom(true);
  }
  if (
    id.startsWith('video.') ||
    id.startsWith('display.night') ||
    id.startsWith('display.vignette') ||
    id === 'display.crtScanlines' ||
    id === 'display.letterboxColor' ||
    id === 'appearance.customCss' ||
    id === 'appearance.injectCssIntoTv' ||
    id.startsWith('ads.')
  ) {
    lastInjectKey = '';
    scheduleInject(true);
  }
  if (id.startsWith('shortcut.') || id === 'input.f11Fullscreen') {
    registerShortcuts();
  }
  if (id === 'behavior.trayIcon') createTray();
  if (id.startsWith('behavior.prevent')) updatePowerBlocker(getSettings());
  if (id === 'integrations.clipboardWatch') setupClipboardWatch();
  if (id === 'audio.masterVolume') applyMasterVolume(value);
  if (id === 'startup.launchOnLogin') {
    app.setLoginItemSettings({ openAtLogin: !!value });
  }
  if (
    id === 'weather.backgroundAlerts' ||
    id === 'weather.alertsEnabled' ||
    id === 'weather.enabled' ||
    id === 'weather.pollMinutes' ||
    id === 'weather.zip' ||
    id === 'weather.lat' ||
    id === 'weather.lon' ||
    id === 'weather.minSeverity'
  ) {
    ensureWeatherWatcher();
  }
  if (getSetting('session.exportSettingsOnChange')) {
    try {
      const backup = path.join(app.getPath('userData'), 'settings-backup.json');
      fs.writeFileSync(backup, JSON.stringify(getSettings(), null, 2));
    } catch {
      /* ignore */
    }
  }
  broadcast('settings-updated', { id, value, settings: getSettings() });
}

// ── App lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  if (getSetting('startup.deepLinkProtocol') !== false) {
    try {
      if (process.defaultApp) {
        if (process.argv.length >= 2) {
          app.setAsDefaultProtocolClient('newtube', process.execPath, [path.resolve(process.argv[1])]);
        }
      } else {
        app.setAsDefaultProtocolClient('newtube');
      }
    } catch {
      /* ignore */
    }
  }

  if (getSetting('startup.launchOnLogin')) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  if (getSetting('startup.clearCacheOnLaunch')) {
    session.defaultSession.clearCache().catch(() => {});
  }

  setupIpc();
  createWindow();
  handleDeepLink(process.argv);
  // Start NWS watcher if user enabled background alerts
  ensureWeatherWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('window-all-closed', () => {
  // Keep process alive for weather tray alerts or multi-players
  if (process.platform !== 'darwin') {
    if (isWeatherBackgroundEnabled()) {
      ensureWeatherWatcher();
      return;
    }
    if (!mainWindow && multi.count() === 0) {
      quitting = true;
      app.quit();
    }
  }
});

app.on('will-quit', async (e) => {
  weatherAlerts.stop();
  easWindow.destroy();
  globalShortcut.unregisterAll();
  multi.destroyAll();
  if (clipboardTimer) clearInterval(clipboardTimer);
  if (powerBlockerId != null) {
    try {
      powerSaveBlocker.stop(powerBlockerId);
    } catch {
      /* ignore */
    }
  }
  const s = getSettings();
  try {
    if (s['privacy.clearCacheOnExit'] && tvView) {
      e.preventDefault();
      await tvView.webContents.session.clearCache();
      if (s['privacy.clearCookiesOnExit']) {
        await tvView.webContents.session.clearStorageData({ storages: ['cookies'] });
      }
      app.exit(0);
    } else if (s['privacy.clearCookiesOnExit'] && tvView) {
      e.preventDefault();
      await tvView.webContents.session.clearStorageData({ storages: ['cookies'] });
      app.exit(0);
    }
  } catch {
    /* ignore */
  }
});

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});
