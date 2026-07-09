/**
 * YouTube TV scaling for desktop monitors.
 * Leanback UI is designed ~1920×1080; on PC it often looks huge, tiny, or blurry.
 */

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

/**
 * @param {{ width: number, height: number }} viewSize
 * @param {object} settings
 * @returns {number} zoom factor for webContents.setZoomFactor
 */
function computeTvZoom(viewSize, settings) {
  const w = Math.max(1, viewSize.width || 1);
  const h = Math.max(1, viewSize.height || 1);
  const userPct = Number(settings['display.zoomFactor'] ?? 100) / 100;
  const mode = settings['display.scaleMode'] || 'auto';

  let base = 1;

  switch (mode) {
    case 'manual':
      // User zoom only — crisp 1:1 layout chrome, no auto fit
      base = 1;
      break;
    case 'fit-width':
      // Map design width 1920 → current width
      base = w / 1920;
      break;
    case 'fit-height':
      base = h / 1080;
      break;
    case 'desktop':
      // Comfortable 10-foot UI shrunk for desk viewing (less oversized tiles)
      base = Math.min(w / 1600, h / 900);
      break;
    case 'tv':
      // Classic living-room: fill as if 1080p panel
      base = Math.min(w / 1920, h / 1080);
      break;
    case 'auto':
    default: {
      // YouTube Leanback is authored around 1920×1080.
      // Map the player area so 1080p windows are 1:1 (sharp, correct density).
      // Larger windows scale up; smaller ones scale down — never blur from random zoom.
      base = Math.min(w / 1920, h / 1080);
      base = clamp(base, 0.6, 1.6);
      break;
    }
  }

  // Slight global density bias (user can override with zoom %)
  const density = Number(settings['display.densityBias'] ?? 100) / 100;
  return clamp(base * userPct * density, 0.5, 2.5);
}

module.exports = { computeTvZoom, clamp };
