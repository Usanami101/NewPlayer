/**
 * NewTV service — fetch & cache free public IPTV playlists.
 */

const { net } = require('electron');
const {
  GENRES,
  COUNTRIES,
  QUALITY_PRESETS,
  countryPlaylistUrl,
  genrePlaylistUrl,
} = require('../data/iptv-sources');
const { parseM3U, filterChannels } = require('./m3u');

const cache = new Map(); // key -> { at, channels }
const CACHE_MS = 1000 * 60 * 30; // 30 min

function fetchText(url, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, method: 'GET' });
    let body = '';
    const timer = setTimeout(() => {
      try {
        request.abort();
      } catch {
        /* ignore */
      }
      reject(new Error('Timeout loading playlist'));
    }, timeoutMs);

    request.on('response', (response) => {
      if (response.statusCode >= 400) {
        clearTimeout(timer);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => {
        body += chunk.toString('utf8');
      });
      response.on('end', () => {
        clearTimeout(timer);
        resolve(body);
      });
      response.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    request.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    request.end();
  });
}

async function loadPlaylist(url, label) {
  const key = url;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.channels;

  const text = await fetchText(url);
  const channels = parseM3U(text, label);
  cache.set(key, { at: Date.now(), channels });
  return channels;
}

async function loadByCountry(code) {
  const c = COUNTRIES.find((x) => x.code === code) || { code, name: code };
  return loadPlaylist(countryPlaylistUrl(code), c.name);
}

async function loadByGenre(genreId) {
  const g = GENRES.find((x) => x.id === genreId);
  if (!g || !g.path) {
    // all — merge a few popular countries for a starter set
    const codes = ['us', 'gb', 'de', 'fr', 'in', 'jp', 'br', 'ca', 'au'];
    const parts = await Promise.allSettled(codes.map((code) => loadByCountry(code)));
    const merged = [];
    const seen = new Set();
    for (const p of parts) {
      if (p.status !== 'fulfilled') continue;
      for (const ch of p.value) {
        if (seen.has(ch.url)) continue;
        seen.add(ch.url);
        merged.push(ch);
      }
    }
    return merged;
  }
  return loadPlaylist(genrePlaylistUrl(g.path), g.label);
}

async function loadCustomM3U(url) {
  return loadPlaylist(url, 'Custom');
}

function getCatalog() {
  return {
    genres: GENRES,
    countries: COUNTRIES,
    qualities: QUALITY_PRESETS,
  };
}

function searchChannels(channels, opts) {
  return filterChannels(channels, opts);
}

function clearCache() {
  cache.clear();
}

module.exports = {
  getCatalog,
  loadByCountry,
  loadByGenre,
  loadCustomM3U,
  searchChannels,
  clearCache,
  loadPlaylist,
};
