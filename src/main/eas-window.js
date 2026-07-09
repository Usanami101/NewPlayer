/**
 * Full-screen TV-style EAS (Emergency Alert System) takeover window.
 * Shows real NWS alert text with authentic dual-tone attention signal (853+960 Hz).
 */

const path = require('path');
const { BrowserWindow, screen } = require('electron');

let easWin = null;
let currentAlert = null;

function isOpen() {
  return !!(easWin && !easWin.isDestroyed());
}

function getCurrent() {
  return currentAlert;
}

/**
 * Open EAS takeover on the display that has the cursor / primary.
 * @param {object} alert - NWS alert object
 * @param {object} [opts]
 */
function showEAS(alert, opts = {}) {
  if (!alert) return null;
  currentAlert = alert;

  const display =
    screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) ||
    screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  if (easWin && !easWin.isDestroyed()) {
    easWin.webContents.send('eas:show', { alert, opts });
    easWin.setBounds({ x, y, width, height });
    easWin.setFullScreen(true);
    easWin.show();
    easWin.focus();
    easWin.moveTop();
    return easWin;
  }

  easWin = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    backgroundColor: '#000000',
    title: 'EMERGENCY ALERT SYSTEM',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-eas.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  // Highest always-on-top level so it covers games/video
  try {
    easWin.setAlwaysOnTop(true, 'screen-saver');
  } catch {
    easWin.setAlwaysOnTop(true);
  }
  easWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  easWin.setMenuBarVisibility(false);

  easWin.once('ready-to-show', () => {
    easWin.setFullScreen(true);
    easWin.show();
    easWin.focus();
    easWin.moveTop();
    easWin.webContents.send('eas:show', { alert, opts });
  });

  easWin.on('closed', () => {
    easWin = null;
    currentAlert = null;
  });

  // Block accidental Alt+F4 during mandatory hold for Extreme/Severe
  easWin.on('close', (e) => {
    if (easWin && easWin.__easLocked) {
      e.preventDefault();
      easWin.webContents.send('eas:deny-close');
    }
  });

  easWin.loadFile(path.join(__dirname, '../renderer/eas.html'));
  return easWin;
}

function setLocked(locked) {
  if (easWin && !easWin.isDestroyed()) {
    easWin.__easLocked = !!locked;
  }
}

function closeEAS(force = false) {
  if (!easWin || easWin.isDestroyed()) {
    currentAlert = null;
    return;
  }
  if (easWin.__easLocked && !force) {
    easWin.webContents.send('eas:deny-close');
    return;
  }
  easWin.__easLocked = false;
  try {
    easWin.close();
  } catch {
    try {
      easWin.destroy();
    } catch {
      /* ignore */
    }
  }
  easWin = null;
  currentAlert = null;
}

function destroy() {
  closeEAS(true);
}

module.exports = {
  showEAS,
  closeEAS,
  setLocked,
  isOpen,
  getCurrent,
  destroy,
};
