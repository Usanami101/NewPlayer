/**
 * NewTube shell UI — splash, settings, HUD, command palette
 */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  let settings = {};
  let catalog = [];
  let categories = [];
  let activeCategory = null;
  let searchQuery = '';
  let volumeHudTimer = null;
  let fpsTimer = null;
  let clipUrl = null;
  let settingsOpen = false;

  const el = {
    splash: $('#splash'),
    offline: $('#offline'),
    volumeHud: $('#volumeHud'),
    toasts: $('#toasts'),
    hud: $('#hud'),
    hudClock: $('#hudClock'),
    hudNet: $('#hudNet'),
    hudFps: $('#hudFps'),
    hudRes: $('#hudRes'),
    topChrome: $('#topChrome'),
    settingsBackdrop: $('#settingsBackdrop'),
    settingsPanel: $('#settingsPanel'),
    categoryNav: $('#categoryNav'),
    settingsList: $('#settingsList'),
    settingsSearch: $('#settingsSearch'),
    settingsCount: $('#settingsCount'),
    appVersion: $('#appVersion'),
    cmdBackdrop: $('#cmdBackdrop'),
    cmdPalette: $('#cmdPalette'),
    cmdInput: $('#cmdInput'),
    cmdList: $('#cmdList'),
    clipPrompt: $('#clipPrompt'),
    welcomeTip: $('#welcomeTip'),
    multiBackdrop: $('#multiBackdrop'),
    multiPanel: $('#multiPanel'),
    multiPlayerList: $('#multiPlayerList'),
    multiUrlInput: $('#multiUrlInput'),
    multiDisplaySelect: $('#multiDisplaySelect'),
    multiStartMuted: $('#multiStartMuted'),
  };

  let multiOpen = false;
  let multiPlayers = [];
  let multiDisplays = [];

  // ── Bootstrap ────────────────────────────────────────────
  function init() {
    bindChrome();
    bindSettingsChrome();
    bindNetwork();
    bindTopHover();

    window.newtube.on('bootstrap', (data) => {
      settings = data.settings || {};
      catalog = data.catalog || [];
      categories = data.categories || [];
      multiPlayers = data.players || [];
      multiDisplays = data.displays || [];
      el.settingsCount.textContent = String(data.count || catalog.length);
      if (data.info?.version) el.appVersion.textContent = `v${data.info.version}`;
      applyTheme();
      applyUiPrefs();
      renderCategories();
      if (!activeCategory && categories[0]) activeCategory = categories[0].id;
      renderSettings();
      setupHud();
      fillDisplaySelect();
      maybeWelcome(data.meta);
    });

    window.newtube.on('settings-visibility', ({ open }) => {
      setSettingsOpen(!!open);
    });

    window.newtube.on('settings-updated', ({ settings: next }) => {
      if (next) settings = next;
      applyTheme();
      applyUiPrefs();
      setupHud();
      // re-render current view if open
      if (settingsOpen) renderSettings();
    });

    window.newtube.on('toast', (t) => showToast(t.message, t.type));
    window.newtube.on('volume-hud', ({ volume }) => showVolume(volume));
    window.newtube.on('tv-loaded', () => hideSplash());
    window.newtube.on('tv-fail', ({ desc }) => {
      showToast(`Load failed: ${desc || 'network error'}`, 'error');
    });
    window.newtube.on('fullscreen-changed', (fs) => {
      document.body.classList.toggle('is-fullscreen', !!fs);
    });
    window.newtube.on('command-palette', () => openCommandPalette());
    window.newtube.on('clipboard-youtube', ({ url }) => {
      clipUrl = url;
      el.clipPrompt.classList.remove('hidden');
    });

    window.newtube.on('multiview-updated', ({ players }) => {
      multiPlayers = players || [];
      if (multiOpen) renderMultiList();
    });
    window.newtube.on('multidesk-open', () => setMultiOpen(true));

    // Safety: hide splash even if TV is slow
    setTimeout(hideSplash, 8000);

    window.newtube.ready();
  }

  function maybeWelcome(meta) {
    if (!settings['startup.welcomeTips']) return;
    if (meta && meta.firstRun === false) {
      // still show lightly first few times — skip if not firstRun and user dismissed
      return;
    }
    setTimeout(() => el.welcomeTip.classList.remove('hidden'), 1200);
  }

  function hideSplash() {
    if (!el.splash) return;
    if (settings['appearance.showSplash'] === false) {
      el.splash.classList.add('fade-out', 'hidden');
      return;
    }
    const min = settings['appearance.splashDurationMs'] ?? 300;
    setTimeout(() => {
      el.splash.classList.add('fade-out');
      setTimeout(() => el.splash.classList.add('hidden'), 280);
    }, Math.max(0, min));
  }

  // ── Theme / prefs ────────────────────────────────────────
  function applyTheme() {
    const mode = settings['theme.mode'] || 'dark';
    document.body.classList.remove(
      'theme-oled',
      'theme-midnight',
      'theme-carbon',
      'theme-light',
      'theme-high-contrast'
    );
    if (mode === 'oled') document.body.classList.add('theme-oled');
    if (mode === 'midnight') document.body.classList.add('theme-midnight');
    if (mode === 'carbon') document.body.classList.add('theme-carbon');
    if (mode === 'light') document.body.classList.add('theme-light');
    if (mode === 'system') {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('theme-light');
      }
    }
    if (settings['theme.highContrast']) document.body.classList.add('theme-high-contrast');

    const accent = settings['theme.accent'] || '#FF0033';
    const accent2 = settings['theme.accentSecondary'] || '#FF4D6D';
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-2', accent2);
    document.documentElement.style.setProperty('--accent-soft', hexAlpha(accent, 0.15));

    if (settings['theme.customBg']) {
      document.documentElement.style.setProperty('--bg', settings['theme.customBg']);
    }

    if (settings['a11y.reduceMotion'] || (settings['display.animationScale'] === 0)) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  }

  function applyUiPrefs() {
    const w = settings['appearance.settingsWidth'] || 420;
    document.documentElement.style.setProperty('--settings-width', `${w}px`);
    const blur = settings['appearance.settingsBlur'] ?? 24;
    document.documentElement.style.setProperty('--blur', `${blur}px`);
    const scale = (settings['appearance.uiScaleSettings'] || 100) / 100;
    document.documentElement.style.setProperty('--ui-scale', String(scale));

    // toast position
    el.toasts.className = 'toasts';
    const pos = settings['appearance.toastPosition'] || 'bottom';
    if (pos === 'top') el.toasts.classList.add('pos-top');
    if (pos === 'top-right') el.toasts.classList.add('pos-top-right');
    if (pos === 'bottom-right') el.toasts.classList.add('pos-bottom-right');
  }

  function hexAlpha(hex, a) {
    const h = (hex || '#ff0033').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  // ── Chrome buttons ───────────────────────────────────────
  function bindChrome() {
    $('#btnSettings').addEventListener('click', () => window.newtube.toggleSettings(true));
    $('#btnCloseSettings').addEventListener('click', () => window.newtube.toggleSettings(false));
    el.settingsBackdrop.addEventListener('click', () => window.newtube.toggleSettings(false));
    $('#btnAppHome')?.addEventListener('click', () => window.newtube.goAppHome?.() || window.newplayer?.enterMode('home'));
    $('#btnHome').addEventListener('click', () => window.newtube.home());
    $('#btnReload').addEventListener('click', () => window.newtube.reload());
    $('#btnFs').addEventListener('click', async () => {
      await window.newtube.toggleFullscreen();
    });
    $('#btnMulti')?.addEventListener('click', () => setMultiOpen(true));
    $('#btnNewPlayer')?.addEventListener('click', () => window.newtube.multiOpen({}));
    $('#btnCloseMulti')?.addEventListener('click', () => setMultiOpen(false));
    el.multiBackdrop?.addEventListener('click', () => setMultiOpen(false));
    $('#btnAddPlayer')?.addEventListener('click', () => openFromForm());
    $('#btnTilePlayers')?.addEventListener('click', () => window.newtube.multiTile('active'));
    $('#btnSpreadPlayers')?.addEventListener('click', () => window.newtube.multiTile('spread'));
    $('#btnCascadePlayers')?.addEventListener('click', () => window.newtube.multiCascade());
    $('#btnMuteAll')?.addEventListener('click', () => window.newtube.multiMuteAll(true));
    $('#btnUnmuteAll')?.addEventListener('click', () => window.newtube.multiMuteAll(false));
    $('#btnCloseAllPlayers')?.addEventListener('click', () => {
      if (confirm('Close all multi-player windows?')) window.newtube.multiCloseAll();
    });
    $('#multiOpenForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      openFromForm();
    });
    $('#btnExport').addEventListener('click', () => window.newtube.exportSettings());
    $('#btnImport').addEventListener('click', async () => {
      const next = await window.newtube.importSettings();
      if (next) {
        settings = next;
        renderSettings();
        applyTheme();
      }
    });
    $('#btnClearCache').addEventListener('click', () => window.newtube.clearCache());
    $('#btnReset').addEventListener('click', async () => {
      if (settings['advanced.resetConfirm'] !== false) {
        const ok = confirm('Reset all NewTube settings to defaults?');
        if (!ok) return;
      }
      settings = await window.newtube.resetSettings();
      renderSettings();
      applyTheme();
    });
    $('#clipOpen').addEventListener('click', () => {
      if (clipUrl) window.newtube.openExternal(clipUrl);
      el.clipPrompt.classList.add('hidden');
    });
    $('#clipDismiss').addEventListener('click', () => el.clipPrompt.classList.add('hidden'));
    $('#welcomeDismiss').addEventListener('click', () => el.welcomeTip.classList.add('hidden'));
  }

  function bindTopHover() {
    let hideT;
    document.addEventListener('mousemove', (e) => {
      if (e.clientY < 48) {
        el.topChrome.classList.add('visible');
        clearTimeout(hideT);
        hideT = setTimeout(() => el.topChrome.classList.remove('visible'), 2200);
      }
    });
  }

  function setSettingsOpen(open) {
    settingsOpen = open;
    el.settingsBackdrop.classList.toggle('hidden', !open);
    el.settingsPanel.classList.toggle('hidden', !open);
    if (open) {
      renderSettings();
      setTimeout(() => el.settingsSearch.focus(), 50);
    } else {
      window.newtube.focusTv();
    }
  }

  // ── Settings render ──────────────────────────────────────
  function bindSettingsChrome() {
    el.settingsSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderSettings();
    });
  }

  function renderCategories() {
    el.categoryNav.innerHTML = '';
    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-btn' + (cat.id === activeCategory ? ' active' : '');
      btn.dataset.id = cat.id;
      btn.innerHTML = `<span class="ico">${cat.icon || '•'}</span><span>${escapeHtml(cat.label)}</span>`;
      btn.addEventListener('click', () => {
        activeCategory = cat.id;
        searchQuery = '';
        el.settingsSearch.value = '';
        renderCategories();
        renderSettings();
      });
      el.categoryNav.appendChild(btn);
    }
  }

  function renderSettings() {
    const list = el.settingsList;
    list.innerHTML = '';

    let items = catalog;
    if (searchQuery) {
      items = catalog.filter(
        (s) =>
          s.label.toLowerCase().includes(searchQuery) ||
          (s.description || '').toLowerCase().includes(searchQuery) ||
          s.id.toLowerCase().includes(searchQuery) ||
          (s.group || '').toLowerCase().includes(searchQuery)
      );
    } else {
      items = catalog.filter((s) => s.category === activeCategory);
    }

    if (!items.length) {
      list.innerHTML = `<div class="empty-search">No settings match “${escapeHtml(searchQuery)}”</div>`;
      return;
    }

    if (!searchQuery) {
      const cat = categories.find((c) => c.id === activeCategory);
      if (cat) {
        const banner = document.createElement('div');
        banner.className = 'category-banner';
        banner.innerHTML = `<h3>${cat.icon || ''} ${escapeHtml(cat.label)}</h3><p>${escapeHtml(cat.description || '')}</p>`;
        list.appendChild(banner);
      }
    } else {
      const banner = document.createElement('div');
      banner.className = 'category-banner';
      banner.innerHTML = `<h3>Search results</h3><p>${items.length} setting${items.length === 1 ? '' : 's'} found</p>`;
      list.appendChild(banner);
    }

    let lastGroup = null;
    for (const s of items) {
      const group = s.group || (searchQuery ? categoryLabel(s.category) : null);
      if (group && group !== lastGroup) {
        const gt = document.createElement('div');
        gt.className = 'group-title';
        gt.textContent = group;
        list.appendChild(gt);
        lastGroup = group;
      }
      list.appendChild(renderRow(s));
    }
  }

  function categoryLabel(id) {
    return categories.find((c) => c.id === id)?.label || id;
  }

  function renderRow(s) {
    const row = document.createElement('div');
    row.className = 'setting-row' + (s.restart ? ' restart' : '');
    row.dataset.id = s.id;

    const meta = document.createElement('div');
    meta.className = 'setting-meta';
    meta.innerHTML = `<div class="setting-label">${escapeHtml(s.label)}</div>${
      s.description ? `<div class="setting-desc">${escapeHtml(s.description)}</div>` : ''
    }`;

    const control = document.createElement('div');
    control.className = 'setting-control';
    control.appendChild(buildControl(s));

    row.appendChild(meta);
    row.appendChild(control);
    return row;
  }

  function buildControl(s) {
    const value = settings[s.id] !== undefined ? settings[s.id] : s.default;
    const wrap = document.createElement('div');

    if (s.type === 'boolean') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle' + (value ? ' on' : '');
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', value ? 'true' : 'false');
      btn.addEventListener('click', async () => {
        const next = !btn.classList.contains('on');
        btn.classList.toggle('on', next);
        btn.setAttribute('aria-checked', next ? 'true' : 'false');
        await commit(s.id, next);
      });
      return btn;
    }

    if (s.type === 'enum') {
      const sel = document.createElement('select');
      sel.className = 'ctrl-select';
      for (const opt of s.options || []) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (String(opt.value) === String(value)) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => commit(s.id, sel.value));
      return sel;
    }

    if (s.type === 'range') {
      wrap.className = 'ctrl-range-wrap';
      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'ctrl-range';
      range.min = s.min ?? 0;
      range.max = s.max ?? 100;
      range.step = s.step ?? 1;
      range.value = value;
      const lab = document.createElement('span');
      lab.className = 'ctrl-range-val';
      lab.textContent = `${value}${s.unit || ''}`;
      range.addEventListener('input', () => {
        lab.textContent = `${range.value}${s.unit || ''}`;
      });
      range.addEventListener('change', () => commit(s.id, Number(range.value)));
      wrap.appendChild(range);
      wrap.appendChild(lab);
      return wrap;
    }

    if (s.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'ctrl-number';
      if (s.min != null) input.min = s.min;
      if (s.max != null) input.max = s.max;
      if (s.step != null) input.step = s.step;
      input.value = value;
      input.addEventListener('change', () => commit(s.id, Number(input.value)));
      return input;
    }

    if (s.type === 'color') {
      const input = document.createElement('input');
      input.type = 'color';
      input.className = 'ctrl-color';
      input.value = normalizeColor(value);
      input.addEventListener('change', () => commit(s.id, input.value));
      return input;
    }

    if (s.type === 'hotkey') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ctrl-hotkey';
      btn.textContent = value || 'Click to bind';
      btn.addEventListener('click', () => listenHotkey(btn, s.id));
      return btn;
    }

    // string default
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ctrl-input';
    input.value = value ?? '';
    input.placeholder = s.id.includes('Css') ? '/* custom css */' : '';
    input.addEventListener('change', () => commit(s.id, input.value));
    return input;
  }

  function normalizeColor(c) {
    if (!c) return '#ff0033';
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (/^#[0-9a-fA-F]{3}$/.test(c)) {
      return '#' + c.slice(1).split('').map((x) => x + x).join('');
    }
    return '#ff0033';
  }

  async function commit(id, value) {
    settings[id] = value;
    try {
      const all = await window.newtube.setSetting(id, value);
      if (all) settings = all;
    } catch {
      showToast('Failed to save setting', 'error');
    }
    const def = catalog.find((x) => x.id === id);
    if (def?.restart) showToast('Restart NewTube to fully apply', 'warn');
  }

  function listenHotkey(btn, id) {
    btn.classList.add('listening');
    btn.textContent = 'Press keys…';
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      const parts = [];
      if (e.ctrlKey) parts.push('Control');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Meta');
      let key = e.key;
      if (key === ' ') key = 'Space';
      if (key.length === 1) key = key.toUpperCase();
      if (key.startsWith('Arrow')) key = key; // ArrowUp etc.
      parts.push(key);
      const accel = parts.join('+');
      btn.classList.remove('listening');
      btn.textContent = accel;
      commit(id, accel);
      window.removeEventListener('keydown', handler, true);
    };
    window.addEventListener('keydown', handler, true);
  }

  // ── Toasts / volume / HUD ────────────────────────────────
  function showToast(message, type = 'info') {
    if (settings['notify.enabled'] === false) return;
    if (isQuietHours() && type !== 'error') return;
    const t = document.createElement('div');
    t.className = `toast ${type || ''}`;
    t.textContent = message;
    el.toasts.appendChild(t);
    const dur = settings['appearance.toastDurationMs'] || 2200;
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s';
      setTimeout(() => t.remove(), 320);
    }, dur);
  }

  function isQuietHours() {
    if (!settings['notify.quietHours']) return false;
    const range = settings['notify.quietHoursRange'] || '22:00-08:00';
    const m = range.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return false;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const a = Number(m[1]) * 60 + Number(m[2]);
    const b = Number(m[3]) * 60 + Number(m[4]);
    if (a <= b) return cur >= a && cur < b;
    return cur >= a || cur < b;
  }

  function showVolume(volume) {
    el.volumeHud.classList.remove('hidden');
    el.volumeHud.querySelector('.volume-fill').style.width = `${volume}%`;
    el.volumeHud.querySelector('.volume-label').textContent = `${Math.round(volume)}%`;
    el.volumeHud.querySelector('.volume-icon').textContent = volume === 0 ? '🔇' : volume < 40 ? '🔈' : '🔊';
    clearTimeout(volumeHudTimer);
    volumeHudTimer = setTimeout(() => el.volumeHud.classList.add('hidden'), 1200);
  }

  function setupHud() {
    clearInterval(fpsTimer);
    const on = settings['hud.enabled'] !== false;
    el.hud.classList.toggle('hidden', !on);
    if (!on) return;

    // Clock
    const showClock = !!settings['hud.showClock'];
    el.hudClock.classList.toggle('hidden', !showClock);
    placePill(el.hudClock, settings['hud.clockPosition'] || 'top-right');
    if (showClock) {
      tickClock();
      setInterval(tickClock, 1000);
    }

    // Network
    const showNet = settings['hud.showNetworkStatus'] !== false;
    el.hudNet.classList.toggle('hidden', !showNet);
    if (showNet) {
      placePill(el.hudNet, 'bottom-left');
      el.hudNet.textContent = navigator.onLine ? 'Online' : 'Offline';
    }

    // FPS
    const showFps = !!settings['hud.showFps'] || !!settings['perf.performanceOverlay'];
    el.hudFps.classList.toggle('hidden', !showFps);
    if (showFps) {
      placePill(el.hudFps, 'top-left');
      let frames = 0;
      let last = performance.now();
      const loop = (t) => {
        frames++;
        if (t - last >= 1000) {
          el.hudFps.textContent = `${frames} FPS`;
          frames = 0;
          last = t;
        }
        if (!el.hudFps.classList.contains('hidden')) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // Resolution
    const showRes = !!settings['hud.showResolution'];
    el.hudRes.classList.toggle('hidden', !showRes);
    if (showRes) {
      placePill(el.hudRes, 'bottom-right');
      const update = () => {
        el.hudRes.textContent = `${window.innerWidth}×${window.innerHeight}`;
      };
      update();
      window.addEventListener('resize', update);
    }

    el.hud.style.opacity = String((settings['hud.opacity'] ?? 85) / 100);
    el.hud.style.zoom = String((settings['hud.scale'] || 100) / 100);
  }

  function placePill(node, pos) {
    node.classList.remove('tl', 'tr', 'bl', 'br');
    const map = {
      'top-left': 'tl',
      'top-right': 'tr',
      'bottom-left': 'bl',
      'bottom-right': 'br',
    };
    node.classList.add(map[pos] || 'tr');
  }

  function tickClock() {
    const fmt = settings['hud.clockFormat'] || 'local24';
    const d = new Date();
    let text;
    if (fmt === 'iso') text = d.toISOString().slice(11, 19);
    else if (fmt === 'local12') {
      text = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    } else {
      text = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    el.hudClock.textContent = text;
  }

  function bindNetwork() {
    const sync = () => {
      const online = navigator.onLine;
      if (settings['network.offlineBanner'] !== false) {
        el.offline.classList.toggle('hidden', online);
      }
      if (settings['hud.showNetworkStatus'] !== false) {
        el.hudNet.textContent = online ? 'Online' : 'Offline';
      }
      if (settings['notify.networkEvents'] !== false) {
        showToast(online ? 'Back online' : 'You are offline', online ? 'success' : 'warn');
      }
    };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
  }

  // ── Command palette ──────────────────────────────────────
  function setMultiOpen(open) {
    multiOpen = open;
    el.multiBackdrop?.classList.toggle('hidden', !open);
    el.multiPanel?.classList.toggle('hidden', !open);
    window.newtube.multiSetPanelOpen?.(open);
    if (open) {
      // close settings if open
      if (settingsOpen) window.newtube.toggleSettings(false);
      refreshMulti();
    } else {
      window.newtube.focusTv();
    }
  }

  async function refreshMulti() {
    try {
      multiPlayers = (await window.newtube.multiList()) || [];
      multiDisplays = (await window.newtube.multiDisplays()) || multiDisplays;
      fillDisplaySelect();
      renderMultiList();
    } catch {
      /* ignore */
    }
  }

  function fillDisplaySelect() {
    const sel = el.multiDisplaySelect;
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '';
    (multiDisplays || []).forEach((d) => {
      const o = document.createElement('option');
      o.value = String(d.index);
      o.textContent = `${d.primary ? '★ ' : ''}${d.label || 'Display ' + (d.index + 1)}`;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function openFromForm() {
    const url = el.multiUrlInput?.value?.trim() || '';
    const displayIndex = Number(el.multiDisplaySelect?.value || 0);
    const muted = !!el.multiStartMuted?.checked;
    window.newtube.multiOpen({ url: url || undefined, displayIndex, muted });
    if (el.multiUrlInput) el.multiUrlInput.value = '';
    setTimeout(refreshMulti, 200);
  }

  function renderMultiList() {
    const root = el.multiPlayerList;
    if (!root) return;
    root.innerHTML = '';
    if (!multiPlayers.length) {
      root.innerHTML =
        '<div class="multi-empty">No extra players yet.<br/>Open a new player, paste a YouTube link, and drag the window to another monitor.</div>';
      return;
    }
    for (const p of multiPlayers) {
      const card = document.createElement('div');
      card.className = 'multi-card';
      const disp =
        multiDisplays.find((d) => d.id === p.displayId) ||
        multiDisplays.find((d) => d.index === 0);
      const left = document.createElement('div');
      left.innerHTML = `<h4>${escapeHtml(p.label)}</h4>
        <div class="meta">${p.muted ? '🔇 Muted' : '🔊 Audio on'}${p.alwaysOnTop ? ' · 📌 On top' : ''}${
        disp ? ' · ' + escapeHtml(disp.label || 'Monitor') : ''
      }</div>
        <div class="url">${escapeHtml(p.url || '')}</div>`;
      const actions = document.createElement('div');
      actions.className = 'multi-card-actions';
      actions.innerHTML = `
        <button type="button" data-act="focus">Focus</button>
        <button type="button" data-act="mute">${p.muted ? 'Unmute' : 'Mute'}</button>
        <button type="button" data-act="top">${p.alwaysOnTop ? 'Unpin' : 'Pin top'}</button>
        <button type="button" data-act="move">→ Monitor</button>
        <button type="button" class="danger" data-act="close">Close</button>`;
      actions.querySelector('[data-act="focus"]').onclick = () => window.newtube.multiFocus(p.id);
      actions.querySelector('[data-act="mute"]').onclick = () => window.newtube.multiToggleMute(p.id);
      actions.querySelector('[data-act="top"]').onclick = () =>
        window.newtube.multiAlwaysOnTop(p.id, !p.alwaysOnTop);
      actions.querySelector('[data-act="move"]').onclick = async () => {
        const displays = (await window.newtube.multiDisplays()) || [];
        if (displays.length < 2) {
          showToast('Only one monitor detected', 'info');
          return;
        }
        const labels = displays.map((d, i) => `${i}: ${d.label}`).join('\n');
        const raw = prompt(`Move to monitor index:\n${labels}`, '0');
        if (raw == null) return;
        window.newtube.multiMoveToDisplay(p.id, Number(raw));
      };
      actions.querySelector('[data-act="close"]').onclick = () => window.newtube.multiClose(p.id);
      card.appendChild(left);
      card.appendChild(actions);
      root.appendChild(card);
    }
  }

  const COMMANDS = [
    { id: 'settings', label: 'Open settings', kbd: 'Ctrl+,', run: () => window.newtube.toggleSettings(true) },
    { id: 'multidesk', label: 'Open Multi Desk', kbd: 'Ctrl+Shift+M', run: () => setMultiOpen(true) },
    { id: 'newplayer', label: 'New multi player', kbd: 'Ctrl+Shift+N', run: () => window.newtube.multiOpen({}) },
    { id: 'tile', label: 'Tile multi players', kbd: 'Ctrl+Shift+T', run: () => window.newtube.multiTile('active') },
    { id: 'fullscreen', label: 'Toggle fullscreen', kbd: 'F11', run: () => window.newtube.toggleFullscreen() },
    { id: 'home', label: 'Go home', kbd: 'Alt+Home', run: () => window.newtube.home() },
    { id: 'reload', label: 'Reload YouTube TV', kbd: 'Ctrl+R', run: () => window.newtube.reload() },
    { id: 'cache', label: 'Clear cache', run: () => window.newtube.clearCache() },
    { id: 'logs', label: 'Open data / logs folder', run: () => window.newtube.openLogs() },
    { id: 'export', label: 'Export settings', run: () => window.newtube.exportSettings() },
    { id: 'import', label: 'Import settings', run: () => window.newtube.importSettings() },
    { id: 'quit', label: 'Quit NewTube', kbd: 'Ctrl+Q', run: () => window.newtube.quit() },
  ];

  let cmdIndex = 0;
  let cmdFiltered = COMMANDS;

  function openCommandPalette() {
    el.cmdBackdrop.classList.remove('hidden');
    el.cmdPalette.classList.remove('hidden');
    el.cmdInput.value = '';
    cmdIndex = 0;
    renderCmds('');
    setTimeout(() => el.cmdInput.focus(), 30);
  }

  function closeCommandPalette() {
    el.cmdBackdrop.classList.add('hidden');
    el.cmdPalette.classList.add('hidden');
    window.newtube.focusTv();
  }

  function renderCmds(q) {
    const query = (q || '').toLowerCase();
    cmdFiltered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query));
    el.cmdList.innerHTML = '';
    cmdFiltered.forEach((c, i) => {
      const li = document.createElement('li');
      li.className = i === cmdIndex ? 'active' : '';
      li.innerHTML = `<span>${escapeHtml(c.label)}</span>${c.kbd ? `<kbd>${escapeHtml(c.kbd)}</kbd>` : ''}`;
      li.addEventListener('click', () => {
        closeCommandPalette();
        c.run();
      });
      el.cmdList.appendChild(li);
    });
  }

  el.cmdInput?.addEventListener('input', (e) => {
    cmdIndex = 0;
    renderCmds(e.target.value);
  });
  el.cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCommandPalette();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdIndex = Math.min(cmdFiltered.length - 1, cmdIndex + 1);
      renderCmds(el.cmdInput.value);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdIndex = Math.max(0, cmdIndex - 1);
      renderCmds(el.cmdInput.value);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const c = cmdFiltered[cmdIndex];
      if (c) {
        closeCommandPalette();
        c.run();
      }
    }
  });
  el.cmdBackdrop?.addEventListener('click', closeCommandPalette);

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Kick off
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
