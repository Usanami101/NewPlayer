/**
 * NewTube Settings Catalog
 * ~200 curated, purposeful settings for a premium YouTube TV experience.
 * Every setting is intentional — no filler.
 */

const C = {
  WINDOW: 'window',
  DISPLAY: 'display',
  PLAYBACK: 'playback',
  VIDEO: 'video',
  AUDIO: 'audio',
  ADS: 'ads',
  WEATHER: 'weather',
  MULTIVIEW: 'multiview',
  INPUT: 'input',
  GAMEPAD: 'gamepad',
  NETWORK: 'network',
  PERFORMANCE: 'performance',
  APPEARANCE: 'appearance',
  THEME: 'theme',
  HUD: 'hud',
  STARTUP: 'startup',
  BEHAVIOR: 'behavior',
  PRIVACY: 'privacy',
  ACCESSIBILITY: 'accessibility',
  NOTIFICATIONS: 'notifications',
  CACHE: 'cache',
  ADVANCED: 'advanced',
  EXPERIMENTAL: 'experimental',
  INTEGRATIONS: 'integrations',
  SHORTCUTS: 'shortcuts',
  SESSION: 'session',
};

const CATEGORIES = [
  { id: C.WINDOW, label: 'Window', icon: '🗔', description: 'Size, position, frame, and multi-monitor layout' },
  { id: C.DISPLAY, label: 'Display', icon: '🖥', description: 'Resolution, scaling, HDR, and visual output' },
  { id: C.PLAYBACK, label: 'Playback', icon: '▶', description: 'How videos start, pause, seek, and continue' },
  { id: C.VIDEO, label: 'Video Quality', icon: '🎬', description: 'Resolution caps, codecs, and frame pacing' },
  { id: C.AUDIO, label: 'Audio', icon: '🔊', description: 'Volume, devices, spatial audio, and ducking' },
  { id: C.ADS, label: 'Ad Shield', icon: '🛡', description: 'Block ads, trackers, and sponsored clutter — on by default' },
  { id: C.WEATHER, label: 'NewWeather', icon: '🌤', description: 'NWS forecast, severe alerts, and full-screen TV EAS takeover' },
  { id: C.MULTIVIEW, label: 'Multi Desk', icon: '⧉', description: 'Play many videos at once, mute per window, drag across monitors' },
  { id: C.INPUT, label: 'Keyboard & Mouse', icon: '⌨', description: 'Keys, cursor, scroll, and pointer behavior' },
  { id: C.GAMEPAD, label: 'Controller', icon: '🎮', description: 'Gamepad layout, deadzones, and haptics' },
  { id: C.NETWORK, label: 'Network', icon: '🌐', description: 'Streaming strategy, DNS, and connection care' },
  { id: C.PERFORMANCE, label: 'Performance', icon: '⚡', description: 'GPU, RAM, process priority, and smoothness' },
  { id: C.APPEARANCE, label: 'Appearance', icon: '✨', description: 'Chrome, overlays, animations, and polish' },
  { id: C.THEME, label: 'Theme', icon: '🎨', description: 'Colors, accents, and visual identity' },
  { id: C.HUD, label: 'On-Screen HUD', icon: '📡', description: 'Status overlays, clock, and session info' },
  { id: C.STARTUP, label: 'Startup', icon: '🚀', description: 'Launch flow, splash, and first-run feel' },
  { id: C.BEHAVIOR, label: 'Behavior', icon: '⚙', description: 'Focus, power, idle, and system manners' },
  { id: C.PRIVACY, label: 'Privacy', icon: '🔒', description: 'Tracking, cookies, history, and sandboxing' },
  { id: C.ACCESSIBILITY, label: 'Accessibility', icon: '♿', description: 'Captions, contrast, motion, and input aids' },
  { id: C.NOTIFICATIONS, label: 'Notifications', icon: '🔔', description: 'Toasts, sounds, and system alerts' },
  { id: C.CACHE, label: 'Storage & Cache', icon: '💾', description: 'Disk use, media cache, and cleanup' },
  { id: C.SHORTCUTS, label: 'Shortcuts', icon: '⌘', description: 'Global hotkeys and action bindings' },
  { id: C.SESSION, label: 'Session', icon: '👤', description: 'Accounts, profiles, and resume state' },
  { id: C.INTEGRATIONS, label: 'Integrations', icon: '🔗', description: 'Discord, media keys, and OS hooks' },
  { id: C.ADVANCED, label: 'Advanced', icon: '🛠', description: 'User agent, flags, and expert knobs' },
  { id: C.EXPERIMENTAL, label: 'Experimental', icon: '🧪', description: 'Bleeding-edge features — use carefully' },
];

/**
 * Setting types: boolean | number | string | enum | color | hotkey | range
 * apply: main | renderer | webview | none — where the setting takes effect
 */
function S(id, category, label, type, def, extra = {}) {
  return {
    id,
    category,
    label,
    type,
    default: def,
    description: extra.description || '',
    options: extra.options || null,
    min: extra.min,
    max: extra.max,
    step: extra.step,
    unit: extra.unit || '',
    apply: extra.apply || 'main',
    group: extra.group || null,
    premium: extra.premium || false,
    restart: extra.restart || false,
  };
}

const SETTINGS = [
  // ═══════════════════════════════════════════════════════════
  // WINDOW (1–14)
  // ═══════════════════════════════════════════════════════════
  S('window.startFullscreen', C.WINDOW, 'Start in fullscreen', 'boolean', false, {
    description: 'Launch NewTube in fullscreen (off by default — use F11 anytime)',
    group: 'Launch size',
  }),
  S('window.startMaximized', C.WINDOW, 'Start maximized', 'boolean', false, {
    description: 'Fill the work area when opening (off = normal floating window)',
    group: 'Launch size',
  }),
  S('window.rememberBounds', C.WINDOW, 'Remember window position', 'boolean', true, {
    description: 'Restore last size and position on next launch',
    group: 'Launch size',
  }),
  S('window.width', C.WINDOW, 'Default width', 'number', 1600, {
    min: 800, max: 7680, step: 10, unit: 'px', description: 'Initial window width when not maximized',
    group: 'Launch size',
  }),
  S('window.height', C.WINDOW, 'Default height', 'number', 900, {
    min: 480, max: 4320, step: 10, unit: 'px', description: 'Initial window height when not maximized',
    group: 'Launch size',
  }),
  S('window.minWidth', C.WINDOW, 'Minimum width', 'number', 960, {
    min: 640, max: 1920, step: 10, unit: 'px', description: 'Smallest allowed window width',
  }),
  S('window.minHeight', C.WINDOW, 'Minimum height', 'number', 540, {
    min: 360, max: 1080, step: 10, unit: 'px', description: 'Smallest allowed window height',
  }),
  S('window.frameless', C.WINDOW, 'Frameless window', 'boolean', false, {
    description: 'Hide OS title bar (harder to drag — keep off for a normal window)',
    restart: true,
  }),
  S('window.alwaysOnTop', C.WINDOW, 'Always on top', 'boolean', false, {
    description: 'Keep NewTube above other windows',
  }),
  S('window.transparent', C.WINDOW, 'Transparent window edges', 'boolean', false, {
    description: 'Allow rounded translucent frame (Windows 11)',
    restart: true,
  }),
  S('window.opacity', C.WINDOW, 'Window opacity', 'range', 100, {
    min: 40, max: 100, step: 1, unit: '%', description: 'Overall window transparency',
  }),
  S('window.displayIndex', C.WINDOW, 'Preferred monitor', 'number', 0, {
    min: 0, max: 7, step: 1, description: '0 = primary display; higher numbers pick secondary monitors',
  }),
  S('window.centerOnLaunch', C.WINDOW, 'Center on launch', 'boolean', true, {
    description: 'Center the window on the preferred monitor',
  }),
  S('window.snapToEdges', C.WINDOW, 'Snap to screen edges', 'boolean', true, {
    description: 'Magnetic snap when dragging near monitor borders',
  }),

  // ═══════════════════════════════════════════════════════════
  // DISPLAY (15–28)
  // ═══════════════════════════════════════════════════════════
  S('display.hardwareAcceleration', C.DISPLAY, 'Hardware acceleration', 'boolean', true, {
    description: 'Use GPU for compositing and video decode',
    restart: true,
  }),
  S('display.vsync', C.DISPLAY, 'V-Sync', 'boolean', true, {
    description: 'Lock frame presentation to display refresh',
    restart: true,
  }),
  S('display.frameRateLimit', C.DISPLAY, 'Frame rate limit', 'enum', 'display', {
    options: [
      { value: 'display', label: 'Match display' },
      { value: '30', label: '30 FPS' },
      { value: '60', label: '60 FPS' },
      { value: '120', label: '120 FPS' },
      { value: '144', label: '144 FPS' },
      { value: 'unlimited', label: 'Unlimited' },
    ],
    description: 'Cap compositor refresh for smoother or cooler running',
    restart: true,
  }),
  S('display.scaleMode', C.DISPLAY, 'TV scale mode', 'enum', 'auto', {
    options: [
      { value: 'auto', label: 'Auto (recommended)' },
      { value: 'desktop', label: 'Desktop comfort' },
      { value: 'tv', label: 'TV fill (1080 design)' },
      { value: 'fit-width', label: 'Fit width' },
      { value: 'fit-height', label: 'Fit height' },
      { value: 'manual', label: 'Manual zoom only' },
    ],
    description: 'How YouTube TV maps to your window — Auto fixes oversized/tiny UI',
  }),
  S('display.zoomFactor', C.DISPLAY, 'UI zoom', 'range', 100, {
    min: 50, max: 200, step: 5, unit: '%',
    description: 'Extra zoom on top of scale mode (100% = no extra)',
  }),
  S('display.densityBias', C.DISPLAY, 'UI density', 'range', 100, {
    min: 70, max: 130, step: 5, unit: '%',
    description: 'Fine-tune overall size — lower = more content on screen',
  }),
  S('display.forceColorProfile', C.DISPLAY, 'Color profile', 'enum', 'default', {
    options: [
      { value: 'default', label: 'System default' },
      { value: 'srgb', label: 'sRGB' },
      { value: 'display-p3-d65', label: 'Display P3' },
      { value: 'color-spin-gamma24', label: 'Gamma 2.4' },
    ],
    description: 'Override browser color management',
    restart: true,
  }),
  S('display.hdrSupport', C.DISPLAY, 'Prefer HDR when available', 'boolean', true, {
    description: 'Hint the pipeline toward HDR content paths on capable displays',
  }),
  S('display.highDpiAware', C.DISPLAY, 'Per-monitor DPI awareness', 'boolean', true, {
    description: 'Scale cleanly across mixed-DPI multi-monitor setups',
    restart: true,
  }),
  S('display.letterboxColor', C.DISPLAY, 'Letterbox color', 'color', '#000000', {
    description: 'Bars around video when aspect ratios differ',
  }),
  S('display.smoothScrolling', C.DISPLAY, 'Smooth scrolling', 'boolean', true, {
    description: 'Inertia and smoothed scroll animations in menus',
  }),
  S('display.animationScale', C.DISPLAY, 'Animation scale', 'range', 100, {
    min: 0, max: 150, step: 10, unit: '%', description: '0% reduces motion for snappier UI',
  }),
  S('display.reduceBlur', C.DISPLAY, 'Reduce background blur', 'boolean', false, {
    description: 'Lower GPU cost of frosted overlays',
  }),
  S('display.crtScanlines', C.DISPLAY, 'CRT scanline overlay', 'boolean', false, {
    description: 'Subtle retro scanlines for ambient/theater vibe',
    group: 'Effects',
  }),
  S('display.vignette', C.DISPLAY, 'Vignette strength', 'range', 0, {
    min: 0, max: 80, step: 5, unit: '%', description: 'Darken edges for a theater look',
    group: 'Effects',
  }),
  S('display.nightLight', C.DISPLAY, 'Warm night tint', 'range', 0, {
    min: 0, max: 100, step: 5, unit: '%', description: 'Shift whites warmer in the evening',
    group: 'Effects',
  }),

  // ═══════════════════════════════════════════════════════════
  // PLAYBACK (29–42)
  // ═══════════════════════════════════════════════════════════
  S('playback.autoplay', C.PLAYBACK, 'Allow autoplay', 'boolean', true, {
    description: 'Let the next video start without a click when YouTube offers it',
  }),
  S('playback.resumeLast', C.PLAYBACK, 'Resume last session', 'boolean', true, {
    description: 'Return to previous page/state when possible',
  }),
  S('playback.seekStepSmall', C.PLAYBACK, 'Fine seek step', 'number', 5, {
    min: 1, max: 30, step: 1, unit: 's', description: 'Seconds jumped by fine seek shortcuts',
  }),
  S('playback.seekStepLarge', C.PLAYBACK, 'Coarse seek step', 'number', 30, {
    min: 10, max: 120, step: 5, unit: 's', description: 'Seconds jumped by coarse seek shortcuts',
  }),
  S('playback.defaultSpeed', C.PLAYBACK, 'Default speed', 'enum', '1', {
    options: [
      { value: '0.25', label: '0.25×' }, { value: '0.5', label: '0.5×' },
      { value: '0.75', label: '0.75×' }, { value: '1', label: '1×' },
      { value: '1.25', label: '1.25×' }, { value: '1.5', label: '1.5×' },
      { value: '1.75', label: '1.75×' }, { value: '2', label: '2×' },
    ],
    description: 'Preferred playback rate when controllable',
  }),
  S('playback.rememberSpeed', C.PLAYBACK, 'Remember speed per channel', 'boolean', false, {
    description: 'Store last used speed associated with a channel when possible',
  }),
  S('playback.loopVideos', C.PLAYBACK, 'Loop single videos', 'boolean', false, {
    description: 'Prefer looping when watching a single item',
  }),
  S('playback.skipSponsoredSegments', C.PLAYBACK, 'Highlight long intros', 'boolean', false, {
    description: 'Visual cue when videos open with very long cold opens (heuristic)',
  }),
  S('playback.pauseOnBlur', C.PLAYBACK, 'Pause when unfocused', 'boolean', false, {
    description: 'Pause playback if NewTube loses window focus',
  }),
  S('playback.pauseOnMinimize', C.PLAYBACK, 'Pause when minimized', 'boolean', true, {
    description: 'Pause when the window is minimized',
  }),
  S('playback.continueInBackground', C.PLAYBACK, 'Continue in background', 'boolean', false, {
    description: 'Keep audio going when the window is hidden (overrides pause options)',
  }),
  S('playback.endOfVideoAction', C.PLAYBACK, 'End of video', 'enum', 'auto', {
    options: [
      { value: 'auto', label: 'YouTube default' },
      { value: 'home', label: 'Return home' },
      { value: 'related', label: 'Stay on related' },
      { value: 'replay', label: 'Replay' },
    ],
    description: 'Preferred behavior after a video finishes',
  }),
  S('playback.theaterModeOnPlay', C.PLAYBACK, 'Fullscreen on play', 'boolean', false, {
    description: 'Enter fullscreen automatically when playback begins',
  }),
  S('playback.confirmExitWhilePlaying', C.PLAYBACK, 'Confirm exit while playing', 'boolean', true, {
    description: 'Ask before closing if a video is actively playing',
  }),

  // ═══════════════════════════════════════════════════════════
  // VIDEO QUALITY (43–56)
  // ═══════════════════════════════════════════════════════════
  S('video.maxResolution', C.VIDEO, 'Max resolution', 'enum', 'auto', {
    options: [
      { value: 'auto', label: 'Auto (best)' },
      { value: '4320', label: '8K / 4320p' },
      { value: '2160', label: '4K / 2160p' },
      { value: '1440', label: '1440p' },
      { value: '1080', label: '1080p' },
      { value: '720', label: '720p' },
      { value: '480', label: '480p' },
      { value: '360', label: '360p' },
    ],
    description: 'Cap stream resolution (bandwidth & GPU friendly)',
  }),
  S('video.prefer60fps', C.VIDEO, 'Prefer 60 FPS', 'boolean', true, {
    description: 'Favor high-frame-rate streams when available',
  }),
  S('video.preferHdr', C.VIDEO, 'Prefer HDR streams', 'boolean', true, {
    description: 'Choose HDR variants on capable hardware',
  }),
  S('video.codecPreference', C.VIDEO, 'Codec preference', 'enum', 'auto', {
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'av1', label: 'AV1 first' },
      { value: 'vp9', label: 'VP9 first' },
      { value: 'h264', label: 'H.264 first' },
    ],
    description: 'Bias adaptive streaming toward a codec family',
  }),
  S('video.forceH264', C.VIDEO, 'Force H.264 only', 'boolean', false, {
    description: 'Restrict to H.264 for maximum compatibility on older GPUs',
    restart: true,
  }),
  S('video.sharpnessBoost', C.VIDEO, 'Sharpness boost', 'range', 0, {
    min: 0, max: 50, step: 5, unit: '%', description: 'Light CSS unsharp mask on the video layer',
  }),
  S('video.brightness', C.VIDEO, 'Brightness', 'range', 100, {
    min: 50, max: 150, step: 1, unit: '%', description: 'Video layer brightness filter',
  }),
  S('video.contrast', C.VIDEO, 'Contrast', 'range', 100, {
    min: 50, max: 150, step: 1, unit: '%', description: 'Video layer contrast filter',
  }),
  S('video.saturation', C.VIDEO, 'Saturation', 'range', 100, {
    min: 0, max: 200, step: 1, unit: '%', description: 'Video color intensity',
  }),
  S('video.ambientMode', C.VIDEO, 'Ambient backlight simulation', 'boolean', false, {
    description: 'Soft glow around the player matching dominant colors',
  }),
  S('video.ambientIntensity', C.VIDEO, 'Ambient intensity', 'range', 40, {
    min: 0, max: 100, step: 5, unit: '%', description: 'Strength of ambient backlight effect',
  }),
  S('video.statsOverlay', C.VIDEO, 'Show video stats overlay', 'boolean', false, {
    description: 'Tiny corner readout of resolution / FPS estimate',
  }),
  S('video.deblockHint', C.VIDEO, 'Soft deblock hint', 'boolean', false, {
    description: 'Mild blur on very low-bitrate looking frames (heuristic CSS)',
  }),
  S('video.cinemaBars', C.VIDEO, 'Force 21:9 cinema bars', 'boolean', false, {
    description: 'Add cinematic bars over 16:9 content',
  }),

  // ═══════════════════════════════════════════════════════════
  // AUDIO (57–70)
  // ═══════════════════════════════════════════════════════════
  S('audio.masterVolume', C.AUDIO, 'Master volume', 'range', 100, {
    min: 0, max: 100, step: 1, unit: '%', description: 'Application-level volume multiplier',
  }),
  S('audio.muteOnStart', C.AUDIO, 'Start muted', 'boolean', false, {
    description: 'Launch with audio muted until you unmute',
  }),
  S('audio.volumeStep', C.AUDIO, 'Volume step', 'number', 5, {
    min: 1, max: 20, step: 1, unit: '%', description: 'Change per volume key press',
  }),
  S('audio.normalizeLoudness', C.AUDIO, 'Loudness normalization bias', 'boolean', true, {
    description: 'Prefer more consistent perceived loudness when available',
  }),
  S('audio.spatialAudio', C.AUDIO, 'Spatial audio preference', 'boolean', false, {
    description: 'Hint for spatial / immersive audio paths when offered',
  }),
  S('audio.exclusiveMode', C.AUDIO, 'Prefer exclusive audio mode', 'boolean', false, {
    description: 'Request lower-latency exclusive device access when OS allows',
  }),
  S('audio.outputDevice', C.AUDIO, 'Output device', 'enum', 'default', {
    options: [
      { value: 'default', label: 'System default' },
      { value: 'communications', label: 'Communications device' },
    ],
    description: 'Preferred Windows audio endpoint class',
  }),
  S('audio.duckOnCall', C.AUDIO, 'Duck on communication', 'boolean', true, {
    description: 'Lower volume when Windows detects a call (if supported)',
  }),
  S('audio.muteOnMinimize', C.AUDIO, 'Mute when minimized', 'boolean', false, {
    description: 'Silence audio while minimized (playback may continue)',
  }),
  S('audio.fadeOnPause', C.AUDIO, 'Fade on pause', 'boolean', true, {
    description: 'Short volume fade instead of hard cut when pausing via NewTube',
  }),
  S('audio.fadeMs', C.AUDIO, 'Fade duration', 'number', 180, {
    min: 0, max: 1000, step: 20, unit: 'ms', description: 'Length of pause/resume fades',
  }),
  S('audio.bassBoost', C.AUDIO, 'Bass boost (EQ)', 'range', 0, {
    min: 0, max: 12, step: 1, unit: 'dB', description: 'Soft low-shelf emphasis via WebAudio when injected',
  }),
  S('audio.trebleBoost', C.AUDIO, 'Treble boost (EQ)', 'range', 0, {
    min: 0, max: 12, step: 1, unit: 'dB', description: 'Soft high-shelf emphasis',
  }),
  S('audio.showVolumeHud', C.AUDIO, 'Show volume HUD', 'boolean', true, {
    description: 'Large on-screen volume indicator when changing levels',
  }),

  // ═══════════════════════════════════════════════════════════
  // AD SHIELD — ad-free by default
  // ═══════════════════════════════════════════════════════════
  S('ads.enabled', C.ADS, 'Ad Shield enabled', 'boolean', true, {
    description: 'Master switch — blocks ad networks and skips in-stream ads',
    group: 'Core',
  }),
  S('ads.networkBlock', C.ADS, 'Network ad blocking', 'boolean', true, {
    description: 'Cancel requests to DoubleClick, syndication, and ad hosts',
    group: 'Core',
  }),
  S('ads.aggressive', C.ADS, 'Aggressive mode', 'boolean', true, {
    description: 'Block more ad endpoints and measurement beacons (recommended)',
    group: 'Core',
  }),
  S('ads.pageSkipper', C.ADS, 'In-page ad skipper', 'boolean', true, {
    description: 'Auto-click Skip and neutralize remaining pre/mid-rolls',
    group: 'Playback ads',
  }),
  S('ads.clickSkip', C.ADS, 'Auto-click Skip Ad', 'boolean', true, {
    description: 'Press Skip as soon as YouTube shows the button',
    group: 'Playback ads',
  }),
  S('ads.muteAds', C.ADS, 'Mute ads while skipping', 'boolean', true, {
    description: 'Silence audio during detected ad segments',
    group: 'Playback ads',
  }),
  S('ads.speedThrough', C.ADS, 'Speed through unskippable ads', 'boolean', true, {
    description: 'Max playback rate on detected ads so they end ASAP',
    group: 'Playback ads',
  }),
  S('ads.seekPast', C.ADS, 'Seek past short ads', 'boolean', true, {
    description: 'Jump near the end of short ad clips when safe',
    group: 'Playback ads',
  }),
  S('ads.hideOverlays', C.ADS, 'Hide ad overlays & banners', 'boolean', true, {
    description: 'CSS-hide banner, overlay, and companion ad surfaces',
    group: 'Visual',
  }),
  S('ads.hideSponsored', C.ADS, 'Hide sponsored shelf cards', 'boolean', true, {
    description: 'Suppress promoted/sponsored cards in feeds when possible',
    group: 'Visual',
  }),
  S('ads.blockTrackers', C.ADS, 'Block ad trackers', 'boolean', true, {
    description: 'Block common advertising measurement and pixel hosts',
    group: 'Privacy',
  }),
  S('ads.skipIntervalMs', C.ADS, 'Skipper poll interval', 'number', 750, {
    min: 400, max: 2000, step: 50, unit: 'ms',
    description: 'How often the in-page skipper scans for ads (higher = less CPU)',
    group: 'Advanced',
  }),
  S('ads.notifyBlocked', C.ADS, 'Toast when shield arms', 'boolean', false, {
    description: 'Show a one-time toast that Ad Shield is active',
    group: 'Advanced',
  }),
  S('ads.logBlocks', C.ADS, 'Log blocked URLs (debug)', 'boolean', false, {
    description: 'Print blocked request URLs to the main process log',
    group: 'Advanced',
  }),
  S('ads.strictMode', C.ADS, 'Strict mode', 'boolean', true, {
    description: 'Maximum protection — may rarely affect edge-case features',
    group: 'Advanced',
  }),

  // ═══════════════════════════════════════════════════════════
  // WEATHER — NWS
  // ═══════════════════════════════════════════════════════════
  S('weather.enabled', C.WEATHER, 'Enable weather', 'boolean', true, {
    description: 'Use National Weather Service data in NewPlayer',
    group: 'Core',
  }),
  S('weather.zip', C.WEATHER, 'US ZIP code', 'string', '', {
    description: 'Primary location for forecast and alerts (US only)',
    group: 'Location',
  }),
  S('weather.lat', C.WEATHER, 'Latitude', 'number', 0, {
    min: -90, max: 90, step: 0.0001,
    description: 'Optional if ZIP is set',
    group: 'Location',
  }),
  S('weather.lon', C.WEATHER, 'Longitude', 'number', 0, {
    min: -180, max: 180, step: 0.0001,
    description: 'Optional if ZIP is set',
    group: 'Location',
  }),
  S('weather.alertsEnabled', C.WEATHER, 'Severe weather alerts', 'boolean', true, {
    description: 'Show Windows notifications for NWS alerts',
    group: 'Alerts',
  }),
  S('weather.backgroundAlerts', C.WEATHER, 'Background alert watcher', 'boolean', false, {
    description: 'Keep NewPlayer in the tray for alerts only (no need to keep windows open)',
    group: 'Alerts',
  }),
  S('weather.minSeverity', C.WEATHER, 'Minimum alert severity', 'enum', 'Moderate', {
    options: [
      { value: 'Minor', label: 'Minor and above' },
      { value: 'Moderate', label: 'Moderate and above' },
      { value: 'Severe', label: 'Severe and above' },
      { value: 'Extreme', label: 'Extreme only' },
    ],
    description: 'Ignore quieter alerts below this level',
    group: 'Alerts',
  }),
  S('weather.pollMinutes', C.WEATHER, 'Alert check interval', 'number', 3, {
    min: 1, max: 60, step: 1, unit: 'min',
    description: 'How often to poll NWS for new alerts in the background',
    group: 'Alerts',
  }),
  S('weather.alertSound', C.WEATHER, 'Alert notification sound', 'boolean', true, {
    description: 'Play the system sound with weather notifications',
    group: 'Alerts',
  }),
  S('weather.notifyOnStart', C.WEATHER, 'Notify existing alerts on start', 'boolean', false, {
    description: 'If on, current alerts fire notifications when the watcher starts',
    group: 'Alerts',
  }),
  S('weather.easEnabled', C.WEATHER, 'Full-screen EAS takeover', 'boolean', true, {
    description: 'TV-style Emergency Alert System screen with attention tones for severe weather',
    group: 'EAS',
  }),
  S('weather.easMinSeverity', C.WEATHER, 'EAS minimum severity', 'enum', 'Severe', {
    options: [
      { value: 'Moderate', label: 'Moderate and above' },
      { value: 'Severe', label: 'Severe and above' },
      { value: 'Extreme', label: 'Extreme only' },
    ],
    description: 'Only takeover the screen for alerts at this severity or higher',
    group: 'EAS',
  }),

  // ═══════════════════════════════════════════════════════════
  // MULTI DESK — multi video / multi monitor
  // ═══════════════════════════════════════════════════════════
  S('multiview.enabled', C.MULTIVIEW, 'Enable Multi Desk', 'boolean', true, {
    description: 'Allow opening multiple simultaneous player windows',
    group: 'Core',
  }),
  S('multiview.maxPlayers', C.MULTIVIEW, 'Max simultaneous players', 'number', 8, {
    min: 2, max: 16, step: 1,
    description: 'Hard cap on open multi-player windows',
    group: 'Core',
  }),
  S('multiview.shareSession', C.MULTIVIEW, 'Share login across players', 'boolean', true, {
    description: 'All players use the same signed-in YouTube session',
    group: 'Core',
  }),
  S('multiview.startMuted', C.MULTIVIEW, 'New players start muted', 'boolean', false, {
    description: 'Useful so only one video has sound until you unmute',
    group: 'Audio',
  }),
  S('multiview.muteOthersOnFocus', C.MULTIVIEW, 'Solo audio on focus', 'boolean', false, {
    description: 'When focusing a player, mute all other multi players',
    group: 'Audio',
  }),
  S('multiview.alwaysOnTopDefault', C.MULTIVIEW, 'New players always on top', 'boolean', false, {
    description: 'Float new multi windows above other apps',
    group: 'Window',
  }),
  S('multiview.defaultWidth', C.MULTIVIEW, 'Default player width', 'number', 960, {
    min: 480, max: 3840, step: 10, unit: 'px',
    description: 'Initial width of a new multi player',
    group: 'Window',
  }),
  S('multiview.defaultHeight', C.MULTIVIEW, 'Default player height', 'number', 540, {
    min: 270, max: 2160, step: 10, unit: 'px',
    description: 'Initial height of a new multi player',
    group: 'Window',
  }),
  S('multiview.defaultDisplay', C.MULTIVIEW, 'Preferred display for new players', 'number', 0, {
    min: 0, max: 7, step: 1,
    description: '0 = primary; higher values target other monitors',
    group: 'Window',
  }),
  S('multiview.tileOnOpen', C.MULTIVIEW, 'Auto-tile when opening many', 'boolean', false, {
    description: 'Retile multi players after each new open',
    group: 'Layout',
  }),
  S('multiview.backgroundPlayback', C.MULTIVIEW, 'Keep playing when unfocused', 'boolean', true, {
    description: 'Disable background throttling so all videos keep running',
    group: 'Playback',
  }),
  S('multiview.showInTray', C.MULTIVIEW, 'List players in tray menu', 'boolean', true, {
    description: 'Quick jump / mute from the system tray',
    group: 'UI',
  }),

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD & MOUSE (71–84)
  // ═══════════════════════════════════════════════════════════
  S('input.hideCursor', C.INPUT, 'Hide idle cursor', 'boolean', true, {
    description: 'Fade the mouse away after inactivity during video',
  }),
  S('input.cursorHideDelay', C.INPUT, 'Cursor hide delay', 'number', 2500, {
    min: 500, max: 10000, step: 100, unit: 'ms', description: 'Idle time before cursor vanishes',
  }),
  S('input.cursorStyle', C.INPUT, 'Cursor style', 'enum', 'default', {
    options: [
      { value: 'default', label: 'System' },
      { value: 'none', label: 'Always hidden' },
      { value: 'crosshair', label: 'Crosshair' },
      { value: 'pointer', label: 'Pointer' },
    ],
    description: 'Default cursor appearance inside the player',
  }),
  S('input.scrollSpeed', C.INPUT, 'Scroll speed', 'range', 100, {
    min: 25, max: 300, step: 5, unit: '%', description: 'Multiplier for wheel scrolling in menus',
  }),
  S('input.invertScroll', C.INPUT, 'Invert scroll direction', 'boolean', false, {
    description: 'Natural scrolling inversion for vertical lists',
  }),
  S('input.middleClickFullscreen', C.INPUT, 'Middle-click toggles fullscreen', 'boolean', true, {
    description: 'Click the mouse wheel to toggle fullscreen',
  }),
  S('input.doubleClickFullscreen', C.INPUT, 'Double-click toggles fullscreen', 'boolean', true, {
    description: 'Double-click the player surface for fullscreen',
  }),
  S('input.rightClickMenu', C.INPUT, 'Custom right-click menu', 'boolean', true, {
    description: 'Show NewTube quick actions on right-click',
  }),
  S('input.keyboardNavigation', C.INPUT, 'Arrow-key TV navigation', 'boolean', true, {
    description: 'Emphasize D-pad style focus movement',
  }),
  S('input.escapeExitsFullscreen', C.INPUT, 'Esc exits fullscreen first', 'boolean', true, {
    description: 'First Esc leaves fullscreen; second can open settings or exit',
  }),
  S('input.f11Fullscreen', C.INPUT, 'F11 fullscreen', 'boolean', true, {
    description: 'Classic F11 fullscreen toggle',
  }),
  S('input.spacePlayPause', C.INPUT, 'Space = play/pause', 'boolean', true, {
    description: 'Spacebar toggles playback when focus allows',
  }),
  S('input.numberSeek', C.INPUT, 'Number keys seek percentage', 'boolean', true, {
    description: '0–9 jump to 0%–90% of the timeline',
  }),
  S('input.mediaKeys', C.INPUT, 'Honor media keys', 'boolean', true, {
    description: 'Play/pause, next, previous from keyboard media keys',
  }),

  // ═══════════════════════════════════════════════════════════
  // GAMEPAD (85–98)
  // ═══════════════════════════════════════════════════════════
  S('gamepad.enabled', C.GAMEPAD, 'Enable controller support', 'boolean', true, {
    description: 'Map Xbox / DualSense style pads to TV navigation',
  }),
  S('gamepad.layout', C.GAMEPAD, 'Button layout', 'enum', 'xbox', {
    options: [
      { value: 'xbox', label: 'Xbox' },
      { value: 'playstation', label: 'PlayStation' },
      { value: 'switch', label: 'Switch' },
      { value: 'custom', label: 'Custom' },
    ],
    description: 'Glyphs and default bindings style',
  }),
  S('gamepad.deadzone', C.GAMEPAD, 'Stick deadzone', 'range', 12, {
    min: 0, max: 40, step: 1, unit: '%', description: 'Ignore tiny stick drift',
  }),
  S('gamepad.sensitivity', C.GAMEPAD, 'Stick sensitivity', 'range', 100, {
    min: 50, max: 200, step: 5, unit: '%', description: 'Cursor/focus movement speed from sticks',
  }),
  S('gamepad.vibration', C.GAMEPAD, 'Haptic feedback', 'boolean', true, {
    description: 'Rumble on select / boundary when supported',
  }),
  S('gamepad.vibrationStrength', C.GAMEPAD, 'Haptic strength', 'range', 60, {
    min: 0, max: 100, step: 5, unit: '%', description: 'How strong rumble pulses feel',
  }),
  S('gamepad.guideOpensSettings', C.GAMEPAD, 'Guide / PS button = settings', 'boolean', true, {
    description: 'Open NewTube settings from the system button',
  }),
  S('gamepad.yHome', C.GAMEPAD, 'Y / Triangle = Home', 'boolean', true, {
    description: 'Jump to YouTube TV home with Y/Triangle',
  }),
  S('gamepad.xSearch', C.GAMEPAD, 'X / Square = Search', 'boolean', true, {
    description: 'Open search with X/Square',
  }),
  S('gamepad.lbRbSeek', C.GAMEPAD, 'LB/RB seek', 'boolean', true, {
    description: 'Shoulders jump backward / forward',
  }),
  S('gamepad.triggersVolume', C.GAMEPAD, 'Triggers control volume', 'boolean', true, {
    description: 'LT lower volume, RT raise volume',
  }),
  S('gamepad.longPressBackExit', C.GAMEPAD, 'Long-press Back to exit', 'boolean', true, {
    description: 'Hold B/Circle to quit after confirm',
  }),
  S('gamepad.pollRate', C.GAMEPAD, 'Poll rate', 'enum', '60', {
    options: [
      { value: '30', label: '30 Hz' },
      { value: '60', label: '60 Hz' },
      { value: '120', label: '120 Hz' },
    ],
    description: 'How often pads are sampled',
  }),
  S('gamepad.showConnectedToast', C.GAMEPAD, 'Toast on connect', 'boolean', true, {
    description: 'Notify when a controller is plugged in',
  }),

  // ═══════════════════════════════════════════════════════════
  // NETWORK (99–112)
  // ═══════════════════════════════════════════════════════════
  S('network.preferIpv4', C.NETWORK, 'Prefer IPv4', 'boolean', false, {
    description: 'Bias connections toward IPv4 if dual-stack is flaky',
    restart: true,
  }),
  S('network.dnsOverHttps', C.NETWORK, 'DNS over HTTPS', 'enum', 'off', {
    options: [
      { value: 'off', label: 'Off' },
      { value: 'automatic', label: 'Automatic' },
      { value: 'secure', label: 'Secure only' },
    ],
    description: 'Chromium DoH mode for name resolution',
    restart: true,
  }),
  S('network.connectionTimeout', C.NETWORK, 'Connection timeout', 'number', 30, {
    min: 5, max: 120, step: 5, unit: 's', description: 'How long to wait before failing a load',
  }),
  S('network.retryOnFail', C.NETWORK, 'Auto-retry failed loads', 'boolean', true, {
    description: 'Reload the TV shell if the first load fails',
  }),
  S('network.retryCount', C.NETWORK, 'Retry attempts', 'number', 3, {
    min: 0, max: 10, step: 1, description: 'Max automatic retries after a failed load',
  }),
  S('network.retryDelayMs', C.NETWORK, 'Retry delay', 'number', 2000, {
    min: 500, max: 15000, step: 500, unit: 'ms', description: 'Wait between retries',
  }),
  S('network.bandwidthSaver', C.NETWORK, 'Bandwidth saver', 'boolean', false, {
    description: 'Bias quality settings and prefetch toward lower data use',
  }),
  S('network.preloadHint', C.NETWORK, 'Preload aggressiveness', 'enum', 'medium', {
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
    description: 'How eagerly related assets may be warmed',
  }),
  S('network.offlineBanner', C.NETWORK, 'Show offline banner', 'boolean', true, {
    description: 'Clear banner when connectivity drops',
  }),
  S('network.proxyMode', C.NETWORK, 'Proxy mode', 'enum', 'system', {
    options: [
      { value: 'system', label: 'System' },
      { value: 'direct', label: 'Direct' },
      { value: 'custom', label: 'Custom PAC / rules' },
    ],
    description: 'How NewTube resolves HTTP proxies',
    restart: true,
  }),
  S('network.customProxy', C.NETWORK, 'Custom proxy string', 'string', '', {
    description: 'e.g. http://127.0.0.1:8080 — only if proxy mode is custom',
    restart: true,
  }),
  S('network.userAgentProfile', C.NETWORK, 'Device profile (UA)', 'enum', 'smarttv_tizen', {
    options: [
      { value: 'smarttv_tizen', label: 'Samsung Tizen TV' },
      { value: 'smarttv_webos', label: 'LG webOS TV' },
      { value: 'smarttv_bravia', label: 'Sony BRAVIA' },
      { value: 'smarttv_viera', label: 'Panasonic VIERA' },
      { value: 'chromecast', label: 'Chromecast' },
      { value: 'appletv', label: 'Apple TV (web)' },
      { value: 'desktop_chrome', label: 'Desktop Chrome' },
      { value: 'custom', label: 'Custom UA string' },
    ],
    description: 'Spoof a living-room device so YouTube serves the TV app',
    restart: true,
  }),
  S('network.customUserAgent', C.NETWORK, 'Custom user agent', 'string', '', {
    description: 'Used when Device profile is Custom',
    restart: true,
  }),
  S('network.tvEntryUrl', C.NETWORK, 'TV entry URL', 'string', 'https://www.youtube.com/tv', {
    description: 'Landing URL for the YouTube TV experience',
    restart: true,
  }),

  // ═══════════════════════════════════════════════════════════
  // PERFORMANCE (113–126)
  // ═══════════════════════════════════════════════════════════
  S('perf.processPriority', C.PERFORMANCE, 'Process priority', 'enum', 'high', {
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'above_normal', label: 'Above normal' },
      { value: 'high', label: 'High' },
    ],
    description: 'Windows process priority for smoother playback',
  }),
  S('perf.backgroundThrottling', C.PERFORMANCE, 'Background throttling', 'boolean', false, {
    description: 'When off, timers stay responsive while unfocused',
    restart: true,
  }),
  S('perf.diskCacheSizeMb', C.PERFORMANCE, 'Disk cache size', 'number', 1024, {
    min: 64, max: 8192, step: 64, unit: 'MB', description: 'HTTP disk cache budget',
    restart: true,
  }),
  S('perf.useD3d11', C.PERFORMANCE, 'Use D3D11 (Windows)', 'boolean', true, {
    description: 'ANGLE D3D11 backend — usually fastest for video on Windows',
    restart: true,
  }),
  S('perf.memoryCacheMb', C.PERFORMANCE, 'Memory cache target', 'number', 256, {
    min: 64, max: 2048, step: 32, unit: 'MB', description: 'Soft target for in-memory resource cache',
  }),
  S('perf.gpuRasterization', C.PERFORMANCE, 'GPU rasterization', 'boolean', true, {
    description: 'Rasterize layers on the GPU',
    restart: true,
  }),
  S('perf.zeroCopy', C.PERFORMANCE, 'Zero-copy video (when available)', 'boolean', true, {
    description: 'Reduce copies between decoder and compositor',
    restart: true,
  }),
  S('perf.disableSmoothScrolling', C.PERFORMANCE, 'Disable smooth scrolling (perf)', 'boolean', false, {
    description: 'Instant scroll steps for lower CPU on weak machines',
  }),
  S('perf.rendererProcessLimit', C.PERFORMANCE, 'Renderer process limit', 'number', 1, {
    min: 1, max: 8, step: 1, description: 'Keep low for a single TV shell',
    restart: true,
  }),
  S('perf.enableNativeGpuMemoryBuffers', C.PERFORMANCE, 'Native GPU memory buffers', 'boolean', true, {
    description: 'Chromium flag for efficient GPU buffers',
    restart: true,
  }),
  S('perf.ignoreGpuBlocklist', C.PERFORMANCE, 'Ignore GPU blocklist', 'boolean', true, {
    description: 'Enable GPU video decode on more drivers (recommended)',
    restart: true,
  }),
  S('perf.quitOnGpuCrash', C.PERFORMANCE, 'Recover from GPU crash', 'boolean', true, {
    description: 'Reload the player if the GPU process dies',
  }),
  S('perf.lowPowerMode', C.PERFORMANCE, 'Low power mode', 'boolean', false, {
    description: 'Cap FPS, lower quality bias, dim ambient effects',
  }),
  S('perf.performanceOverlay', C.PERFORMANCE, 'Show performance overlay', 'boolean', false, {
    description: 'FPS / memory corner meter',
  }),
  S('perf.collectMetrics', C.PERFORMANCE, 'Collect local metrics', 'boolean', true, {
    description: 'Store anonymous local session stats for the overlay',
  }),

  // ═══════════════════════════════════════════════════════════
  // APPEARANCE (127–140)
  // ═══════════════════════════════════════════════════════════
  S('appearance.showSplash', C.APPEARANCE, 'Show splash screen', 'boolean', true, {
    description: 'Branded NewTube splash while YouTube TV loads',
  }),
  S('appearance.splashDurationMs', C.APPEARANCE, 'Min splash duration', 'number', 300, {
    min: 0, max: 5000, step: 100, unit: 'ms', description: 'Minimum time the splash stays visible',
  }),
  S('appearance.splashStyle', C.APPEARANCE, 'Splash style', 'enum', 'cinematic', {
    options: [
      { value: 'cinematic', label: 'Cinematic' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'neon', label: 'Neon pulse' },
      { value: 'classic', label: 'Classic red' },
    ],
    description: 'Splash animation personality',
  }),
  S('appearance.loadingSpinner', C.APPEARANCE, 'Loading spinner style', 'enum', 'ring', {
    options: [
      { value: 'ring', label: 'Ring' },
      { value: 'dots', label: 'Dots' },
      { value: 'bars', label: 'Equalizer bars' },
      { value: 'none', label: 'None' },
    ],
    description: 'In-app loading indicator style',
  }),
  S('appearance.cornerRadius', C.APPEARANCE, 'Window corner radius', 'range', 12, {
    min: 0, max: 24, step: 1, unit: 'px', description: 'Rounded corners when not fullscreen',
  }),
  S('appearance.shadows', C.APPEARANCE, 'Window shadows', 'boolean', true, {
    description: 'Drop shadow on the framed window',
  }),
  S('appearance.settingsBlur', C.APPEARANCE, 'Settings panel blur', 'range', 24, {
    min: 0, max: 40, step: 2, unit: 'px', description: 'Backdrop blur behind the settings drawer',
  }),
  S('appearance.settingsWidth', C.APPEARANCE, 'Settings panel width', 'number', 420, {
    min: 320, max: 720, step: 10, unit: 'px', description: 'Width of the settings side panel',
  }),
  S('appearance.toastPosition', C.APPEARANCE, 'Toast position', 'enum', 'bottom', {
    options: [
      { value: 'top', label: 'Top' },
      { value: 'bottom', label: 'Bottom' },
      { value: 'top-right', label: 'Top right' },
      { value: 'bottom-right', label: 'Bottom right' },
    ],
    description: 'Where ephemeral toasts appear',
  }),
  S('appearance.toastDurationMs', C.APPEARANCE, 'Toast duration', 'number', 2200, {
    min: 800, max: 8000, step: 100, unit: 'ms', description: 'How long toasts stay on screen',
  }),
  S('appearance.reduceTransparency', C.APPEARANCE, 'Reduce transparency', 'boolean', false, {
    description: 'Solid panels instead of glass for readability',
  }),
  S('appearance.customCss', C.APPEARANCE, 'Custom CSS injection', 'string', '', {
    description: 'Advanced: extra CSS applied to the shell UI (not YouTube page by default)',
  }),
  S('appearance.injectCssIntoTv', C.APPEARANCE, 'Allow CSS on TV page', 'boolean', false, {
    description: 'When on, custom CSS is also injected into the YouTube TV document',
  }),
  S('appearance.uiScaleSettings', C.APPEARANCE, 'Settings UI scale', 'range', 100, {
    min: 85, max: 140, step: 5, unit: '%', description: 'Scale only the NewTube settings interface',
  }),

  // ═══════════════════════════════════════════════════════════
  // THEME (141–152)
  // ═══════════════════════════════════════════════════════════
  S('theme.mode', C.THEME, 'Theme mode', 'enum', 'dark', {
    options: [
      { value: 'dark', label: 'Dark' },
      { value: 'oled', label: 'OLED pure black' },
      { value: 'midnight', label: 'Midnight blue' },
      { value: 'carbon', label: 'Carbon gray' },
      { value: 'light', label: 'Light' },
      { value: 'system', label: 'Follow Windows' },
    ],
    description: 'Base palette for NewTube chrome',
  }),
  S('theme.accent', C.THEME, 'Accent color', 'color', '#FF0033', {
    description: 'Primary accent — play red by default',
  }),
  S('theme.accentSecondary', C.THEME, 'Secondary accent', 'color', '#FF4D6D', {
    description: 'Highlights and gradients',
  }),
  S('theme.focusRing', C.THEME, 'Focus ring color', 'color', '#FFFFFF', {
    description: 'Keyboard / controller focus outline',
  }),
  S('theme.fontFamily', C.THEME, 'UI font', 'enum', 'inter', {
    options: [
      { value: 'inter', label: 'Inter' },
      { value: 'segoe', label: 'Segoe UI' },
      { value: 'system', label: 'System UI' },
      { value: 'roboto', label: 'Roboto' },
      { value: 'mono', label: 'JetBrains Mono' },
    ],
    description: 'Typography for settings and overlays',
  }),
  S('theme.fontWeight', C.THEME, 'Heading weight', 'enum', '600', {
    options: [
      { value: '500', label: 'Medium' },
      { value: '600', label: 'Semibold' },
      { value: '700', label: 'Bold' },
      { value: '800', label: 'Extra bold' },
    ],
    description: 'Weight used for section titles',
  }),
  S('theme.iconStyle', C.THEME, 'Icon style', 'enum', 'duotone', {
    options: [
      { value: 'duotone', label: 'Duotone' },
      { value: 'outline', label: 'Outline' },
      { value: 'solid', label: 'Solid' },
    ],
    description: 'Category icons in settings',
  }),
  S('theme.gradientHeader', C.THEME, 'Gradient headers', 'boolean', true, {
    description: 'Soft gradient on settings category headers',
  }),
  S('theme.animatedAccent', C.THEME, 'Animated accent glow', 'boolean', true, {
    description: 'Subtle breathing glow on primary actions',
  }),
  S('theme.highContrast', C.THEME, 'High contrast mode', 'boolean', false, {
    description: 'Boost borders and text contrast system-wide in shell',
  }),
  S('theme.customBg', C.THEME, 'Custom background color', 'color', '#0A0A0B', {
    description: 'Shell background behind the TV view',
  }),
  S('theme.borderIntensity', C.THEME, 'Border intensity', 'range', 40, {
    min: 0, max: 100, step: 5, unit: '%', description: 'How visible panel borders are',
  }),

  // ═══════════════════════════════════════════════════════════
  // HUD (153–164)
  // ═══════════════════════════════════════════════════════════
  S('hud.enabled', C.HUD, 'Enable HUD', 'boolean', true, {
    description: 'Master switch for NewTube on-screen info',
  }),
  S('hud.showClock', C.HUD, 'Show clock', 'boolean', false, {
    description: 'Corner clock while browsing or watching',
  }),
  S('hud.clockFormat', C.HUD, 'Clock format', 'enum', 'local24', {
    options: [
      { value: 'local12', label: '12-hour' },
      { value: 'local24', label: '24-hour' },
      { value: 'iso', label: 'ISO time' },
    ],
    description: 'Time display format',
  }),
  S('hud.clockPosition', C.HUD, 'Clock position', 'enum', 'top-right', {
    options: [
      { value: 'top-left', label: 'Top left' },
      { value: 'top-right', label: 'Top right' },
      { value: 'bottom-left', label: 'Bottom left' },
      { value: 'bottom-right', label: 'Bottom right' },
    ],
    description: 'Where the clock sits',
  }),
  S('hud.showNetworkStatus', C.HUD, 'Network status pill', 'boolean', true, {
    description: 'Tiny online/offline indicator',
  }),
  S('hud.showControllerHint', C.HUD, 'Controller button hints', 'boolean', true, {
    description: 'Show context button prompts when a pad is active',
  }),
  S('hud.showFps', C.HUD, 'Show FPS', 'boolean', false, {
    description: 'Frames-per-second counter',
  }),
  S('hud.showResolution', C.HUD, 'Show window resolution', 'boolean', false, {
    description: 'Display current render size',
  }),
  S('hud.opacity', C.HUD, 'HUD opacity', 'range', 85, {
    min: 30, max: 100, step: 5, unit: '%', description: 'Transparency of HUD elements',
  }),
  S('hud.autoHide', C.HUD, 'Auto-hide HUD', 'boolean', true, {
    description: 'Fade HUD after idle during playback',
  }),
  S('hud.autoHideDelayMs', C.HUD, 'HUD auto-hide delay', 'number', 4000, {
    min: 1000, max: 20000, step: 500, unit: 'ms', description: 'Idle time before HUD fades',
  }),
  S('hud.scale', C.HUD, 'HUD scale', 'range', 100, {
    min: 75, max: 150, step: 5, unit: '%', description: 'Size of HUD text and pills',
  }),

  // ═══════════════════════════════════════════════════════════
  // STARTUP (165–174)
  // ═══════════════════════════════════════════════════════════
  S('startup.launchOnLogin', C.STARTUP, 'Launch with Windows', 'boolean', false, {
    description: 'Start NewTube when you sign in to Windows',
  }),
  S('startup.startMinimized', C.STARTUP, 'Start minimized to tray', 'boolean', false, {
    description: 'Boot into the tray without showing a window',
  }),
  S('startup.singleInstance', C.STARTUP, 'Single instance only', 'boolean', true, {
    description: 'Focus existing NewTube instead of opening a second copy',
  }),
  S('startup.clearCacheOnLaunch', C.STARTUP, 'Clear cache on launch', 'boolean', false, {
    description: 'Wipe HTTP cache every start (slower, cleaner)',
  }),
  S('startup.hardwareCheck', C.STARTUP, 'Startup hardware check', 'boolean', true, {
    description: 'Quick GPU/audio readiness probe before loading TV',
  }),
  S('startup.welcomeTips', C.STARTUP, 'Show welcome tips', 'boolean', true, {
    description: 'First-run and occasional tips for power features',
  }),
  S('startup.restoreSession', C.STARTUP, 'Restore browsing session', 'boolean', true, {
    description: 'Reload last TV URL when safe',
  }),
  S('startup.deepLinkProtocol', C.STARTUP, 'Register newtube:// links', 'boolean', true, {
    description: 'Open newtube://watch?v=… style links in this app',
    restart: true,
  }),
  S('startup.crashRecovery', C.STARTUP, 'Crash recovery', 'boolean', true, {
    description: 'Offer to restore after an unexpected exit',
  }),
  S('startup.verboseLogging', C.STARTUP, 'Verbose startup log', 'boolean', false, {
    description: 'Write detailed boot logs for troubleshooting',
  }),

  // ═══════════════════════════════════════════════════════════
  // BEHAVIOR (175–186)
  // ═══════════════════════════════════════════════════════════
  S('behavior.closeToTray', C.BEHAVIOR, 'Close goes to tray', 'boolean', true, {
    description: 'X button hides to tray instead of quitting',
  }),
  S('behavior.trayIcon', C.BEHAVIOR, 'Show tray icon', 'boolean', true, {
    description: 'Keep NewTube in the system tray',
  }),
  S('behavior.preventDisplaySleep', C.BEHAVIOR, 'Prevent display sleep', 'boolean', true, {
    description: 'Keep the screen awake while playing',
  }),
  S('behavior.preventSystemSleep', C.BEHAVIOR, 'Prevent system sleep', 'boolean', true, {
    description: 'Stop the PC sleeping during active playback',
  }),
  S('behavior.idleDetection', C.BEHAVIOR, 'Idle detection', 'boolean', true, {
    description: 'Detect long idle periods for power-saving actions',
  }),
  S('behavior.idleMinutes', C.BEHAVIOR, 'Idle timeout', 'number', 30, {
    min: 5, max: 180, step: 5, unit: 'min', description: 'Minutes of idle before power actions',
  }),
  S('behavior.idleAction', C.BEHAVIOR, 'Idle action', 'enum', 'dim', {
    options: [
      { value: 'none', label: 'Do nothing' },
      { value: 'dim', label: 'Dim overlay' },
      { value: 'pause', label: 'Pause playback' },
      { value: 'exit_fullscreen', label: 'Exit fullscreen' },
    ],
    description: 'What happens after idle timeout',
  }),
  S('behavior.focusFollowsMouse', C.BEHAVIOR, 'Focus follows mouse', 'boolean', false, {
    description: 'Raise focus when the pointer enters the window',
  }),
  S('behavior.confirmQuit', C.BEHAVIOR, 'Confirm quit', 'boolean', false, {
    description: 'Always ask before fully quitting',
  }),
  S('behavior.doubleEscQuit', C.BEHAVIOR, 'Double Esc to quit', 'boolean', false, {
    description: 'Press Esc twice quickly to exit the app (off by default)',
  }),
  S('behavior.kioskMode', C.BEHAVIOR, 'Kiosk mode', 'boolean', false, {
    description: 'Lock down chrome for dedicated HTPC / wall TV PCs',
    restart: true,
  }),
  S('behavior.fullscreenExclusive', C.BEHAVIOR, 'Exclusive fullscreen', 'boolean', false, {
    description: 'Prefer exclusive fullscreen over borderless when possible',
  }),

  // ═══════════════════════════════════════════════════════════
  // PRIVACY (187–196)
  // ═══════════════════════════════════════════════════════════
  S('privacy.clearCookiesOnExit', C.PRIVACY, 'Clear cookies on exit', 'boolean', false, {
    description: 'Remove session cookies when NewTube quits',
  }),
  S('privacy.clearCacheOnExit', C.PRIVACY, 'Clear cache on exit', 'boolean', false, {
    description: 'Flush disk cache on quit',
  }),
  S('privacy.partition', C.PRIVACY, 'Session partition', 'enum', 'persist:newtube', {
    options: [
      { value: 'persist:newtube', label: 'Persistent (signed-in stays)' },
      { value: 'persist:newtube-guest', label: 'Guest persistent' },
      { value: 'temp:newtube', label: 'Temporary (clears each run)' },
    ],
    description: 'Where Chromium stores cookies and local data',
    restart: true,
  }),
  S('privacy.blockThirdPartyCookies', C.PRIVACY, 'Block third-party cookies', 'boolean', false, {
    description: 'Stricter cookie policy for non-YouTube origins',
    restart: true,
  }),
  S('privacy.doNotTrack', C.PRIVACY, 'Send DNT header', 'boolean', true, {
    description: 'Request Do Not Track on navigations',
  }),
  S('privacy.spellcheck', C.PRIVACY, 'Spellcheck', 'boolean', false, {
    description: 'Browser spellcheck on text fields',
  }),
  S('privacy.permissionsAutoDeny', C.PRIVACY, 'Auto-deny extra permissions', 'boolean', true, {
    description: 'Deny mic/camera/geo unless you explicitly allow',
  }),
  S('privacy.allowNotifications', C.PRIVACY, 'Allow site notifications', 'boolean', false, {
    description: 'Let YouTube request OS notifications',
  }),
  S('privacy.sandbox', C.PRIVACY, 'Renderer sandbox', 'boolean', true, {
    description: 'Keep Chromium sandbox enabled (recommended)',
    restart: true,
  }),
  S('privacy.incognitoLaunch', C.PRIVACY, 'Launch in private partition', 'boolean', false, {
    description: 'Use temporary storage for this session only',
    restart: true,
  }),

  // ═══════════════════════════════════════════════════════════
  // ACCESSIBILITY (197–206)
  // ═══════════════════════════════════════════════════════════
  S('a11y.alwaysShowCaptions', C.ACCESSIBILITY, 'Prefer captions on', 'boolean', false, {
    description: 'Bias toward enabling captions when YouTube exposes the control',
  }),
  S('a11y.captionFontScale', C.ACCESSIBILITY, 'Caption size bias', 'range', 100, {
    min: 75, max: 200, step: 5, unit: '%', description: 'Scale preference for readable captions',
  }),
  S('a11y.highContrastFocus', C.ACCESSIBILITY, 'High-contrast focus', 'boolean', true, {
    description: 'Thicker, brighter focus rings',
  }),
  S('a11y.reduceMotion', C.ACCESSIBILITY, 'Reduce motion', 'boolean', false, {
    description: 'Cut non-essential animations in the shell',
  }),
  S('a11y.screenReaderHints', C.ACCESSIBILITY, 'Screen reader hints', 'boolean', true, {
    description: 'Richer ARIA labels on NewTube controls',
  }),
  S('a11y.keyboardOnly', C.ACCESSIBILITY, 'Keyboard-only mode', 'boolean', false, {
    description: 'Optimize focus order and skip pointer-first patterns',
  }),
  S('a11y.colorBlindMode', C.ACCESSIBILITY, 'Color vision assist', 'enum', 'none', {
    options: [
      { value: 'none', label: 'None' },
      { value: 'protanopia', label: 'Protanopia' },
      { value: 'deuteranopia', label: 'Deuteranopia' },
      { value: 'tritanopia', label: 'Tritanopia' },
    ],
    description: 'Shell palette adjustments for color vision differences',
  }),
  S('a11y.largeHitTargets', C.ACCESSIBILITY, 'Large hit targets', 'boolean', false, {
    description: 'Bigger clickable areas in settings and HUD',
  }),
  S('a11y.stickyKeysFriendly', C.ACCESSIBILITY, 'Sticky-keys friendly', 'boolean', true, {
    description: 'Avoid requiring difficult multi-key chords',
  }),
  S('a11y.narrateToasts', C.ACCESSIBILITY, 'Narrate toasts', 'boolean', false, {
    description: 'Expose toast text to accessibility APIs',
  }),

  // ═══════════════════════════════════════════════════════════
  // NOTIFICATIONS (207–214)
  // ═══════════════════════════════════════════════════════════
  S('notify.enabled', C.NOTIFICATIONS, 'Enable notifications', 'boolean', true, {
    description: 'Master switch for NewTube toasts and OS notices',
  }),
  S('notify.sound', C.NOTIFICATIONS, 'Notification sounds', 'boolean', false, {
    description: 'Play a soft sound with toasts',
  }),
  S('notify.updateAvailable', C.NOTIFICATIONS, 'Update notices', 'boolean', true, {
    description: 'Tell you when a NewTube update is ready',
  }),
  S('notify.controllerEvents', C.NOTIFICATIONS, 'Controller events', 'boolean', true, {
    description: 'Toasts for connect / disconnect',
  }),
  S('notify.networkEvents', C.NOTIFICATIONS, 'Network events', 'boolean', true, {
    description: 'Toasts for online / offline',
  }),
  S('notify.playbackEvents', C.NOTIFICATIONS, 'Playback events', 'boolean', false, {
    description: 'Toasts for play / pause from media keys',
  }),
  S('notify.quietHours', C.NOTIFICATIONS, 'Quiet hours', 'boolean', false, {
    description: 'Suppress non-critical toasts at night',
  }),
  S('notify.quietHoursRange', C.NOTIFICATIONS, 'Quiet hours range', 'string', '22:00-08:00', {
    description: 'Local time range for quiet hours (HH:MM-HH:MM)',
  }),

  // ═══════════════════════════════════════════════════════════
  // CACHE (215–222)
  // ═══════════════════════════════════════════════════════════
  S('cache.autoClean', C.CACHE, 'Auto-clean cache', 'boolean', true, {
    description: 'Periodically prune stale cache entries',
  }),
  S('cache.autoCleanDays', C.CACHE, 'Auto-clean older than', 'number', 14, {
    min: 1, max: 90, step: 1, unit: 'days', description: 'Age threshold for automatic cleanup',
  }),
  S('cache.maxTotalMb', C.CACHE, 'Max total cache', 'number', 2048, {
    min: 128, max: 16384, step: 128, unit: 'MB', description: 'Hard ceiling for on-disk cache',
  }),
  S('cache.mediaCache', C.CACHE, 'Allow media cache', 'boolean', true, {
    description: 'Let Chromium cache media segments when it chooses',
  }),
  S('cache.imageCache', C.CACHE, 'Allow image cache', 'boolean', true, {
    description: 'Cache thumbnails and UI images',
  }),
  S('cache.showUsageInSettings', C.CACHE, 'Show cache usage', 'boolean', true, {
    description: 'Display approximate cache size in Storage settings',
  }),
  S('cache.warnWhenLarge', C.CACHE, 'Warn when cache is large', 'boolean', true, {
    description: 'Toast when cache exceeds 80% of the max budget',
  }),
  S('cache.compactOnExit', C.CACHE, 'Compact on exit', 'boolean', false, {
    description: 'Attempt cache compaction during shutdown',
  }),

  // ═══════════════════════════════════════════════════════════
  // SHORTCUTS (223–234)
  // ═══════════════════════════════════════════════════════════
  S('shortcut.settings', C.SHORTCUTS, 'Open settings', 'hotkey', 'Control+,', {
    description: 'Toggle the NewTube settings panel',
  }),
  S('shortcut.fullscreen', C.SHORTCUTS, 'Toggle fullscreen', 'hotkey', 'F11', {
    description: 'Enter or leave fullscreen',
  }),
  S('shortcut.home', C.SHORTCUTS, 'Go home', 'hotkey', 'Alt+Home', {
    description: 'Navigate to YouTube TV home',
  }),
  S('shortcut.reload', C.SHORTCUTS, 'Reload TV app', 'hotkey', 'Control+R', {
    description: 'Hard-reload the YouTube TV document',
  }),
  S('shortcut.devTools', C.SHORTCUTS, 'Toggle DevTools', 'hotkey', 'Control+Shift+I', {
    description: 'Open Chromium DevTools (power users)',
  }),
  S('shortcut.mute', C.SHORTCUTS, 'Mute', 'hotkey', 'Control+M', {
    description: 'Toggle mute',
  }),
  S('shortcut.volumeUp', C.SHORTCUTS, 'Volume up', 'hotkey', 'Control+Up', {
    description: 'Raise master volume',
  }),
  S('shortcut.volumeDown', C.SHORTCUTS, 'Volume down', 'hotkey', 'Control+Down', {
    description: 'Lower master volume',
  }),
  S('shortcut.screenshot', C.SHORTCUTS, 'Screenshot', 'hotkey', 'Control+Shift+S', {
    description: 'Capture the current frame to Pictures/NewTube',
  }),
  S('shortcut.pip', C.SHORTCUTS, 'Picture-in-picture window', 'hotkey', 'Control+Shift+P', {
    description: 'Shrink to a compact always-on-top player window',
  }),
  S('shortcut.quit', C.SHORTCUTS, 'Quit NewTube', 'hotkey', 'Control+Q', {
    description: 'Fully exit the application',
  }),
  S('shortcut.commandPalette', C.SHORTCUTS, 'Command palette', 'hotkey', 'Control+K', {
    description: 'Open the quick command palette',
  }),
  S('shortcut.newPlayer', C.SHORTCUTS, 'New multi player', 'hotkey', 'Control+Shift+N', {
    description: 'Open another floating video player window',
  }),
  S('shortcut.multiDesk', C.SHORTCUTS, 'Open Multi Desk panel', 'hotkey', 'Control+Shift+M', {
    description: 'Show the multi-player manager in the main window',
  }),
  S('shortcut.tilePlayers', C.SHORTCUTS, 'Tile multi players', 'hotkey', 'Control+Shift+T', {
    description: 'Tile all multi-player windows on the current monitor',
  }),

  // ═══════════════════════════════════════════════════════════
  // SESSION (235–242)
  // ═══════════════════════════════════════════════════════════
  S('session.profileName', C.SESSION, 'Profile name', 'string', 'Default', {
    description: 'Label for this NewTube profile',
  }),
  S('session.autoSignInHint', C.SESSION, 'Show sign-in tip', 'boolean', true, {
    description: 'Gentle tip if you appear signed out of YouTube',
  }),
  S('session.multiProfile', C.SESSION, 'Enable multi-profile switcher', 'boolean', false, {
    description: 'Prepare UI for switching persistent partitions',
    restart: true,
  }),
  S('session.saveLastUrl', C.SESSION, 'Save last URL', 'boolean', true, {
    description: 'Remember the last TV URL for restore',
  }),
  S('session.maxHistoryEntries', C.SESSION, 'In-app history depth', 'number', 50, {
    min: 0, max: 500, step: 10, description: 'How many local navigations to keep for back/forward',
  }),
  S('session.watchLaterQuick', C.SESSION, 'Quick Watch Later tip', 'boolean', true, {
    description: 'Show a tip for Watch Later the first few sessions',
  }),
  S('session.exportSettingsOnChange', C.SESSION, 'Auto-export settings backup', 'boolean', false, {
    description: 'Write a backup JSON when settings change',
  }),
  S('session.cloudSyncPlaceholder', C.SESSION, 'Cloud sync (local only for now)', 'boolean', false, {
    description: 'Reserved for future encrypted settings sync — currently local only',
  }),

  // ═══════════════════════════════════════════════════════════
  // INTEGRATIONS (243–250)
  // ═══════════════════════════════════════════════════════════
  S('integrations.discordRpc', C.INTEGRATIONS, 'Discord Rich Presence', 'boolean', false, {
    description: 'Show “Watching on NewTube” in Discord when enabled',
  }),
  S('integrations.discordDetail', C.INTEGRATIONS, 'Discord detail text', 'string', 'YouTube TV', {
    description: 'Secondary line for Discord presence',
  }),
  S('integrations.windowsMediaSession', C.INTEGRATIONS, 'Windows media session', 'boolean', true, {
    description: 'Expose play state to Windows SMTC / media flyout when possible',
  }),
  S('integrations.nowPlayingOverlay', C.INTEGRATIONS, 'Now-playing mini overlay', 'boolean', false, {
    description: 'Floating title chip when available from page metadata',
  }),
  S('integrations.obsFriendly', C.INTEGRATIONS, 'OBS-friendly capture mode', 'boolean', false, {
    description: 'Avoid exclusive fullscreen so game capture stays happy',
  }),
  S('integrations.screenshotFolder', C.INTEGRATIONS, 'Screenshot folder', 'string', '', {
    description: 'Empty = Pictures/NewTube; or set a full path',
  }),
  S('integrations.openLinksExternally', C.INTEGRATIONS, 'Open external links outside', 'boolean', true, {
    description: 'http(s) links that leave YouTube open in your default browser',
  }),
  S('integrations.clipboardWatch', C.INTEGRATIONS, 'Clipboard YouTube URL watch', 'boolean', false, {
    description: 'Offer to open copied YouTube links in NewTube',
  }),

  // ═══════════════════════════════════════════════════════════
  // ADVANCED (251–262)
  // ═══════════════════════════════════════════════════════════
  S('advanced.devtoolsAllowed', C.ADVANCED, 'Allow DevTools', 'boolean', true, {
    description: 'Permit opening Chromium DevTools',
  }),
  S('advanced.ignoreCertificateErrors', C.ADVANCED, 'Ignore certificate errors', 'boolean', false, {
    description: 'Dangerous — only for local debugging',
    restart: true,
  }),
  S('advanced.extraChromiumFlags', C.ADVANCED, 'Extra Chromium flags', 'string', '', {
    description: 'Space-separated flags (advanced; can break startup)',
    restart: true,
  }),
  S('advanced.disableGpuSandbox', C.ADVANCED, 'Disable GPU sandbox', 'boolean', false, {
    description: 'Workaround for rare GPU sandbox failures',
    restart: true,
  }),
  S('advanced.autoplayPolicy', C.ADVANCED, 'Autoplay policy', 'enum', 'no-user-gesture-required', {
    options: [
      { value: 'no-user-gesture-required', label: 'Allow without gesture' },
      { value: 'user-gesture-required', label: 'Require gesture' },
      { value: 'document-user-activation-required', label: 'Document activation' },
    ],
    description: 'Chromium autoplay policy for media',
    restart: true,
  }),
  S('advanced.lang', C.ADVANCED, 'Accept-Language', 'string', 'en-US,en', {
    description: 'Language header preference',
    restart: true,
  }),
  S('advanced.timezoneOverride', C.ADVANCED, 'Timezone override', 'string', '', {
    description: 'Empty = system; e.g. America/New_York',
    restart: true,
  }),
  S('advanced.logLevel', C.ADVANCED, 'Log level', 'enum', 'info', {
    options: [
      { value: 'error', label: 'Error' },
      { value: 'warn', label: 'Warn' },
      { value: 'info', label: 'Info' },
      { value: 'debug', label: 'Debug' },
    ],
    description: 'Verbosity of NewTube logs',
  }),
  S('advanced.openLogFolder', C.ADVANCED, 'Show “Open log folder” action', 'boolean', true, {
    description: 'Expose a button to open the logs directory',
  }),
  S('advanced.resetConfirm', C.ADVANCED, 'Require confirm to reset settings', 'boolean', true, {
    description: 'Extra step before wiping all settings',
  }),
  S('advanced.betaChannel', C.ADVANCED, 'Prefer beta updates', 'boolean', false, {
    description: 'Opt into pre-release update channel when available',
  }),
  S('advanced.telemetry', C.ADVANCED, 'Anonymous diagnostics', 'boolean', false, {
    description: 'Off by default — reserved; currently no data leaves your PC',
  }),

  // ═══════════════════════════════════════════════════════════
  // EXPERIMENTAL (263–272)
  // ═══════════════════════════════════════════════════════════
  S('experimental.webviewPreloadBoost', C.EXPERIMENTAL, 'Aggressive preload boost', 'boolean', false, {
    description: 'Start warming the TV origin earlier in boot',
  }),
  S('experimental.pictureInPictureNative', C.EXPERIMENTAL, 'Native PiP experiments', 'boolean', false, {
    description: 'Try OS-level picture-in-picture APIs',
  }),
  S('experimental.touchOptimized', C.EXPERIMENTAL, 'Touch-optimized chrome', 'boolean', false, {
    description: 'Larger UI for tablets / touchscreen HTPCs',
  }),
  S('experimental.gestureNav', C.EXPERIMENTAL, 'Trackpad gesture nav', 'boolean', true, {
    description: 'Two-finger back/forward when the OS reports it',
  }),
  S('experimental.ambientExtract', C.EXPERIMENTAL, 'Live ambient color extract', 'boolean', false, {
    description: 'Sample video colors for ambient mode (CPU cost)',
  }),
  S('experimental.aiSummarizeTips', C.EXPERIMENTAL, 'Smart tips engine', 'boolean', true, {
    description: 'Context tips based on which settings you use most',
  }),
  S('experimental.remoteControlPort', C.EXPERIMENTAL, 'Local remote control port', 'number', 0, {
    min: 0, max: 65535, step: 1, description: '0 = off; otherwise localhost HTTP remote API',
    restart: true,
  }),
  S('experimental.multiViewPlaceholder', C.EXPERIMENTAL, 'Multi-view shell (preview)', 'boolean', false, {
    description: 'Scaffold for future dual-player layout — incomplete',
  }),
  S('experimental.cssFilterPipeline', C.EXPERIMENTAL, 'Advanced filter pipeline', 'boolean', false, {
    description: 'Brightness/contrast/saturation on video (OFF by default — costs GPU)',
  }),
  S('experimental.smoothSeekPreview', C.EXPERIMENTAL, 'Smooth seek HUD', 'boolean', true, {
    description: 'Animated seek feedback when using NewTube seek keys',
  }),
];

function getDefaults() {
  const out = {};
  for (const s of SETTINGS) out[s.id] = s.default;
  return out;
}

function getByCategory(categoryId) {
  return SETTINGS.filter((s) => s.category === categoryId);
}

function getSetting(id) {
  return SETTINGS.find((s) => s.id === id);
}

module.exports = {
  C,
  CATEGORIES,
  SETTINGS,
  getDefaults,
  getByCategory,
  getSetting,
  COUNT: SETTINGS.length,
};
