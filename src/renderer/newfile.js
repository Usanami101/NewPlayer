(() => {
  const $ = (s) => document.querySelector(s);
  let currentPath = '';
  let items = [];
  let filter = 'all';
  let selected = null;

  const icons = {
    folders: '📁',
    images: '🖼',
    videos: '🎬',
    audio: '🎵',
    documents: '📄',
    archives: '📦',
    code: ' </> ',
    programs: '⚙',
    other: '📎',
  };

  async function boot() {
    const roots = await window.newfile.roots();
    const rootEl = $('#roots');
    rootEl.innerHTML = '';
    for (const r of roots) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'root-btn';
      b.textContent = r.label;
      b.onclick = () => {
        document.querySelectorAll('.root-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        openPath(r.path);
      };
      rootEl.appendChild(b);
    }
    if (roots[0]) {
      rootEl.querySelector('.root-btn')?.classList.add('active');
      await openPath(roots.find((r) => r.id === 'home')?.path || roots[0].path);
    }
  }

  async function openPath(p) {
    try {
      setStatus('Loading…');
      const data = await window.newfile.list(p);
      currentPath = data.path;
      items = data.items || [];
      $('#pathBar').value = currentPath;
      renderList();
      setStatus(`${items.length} items · ${currentPath}`);
      // light auto-sense on open
      sense(true);
    } catch (e) {
      setStatus(e.message || String(e));
    }
  }

  function renderList() {
    const list = $('#fileList');
    list.innerHTML = '';
    let shown = items;
    if (filter !== 'all') shown = items.filter((i) => i.category === filter || (filter === 'folders' && i.isDir));
    $('#itemCount').textContent = `${shown.length} items`;
    for (const it of shown) {
      const row = document.createElement('div');
      row.className = 'row' + (selected === it.path ? ' selected' : '');
      const ico = it.isDir ? '📁' : icons[it.category] || '📎';
      row.innerHTML = `
        <div class="ico">${ico}</div>
        <div class="name" title="${esc(it.path)}">${esc(it.name)}</div>
        <div class="meta">${it.isDir ? '' : formatSize(it.size)}</div>
        <div class="cat">${it.isDir ? 'folder' : esc(it.category)}</div>`;
      row.ondblclick = () => {
        if (it.isDir) openPath(it.path);
        else window.newfile.open(it.path);
      };
      row.onclick = () => {
        selected = it.path;
        renderList();
      };
      row.oncontextmenu = (e) => {
        e.preventDefault();
        selected = it.path;
        showContext(it, e.clientX, e.clientY);
      };
      list.appendChild(row);
    }
  }

  function showContext(it, x, y) {
    // simple prompt menu
    const choice = prompt(
      `${it.name}\n\nType: open | show | rename | delete | cancel`,
      'open'
    );
    if (!choice) return;
    const c = choice.trim().toLowerCase();
    if (c === 'open') {
      if (it.isDir) openPath(it.path);
      else window.newfile.open(it.path);
    } else if (c === 'show') window.newfile.show(it.path);
    else if (c === 'rename') {
      const n = prompt('New name', it.name);
      if (n && n !== it.name) {
        window.newfile.rename(it.path, n).then(() => openPath(currentPath));
      }
    } else if (c === 'delete') {
      if (confirm(`Delete ${it.name}?`)) {
        window.newfile.remove(it.path).then(() => openPath(currentPath));
      }
    }
  }

  async function sense(quiet) {
    if (!currentPath) return;
    if (!quiet) setStatus('Sensing files…');
    try {
      const s = await window.newfile.sense(currentPath);
      const stats = $('#senseStats');
      const c = s.counts || {};
      stats.innerHTML = `
        <div class="stat"><b>${c.total || 0}</b>files sensed</div>
        <div class="stat"><b>${formatSize(c.bytes || 0)}</b>total size</div>
        <div class="stat"><b>${c.images || 0}</b>images</div>
        <div class="stat"><b>${c.videos || 0}</b>videos</div>
        <div class="stat"><b>${c.audio || 0}</b>audio</div>
        <div class="stat"><b>${c.documents || 0}</b>documents</div>
        <div class="stat"><b>${c.code || 0}</b>code</div>
        <div class="stat"><b>${(s.duplicates || []).length}</b>dup groups</div>`;
      fillMini($('#senseRecent'), s.recent || []);
      fillMini(
        $('#senseDupes'),
        (s.duplicates || []).map((d) => ({
          name: `${d.name} ×${d.count}`,
          path: (d.paths && d.paths[0]) || '',
        }))
      );
      fillMini($('#senseLarge'), s.large || []);
      if (!quiet) setStatus(`Sensed ${s.scanned} files in ${currentPath}`);
    } catch (e) {
      if (!quiet) setStatus(e.message || String(e));
    }
  }

  function fillMini(el, arr) {
    el.innerHTML = '';
    if (!arr.length) {
      el.innerHTML = '<div class="mini">None found</div>';
      return;
    }
    for (const it of arr.slice(0, 12)) {
      const d = document.createElement('div');
      d.className = 'mini';
      d.textContent = it.name + (it.size ? ` · ${formatSize(it.size)}` : '');
      d.title = it.path || '';
      d.onclick = () => {
        if (it.path) window.newfile.show(it.path);
      };
      el.appendChild(d);
    }
  }

  function formatSize(n) {
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
    return `${(n / 1073741824).toFixed(2)} GB`;
  }

  function setStatus(t) {
    $('#status').textContent = t;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  $('#btnHome').onclick = () => window.newfile.goHome();
  $('#btnUp').onclick = () => {
    if (!currentPath) return;
    const parent = currentPath.replace(/[\\/]+$/, '').split(/[\\/]/);
    if (parent.length <= 1) return;
    parent.pop();
    let p = parent.join('\\');
    if (/^[A-Za-z]:$/.test(p)) p += '\\';
    openPath(p || currentPath);
  };
  $('#btnRefresh').onclick = () => openPath(currentPath);
  $('#pathBar').onkeydown = (e) => {
    if (e.key === 'Enter') openPath(e.target.value.trim());
  };
  let st;
  $('#search').oninput = (e) => {
    clearTimeout(st);
    const q = e.target.value.trim();
    st = setTimeout(async () => {
      if (!q) {
        renderList();
        return;
      }
      setStatus('Searching…');
      try {
        const res = await window.newfile.search(currentPath, q);
        items = res;
        filter = 'all';
        renderList();
        setStatus(`${res.length} results for “${q}”`);
      } catch (err) {
        setStatus(err.message || String(err));
      }
    }, 300);
  };
  document.querySelectorAll('.chip').forEach((c) => {
    c.onclick = () => {
      document.querySelectorAll('.chip').forEach((x) => x.classList.remove('active'));
      c.classList.add('active');
      filter = c.dataset.filter;
      renderList();
    };
  });
  $('#btnSense').onclick = () => sense(false);
  $('#btnApplyOrg').onclick = async () => {
    if (!confirm('Move top-level files in this folder into _NewFile_Organized categories?\n(Your NewPlayer app data is never touched.)')) return;
    setStatus('Organizing…');
    try {
      const r = await window.newfile.organize(currentPath, false);
      setStatus(`Organized ${r.moves.length} files`);
      openPath(currentPath);
    } catch (e) {
      setStatus(e.message || String(e));
    }
  };

  boot();
})();
