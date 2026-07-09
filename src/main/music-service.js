/**
 * NewRadio — free public radio stations via Radio Browser.
 * Filter by genre, country, religion, language, search.
 * https://api.radio-browser.info
 */

const { net } = require('electron');
const { GENRES, RELIGIONS, COUNTRIES, LANGUAGES, MOODS } = require('../data/radio-filters');

const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

let mirrorIndex = 0;
const cache = new Map();
const CACHE_MS = 1000 * 60 * 20;

function fetchJson(path, timeoutMs = 20000) {
  const tryMirror = (idx) =>
    new Promise((resolve, reject) => {
      if (idx >= MIRRORS.length) {
        reject(new Error('All radio mirrors failed'));
        return;
      }
      const base = MIRRORS[(mirrorIndex + idx) % MIRRORS.length];
      const url = base + path;
      const request = net.request({
        url,
        method: 'GET',
        headers: {
          'User-Agent': 'NewPlayer/2.0 (NewRadio)',
          Accept: 'application/json',
        },
      });
      let body = '';
      const timer = setTimeout(() => {
        try {
          request.abort();
        } catch {
          /* ignore */
        }
        tryMirror(idx + 1).then(resolve, reject);
      }, timeoutMs);

      request.on('response', (response) => {
        if (response.statusCode >= 400) {
          clearTimeout(timer);
          tryMirror(idx + 1).then(resolve, reject);
          return;
        }
        response.on('data', (c) => {
          body += c.toString('utf8');
        });
        response.on('end', () => {
          clearTimeout(timer);
          try {
            mirrorIndex = (mirrorIndex + idx) % MIRRORS.length;
            resolve(JSON.parse(body));
          } catch (e) {
            tryMirror(idx + 1).then(resolve, reject);
          }
        });
        response.on('error', () => {
          clearTimeout(timer);
          tryMirror(idx + 1).then(resolve, reject);
        });
      });
      request.on('error', () => {
        clearTimeout(timer);
        tryMirror(idx + 1).then(resolve, reject);
      });
      request.end();
    });

  return tryMirror(0);
}

function mapStation(s) {
  return {
    id: s.stationuuid || s.changeuuid || String(s.id),
    name: s.name || 'Station',
    url: s.url_resolved || s.url,
    favicon: s.favicon || '',
    country: s.country || '',
    countrycode: (s.countrycode || '').toUpperCase(),
    language: s.language || '',
    tags: (s.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    genre: ((s.tags || '').split(',')[0] || 'radio').trim(),
    votes: s.votes || 0,
    codec: s.codec || '',
    bitrate: s.bitrate || 0,
    homepage: s.homepage || '',
  };
}

async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

async function getStationsByGenre(genre, { limit = 100, offset = 0 } = {}) {
  const g = encodeURIComponent(genre);
  const key = `genre:${genre}:${limit}:${offset}`;
  return cached(key, async () => {
    let rows;
    try {
      rows = await fetchJson(
        `/json/stations/bytagexact/${g}?hidebroken=true&order=votes&reverse=true&limit=${limit}&offset=${offset}`
      );
    } catch {
      rows = await fetchJson(
        `/json/stations/search?tag=${g}&hidebroken=true&order=votes&reverse=true&limit=${limit}&offset=${offset}`
      );
    }
    return (rows || []).map(mapStation).filter((s) => s.url);
  });
}

async function searchStations(query, { limit = 80 } = {}) {
  const q = encodeURIComponent(query);
  return cached(`search:${query}:${limit}`, async () => {
    const rows = await fetchJson(
      `/json/stations/search?name=${q}&hidebroken=true&order=votes&reverse=true&limit=${limit}`
    );
    return (rows || []).map(mapStation).filter((s) => s.url);
  });
}

async function topStations(limit = 100) {
  return cached(`top:${limit}`, async () => {
    const rows = await fetchJson(`/json/stations/topvote/${limit}?hidebroken=true`);
    return (rows || []).map(mapStation).filter((s) => s.url);
  });
}

async function stationsByCountry(code, limit = 100) {
  const c = encodeURIComponent(String(code || '').toUpperCase());
  return cached(`cc:${c}:${limit}`, async () => {
    const rows = await fetchJson(
      `/json/stations/bycountrycodeexact/${c}?hidebroken=true&order=votes&reverse=true&limit=${limit}`
    );
    return (rows || []).map(mapStation).filter((s) => s.url);
  });
}

async function stationsByLanguage(lang, limit = 80) {
  const l = encodeURIComponent(lang);
  return cached(`lang:${lang}:${limit}`, async () => {
    let rows;
    try {
      rows = await fetchJson(
        `/json/stations/bylanguageexact/${l}?hidebroken=true&order=votes&reverse=true&limit=${limit}`
      );
    } catch {
      rows = await fetchJson(
        `/json/stations/search?language=${l}&hidebroken=true&order=votes&reverse=true&limit=${limit}`
      );
    }
    return (rows || []).map(mapStation).filter((s) => s.url);
  });
}

async function stationsByReligion(religionId, limit = 100) {
  const rel = RELIGIONS.find((r) => r.id === religionId) || RELIGIONS[0];
  const key = `rel:${rel.id}:${limit}`;
  return cached(key, async () => {
    const batches = await Promise.all(
      rel.tags.map((tag) =>
        getStationsByGenre(tag, { limit: Math.ceil(limit / rel.tags.length) + 10 }).catch(() => [])
      )
    );
    const seen = new Set();
    const out = [];
    for (const list of batches) {
      for (const s of list) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
      }
    }
    out.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    return out.slice(0, limit);
  });
}

/**
 * Combined filter: any mix of genre / country / religion / language / query
 */
async function filterStations(opts = {}) {
  const {
    genre = '',
    country = '',
    religion = '',
    language = '',
    query = '',
    limit = 120,
  } = opts;

  if (query && String(query).trim().length >= 2) {
    return searchStations(String(query).trim(), { limit });
  }
  if (religion) return stationsByReligion(religion, limit);
  if (country && genre) {
    // country first then client-filter by genre tag
    const list = await stationsByCountry(country, Math.min(300, limit * 3));
    const g = genre.toLowerCase();
    const filtered = list.filter(
      (s) =>
        (s.tags || []).some((t) => t.toLowerCase().includes(g)) ||
        (s.genre || '').toLowerCase().includes(g) ||
        (s.name || '').toLowerCase().includes(g)
    );
    return (filtered.length ? filtered : list).slice(0, limit);
  }
  if (country) return stationsByCountry(country, limit);
  if (language) return stationsByLanguage(language, limit);
  if (genre) return getStationsByGenre(genre, { limit });
  return topStations(limit);
}

function getCatalog() {
  return {
    genres: GENRES,
    religions: RELIGIONS.map(({ id, label }) => ({ id, label })),
    countries: COUNTRIES,
    languages: LANGUAGES,
    moods: MOODS,
  };
}

function getGenres() {
  return GENRES;
}

function clearCache() {
  cache.clear();
}

module.exports = {
  getGenres,
  getCatalog,
  getStationsByGenre,
  searchStations,
  topStations,
  stationsByCountry,
  stationsByLanguage,
  stationsByReligion,
  filterStations,
  clearCache,
  GENRE_COUNT: GENRES.length,
};
