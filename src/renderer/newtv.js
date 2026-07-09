(() => {
  const $ = (s) => document.querySelector(s);
  const video = $('#video');
  const grid = $('#channelGrid');
  const browse = $('#browseList');
  const status = $('#playerStatus');
  const now = $('#nowPlaying');

  let catalog = { countries: [], genres: [], qualities: [] };
  let channels = [];
  let filtered = [];
  let favorites = [];
  let tab = 'countries';
  let selectedKey = 'us';
  let current = null;
  let hls = null;
  let search = '';
  let quality = 'all';

  function setStatus(t) {
    status.textContent = t || '';
  }

  async function boot() {
    catalog = await window.newtv.getCatalog();
    favorites = (await window.newtv.getFavorites()) || [];
    renderBrowse();
    await loadCountry('us');
  }

  function renderBrowse() {
    browse.innerHTML = '';
    if (tab === 'countries') {
      const regions = {};
      for (const c of catalog.countries || []) {
        (regions[c.region] ||= []).push(c);
      }
      for (const [region, list] of Object.entries(regions)) {
        const lab = document.createElement('div');
        lab.className = 'region-label';
        lab.textContent = region;
        browse.appendChild(lab);
        for (const c of list) {
          browse.appendChild(browseBtn(c.code, c.name, selectedKey === c.code, () => {
            selectedKey = c.code;
            renderBrowse();
            loadCountry(c.code);
          }));
        }
      }
    } else if (tab === 'genres') {
      for (const g of catalog.genres || []) {
        browse.appendChild(
          browseBtn(g.id, `${g.icon || ''} ${g.label}`, selectedKey === g.id, () => {
            selectedKey = g.id;
            renderBrowse();
            loadGenre(g.id);
          })
        );
      }
    } else if (tab === 'favorites') {
      browse.appendChild(
        browseBtn('fav', `☆ Favorites (${favorites.length})`, true, () => {
          loadFavorites();
        })
      );
      loadFavorites();
    } else if (tab === 'custom') {
      browse.innerHTML = '<div class="region-label">Custom playlist</div>';
      const b = document.createElement('button');
      b.className = 'browse-item active';
      b.type = 'button';
      b.textContent = 'Load M3U URL…';
      b.onclick = () => $('#customModal').classList.remove('hidden');
      browse.appendChild(b);
    }
  }

  function browseBtn(id, label, active, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'browse-item' + (active ? ' active' : '');
    b.dataset.id = id;
    b.innerHTML = label;
    b.onclick = onClick;
    return b;
  }

  async function loadCountry(code) {
    setStatus('Loading…');
    try {
      channels = await window.newtv.loadCountry(code);
      applyFilter();
      setStatus(`${filtered.length} channels`);
    } catch (e) {
      setStatus('Failed to load country');
      channels = [];
      applyFilter();
    }
  }

  async function loadGenre(id) {
    setStatus('Loading…');
    try {
      channels = await window.newtv.loadGenre(id);
      applyFilter();
      setStatus(`${filtered.length} channels`);
    } catch (e) {
      setStatus('Failed to load genre');
      channels = [];
      applyFilter();
    }
  }

  async function loadFavorites() {
    favorites = (await window.newtv.getFavorites()) || [];
    const favSet = new Set(favorites.map((f) => f.id || f.url));
    // Show favorited channel objects stored fully
    channels = favorites.map((f) => ({
      id: f.id,
      name: f.name,
      url: f.url,
      logo: f.logo || '',
      group: f.group || 'Favorites',
    }));
    applyFilter();
    setStatus(`${filtered.length} favorites`);
  }

  async function loadCustom(url) {
    setStatus('Loading M3U…');
    try {
      channels = await window.newtv.loadCustom(url);
      applyFilter();
      setStatus(`${filtered.length} channels`);
    } catch (e) {
      setStatus('Custom M3U failed');
    }
  }

  function applyFilter() {
    const q = search.trim().toLowerCase();
    filtered = channels.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.group || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (quality === 'uhd') return /(uhd|4k|2160)/i.test(c.name + c.group);
      if (quality === 'fhd') return /(1080|fhd|full\s*hd)/i.test(c.name + c.group);
      if (quality === 'hd') return /(720|hd|1080|fhd|uhd|4k)/i.test(c.name + c.group);
      return true;
    });
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = '';
    if (!filtered.length) {
      grid.innerHTML = '<div class="empty">No channels match. Try another country, genre, or clear search.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    // Cap DOM for performance; virtual-ish: first 400
    const slice = filtered.slice(0, 400);
    for (const ch of slice) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ch-card' + (current && current.url === ch.url ? ' active' : '');
      const isFav = favorites.some((f) => f.id === ch.id || f.url === ch.url);
      card.innerHTML = `
        ${isFav ? '<span class="star">★</span>' : ''}
        ${ch.logo ? `<img class="logo" src="${escapeAttr(ch.logo)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : ''}
        <div class="name">${escapeHtml(ch.name)}</div>
        <div class="grp">${escapeHtml(ch.group || '')}</div>`;
      card.onclick = () => playChannel(ch);
      frag.appendChild(card);
    }
    if (filtered.length > 400) {
      const more = document.createElement('div');
      more.className = 'empty';
      more.textContent = `Showing 400 of ${filtered.length} — refine search to narrow results`;
      frag.appendChild(more);
    }
    grid.appendChild(frag);
  }

  function playChannel(ch) {
    current = ch;
    $('#chName').textContent = ch.name;
    $('#chGroup').textContent = ch.group || '';
    now.textContent = ch.name;
    const logo = $('#chLogo');
    if (ch.logo) {
      logo.src = ch.logo;
      logo.hidden = false;
    } else {
      logo.hidden = true;
    }
    updateFavBtn();
    renderGrid();
    startPlayback(ch.url);
  }

  function startPlayback(url) {
    setStatus('Connecting…');
    if (hls) {
      try { hls.destroy(); } catch { /* */ }
      hls = null;
    }
    video.pause();
    video.removeAttribute('src');
    video.load();

    const isHls = /\.m3u8($|\?)/i.test(url) || url.includes('m3u8');
    if (isHls && window.Hls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        capLevelToPlayerSize: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('Playing');
        video.play().catch(() => setStatus('Press play'));
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setStatus('Stream error — try another channel');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      video.src = url;
      video.play().then(() => setStatus('Playing')).catch(() => setStatus('Press play'));
    } else if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, capLevelToPlayerSize: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('Playing');
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setStatus('Stream error');
      });
    } else {
      setStatus('HLS not supported');
    }
  }

  function updateFavBtn() {
    const btn = $('#btnFav');
    if (!current) return;
    const isFav = favorites.some((f) => f.id === current.id || f.url === current.url);
    btn.textContent = isFav ? '★ Favorited' : '☆ Favorite';
    btn.classList.toggle('fav', isFav);
  }

  async function toggleFav() {
    if (!current) return;
    favorites = await window.newtv.toggleFavorite({
      id: current.id,
      name: current.name,
      url: current.url,
      logo: current.logo,
      group: current.group,
    });
    updateFavBtn();
    renderGrid();
  }

  // Events
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      tab = t.dataset.tab;
      selectedKey = tab === 'countries' ? 'us' : tab === 'genres' ? 'movies' : tab;
      renderBrowse();
      if (tab === 'countries') loadCountry(selectedKey);
      if (tab === 'genres') loadGenre(selectedKey);
      if (tab === 'favorites') loadFavorites();
    });
  });

  $('#search').addEventListener('input', (e) => {
    search = e.target.value;
    applyFilter();
  });
  $('#quality').addEventListener('change', (e) => {
    quality = e.target.value;
    applyFilter();
  });
  $('#btnHome').onclick = () => window.newtv.goHome();
  $('#btnFav').onclick = toggleFav;
  $('#btnReload').onclick = () => {
    if (tab === 'countries') loadCountry(selectedKey);
    else if (tab === 'genres') loadGenre(selectedKey);
    else if (tab === 'favorites') loadFavorites();
  };
  $('#customCancel').onclick = () => $('#customModal').classList.add('hidden');
  $('#customLoad').onclick = async () => {
    const url = $('#customUrl').value.trim();
    if (!url) return;
    $('#customModal').classList.add('hidden');
    await loadCustom(url);
  };

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  boot();
})();
