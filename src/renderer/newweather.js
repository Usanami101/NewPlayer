(() => {
  const $ = (s) => document.querySelector(s);

  async function boot() {
    const settings = await window.newweather.getSettings();
    $('#zip').value = settings['weather.zip'] || '';
    $('#lat').value = settings['weather.lat'] ?? '';
    $('#lon').value = settings['weather.lon'] ?? '';
    $('#alertsOn').checked = settings['weather.alertsEnabled'] !== false;
    $('#bgOn').checked = !!settings['weather.backgroundAlerts'];
    $('#easOn').checked = settings['weather.easEnabled'] !== false;
    $('#minSev').value = settings['weather.minSeverity'] || 'Moderate';
    $('#easMin').value = settings['weather.easMinSeverity'] || 'Severe';
    $('#pollMin').value = settings['weather.pollMinutes'] || 3;
    updateBgBtn(!!settings['weather.backgroundAlerts']);

    const hasLoc =
      (settings['weather.zip'] && String(settings['weather.zip']).trim()) ||
      (Number(settings['weather.lat']) && Number(settings['weather.lon']));
    if (hasLoc) {
      await loadWeather();
    }

    window.newweather.onAlert?.(() => {
      loadWeather();
    });
  }

  function updateBgBtn(on) {
    const b = $('#btnBg');
    b.classList.toggle('active', on);
    b.textContent = on ? 'NewWeather BG ON' : 'Background alerts';
  }

  async function saveSettings() {
    const patch = {
      'weather.enabled': true,
      'weather.zip': $('#zip').value.trim(),
      'weather.lat': $('#lat').value === '' ? 0 : Number($('#lat').value),
      'weather.lon': $('#lon').value === '' ? 0 : Number($('#lon').value),
      'weather.alertsEnabled': $('#alertsOn').checked,
      'weather.backgroundAlerts': $('#bgOn').checked,
      'weather.easEnabled': $('#easOn').checked,
      'weather.minSeverity': $('#minSev').value,
      'weather.easMinSeverity': $('#easMin').value,
      'weather.pollMinutes': Number($('#pollMin').value) || 3,
    };
    await window.newweather.setSettings(patch);
    updateBgBtn(patch['weather.backgroundAlerts']);
    if (patch['weather.backgroundAlerts']) {
      await window.newweather.startBackground();
    } else {
      await window.newweather.stopBackground();
    }
    return patch;
  }

  async function loadWeather() {
    $('#setupStatus').textContent = 'Loading NewWeather from NWS…';
    try {
      await saveSettings();
      const data = await window.newweather.getBundle();
      render(data);
      $('#setupPanel').classList.add('hidden');
      $('#dash').classList.remove('hidden');
      $('#setupStatus').textContent = '';
    } catch (e) {
      $('#setupStatus').textContent = e.message || String(e);
      $('#dash').classList.add('hidden');
      $('#setupPanel').classList.remove('hidden');
    }
  }

  function render(data) {
    const loc = data.location || {};
    $('#locLabel').textContent =
      loc.label || [loc.city, loc.state].filter(Boolean).join(', ') || 'NewWeather · NWS';
    const now = (data.periods || [])[0];
    if (now) {
      $('#temp').textContent = `${now.temperature}°${now.temperatureUnit || 'F'}`;
      $('#short').textContent = now.shortForecast || '—';
      $('#nowMeta').textContent = [
        now.name,
        now.windDirection && now.windSpeed ? `Wind ${now.windDirection} ${now.windSpeed}` : '',
        now.precipitationProbability != null ? `Precip ${now.precipitationProbability}%` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      $('#detail').textContent = now.detailedForecast || '';
    }
    $('#updated').textContent = data.updated
      ? new Date(data.updated).toLocaleString()
      : new Date().toLocaleString();

    const list = $('#alertsList');
    list.innerHTML = '';
    const alerts = data.alerts || [];
    if (!alerts.length) {
      list.innerHTML = '<div class="empty-alerts">No active alerts for this location.</div>';
    } else {
      for (const a of alerts) {
        const el = document.createElement('div');
        el.className = `alert-item ${a.severity || ''}`;
        el.innerHTML = `
          <div class="ev">${esc(a.severity)} · ${esc(a.event)}</div>
          <div class="hd">${esc(a.headline || '')}</div>
          <div class="area">${esc(a.areaDesc || '')}${a.expires ? ' · until ' + esc(new Date(a.expires).toLocaleString()) : ''}</div>`;
        list.appendChild(el);
      }
    }

    const pl = $('#periodList');
    pl.innerHTML = '';
    for (const p of (data.periods || []).slice(0, 14)) {
      const el = document.createElement('div');
      el.className = 'period';
      el.innerHTML = `
        <div>
          <div class="n">${esc(p.name)}</div>
          <div class="s">${esc(p.shortForecast || '')}</div>
        </div>
        <div class="t">${p.temperature}°</div>`;
      pl.appendChild(el);
    }

    const hl = $('#hourlyList');
    hl.innerHTML = '';
    for (const h of (data.hourly || []).slice(0, 24)) {
      const t = h.startTime ? new Date(h.startTime) : null;
      const el = document.createElement('div');
      el.className = 'hour';
      el.innerHTML = `
        <div>${t ? t.toLocaleTimeString([], { hour: 'numeric' }) : ''}</div>
        <div class="ht">${h.temperature}°</div>
        <div>${esc((h.shortForecast || '').split(' ').slice(0, 2).join(' '))}</div>`;
      hl.appendChild(el);
    }
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  $('#btnHome').onclick = () => window.newweather.goHome();
  $('#btnSave').onclick = () => loadWeather();
  $('#btnRefresh').onclick = () => loadWeather();
  $('#btnTestEAS').onclick = () => window.newweather.testEAS();
  $('#btnBg').onclick = async () => {
    const on = !$('#bgOn').checked;
    $('#bgOn').checked = on;
    await saveSettings();
    $('#setupStatus').textContent = on
      ? 'NewWeather background on — tray stays alive for NWS + EAS.'
      : 'Background alerts off.';
  };

  boot();
})();
