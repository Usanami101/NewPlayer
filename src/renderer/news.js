(() => {
  const $ = (s) => document.querySelector(s);
  let catalog = { feeds: [], regions: [] };
  let region = 'all';
  let feedId = null;
  let query = '';

  async function boot() {
    catalog = await window.news.getCatalog();
    renderRegions();
    renderFeeds();
    await load();
  }

  function renderRegions() {
    const root = $('#regionList');
    root.innerHTML = '';
    for (const r of catalog.regions || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'region' + (region === r ? ' active' : '');
      b.textContent = r;
      b.onclick = () => {
        region = r;
        feedId = null;
        document.querySelectorAll('.region').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        document.querySelector('[data-region="all"]')?.classList.remove('active');
        renderFeeds();
        load();
      };
      root.appendChild(b);
    }
  }

  function renderFeeds() {
    const root = $('#feedList');
    root.innerHTML = '';
    const feeds = (catalog.feeds || []).filter((f) => region === 'all' || f.region === region);
    for (const f of feeds) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'feed-item' + (feedId === f.id ? ' active' : '');
      b.innerHTML = `${esc(f.name)}<small>${esc(f.region)}</small>`;
      b.onclick = () => {
        feedId = f.id;
        renderFeeds();
        load();
      };
      root.appendChild(b);
    }
  }

  async function load() {
    $('#viewTitle').textContent = feedId
      ? catalog.feeds.find((f) => f.id === feedId)?.name || 'News'
      : region === 'all'
        ? 'World news'
        : region;
    $('#viewSub').textContent = 'Loading…';
    try {
      const items = await window.news.getHeadlines({ region, feedId, query });
      renderList(items);
      $('#viewSub').textContent = `${items.length} headlines · free public RSS`;
    } catch {
      renderList([]);
      $('#viewSub').textContent = 'Could not load feeds — check network';
    }
  }

  function renderList(items) {
    const root = $('#list');
    root.innerHTML = '';
    if (!items.length) {
      root.innerHTML = '<div class="empty">No headlines right now.</div>';
      return;
    }
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'story';
      const when = it.published ? new Date(it.published).toLocaleString() : '';
      b.innerHTML = `
        <h3>${esc(it.title)}</h3>
        ${it.summary ? `<div class="sum">${esc(it.summary)}</div>` : ''}
        <div class="meta">${esc(it.source)}${when ? ' · ' + esc(when) : ''}</div>`;
      b.onclick = () => {
        if (it.link) window.news.openLink(it.link);
      };
      root.appendChild(b);
    }
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  $('#btnHome').onclick = () => window.news.goHome();
  $('#btnRefresh').onclick = () => load();
  document.querySelector('[data-region="all"]').onclick = () => {
    region = 'all';
    feedId = null;
    document.querySelectorAll('.region').forEach((x) => x.classList.remove('active'));
    document.querySelector('[data-region="all"]').classList.add('active');
    renderFeeds();
    load();
  };
  let t;
  $('#search').oninput = (e) => {
    clearTimeout(t);
    query = e.target.value;
    t = setTimeout(load, 300);
  };

  boot();
})();
