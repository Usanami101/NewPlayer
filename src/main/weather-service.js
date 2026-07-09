/**
 * National Weather Service (api.weather.gov) client.
 * Free US government API — requires a descriptive User-Agent.
 * Coverage: United States (including territories with NWS service).
 */

const { net } = require('electron');

const NWS_UA = '(NewPlayer Weather, newplayer-weather@local)';
const cache = new Map();
const CACHE_MS = {
  points: 1000 * 60 * 60 * 6,
  forecast: 1000 * 60 * 20,
  alerts: 1000 * 60 * 2,
  hourly: 1000 * 60 * 20,
};

function fetchJson(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: 'GET',
      headers: {
        'User-Agent': NWS_UA,
        Accept: 'application/geo+json, application/json',
      },
    });
    let body = '';
    const timer = setTimeout(() => {
      try {
        request.abort();
      } catch {
        /* ignore */
      }
      reject(new Error('NWS request timeout'));
    }, timeoutMs);

    request.on('response', (response) => {
      if (response.statusCode === 404) {
        clearTimeout(timer);
        reject(new Error('Location not found in NWS coverage'));
        return;
      }
      if (response.statusCode >= 400) {
        clearTimeout(timer);
        reject(new Error(`NWS HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', (c) => {
        body += c.toString('utf8');
      });
      response.on('end', () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
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

async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** ZIP → lat/lon via free Zippopotam (US) */
async function geocodeZip(zip) {
  const z = String(zip || '').trim().slice(0, 10);
  if (!/^\d{5}(-\d{4})?$/.test(z)) throw new Error('Enter a 5-digit US ZIP code');
  const five = z.slice(0, 5);
  return cached(`zip:${five}`, CACHE_MS.points, async () => {
    const data = await fetchJson(`https://api.zippopotam.us/us/${five}`);
    const place = data.places && data.places[0];
    if (!place) throw new Error('ZIP not found');
    return {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
      city: place['place name'],
      state: place['state abbreviation'],
      zip: five,
      label: `${place['place name']}, ${place['state abbreviation']} ${five}`,
    };
  });
}

async function getPoints(lat, lon) {
  const la = Number(lat).toFixed(4);
  const lo = Number(lon).toFixed(4);
  return cached(`pts:${la},${lo}`, CACHE_MS.points, async () => {
    const data = await fetchJson(`https://api.weather.gov/points/${la},${lo}`);
    const p = data.properties || {};
    return {
      forecast: p.forecast,
      forecastHourly: p.forecastHourly,
      forecastGridData: p.forecastGridData,
      observationStations: p.observationStations,
      relativeLocation: p.relativeLocation,
      gridId: p.gridId,
      gridX: p.gridX,
      gridY: p.gridY,
      timeZone: p.timeZone,
      radarStation: p.radarStation,
      county: p.county,
      fireWeatherZone: p.fireWeatherZone,
      forecastZone: p.forecastZone,
      lat: Number(la),
      lon: Number(lo),
      city: p.relativeLocation?.properties?.city || '',
      state: p.relativeLocation?.properties?.state || '',
    };
  });
}

function mapPeriod(p) {
  return {
    name: p.name,
    startTime: p.startTime,
    endTime: p.endTime,
    isDaytime: p.isDaytime,
    temperature: p.temperature,
    temperatureUnit: p.temperatureUnit,
    windSpeed: p.windSpeed,
    windDirection: p.windDirection,
    shortForecast: p.shortForecast,
    detailedForecast: p.detailedForecast,
    icon: p.icon,
    precipitationProbability: p.probabilityOfPrecipitation?.value ?? null,
    humidity: p.relativeHumidity?.value ?? null,
  };
}

async function getForecast(lat, lon) {
  const points = await getPoints(lat, lon);
  if (!points.forecast) throw new Error('No forecast URL for this point');
  const data = await cached(`fc:${points.forecast}`, CACHE_MS.forecast, () =>
    fetchJson(points.forecast)
  );
  const periods = (data.properties?.periods || []).map(mapPeriod);
  return {
    location: {
      lat: points.lat,
      lon: points.lon,
      city: points.city,
      state: points.state,
      timeZone: points.timeZone,
      radarStation: points.radarStation,
    },
    updated: data.properties?.updated || data.properties?.generatedAt,
    periods,
    points,
  };
}

async function getHourly(lat, lon) {
  const points = await getPoints(lat, lon);
  if (!points.forecastHourly) throw new Error('No hourly forecast');
  const data = await cached(`hr:${points.forecastHourly}`, CACHE_MS.hourly, () =>
    fetchJson(points.forecastHourly)
  );
  return (data.properties?.periods || []).slice(0, 48).map(mapPeriod);
}

/**
 * Active alerts for a point (lat/lon).
 * https://www.weather.gov/documentation/services-web-api
 */
async function getAlerts(lat, lon) {
  const la = Number(lat).toFixed(4);
  const lo = Number(lon).toFixed(4);
  const url = `https://api.weather.gov/alerts/active?point=${la},${lo}&status=actual`;
  const data = await cached(`al:${la},${lo}`, CACHE_MS.alerts, () => fetchJson(url));
  const features = data.features || [];
  return features.map((f) => {
    const p = f.properties || {};
    return {
      id: p.id || f.id,
      event: p.event || 'Weather Alert',
      headline: p.headline || p.event,
      description: p.description || '',
      instruction: p.instruction || '',
      severity: p.severity || 'Unknown', // Extreme, Severe, Moderate, Minor, Unknown
      urgency: p.urgency || '',
      certainty: p.certainty || '',
      urgencyRank: urgencyRank(p.urgency),
      severityRank: severityRank(p.severity),
      areaDesc: p.areaDesc || '',
      sent: p.sent,
      effective: p.effective,
      onset: p.onset,
      expires: p.expires,
      ends: p.ends,
      status: p.status,
      messageType: p.messageType,
      category: p.category,
      response: p.response,
      senderName: p.senderName || 'NWS',
      web: p.web || '',
    };
  }).sort((a, b) => b.severityRank - a.severityRank || b.urgencyRank - a.urgencyRank);
}

function severityRank(s) {
  const m = { Extreme: 5, Severe: 4, Moderate: 3, Minor: 2, Unknown: 1 };
  return m[s] || 0;
}

function urgencyRank(u) {
  const m = { Immediate: 5, Expected: 4, Future: 3, Past: 2, Unknown: 1 };
  return m[u] || 0;
}

/** Severity threshold: only notify at or above this */
function severityAtLeast(sev, minSev) {
  return severityRank(sev) >= severityRank(minSev);
}

async function resolveLocation(settings) {
  const zip = (settings['weather.zip'] || '').trim();
  const lat = Number(settings['weather.lat']);
  const lon = Number(settings['weather.lon']);
  if (zip) {
    try {
      return await geocodeZip(zip);
    } catch (e) {
      if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
        return { lat, lon, label: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, city: '', state: '', zip };
      }
      throw e;
    }
  }
  if (Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)) {
    return { lat, lon, label: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, city: '', state: '', zip: '' };
  }
  throw new Error('Set a US ZIP code or latitude/longitude in Weather settings');
}

async function getBundle(settings) {
  const loc = await resolveLocation(settings);
  const [forecast, hourly, alerts] = await Promise.all([
    getForecast(loc.lat, loc.lon),
    getHourly(loc.lat, loc.lon).catch(() => []),
    getAlerts(loc.lat, loc.lon).catch(() => []),
  ]);
  return {
    location: {
      ...forecast.location,
      label: loc.label || `${forecast.location.city}, ${forecast.location.state}`,
      zip: loc.zip || '',
    },
    updated: forecast.updated,
    periods: forecast.periods,
    hourly,
    alerts,
    source: 'National Weather Service (weather.gov)',
  };
}

function clearCache() {
  cache.clear();
}

module.exports = {
  geocodeZip,
  getPoints,
  getForecast,
  getHourly,
  getAlerts,
  getBundle,
  resolveLocation,
  severityAtLeast,
  severityRank,
  clearCache,
};
