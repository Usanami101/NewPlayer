/**
 * NewFile — smart file manager backend.
 * Senses file types, organizes, search, real FS ops via Node.
 * User data path is never touched for app settings — only user-chosen folders.
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const { shell, app } = require('electron');
const crypto = require('crypto');

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico', '.heic', '.tif', '.tiff', '.raw']);
const VIDEO = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v', '.flv', '.mpeg', '.mpg', '.3gp']);
const AUDIO = new Set(['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus', '.aiff']);
const DOC = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.csv', '.md']);
const ARCHIVE = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso']);
const CODE = new Set(['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.php', '.html', '.css', '.json', '.xml', '.yml', '.yaml', '.sql', '.sh', '.ps1', '.rb', '.swift', '.kt']);
const EXE = new Set(['.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.msix', '.appx']);

function classify(name, isDir) {
  if (isDir) return 'folders';
  const ext = path.extname(name).toLowerCase();
  if (IMAGE.has(ext)) return 'images';
  if (VIDEO.has(ext)) return 'videos';
  if (AUDIO.has(ext)) return 'audio';
  if (DOC.has(ext)) return 'documents';
  if (ARCHIVE.has(ext)) return 'archives';
  if (CODE.has(ext)) return 'code';
  if (EXE.has(ext)) return 'programs';
  return 'other';
}

function roots() {
  const home = os.homedir();
  const list = [
    { id: 'home', label: 'Home', path: home },
    { id: 'desktop', label: 'Desktop', path: path.join(home, 'Desktop') },
    { id: 'documents', label: 'Documents', path: path.join(home, 'Documents') },
    { id: 'downloads', label: 'Downloads', path: path.join(home, 'Downloads') },
    { id: 'pictures', label: 'Pictures', path: path.join(home, 'Pictures') },
    { id: 'music', label: 'Music', path: path.join(home, 'Music') },
    { id: 'videos', label: 'Videos', path: path.join(home, 'Videos') },
  ];
  if (process.platform === 'win32') {
    for (const letter of 'CDEFGHIJ') {
      const p = `${letter}:\\`;
      try {
        if (fs.existsSync(p)) list.push({ id: `drive-${letter}`, label: `${letter}:`, path: p });
      } catch {
        /* ignore */
      }
    }
  }
  return list.filter((r) => {
    try {
      return fs.existsSync(r.path);
    } catch {
      return false;
    }
  });
}

async function listDir(dirPath) {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) throw new Error('Path not found');
  const entries = await fsp.readdir(resolved, { withFileTypes: true });
  const items = [];
  for (const ent of entries) {
    if (ent.name === '.' || ent.name === '..') continue;
    // skip heavy system noise at drive root
    if (ent.name.startsWith('$') || ent.name === 'System Volume Information') continue;
    const full = path.join(resolved, ent.name);
    let stat;
    try {
      stat = await fsp.stat(full);
    } catch {
      continue;
    }
    const isDir = ent.isDirectory();
    items.push({
      name: ent.name,
      path: full,
      isDir,
      size: isDir ? 0 : stat.size,
      mtime: stat.mtimeMs,
      category: classify(ent.name, isDir),
      ext: isDir ? '' : path.extname(ent.name).toLowerCase(),
    });
  }
  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return { path: resolved, parent: path.dirname(resolved), items };
}

async function senseFolder(dirPath, { maxFiles = 4000, maxDepth = 4 } = {}) {
  const resolved = path.resolve(dirPath);
  const counts = {
    folders: 0,
    images: 0,
    videos: 0,
    audio: 0,
    documents: 0,
    archives: 0,
    code: 0,
    programs: 0,
    other: 0,
    total: 0,
    bytes: 0,
  };
  const samples = {
    images: [],
    videos: [],
    audio: [],
    documents: [],
    archives: [],
    code: [],
    programs: [],
    other: [],
  };
  const recent = [];
  const large = [];
  const nameIndex = new Map(); // lowercase base -> paths (dup sensing)
  let scanned = 0;

  async function walk(dir, depth) {
    if (scanned >= maxFiles || depth > maxDepth) return;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (scanned >= maxFiles) break;
      if (ent.name.startsWith('.') || ent.name.startsWith('$')) continue;
      if (['node_modules', 'System Volume Information', 'Windows', 'Program Files', 'Program Files (x86)'].includes(ent.name) && depth > 0) {
        if (ent.name === 'Windows' || ent.name.startsWith('Program')) continue;
      }
      const full = path.join(dir, ent.name);
      let stat;
      try {
        stat = await fsp.stat(full);
      } catch {
        continue;
      }
      if (ent.isDirectory()) {
        counts.folders++;
        await walk(full, depth + 1);
      } else {
        scanned++;
        counts.total++;
        counts.bytes += stat.size;
        const cat = classify(ent.name, false);
        counts[cat] = (counts[cat] || 0) + 1;
        if (samples[cat] && samples[cat].length < 8) {
          samples[cat].push({ name: ent.name, path: full, size: stat.size, mtime: stat.mtimeMs });
        }
        recent.push({ name: ent.name, path: full, size: stat.size, mtime: stat.mtimeMs, category: cat });
        large.push({ name: ent.name, path: full, size: stat.size, mtime: stat.mtimeMs, category: cat });
        const base = path.basename(ent.name, path.extname(ent.name)).toLowerCase();
        if (!nameIndex.has(base)) nameIndex.set(base, []);
        nameIndex.get(base).push(full);
      }
    }
  }

  await walk(resolved, 0);
  recent.sort((a, b) => b.mtime - a.mtime);
  large.sort((a, b) => b.size - a.size);
  const duplicates = [];
  for (const [base, paths] of nameIndex) {
    if (paths.length > 1 && base.length > 2) {
      duplicates.push({ name: base, paths: paths.slice(0, 6), count: paths.length });
    }
  }
  duplicates.sort((a, b) => b.count - a.count);

  // Suggested smart layout
  const organizePlan = Object.entries(counts)
    .filter(([k, v]) => !['total', 'bytes', 'folders'].includes(k) && v > 0)
    .map(([category, count]) => ({
      category,
      count,
      suggestedFolder: path.join(resolved, '_NewFile_Organized', category.charAt(0).toUpperCase() + category.slice(1)),
    }));

  return {
    path: resolved,
    counts,
    samples,
    recent: recent.slice(0, 40),
    large: large.slice(0, 25),
    duplicates: duplicates.slice(0, 30),
    organizePlan,
    scanned,
  };
}

async function applyOrganize(dirPath, { dryRun = true } = {}) {
  const sense = await senseFolder(dirPath, { maxFiles: 5000, maxDepth: 3 });
  const moves = [];
  const base = path.join(path.resolve(dirPath), '_NewFile_Organized');
  // Only organize top-level files in dirPath (safer)
  const listing = await listDir(dirPath);
  for (const item of listing.items) {
    if (item.isDir) continue;
    if (item.name.startsWith('_NewFile_')) continue;
    const cat = item.category;
    const destDir = path.join(base, cat.charAt(0).toUpperCase() + cat.slice(1));
    const dest = path.join(destDir, item.name);
    moves.push({ from: item.path, to: dest, category: cat });
  }
  if (!dryRun) {
    for (const m of moves) {
      await fsp.mkdir(path.dirname(m.to), { recursive: true });
      // avoid overwrite
      let target = m.to;
      let i = 1;
      while (fs.existsSync(target)) {
        const ext = path.extname(m.to);
        const stem = path.basename(m.to, ext);
        target = path.join(path.dirname(m.to), `${stem} (${i})${ext}`);
        i++;
      }
      await fsp.rename(m.from, target);
      m.to = target;
    }
  }
  return { dryRun, moves, senseCounts: sense.counts };
}

async function searchFiles(dirPath, query, { max = 200 } = {}) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];
  const results = [];
  async function walk(dir, depth) {
    if (results.length >= max || depth > 5) return;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (results.length >= max) break;
      if (ent.name.startsWith('$') || ent.name === 'node_modules') continue;
      const full = path.join(dir, ent.name);
      if (ent.name.toLowerCase().includes(q)) {
        let stat = null;
        try {
          stat = await fsp.stat(full);
        } catch {
          /* ignore */
        }
        results.push({
          name: ent.name,
          path: full,
          isDir: ent.isDirectory(),
          size: stat && !ent.isDirectory() ? stat.size : 0,
          mtime: stat ? stat.mtimeMs : 0,
          category: classify(ent.name, ent.isDirectory()),
        });
      }
      if (ent.isDirectory() && depth < 5) await walk(full, depth + 1);
    }
  }
  await walk(path.resolve(dirPath), 0);
  return results;
}

async function openPath(p) {
  const r = await shell.openPath(path.resolve(p));
  if (r) throw new Error(r);
  return true;
}

async function showInFolder(p) {
  shell.showItemInFolder(path.resolve(p));
  return true;
}

async function createFolder(parent, name) {
  const dest = path.join(path.resolve(parent), name);
  await fsp.mkdir(dest, { recursive: false });
  return dest;
}

async function renamePath(oldPath, newName) {
  const dest = path.join(path.dirname(oldPath), newName);
  await fsp.rename(oldPath, dest);
  return dest;
}

async function deletePath(p) {
  // Move to trash when possible
  try {
    await shell.trashItem(path.resolve(p));
    return { trashed: true };
  } catch {
    const st = await fsp.stat(p);
    if (st.isDirectory()) await fsp.rm(p, { recursive: true, force: true });
    else await fsp.unlink(p);
    return { trashed: false };
  }
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

module.exports = {
  roots,
  listDir,
  senseFolder,
  applyOrganize,
  searchFiles,
  openPath,
  showInFolder,
  createFolder,
  renamePath,
  deletePath,
  classify,
  formatBytes,
  userDataHint: () => app.getPath('userData'),
};
