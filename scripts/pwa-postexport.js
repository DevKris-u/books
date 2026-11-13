#!/usr/bin/env node
// Skrypt uruchamiany po `npx expo export --platform web`.
// Kopiuje zasoby PWA z public/ do dist/ i wstrzykuje linki do index.html.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const ASSETS = path.join(ROOT, 'assets');
const DIST = path.join(ROOT, 'dist');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function injectManifestLink(html) {
  const tags = [
    '<link rel="manifest" href="/manifest.json" />',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '<meta name="theme-color" content="#12332B" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="Margines" />',
  ]
    .filter((tag) => !html.includes(tag))
    .join('\n');
  if (!tags) return html;
  return html.replace('</head>', tags + '\n</head>');
}

function setLanguage(html) {
  if (/<html[^>]*\blang=/.test(html)) {
    return html.replace(/<html([^>]*?)\blang="[^"]*"/, '<html$1lang="pl"');
  }
  return html.replace('<html', '<html lang="pl"');
}

function injectServiceWorker(html) {
  const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
        });
      }
    </script>
  `;
  if (html.includes('serviceWorker')) return html;
  return html.replace('</body>', swScript + '</body>');
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ nie istnieje — uruchom najpierw `npx expo export --platform web`.');
  process.exit(1);
}

// 1. Skopiuj zasoby PWA z public/ do dist/
if (fs.existsSync(PUBLIC)) {
  for (const entry of fs.readdirSync(PUBLIC)) {
    copyRecursive(path.join(PUBLIC, entry), path.join(DIST, entry));
  }
  console.log('Skopiowano zasoby PWA z public/ do dist/');
} else {
  console.warn('Katalog public/ nie istnieje — pomijam kopiowanie.');
}

// 2. Skopiuj assets (ikony, splash) do dist/assets/
if (fs.existsSync(ASSETS)) {
  copyRecursive(ASSETS, path.join(DIST, 'assets'));
  console.log('Skopiowano assets/ do dist/assets/');
} else {
  console.warn('Katalog assets/ nie istnieje — pomijam kopiowanie.');
}

// 3. Wstrzyknij linki do wszystkich plików HTML w dist/
// (przy web.output: "single" jest tylko index.html; przy "static"
// każda trasa ma własny plik HTML — wtedy też musi mieć manifest).
function findHtmlFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

const htmlFiles = findHtmlFiles(DIST);
for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  html = setLanguage(html);
  html = injectManifestLink(html);
  html = injectServiceWorker(html);
  fs.writeFileSync(file, html);
}

console.log(
  `Wstrzyknięto manifest, metatagi PWA i service worker do ${htmlFiles.length} plik(ów) HTML`
);
console.log('PWA gotowe.');
