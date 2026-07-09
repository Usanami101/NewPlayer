/**
 * Lightweight M3U / M3U8 playlist parser for NewTV.
 */

function parseM3U(text, sourceLabel = '') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim());
  const channels = [];
  let pending = null;

  for (const line of lines) {
    if (!line || line.startsWith('#EXTM3U')) continue;
    if (line.startsWith('#EXTINF:')) {
      pending = parseExtInf(line);
      continue;
    }
    if (line.startsWith('#')) continue;
    if (pending) {
      channels.push({
        id: hashId(line + (pending.name || '')),
        name: pending.name || 'Channel',
        url: line,
        logo: pending.logo || '',
        group: pending.group || sourceLabel || 'General',
        tvgId: pending.tvgId || '',
        country: pending.country || '',
        language: pending.language || '',
        raw: pending.raw,
      });
      pending = null;
    }
  }
  return channels;
}

function parseExtInf(line) {
  // #EXTINF:-1 tvg-id=".." tvg-logo=".." group-title="..",Name
  const comma = line.lastIndexOf(',');
  const name = comma >= 0 ? line.slice(comma + 1).trim() : 'Channel';
  const meta = comma >= 0 ? line.slice(0, comma) : line;
  const attr = (key) => {
    const m = meta.match(new RegExp(key + '="([^"]*)"', 'i'));
    return m ? m[1] : '';
  };
  return {
    name,
    logo: attr('tvg-logo') || attr('logo'),
    group: attr('group-title') || attr('group'),
    tvgId: attr('tvg-id'),
    country: attr('tvg-country') || attr('country'),
    language: attr('tvg-language') || attr('language'),
    raw: line,
  };
}

function hashId(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return 'ch_' + (h >>> 0).toString(36);
}

function filterChannels(channels, { query, quality, favoritesOnly, favoriteIds } = {}) {
  let list = channels;
  if (favoritesOnly && favoriteIds) {
    const set = new Set(favoriteIds);
    list = list.filter((c) => set.has(c.id) || set.has(c.url));
  }
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.group && c.group.toLowerCase().includes(q)) ||
        (c.country && c.country.toLowerCase().includes(q))
    );
  }
  if (quality && quality !== 'all') {
    const re =
      quality === 'uhd'
        ? /(uhd|4k|2160)/i
        : quality === 'fhd'
          ? /(1080|fhd|full\s*hd)/i
          : quality === 'hd'
            ? /(720|hd|1080|fhd|uhd|4k)/i
            : null;
    if (re) list = list.filter((c) => re.test(c.name) || re.test(c.group || ''));
  }
  return list;
}

module.exports = { parseM3U, filterChannels, parseExtInf };
