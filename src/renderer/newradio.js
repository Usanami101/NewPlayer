(() => {
  const $ = (s) => document.querySelector(s);
  const audio = $('#audio');

  let catalog = { genres: [], religions: [], countries: [], languages: [] };
  let stations = [];
  let favorites = [];
  let queue = [];
  let queueIndex = -1;
  let current = null;

  const filters = {
    genre: '',
    country: '',
    religion: '',
    language: '',
    query: '',
  };

  let pickerKind = null;
  let dialAngle = { genre: 0, country: 0, religion: 0, language: 0 };

  async function boot() {
    catalog = (await window.newradio.getCatalog()) || catalog;
    favorites = (await window.newradio.getFavorites()) || [];
    renderGenreChips();
    await loadStations();
    updateFilterLabels();
  }

  function updateFilterLabels() {
    $('#valGenre').textContent = filters.genre || 'All';
    const c = catalog.countries?.find((x) => x.code === filters.country);
    $('#valCountry').textContent = c ? c.name : 'World';
    const r = catalog.religions?.find((x) => x.id === filters.religion);
    $('#valReligion').textContent = r ? r.label : 'Any';
    $('#valLang').textContent = filters.language || 'Any';
  }

  function spinDial(kind) {
    dialAngle[kind] = (dialAngle[kind] || 0) + 40;
    const el = {
      genre: $('#dialGenre'),
      country: $('#dialCountry'),
      religion: $('#dialReligion'),
      language: $('#dialLang'),
    }[kind];
    if (el) {
      const mark = el.querySelector('.dial-mark');
      if (mark) mark.style.transform = `rotate(${dialAngle[kind]}deg)`;
    }
  }

  function openPicker(kind) {
    pickerKind = kind;
    const titles = {
      genre: 'Genre dial',
      country: 'Country dial',
      religion: 'Faith dial',
      language: 'Language dial',
    };
    $('#pickerTitle').textContent = titles[kind] || 'Select';
    $('#pickerSearch').value = '';
    $('#picker').classList.remove('hidden');
    renderPickerList('');
    setTimeout(() => $('#pickerSearch').focus(), 50);
  }

  function renderPickerList(q) {
    const root = $('#pickerList');
    root.innerHTML = '';
    const query = (q || '').toLowerCase();
    let items = [];

    if (pickerKind === 'genre') {
      items = [{ id: '', label: 'All genres' }].concat(
        (catalog.genres || []).map((g) => ({ id: g, label: g }))
      );
    } else if (pickerKind === 'country') {
      items = [{ id: '', label: 'World / All countries' }].concat(
        (catalog.countries || []).map((c) => ({ id: c.code, label: `${c.name} (${c.code})` }))
      );
    } else if (pickerKind === 'religion') {
      items = [{ id: '', label: 'Any faith' }].concat(
        (catalog.religions || []).map((r) => ({ id: r.id, label: r.label }))
      );
    } else if (pickerKind === 'language') {
      items = [{ id: '', label: 'Any language' }].concat(
        (catalog.languages || []).map((l) => ({ id: l, label: l }))
      );
    }

    if (query) items = items.filter((i) => i.label.toLowerCase().includes(query));

    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker-item';
      const selected =
        (pickerKind === 'genre' && filters.genre === it.id) ||
        (pickerKind === 'country' && filters.country === it.id) ||
        (pickerKind === 'religion' && filters.religion === it.id) ||
        (pickerKind === 'language' && filters.language === it.id);
      if (selected) b.classList.add('active');
      b.textContent = it.label;
      b.onclick = () => {
        if (pickerKind === 'genre') filters.genre = it.id;
        if (pickerKind === 'country') filters.country = it.id;
        if (pickerKind === 'religion') filters.religion = it.id;
        if (pickerKind === 'language') filters.language = it.id;
        // religion is exclusive-ish with genre for cleaner results
        if (pickerKind === 'religion' && it.id) filters.genre = '';
        if (pickerKind === 'genre' && it.id) filters.religion = '';
        spinDial(pickerKind);
        updateFilterLabels();
        renderGenreChips();
        $('#picker').classList.add('hidden');
        loadStations();
      };
      root.appendChild(b);
    }
  }

  function renderGenreChips() {
    const root = $('#genreChips');
    root.innerHTML = '';
    const quick = ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip hop', 'country', 'news', 'talk', 'oldies'];
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'chip' + (!filters.genre && !filters.religion ? ' active' : '');
    all.textContent = 'All';
    all.onclick = () => {
      filters.genre = '';
      filters.religion = '';
      updateFilterLabels();
      renderGenreChips();
      loadStations();
    };
    root.appendChild(all);

    for (const g of quick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (filters.genre === g ? ' active' : '');
      b.textContent = g;
      b.onclick = () => {
        filters.genre = g;
        filters.religion = '';
        spinDial('genre');
        updateFilterLabels();
        renderGenreChips();
        loadStations();
      };
      root.appendChild(b);
    }

    // Quick faith chips
    for (const r of (catalog.religions || []).slice(0, 5)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (filters.religion === r.id ? ' active' : '');
      b.textContent = r.label;
      b.onclick = () => {
        filters.religion = r.id;
        filters.genre = '';
        spinDial('religion');
        updateFilterLabels();
        renderGenreChips();
        loadStations();
      };
      root.appendChild(b);
    }
  }

  async function loadStations() {
    $('#listTitle').textContent = buildListTitle();
    $('#listCount').textContent = 'Tuning…';
    $('#statusLine').textContent = 'Searching the dial…';
    try {
      stations = await window.newradio.filter({
        genre: filters.genre,
        country: filters.country,
        religion: filters.religion,
        language: filters.language,
        query: filters.query,
        limit: 140,
      });
      queue = stations;
      renderStations();
      $('#listCount').textContent = `${stations.length} stations`;
      $('#statusLine').textContent = stations.length
        ? 'Locked on · pick a preset below'
        : 'No signal — try another dial setting';
    } catch {
      stations = [];
      renderStations();
      $('#listCount').textContent = '0';
      $('#statusLine').textContent = 'Static — check network';
    }
  }

  function buildListTitle() {
    const parts = [];
    if (filters.query) return `Search: ${filters.query}`;
    if (filters.religion) {
      const r = catalog.religions?.find((x) => x.id === filters.religion);
      parts.push(r?.label || 'Faith');
    }
    if (filters.genre) parts.push(filters.genre);
    if (filters.country) {
      const c = catalog.countries?.find((x) => x.code === filters.country);
      parts.push(c?.name || filters.country);
    }
    if (filters.language) parts.push(filters.language);
    return parts.length ? parts.join(' · ') : 'Top presets';
  }

  function renderStations() {
    const grid = $('#stationGrid');
    grid.innerHTML = '';
    if (!stations.length) {
      grid.innerHTML = '<div class="empty">No stations on this frequency. Spin the dials.</div>';
      return;
    }
    stations.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset' + (current && current.id === s.id ? ' active' : '');
      const isFav = favorites.some((f) => f.id === s.id);
      const tags = (s.tags || []).slice(0, 2).join(' · ');
      b.innerHTML = `
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <div class="name">${isFav ? '<span class="star">★</span>' : ''}${esc(s.name)}</div>
        <div class="meta">${esc(s.countrycode || s.country || '—')}${s.bitrate ? ' · ' + s.bitrate + 'k' : ''}${tags ? ' · ' + esc(tags) : ''}</div>`;
      b.onclick = () => playStation(s, i);
      grid.appendChild(b);
    });
  }

  function playStation(s, index) {
    current = s;
    queueIndex = typeof index === 'number' ? index : queue.findIndex((x) => x.id === s.id);
    $('#trackName').textContent = s.name;
    $('#trackMeta').textContent = [
      s.country || s.countrycode,
      s.genre || (s.tags && s.tags[0]),
      s.language,
      s.bitrate ? s.bitrate + ' kbps' : '',
      s.codec,
    ]
      .filter(Boolean)
      .join(' · ');
    $('#liveDot').classList.add('on');

    // Move needle for radio feel
    const pct = 12 + ((queueIndex >= 0 ? queueIndex : 0) % 20) * 4;
    $('#needle').style.left = `${pct}%`;

    audio.src = s.url;
    audio.play()
      .then(() => {
        $('#btnPlay').textContent = '⏸';
        $('#eq').classList.add('on');
      })
      .catch(() => {
        $('#btnPlay').textContent = '▶';
        $('#trackMeta').textContent = 'Weak signal — try another station';
        $('#liveDot').classList.remove('on');
      });
    updateFavBtn();
    renderStations();
    window.newradio.clickStation?.(s.id);
  }

  function togglePlay() {
    if (!audio.src) {
      if (stations[0]) playStation(stations[0], 0);
      return;
    }
    if (audio.paused) {
      audio.play();
      $('#btnPlay').textContent = '⏸';
      $('#eq').classList.add('on');
      $('#liveDot').classList.add('on');
    } else {
      audio.pause();
      $('#btnPlay').textContent = '▶';
      $('#eq').classList.remove('on');
      $('#liveDot').classList.remove('on');
    }
  }

  function next(dir = 1) {
    if (!queue.length) return;
    if (queueIndex < 0) queueIndex = 0;
    queueIndex = (queueIndex + dir + queue.length) % queue.length;
    playStation(queue[queueIndex], queueIndex);
  }

  function updateFavBtn() {
    if (!current) return;
    const isFav = favorites.some((f) => f.id === current.id);
    $('#btnFav').textContent = isFav ? '★' : '☆';
  }

  async function toggleFav() {
    if (!current) return;
    favorites = await window.newradio.toggleFavorite(current);
    updateFavBtn();
    renderStations();
  }

  async function showFavorites() {
    favorites = (await window.newradio.getFavorites()) || [];
    stations = favorites;
    queue = stations;
    $('#listTitle').textContent = 'Favorites';
    $('#listCount').textContent = `${stations.length} saved`;
    renderStations();
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Wire UI
  $('#btnHome').onclick = () => window.newradio.goHome();
  $('#btnPlay').onclick = togglePlay;
  $('#btnNext').onclick = () => next(1);
  $('#btnPrev').onclick = () => next(-1);
  $('#btnFav').onclick = toggleFav;
  $('#btnFavView').onclick = showFavorites;
  $('#btnTop').onclick = () => {
    filters.genre = '';
    filters.country = '';
    filters.religion = '';
    filters.language = '';
    filters.query = '';
    $('#search').value = '';
    updateFilterLabels();
    renderGenreChips();
    loadStations();
  };
  $('#volume').oninput = (e) => {
    audio.volume = Number(e.target.value) / 100;
  };
  audio.volume = 0.85;

  $('#dialGenre').onclick = () => openPicker('genre');
  $('#dialCountry').onclick = () => openPicker('country');
  $('#dialReligion').onclick = () => openPicker('religion');
  $('#dialLang').onclick = () => openPicker('language');
  $('#pickerClose').onclick = () => $('#picker').classList.add('hidden');
  $('#picker').addEventListener('click', (e) => {
    if (e.target.id === 'picker') $('#picker').classList.add('hidden');
  });
  $('#pickerSearch').oninput = (e) => renderPickerList(e.target.value);

  let searchTimer;
  $('#search').oninput = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.query = e.target.value.trim();
      loadStations();
    }, 350);
  };

  audio.addEventListener('error', () => {
    $('#trackMeta').textContent = 'Signal lost — skipping…';
    setTimeout(() => next(1), 700);
  });
  audio.addEventListener('playing', () => {
    $('#btnPlay').textContent = '⏸';
    $('#eq').classList.add('on');
    $('#liveDot').classList.add('on');
  });
  audio.addEventListener('pause', () => {
    $('#btnPlay').textContent = '▶';
    $('#eq').classList.remove('on');
  });

  boot();
})();
