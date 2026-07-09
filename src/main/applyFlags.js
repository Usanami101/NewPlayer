/**
 * Apply Chromium / Electron command-line switches from settings
 * BEFORE app.ready. Tuned for fast video + crisp desktop scaling.
 */

const { app } = require('electron');
const { getSettings } = require('./store');

function applyEarlyFlags() {
  let settings;
  try {
    settings = getSettings();
  } catch {
    settings = {};
  }

  if (settings['display.hardwareAcceleration'] === false) {
    app.disableHardwareAcceleration();
  }

  if (settings['display.forceColorProfile'] && settings['display.forceColorProfile'] !== 'default') {
    app.commandLine.appendSwitch('force-color-profile', settings['display.forceColorProfile']);
  }

  // ── Performance: GPU + video decode (Windows) ─────────────
  if (settings['perf.gpuRasterization'] !== false) {
    app.commandLine.appendSwitch('enable-gpu-rasterization');
  }
  if (settings['perf.zeroCopy'] !== false) {
    app.commandLine.appendSwitch('enable-zero-copy');
  }
  if (settings['perf.enableNativeGpuMemoryBuffers'] !== false) {
    app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  }
  // Always prefer ignoring blocklist for video decode on modern GPUs unless user opts out
  if (settings['perf.ignoreGpuBlocklist'] !== false) {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
  }

  // Accelerated video path
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
  app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode');
  app.commandLine.appendSwitch('enable-features', [
    'PlatformHEVCDecoderSupport',
    'CanvasOopRasterization',
    'AcceleratedVideoDecode',
    'AcceleratedVideoEncoder',
    'VaapiVideoDecoder', // ignored on Win; harmless
  ].join(','));

  // Prefer discrete GPU on hybrid laptops
  app.commandLine.appendSwitch('force_high_performance_gpu');

  // D3D11 ANGLE — typically fastest on Windows
  if (process.platform === 'win32' && settings['perf.useD3d11'] !== false) {
    app.commandLine.appendSwitch('use-angle', 'd3d11');
  }

  // Reduce checkerboarding / improve scroll
  app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
  app.commandLine.appendSwitch('num-raster-threads', '4');

  // Don't throttle in background when multi-view needs it
  if (settings['perf.backgroundThrottling'] === false) {
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
  }

  if (settings['advanced.disableGpuSandbox']) {
    app.commandLine.appendSwitch('disable-gpu-sandbox');
  }

  if (settings['advanced.ignoreCertificateErrors']) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
  }

  if (settings['video.forceH264']) {
    // Prefer widely accelerated H.264
    app.commandLine.appendSwitch('disable-features', 'PlatformHEVCDecoderSupport');
  }

  if (settings['network.dnsOverHttps'] && settings['network.dnsOverHttps'] !== 'off') {
    app.commandLine.appendSwitch(
      'dns-over-https-mode',
      settings['network.dnsOverHttps'] === 'secure' ? 'secure' : 'automatic'
    );
  }

  if (settings['network.preferIpv4']) {
    app.commandLine.appendSwitch('disable-ipv6');
  }

  const autoplay = settings['advanced.autoplayPolicy'] || 'no-user-gesture-required';
  app.commandLine.appendSwitch('autoplay-policy', autoplay);

  // Smooth scrolling can be heavy — honor setting
  if (settings['display.smoothScrolling'] === false || settings['perf.disableSmoothScrolling']) {
    app.commandLine.appendSwitch('disable-smooth-scrolling');
  }

  if (settings['display.vsync'] === false) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
  }

  const frLimit = settings['display.frameRateLimit'];
  if (frLimit === 'unlimited') {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
  }

  // High-DPI: let Chromium handle native scaling (crisp). Never force device scale unless asked.
  if (settings['display.forceDeviceScaleFactor']) {
    const f = String(settings['display.forceDeviceScaleFactor']);
    if (f && f !== '0' && f !== 'auto') {
      app.commandLine.appendSwitch('force-device-scale-factor', f);
    }
  }

  if (settings['display.highDpiAware'] === false) {
    app.commandLine.appendSwitch('high-dpi-support', '0');
    app.commandLine.appendSwitch('force-device-scale-factor', '1');
  }

  const extra = (settings['advanced.extraChromiumFlags'] || '').trim();
  if (extra) {
    for (const token of extra.split(/\s+/)) {
      if (!token) continue;
      if (token.startsWith('--')) {
        const body = token.slice(2);
        const eq = body.indexOf('=');
        if (eq > 0) {
          app.commandLine.appendSwitch(body.slice(0, eq), body.slice(eq + 1));
        } else {
          app.commandLine.appendSwitch(body);
        }
      }
    }
  }

  // Larger disk cache helps repeat visits (default 1GB)
  const cacheMb = Number(settings['perf.diskCacheSizeMb'] || 1024);
  if (cacheMb > 0) {
    app.commandLine.appendSwitch('disk-cache-size', String(cacheMb * 1024 * 1024));
  }

  // Slightly more media cache
  app.commandLine.appendSwitch('media-cache-size', String(256 * 1024 * 1024));
}

module.exports = { applyEarlyFlags };
