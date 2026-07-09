/**
 * NewTube Ad Shield — multi-layer ad blocking (performance-first).
 *
 * CRITICAL: Do NOT intercept every URL (that hits every video segment and kills FPS).
 * Only match known ad hosts / YouTube ad paths.
 */

const AD_HOST_SUFFIXES = [
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  '2mdn.net',
  'moatads.com',
  'moatpixel.com',
  'scorecardresearch.com',
  'quantserve.com',
  'adsrvr.org',
  'adsafeprotected.com',
  'advertising.com',
  'adnxs.com',
  'adform.net',
  'amazon-adsystem.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'criteo.net',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'innovid.com',
  'teads.tv',
  'spotxchange.com',
  'spotx.tv',
  'media.net',
  'flashtalking.com',
  'exelator.com',
  'demdex.net',
  'everesttech.net',
  'ads-twitter.com',
];

/**
 * Electron/Chromium match patterns only.
 * Invalid: mid-host wildcards like adservice.google.*  (crashes the app)
 * Valid host forms: *, *.example.com, exact.example.com
 */
const NETWORK_FILTER_URLS = [
  '*://*.doubleclick.net/*',
  '*://*.googleadservices.com/*',
  '*://*.googlesyndication.com/*',
  '*://*.2mdn.net/*',
  '*://*.moatads.com/*',
  '*://*.moatpixel.com/*',
  '*://*.scorecardresearch.com/*',
  '*://*.quantserve.com/*',
  '*://*.adsrvr.org/*',
  '*://*.adsafeprotected.com/*',
  '*://*.advertising.com/*',
  '*://*.adnxs.com/*',
  '*://*.amazon-adsystem.com/*',
  '*://*.taboola.com/*',
  '*://*.outbrain.com/*',
  '*://*.criteo.com/*',
  '*://*.criteo.net/*',
  '*://*.innovid.com/*',
  '*://*.teads.tv/*',
  '*://*.media.net/*',
  '*://*.flashtalking.com/*',
  '*://pagead2.googlesyndication.com/*',
  '*://googleads.g.doubleclick.net/*',
  '*://ade.googlesyndication.com/*',
  '*://adservice.google.com/*',
  '*://www.googleadservices.com/*',
  // Common regional adservice hosts (no mid-host wildcards)
  '*://adservice.google.co.uk/*',
  '*://adservice.google.de/*',
  '*://adservice.google.fr/*',
  '*://adservice.google.co.jp/*',
  '*://adservice.google.com.au/*',
  '*://adservice.google.ca/*',
  '*://adservice.google.co.in/*',
  '*://adservice.google.com.br/*',
  '*://*.youtube.com/pagead/*',
  '*://youtube.com/pagead/*',
  '*://*.youtube.com/ptracking*',
  '*://*.youtube.com/api/stats/ads*',
  '*://*.youtube.com/get_midroll_*',
  '*://*.youtube.com/youtubei/v1/player/ad_*',
  '*://*.youtube-nocookie.com/pagead/*',
  '*://ad.youtube.com/*',
  '*://ads.youtube.com/*',
];

const AD_PATH_REGEXES = [
  /\/pagead\//i,
  /\/pcs\/activeview/i,
  /\/ptracking/i,
  /\/api\/stats\/ads/i,
  /\/get_midroll_/i,
  /\/youtubei\/v1\/player\/ad_/i,
  /\/pagead\/adview/i,
  /\/pagead\/conversion/i,
  /\/pagead\/gen_204/i,
];

function hostMatchesSuffix(hostname, suffix) {
  if (!hostname || !suffix) return false;
  const h = hostname.toLowerCase();
  const s = suffix.toLowerCase();
  return h === s || h.endsWith('.' + s);
}

function shouldBlockUrl(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false;
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase();

  // Never touch media CDNs here (performance)
  if (host.endsWith('googlevideo.com') || host.endsWith('gvt1.com') || host.endsWith('ytimg.com')) {
    return false;
  }

  for (const suffix of AD_HOST_SUFFIXES) {
    if (hostMatchesSuffix(host, suffix)) return true;
  }

  // Regional Google adservice hosts (adservice.google.co.uk, etc.)
  if (host === 'adservice.google.com' || host.startsWith('adservice.google.')) return true;

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com') || host.endsWith('google.com')) {
    for (const re of AD_PATH_REGEXES) {
      if (re.test(url)) return true;
    }
  }
  return false;
}

/** Cached settings snapshot for the hot path */
let _adsEnabled = true;
let _networkBlock = true;

function refreshAdSettings(getSettingsFn) {
  try {
    const s = getSettingsFn() || {};
    _adsEnabled = s['ads.enabled'] !== false;
    _networkBlock = s['ads.networkBlock'] !== false;
  } catch {
    /* keep previous */
  }
}

function attachNetworkAdblock(ses, getSettingsFn) {
  if (!ses || ses.__newtubeAdblockAttached) return;
  ses.__newtubeAdblockAttached = true;

  refreshAdSettings(getSettingsFn);
  // Refresh cache occasionally without reading store every request
  const timer = setInterval(() => refreshAdSettings(getSettingsFn), 2000);
  if (timer.unref) timer.unref();

  // Guard: never register invalid patterns (would crash main process)
  const safeUrls = NETWORK_FILTER_URLS.filter((p) => {
    // Chromium forbids host wildcards like "foo.*" or "adservice.google.*"
    try {
      const afterScheme = p.replace(/^\*:\/\//, '').replace(/^https?:\/\//, '');
      const host = afterScheme.split('/')[0] || '';
      if (host.includes('*.') && !host.startsWith('*.')) return false;
      if (/\.\*$/.test(host) || host.includes('.*.')) return false;
      if (host.endsWith('.*')) return false;
      return true;
    } catch {
      return false;
    }
  });

  try {
    ses.webRequest.onBeforeRequest({ urls: safeUrls }, (details, callback) => {
      if (!_adsEnabled || !_networkBlock) {
        return callback({});
      }
      if (shouldBlockUrl(details.url)) {
        return callback({ cancel: true });
      }
      callback({});
    });
  } catch (err) {
    console.error('[NewPlayer AdShield] failed to attach filters', err);
    // Last resort: no network filter (skipper CSS still works)
  }
}

function getAdHideCss() {
  // Lean selector list — avoid heavy attribute wildcards that slow style recalc
  return `
.ytp-ad-module,.ytp-ad-overlay-slot,.ytp-ad-overlay-container,
.ytp-ad-text-overlay,.ytp-ad-image-overlay,.ytp-ad-progress,
.ytp-ad-progress-list,.ytp-ad-message-container,.ytp-ad-player-overlay,
.ytp-ad-player-overlay-instream-info,.video-ads,#player-ads,#masthead-ad,
ytd-ad-slot-renderer,ytd-banner-promo-renderer,ytd-display-ad-renderer,
ytd-promoted-sparkles-web-renderer,ytd-promoted-video-renderer,
ytd-in-feed-ad-layout-renderer,.ytd-mealbar-promo-renderer,
.ytp-suggested-action,.ytp-ce-element {
  display:none!important;visibility:hidden!important;pointer-events:none!important;
}
`;
}

function getAdSkipScript(options = {}) {
  const intervalMs = Math.max(400, options.intervalMs ?? 750);
  const muteAds = options.muteAds !== false;
  const speedThrough = options.speedThrough !== false;
  const clickSkip = options.clickSkip !== false;
  const seekPast = options.seekPast !== false;

  return `
(function(){
  if (window.__newtubeAdShield) return;
  window.__newtubeAdShield = true;
  const INTERVAL = ${Number(intervalMs)};
  const MUTE_ADS = ${muteAds ? 'true' : 'false'};
  const SPEED = ${speedThrough ? 'true' : 'false'};
  const CLICK_SKIP = ${clickSkip ? 'true' : 'false'};
  const SEEK_PAST = ${seekPast ? 'true' : 'false'};
  const SKIP_SEL = '.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-skip-ad-button,.ytp-ad-skip-button-container button,.videoAdUiSkipButton,.ytp-ad-overlay-close-button';
  let lastMuted = null;
  let ticking = false;

  function isAd() {
    const p = document.querySelector('.html5-video-player');
    return !!(p && (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting')))
      || !!document.querySelector('.ad-showing,.ad-interrupting,.ytp-ad-player-overlay');
  }

  function tick() {
    if (ticking) return;
    ticking = true;
    try {
      if (CLICK_SKIP) {
        document.querySelectorAll(SKIP_SEL).forEach((el) => { try { el.click(); } catch(e){} });
      }
      const ad = isAd();
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        if (!v) continue;
        if (ad) {
          if (MUTE_ADS) {
            if (lastMuted === null) lastMuted = v.muted;
            v.muted = true;
          }
          if (SPEED) { try { if (v.playbackRate < 8) v.playbackRate = 8; } catch(e){} }
          if (SEEK_PAST && v.duration > 0 && v.duration < 90 && v.currentTime < v.duration - 0.25) {
            try { v.currentTime = Math.max(0, v.duration - 0.15); } catch(e){}
          }
        } else {
          if (MUTE_ADS && lastMuted !== null) { v.muted = !!lastMuted; lastMuted = null; }
          if (SPEED && v.playbackRate >= 8) { try { v.playbackRate = 1; } catch(e){} }
        }
      }
    } catch (e) {}
    ticking = false;
  }
  setInterval(tick, INTERVAL);
  tick();
})();
`;
}

module.exports = {
  shouldBlockUrl,
  attachNetworkAdblock,
  getAdHideCss,
  getAdSkipScript,
  refreshAdSettings,
  NETWORK_FILTER_URLS,
};
