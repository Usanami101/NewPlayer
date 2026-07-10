/**
 * Stage a clean, professional release folder for distribution.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'release');

fs.mkdirSync(out, { recursive: true });

// Clear previous staged binaries but keep README.txt
for (const name of fs.readdirSync(out)) {
  if (name.toLowerCase().endsWith('.exe') || name.toLowerCase().endsWith('.blockmap')) {
    fs.unlinkSync(path.join(out, name));
  }
}

const wanted = [
  { match: /^NewPlayer-Setup-.*\.exe$/i, label: 'Installer' },
  { match: /^NewPlayer-Portable-.*\.exe$/i, label: 'Portable' },
  { match: /^NewTube-Setup-.*\.exe$/i, label: 'Installer (legacy)' },
  { match: /^NewTube-Portable-.*\.exe$/i, label: 'Portable (legacy)' },
];

const found = [];
for (const file of fs.readdirSync(dist)) {
  const full = path.join(dist, file);
  if (!fs.statSync(full).isFile()) continue;
  for (const w of wanted) {
    if (w.match.test(file)) {
      const dest = path.join(out, file);
      fs.copyFileSync(full, dest);
      const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1);
      found.push({ file, label: w.label, mb });
      console.log(`staged ${w.label}: ${file} (${mb} MB)`);
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ver = pkg.version;

// Always refresh release README for the current version
fs.writeFileSync(
  path.join(out, 'README.txt'),
  [
    '══════════════════════════════════════════════════════════════',
    `  NewPlayer  v${ver}`,
    '  NewTube · NewTV · NewRadio · NewWeather · New(s) · NewFile · NewTalk',
    '══════════════════════════════════════════════════════════════',
    '',
    'UPDATE (keeps your data)',
    `  Run:  NewPlayer-Setup-${ver}-x64.exe`,
    '  Install over your existing NewPlayer install.',
    '  Settings, favorites, and NewTalk data stay in AppData.',
    '',
    'https://github.com/Usanami101/NewPlayer',
    '',
  ].join('\r\n'),
  'utf8'
);

// Write a simple version stamp
fs.writeFileSync(
  path.join(out, 'VERSION.txt'),
  `NewPlayer ${ver}\r\nBuilt: ${new Date().toISOString()}\r\n\r\n` +
    found.map((f) => `${f.label}: ${f.file} (${f.mb} MB)`).join('\r\n') +
    '\r\n',
  'utf8'
);

console.log('\nRelease folder ready:', out);
if (!found.length) {
  console.error('No installer/portable artifacts found in dist/. Run npm run build first.');
  process.exitCode = 1;
}
