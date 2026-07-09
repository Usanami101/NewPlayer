/**
 * NewTube Multi Desk — play multiple videos at once.
 * Each player is a free-floating window you can drag to any monitor,
 * mute independently, always-on-top, tile, etc.
 */

const path = require('path');
const {
  BrowserWindow,
  BrowserView,
  screen,
  Menu,
  clipboard,
  shell,
} = require('electron');
const { getSettings, getSetting } = require('./store');
const { resolveUserAgent } = require('./userAgents');
const {
  attachNetworkAdblock,
  getAdHideCss,
  getAdSkipScript,
} = require('./adblock');
const { computeTvZoom } = require('./scale');

let nextId = 1;
/** @type {Map<number, PlayerSlot>} */
const players = new Map();

/**
 * @typedef {object} PlayerSlot
 * @property {number} id
 * @property {string} title
 * @property {BrowserWindow} win
 * @property {BrowserView} view
 * @property {boolean} muted
 * @property {boolean} alwaysOnTop
 * @property {string} url
 * @property {string} label
 */

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

function toPlayableUrl(input) {
  if (!input || !String(input).trim()) {
    return getSetting('network.tvEntryUrl') || 'https://www.youtube.com/tv';
  }
  const raw = String(input).trim();
  // bare video id
  if (/^[\w-]{11}$/.test(raw)) {
    return `https://www.youtube.com/tv#/watch/video/control?v=${raw}`;
  }
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').slice(0, 11);
      if (id) return `https://www.youtube.com/tv#/watch/video/control?v=${id}`;
    }
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube.com/tv#/watch/video/control?v=${v}`;
    // already tv or youtube — use as-is if youtube family
    if (isYoutubeUrl(u.href)) return u.href;
  } catch {
    /* fall through */
  }
  return getSetting('network.tvEntryUrl') || 'https://www.youtube.com/tv';
}

function chromeHeight() {
  return 40;
}

function iconPath(iconPng, iconIco) {
  const fs = require('fs');
  if (iconIco && fs.existsSync(iconIco)) return iconIco;
  if (iconPng && fs.existsSync(iconPng)) return iconPng;
  return undefined;
}

/**
 * @param {object} opts
 * @param {string} [opts.url]
 * @param {string} [opts.label]
 * @param {{x?:number,y?:number,width?:number,height?:number}} [opts.bounds]
 * @param {number} [opts.displayIndex]
 * @param {boolean} [opts.muted]
 * @param {boolean} [opts.alwaysOnTop]
 * @param {(channel:string, payload:any)=>void} opts.broadcast
 * @param {string} [opts.iconPng]
 * @param {string} [opts.iconIco]
 * @param {boolean} [opts.shareSession]
 */
function createPlayer(opts) {
  const s = getSettings();
  const max = Number(s['multiview.maxPlayers'] || 8);
  if (players.size >= max) {
    opts.broadcast?.('toast', {
      message: `Max ${max} players — close one first`,
      type: 'warn',
    });
    return null;
  }

  const id = nextId++;
  const label = opts.label || `Player ${id}`;
  const url = toPlayableUrl(opts.url);
  const displays = screen.getAllDisplays();
  const display =
    displays[Math.min(Math.max(0, opts.displayIndex ?? s['multiview.defaultDisplay'] ?? 0), displays.length - 1)] ||
    screen.getPrimaryDisplay();

  const width = opts.bounds?.width || s['multiview.defaultWidth'] || 960;
  const height = opts.bounds?.height || s['multiview.defaultHeight'] || 540;
  const stagger = (players.size % 6) * 36;
  const x =
    opts.bounds?.x ??
    display.workArea.x + Math.round((display.workArea.width - width) / 2) + stagger;
  const y =
    opts.bounds?.y ??
    display.workArea.y + Math.round((display.workArea.height - height) / 2) + stagger;

  const shareSession = opts.shareSession !== false && s['multiview.shareSession'] !== false;
  const partition = shareSession
    ? s['privacy.partition'] || 'persist:newtube'
    : `persist:newtube-player-${id}`;

  const alwaysOnTop = opts.alwaysOnTop ?? !!s['multiview.alwaysOnTopDefault'];
  const muted = opts.muted ?? !!s['multiview.startMuted'];

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 400,
    minHeight: 280,
    title: `NewTube — ${label}`,
    icon: iconPath(opts.iconPng, opts.iconIco),
    backgroundColor: '#0a0a0b',
    show: false,
    frame: false,
    transparent: false,
    alwaysOnTop,
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-player.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: s['privacy.sandbox'] !== false,
      backgroundThrottling: false, // keep multi videos playing
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/player.html'), {
    query: { id: String(id), label },
  });

  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload-tv.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: s['privacy.sandbox'] !== false,
      backgroundThrottling: false,
      partition,
      spellcheck: false,
    },
  });

  const ua = resolveUserAgent(s);
  try {
    view.webContents.session.setUserAgent(ua);
    attachNetworkAdblock(view.webContents.session, getSettings);
  } catch {
    /* ignore */
  }
  view.webContents.setUserAgent(ua);
  view.webContents.setAudioMuted(muted);

  win.setBrowserView(view);

  const layout = () => {
    if (win.isDestroyed()) return;
    const [w, h] = win.getContentSize();
    const ch = chromeHeight();
    const bw = Math.round(w);
    const bh = Math.round(Math.max(100, h - ch));
    view.setBounds({ x: 0, y: ch, width: bw, height: bh });
    view.setAutoResize({ width: true, height: true });
    try {
      const zoom = computeTvZoom({ width: bw, height: bh }, getSettings());
      view.webContents.setZoomFactor(zoom);
    } catch {
      /* ignore */
    }
  };

  win.on('resize', layout);
  win.once('ready-to-show', () => {
    win.show();
    layout();
  });

  const inject = () => {
    if (view.webContents.isDestroyed()) return;
    const st = getSettings();
    if (st['ads.enabled'] !== false && st['ads.hideOverlays'] !== false) {
      view.webContents.insertCSS(getAdHideCss()).catch(() => {});
    }
    if (st['ads.enabled'] !== false && st['ads.pageSkipper'] !== false) {
      const script = getAdSkipScript({
        intervalMs: st['ads.skipIntervalMs'] ?? 750,
        muteAds: st['ads.muteAds'] !== false,
        speedThrough: st['ads.speedThrough'] !== false,
        clickSkip: st['ads.clickSkip'] !== false,
        seekPast: st['ads.seekPast'] !== false,
      });
      view.webContents.executeJavaScript(script, true).catch(() => {});
    }
    // keep playing in background
    view.webContents
      .executeJavaScript(
        `(function(){ if(window.__ntMulti) return; window.__ntMulti=true;
          document.addEventListener('visibilitychange',()=>{});
        })();`,
        true
      )
      .catch(() => {});
  };

  view.webContents.on('did-finish-load', () => {
    inject();
    const current = view.webContents.getURL();
    const slot = players.get(id);
    if (slot) {
      slot.url = current;
      notifyList(opts.broadcast);
      pushPlayerState(id);
    }
  });
  view.webContents.on('did-navigate-in-page', () => inject());
  view.webContents.on('dom-ready', () => inject());

  view.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    if (isYoutubeUrl(openUrl)) {
      view.webContents.loadURL(openUrl);
    } else {
      shell.openExternal(openUrl);
    }
    return { action: 'deny' };
  });
  view.webContents.on('will-navigate', (e, navUrl) => {
    if (!isYoutubeUrl(navUrl)) {
      e.preventDefault();
      shell.openExternal(navUrl);
    }
  });

  view.webContents.on('context-menu', () => {
    const slot = players.get(id);
    if (!slot) return;
    const menu = Menu.buildFromTemplate([
      {
        label: slot.muted ? 'Unmute this player' : 'Mute this player',
        click: () => setMuted(id, !slot.muted, opts.broadcast),
      },
      {
        label: slot.alwaysOnTop ? 'Disable always on top' : 'Always on top',
        click: () => setAlwaysOnTop(id, !slot.alwaysOnTop, opts.broadcast),
      },
      { type: 'separator' },
      { label: 'Home (YouTube TV)', click: () => loadUrl(id, getSetting('network.tvEntryUrl') || 'https://www.youtube.com/tv') },
      { label: 'Reload', click: () => view.webContents.reload() },
      { label: 'Copy URL', click: () => clipboard.writeText(view.webContents.getURL()) },
      { type: 'separator' },
      { label: 'Fullscreen', click: () => win.setFullScreen(!win.isFullScreen()) },
      { label: 'Close player', click: () => closePlayer(id, opts.broadcast) },
    ]);
    menu.popup({ window: win });
  });

  /** @type {PlayerSlot} */
  const slot = {
    id,
    title: label,
    label,
    win,
    view,
    muted,
    alwaysOnTop,
    url,
    broadcast: opts.broadcast,
  };
  players.set(id, slot);

  win.on('closed', () => {
    players.delete(id);
    notifyList(opts.broadcast);
  });

  // Move to different monitors via shortcuts from player chrome
  win.on('moved', () => {
    // optional: remember bounds later
  });

  view.webContents.loadURL(url);
  layout();
  notifyList(opts.broadcast);
  opts.broadcast?.('toast', { message: `${label} opened`, type: 'info' });
  return slot;
}

function getSlot(id) {
  return players.get(Number(id));
}

function listPlayers() {
  return [...players.values()].map((p) => serialize(p));
}

function serialize(p) {
  let bounds = null;
  let displayId = null;
  try {
    if (!p.win.isDestroyed()) {
      bounds = p.win.getBounds();
      const d = screen.getDisplayMatching(bounds);
      displayId = d?.id ?? null;
    }
  } catch {
    /* ignore */
  }
  return {
    id: p.id,
    label: p.label,
    title: p.title,
    muted: p.muted,
    alwaysOnTop: p.alwaysOnTop,
    url: p.url || (p.view && !p.view.webContents.isDestroyed() ? p.view.webContents.getURL() : ''),
    bounds,
    displayId,
  };
}

function notifyList(broadcast) {
  const fn = broadcast || defaultBroadcast;
  fn?.('multiview-updated', { players: listPlayers() });
}

function defaultBroadcast(channel, payload) {
  for (const p of players.values()) {
    if (p.broadcast) {
      p.broadcast(channel, payload);
      return;
    }
  }
}

function pushPlayerState(id) {
  const p = getSlot(id);
  if (!p || p.win.isDestroyed()) return;
  p.win.webContents.send('player-state', serialize(p));
}

function setMuted(id, muted, broadcast) {
  const p = getSlot(id);
  if (!p) return false;
  p.muted = !!muted;
  try {
    p.view.webContents.setAudioMuted(p.muted);
  } catch {
    /* ignore */
  }
  pushPlayerState(id);
  notifyList(broadcast || p.broadcast);
  return true;
}

function toggleMute(id, broadcast) {
  const p = getSlot(id);
  if (!p) return false;
  return setMuted(id, !p.muted, broadcast);
}

function setAlwaysOnTop(id, value, broadcast) {
  const p = getSlot(id);
  if (!p || p.win.isDestroyed()) return false;
  p.alwaysOnTop = !!value;
  p.win.setAlwaysOnTop(p.alwaysOnTop);
  pushPlayerState(id);
  notifyList(broadcast || p.broadcast);
  return true;
}

function loadUrl(id, url) {
  const p = getSlot(id);
  if (!p) return false;
  const target = toPlayableUrl(url);
  p.url = target;
  p.view.webContents.loadURL(target);
  pushPlayerState(id);
  return true;
}

function closePlayer(id, broadcast) {
  const p = getSlot(id);
  if (!p) return false;
  try {
    if (!p.win.isDestroyed()) p.win.close();
  } catch {
    /* ignore */
  }
  players.delete(Number(id));
  notifyList(broadcast || p.broadcast);
  return true;
}

function closeAll(broadcast) {
  for (const id of [...players.keys()]) {
    closePlayer(id, broadcast);
  }
}

function focusPlayer(id) {
  const p = getSlot(id);
  if (!p || p.win.isDestroyed()) return false;
  if (p.win.isMinimized()) p.win.restore();
  p.win.show();
  p.win.focus();
  return true;
}

function setFullscreen(id, value) {
  const p = getSlot(id);
  if (!p || p.win.isDestroyed()) return false;
  p.win.setFullScreen(value !== undefined ? !!value : !p.win.isFullScreen());
  return true;
}

/** Move player to a monitor by index (0-based) */
function moveToDisplay(id, displayIndex, broadcast) {
  const p = getSlot(id);
  if (!p || p.win.isDestroyed()) return false;
  const displays = screen.getAllDisplays();
  const d = displays[displayIndex];
  if (!d) return false;
  const b = p.win.getBounds();
  const width = Math.min(b.width, d.workArea.width);
  const height = Math.min(b.height, d.workArea.height);
  const x = d.workArea.x + Math.round((d.workArea.width - width) / 2);
  const y = d.workArea.y + Math.round((d.workArea.height - height) / 2);
  p.win.setBounds({ x, y, width, height });
  p.win.focus();
  notifyList(broadcast || p.broadcast);
  return true;
}

/** Tile all multi-players across a display (or all displays) */
function tilePlayers(mode = 'active', broadcast) {
  const list = [...players.values()].filter((p) => !p.win.isDestroyed());
  if (!list.length) return;

  if (mode === 'spread') {
    // one player per display when possible, cascade remainder
    const displays = screen.getAllDisplays();
    list.forEach((p, i) => {
      const d = displays[i % displays.length];
      const cols = Math.ceil(Math.sqrt(Math.ceil(list.length / displays.length)));
      const idx = Math.floor(i / displays.length);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellW = Math.floor(d.workArea.width / cols);
      const cellH = Math.floor(d.workArea.height / Math.max(1, Math.ceil(list.length / displays.length / cols)));
      p.win.setBounds({
        x: d.workArea.x + col * cellW,
        y: d.workArea.y + row * cellH,
        width: cellW,
        height: cellH,
      });
    });
  } else {
    // tile on the display under the cursor / primary of first player
    const anchor = list[0].win.getBounds();
    const d = screen.getDisplayMatching(anchor);
    const n = list.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cellW = Math.floor(d.workArea.width / cols);
    const cellH = Math.floor(d.workArea.height / rows);
    list.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      p.win.setBounds({
        x: d.workArea.x + col * cellW,
        y: d.workArea.y + row * cellH,
        width: cellW,
        height: cellH,
      });
    });
  }
  notifyList(broadcast);
}

function cascadePlayers(broadcast) {
  const list = [...players.values()].filter((p) => !p.win.isDestroyed());
  if (!list.length) return;
  const d = screen.getDisplayMatching(list[0].win.getBounds());
  const w = Math.min(960, d.workArea.width - 80);
  const h = Math.min(540, d.workArea.height - 80);
  list.forEach((p, i) => {
    p.win.setBounds({
      x: d.workArea.x + 40 + i * 40,
      y: d.workArea.y + 40 + i * 40,
      width: w,
      height: h,
    });
  });
  notifyList(broadcast);
}

function muteAll(muted, broadcast) {
  for (const p of players.values()) {
    setMuted(p.id, muted, broadcast);
  }
}

function getDisplayInfo() {
  return screen.getAllDisplays().map((d, index) => ({
    index,
    id: d.id,
    label: d.label || `Display ${index + 1}`,
    bounds: d.bounds,
    workArea: d.workArea,
    primary: d.id === screen.getPrimaryDisplay().id,
  }));
}

function count() {
  return players.size;
}

function destroyAll() {
  for (const p of [...players.values()]) {
    try {
      if (!p.win.isDestroyed()) p.win.destroy();
    } catch {
      /* ignore */
    }
  }
  players.clear();
}

module.exports = {
  createPlayer,
  listPlayers,
  setMuted,
  toggleMute,
  setAlwaysOnTop,
  loadUrl,
  closePlayer,
  closeAll,
  focusPlayer,
  setFullscreen,
  moveToDisplay,
  tilePlayers,
  cascadePlayers,
  muteAll,
  getDisplayInfo,
  count,
  destroyAll,
  getSlot,
  toPlayableUrl,
  chromeHeight,
  pushPlayerState,
};
