(() => {
  const $ = (s) => document.querySelector(s);
  const title = $('#title');
  const muteBadge = $('#muteBadge');
  const btnMute = $('#btnMute');
  const btnTop = $('#btnTop');
  const btnMonitor = $('#btnMonitor');
  const monitorMenu = $('#monitorMenu');
  const urlInput = $('#urlInput');

  function applyState(st) {
    if (!st) return;
    title.textContent = st.label || `Player ${st.id}`;
    document.title = `NewTube — ${st.label || st.id}`;
    btnMute.textContent = st.muted ? '🔇' : '🔊';
    btnMute.classList.toggle('active', !!st.muted);
    muteBadge.hidden = !st.muted;
    btnTop.classList.toggle('active', !!st.alwaysOnTop);
    if (st.url) urlInput.placeholder = st.url.slice(0, 80);
  }

  window.ntPlayer.onState(applyState);
  window.ntPlayer.getState().then(applyState);

  $('#btnHome').onclick = () => window.ntPlayer.home();
  $('#btnReload').onclick = () => window.ntPlayer.reload();
  $('#btnMute').onclick = () => window.ntPlayer.toggleMute();
  $('#btnTop').onclick = () => {
    const on = !btnTop.classList.contains('active');
    window.ntPlayer.alwaysOnTop(on);
  };
  $('#btnFs').onclick = () => window.ntPlayer.fullscreen();
  $('#btnMin').onclick = () => window.ntPlayer.minimize();
  $('#btnClose').onclick = () => window.ntPlayer.close();

  $('#urlBar').onsubmit = (e) => {
    e.preventDefault();
    const v = urlInput.value.trim();
    if (v) window.ntPlayer.loadUrl(v);
  };

  // Double-click title bar → paste / open URL (prompt stays above BrowserView)
  $('#chrome').addEventListener('dblclick', (e) => {
    if (e.target.closest('.actions')) return;
    const current = urlInput.placeholder || '';
    const v = prompt('Open YouTube URL or video ID in this player:', current.startsWith('http') ? current : '');
    if (v && v.trim()) window.ntPlayer.loadUrl(v.trim());
  });

  btnMonitor.onclick = async (e) => {
    e.stopPropagation();
    const open = monitorMenu.classList.contains('hidden');
    monitorMenu.classList.toggle('hidden', !open);
    if (open) {
      const displays = await window.ntPlayer.getDisplays();
      monitorMenu.innerHTML = '';
      displays.forEach((d) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${d.primary ? '★ ' : ''}${d.label} (${d.workArea.width}×${d.workArea.height})`;
        b.onclick = () => {
          window.ntPlayer.moveToDisplay(d.index);
          monitorMenu.classList.add('hidden');
        };
        monitorMenu.appendChild(b);
      });
    }
  };

  document.addEventListener('click', (e) => {
    if (!monitorMenu.contains(e.target) && e.target !== btnMonitor) {
      monitorMenu.classList.add('hidden');
    }
  });

  // Keyboard: M mute, F fullscreen, Escape exit fs handled by OS/app
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'm' || e.key === 'M') window.ntPlayer.toggleMute();
    if (e.key === 'f' || e.key === 'F') window.ntPlayer.fullscreen();
    if (e.key === 'l' || e.key === 'L') {
      document.body.classList.add('show-url');
      urlInput.focus();
    }
  });
})();
