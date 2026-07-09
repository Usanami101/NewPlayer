/**
 * Smart-TV style user agents so YouTube serves the living-room TV app.
 */

const PROFILES = {
  smarttv_tizen:
    'Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  smarttv_webos:
    'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebAppManager',
  smarttv_bravia:
    'Mozilla/5.0 (Linux; BRAVIA 4K VH2; Build/BKV3.220307.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  smarttv_viera:
    'Mozilla/5.0 (Linux; Viera; ja-JP) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  chromecast:
    'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CrKey/1.56.500000',
  appletv:
    'Mozilla/5.0 (Apple TV; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  desktop_chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

function resolveUserAgent(settings) {
  const profile = settings['network.userAgentProfile'] || 'smarttv_tizen';
  if (profile === 'custom' && settings['network.customUserAgent']) {
    return settings['network.customUserAgent'];
  }
  return PROFILES[profile] || PROFILES.smarttv_tizen;
}

module.exports = { PROFILES, resolveUserAgent };
