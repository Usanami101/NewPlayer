/**
 * Background NWS severe weather alert watcher.
 * Polls api.weather.gov and fires OS notifications for new alerts.
 */

const { Notification, app } = require('electron');
const weather = require('./weather-service');

let timer = null;
let running = false;
/** @type {Set<string>} */
const seenIds = new Set();
let lastPollAt = 0;
let lastError = null;
let lastAlertCount = 0;
let onAlertCallback = null;

function start(getSettingsFn, opts = {}) {
  onAlertCallback = opts.onAlert || null;
  stop();
  running = true;
  // Prime seen set so we don't spam on first run unless configured
  const firstNotify = opts.notifyOnStart === true;
  poll(getSettingsFn, { silent: !firstNotify }).finally(() => {
    schedule(getSettingsFn);
  });
}

function schedule(getSettingsFn) {
  if (!running) return;
  if (timer) clearInterval(timer);
  const s = getSettingsFn() || {};
  const mins = Math.max(1, Number(s['weather.pollMinutes'] || 3));
  timer = setInterval(() => {
    poll(getSettingsFn, { silent: false }).catch(() => {});
  }, mins * 60 * 1000);
  if (timer.unref) timer.unref();
}

function stop() {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function isRunning() {
  return running;
}

function getStatus() {
  return {
    running,
    lastPollAt,
    lastError,
    lastAlertCount,
    seenCount: seenIds.size,
  };
}

async function poll(getSettingsFn, { silent = false } = {}) {
  const s = getSettingsFn() || {};
  if (s['weather.enabled'] === false) return { alerts: [] };
  if (s['weather.alertsEnabled'] === false && silent) return { alerts: [] };

  try {
    const loc = await weather.resolveLocation(s);
    const alerts = await weather.getAlerts(loc.lat, loc.lon);
    lastPollAt = Date.now();
    lastError = null;
    lastAlertCount = alerts.length;

    const minSev = s['weather.minSeverity'] || 'Moderate';
    const sound = s['weather.alertSound'] !== false;

    for (const a of alerts) {
      if (!a.id) continue;
      if (seenIds.has(a.id)) continue;
      seenIds.add(a.id);

      // Cap set size
      if (seenIds.size > 200) {
        const arr = [...seenIds];
        arr.slice(0, arr.length - 150).forEach((id) => seenIds.delete(id));
      }

      if (silent) continue;
      if (s['weather.alertsEnabled'] === false) continue;
      if (!weather.severityAtLeast(a.severity, minSev)) continue;

      notifyAlert(a, { sound });
      if (onAlertCallback) {
        try {
          onAlertCallback(a);
        } catch {
          /* ignore */
        }
      }
    }

    return { alerts, location: loc };
  } catch (err) {
    lastError = err.message || String(err);
    lastPollAt = Date.now();
    return { alerts: [], error: lastError };
  }
}

function notifyAlert(a, { sound = true } = {}) {
  if (!Notification.isSupported()) return;
  const title = `NWS ${a.severity || ''}: ${a.event}`.replace(/\s+/g, ' ').trim();
  const body = (a.headline || a.description || a.areaDesc || 'Weather alert')
    .replace(/\n+/g, ' ')
    .slice(0, 220);

  const n = new Notification({
    title: title.slice(0, 120),
    body,
    silent: !sound,
    urgency: a.severity === 'Extreme' || a.severity === 'Severe' ? 'critical' : 'normal',
    timeoutType: a.severity === 'Extreme' || a.severity === 'Severe' ? 'never' : 'default',
  });
  n.show();
  n.on('click', () => {
    if (onAlertCallback) onAlertCallback({ ...a, __open: true });
  });
}

/** Mark current alerts seen without notifying (e.g. after user views them) */
async function markCurrentSeen(getSettingsFn) {
  try {
    const s = getSettingsFn() || {};
    const loc = await weather.resolveLocation(s);
    const alerts = await weather.getAlerts(loc.lat, loc.lon);
    for (const a of alerts) {
      if (a.id) seenIds.add(a.id);
    }
    return alerts.length;
  } catch {
    return 0;
  }
}

function clearSeen() {
  seenIds.clear();
}

module.exports = {
  start,
  stop,
  isRunning,
  getStatus,
  poll,
  markCurrentSeen,
  clearSeen,
};
