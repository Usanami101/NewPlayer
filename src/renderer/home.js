(() => {
  const remember = document.getElementById('rememberMode');

  async function boot() {
    try {
      const meta = await window.newplayer.getMeta();
      if (meta?.rememberMode) remember.checked = true;
    } catch {
      /* ignore */
    }
  }

  async function openMode(mode) {
    try {
      if (remember.checked) {
        await window.newplayer.setMeta({ rememberMode: true, lastMode: mode });
      } else {
        await window.newplayer.setMeta({ rememberMode: false });
      }
      await window.newplayer.enterMode(mode);
    } catch (e) {
      console.error(e);
    }
  }

  document.querySelectorAll('.card').forEach((btn) => {
    btn.addEventListener('click', () => openMode(btn.dataset.mode));
  });

  document.getElementById('btnSettings')?.addEventListener('click', () => {
    window.newplayer.openSettings?.();
  });

  // Keyboard 1–7
  window.addEventListener('keydown', (e) => {
    if (e.key === '1') openMode('newtube');
    if (e.key === '2') openMode('newtv');
    if (e.key === '3') openMode('newradio');
    if (e.key === '4') openMode('newweather');
    if (e.key === '5') openMode('news');
    if (e.key === '6') openMode('newfile');
    if (e.key === '7') openMode('newtalk');
  });

  boot();
})();
