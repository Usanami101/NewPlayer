/**
 * New(s) — worldwide headlines via free public RSS feeds.
 */

const { net } = require('electron');

const FEEDS = [
  { id: 'bbc', name: 'BBC World', region: 'World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'reuters', name: 'Reuters World', region: 'World', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
  { id: 'ap', name: 'AP Top', region: 'World', url: 'https://rsshub.app/apnews/topics/apf-topnews' },
  { id: 'npr', name: 'NPR News', region: 'US', url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'guardian', name: 'Guardian World', region: 'World', url: 'https://www.theguardian.com/world/rss' },
  { id: 'aljazeera', name: 'Al Jazeera', region: 'World', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'dw', name: 'DW', region: 'Europe', url: 'https://rss.dw.com/rdf/rss-en-all' },
  { id: 'france24', name: 'France 24', region: 'Europe', url: 'https://www.france24.com/en/rss' },
  { id: 'nhk', name: 'NHK World', region: 'Asia', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml' },
  { id: 'scmp', name: 'SCMP', region: 'Asia', url: 'https://www.scmp.com/rss/91/feed' },
  { id: 'abc_au', name: 'ABC Australia', region: 'Oceania', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  { id: 'cbc', name: 'CBC', region: 'Americas', url: 'https://www.cbc.ca/cmlink/rss-topstories' },
  { id: 'techcrunch', name: 'TechCrunch', region: 'Tech', url: 'https://techcrunch.com/feed/' },
  { id: 'ars', name: 'Ars Technica', region: 'Tech', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'espn', name: 'ESPN', region: 'Sports', url: 'https://www.espn.com/espn/rss/news' },
  { id: 'bbc_sport', name: 'BBC Sport', region: 'Sports', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { id: 'nasa', name: 'NASA', region: 'Science', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
  { id: 'science', name: 'ScienceDaily', region: 'Science', url: 'https://www.sciencedaily.com/rss/all.xml' },
  { id: 'weather_ch', name: 'Weather Channel', region: 'Weather', url: 'https://weather.com/rss' },
  { id: 'nws', name: 'NWS News', region: 'Weather', url: 'https://www.weather.gov/rss_page.php?site_name=nws' },
];

const cache = new Map();
const CACHE_MS = 1000 * 60 * 8;

function fetchText(url, timeoutMs = 18000) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'NewPlayer-News/2.0 (RSS reader)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    let body = '';
    const timer = setTimeout(() => {
      try {
        request.abort();
      } catch {
        /* ignore */
      }
      reject(new Error('timeout'));
    }, timeoutMs);
    request.on('response', (response) => {
      if (response.statusCode >= 400) {
        clearTimeout(timer);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', (c) => {
        body += c.toString('utf8');
      });
      response.on('end', () => {
        clearTimeout(timer);
        resolve(body);
      });
      response.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });
    request.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    request.end();
  });
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function parseRss(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const block of blocks.slice(0, 40)) {
    const title = decodeEntities(
      (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''
    );
    const link = decodeEntities(
      (block.match(/<link[^>]*href=["']([^"']+)["']/i) ||
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
        [])[1] || ''
    );
    const desc = decodeEntities(
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
        block.match(/<content[^>]*>([\s\S]*?)<\/content>/i) ||
        [])[1] || ''
    );
    const pub =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
        block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
        block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
        [])[1] || '';
    if (!title) continue;
    items.push({
      id: `${source.id}_${title.slice(0, 40)}_${pub}`.replace(/\W+/g, '_'),
      title,
      link: link.trim(),
      summary: desc.slice(0, 280),
      published: pub ? new Date(pub).toISOString() : null,
      source: source.name,
      region: source.region,
      sourceId: source.id,
    });
  }
  return items;
}

async function loadFeed(feed) {
  const key = feed.id;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.items;
  try {
    const xml = await fetchText(feed.url);
    const items = parseRss(xml, feed);
    cache.set(key, { at: Date.now(), items });
    return items;
  } catch {
    return hit?.items || [];
  }
}

async function getCatalog() {
  const regions = [...new Set(FEEDS.map((f) => f.region))];
  return {
    feeds: FEEDS.map(({ id, name, region }) => ({ id, name, region })),
    regions,
  };
}

async function getHeadlines({ region = 'all', feedId = null, query = '' } = {}) {
  let feeds = FEEDS;
  if (feedId) feeds = FEEDS.filter((f) => f.id === feedId);
  else if (region && region !== 'all') feeds = FEEDS.filter((f) => f.region === region);

  const results = await Promise.all(feeds.map((f) => loadFeed(f)));
  let items = results.flat();
  // de-dupe by title
  const seen = new Set();
  items = items.filter((it) => {
    const k = it.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.summary && it.summary.toLowerCase().includes(q)) ||
        it.source.toLowerCase().includes(q)
    );
  }
  items.sort((a, b) => {
    const ta = a.published ? Date.parse(a.published) : 0;
    const tb = b.published ? Date.parse(b.published) : 0;
    return tb - ta;
  });
  return items.slice(0, 120);
}

module.exports = {
  FEEDS,
  getCatalog,
  getHeadlines,
};
