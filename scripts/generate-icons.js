#!/usr/bin/env node
// Generuje ikony PNG dla PWA bez zależności zewnętrznych.
// Geometria odpowiada assets/icon.svg: zaokrąglony kwadrat w kolorze
// marki + monoline "M" (cztery pociągnięcia, grubość 128, zaokrąglone końce).
//
// Uruchomienie: npm run icons

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CANVAS = 1024;
const BG = [0x12, 0x33, 0x2b];
const FG = [0xff, 0xff, 0xff];
const RADIUS = 220;
const HALF_STROKE = 64;

// Pociągnięcia litery "M" w układzie 1024x1024.
const SEGMENTS = [
  [320, 300, 320, 724], // lewa pionowa
  [320, 300, 512, 600], // lewy skos
  [512, 600, 704, 300], // prawy skos
  [704, 300, 704, 724], // prawa pionowa
];

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared ? ((px - x1) * dx + (py - y1) * dy) / lengthSquared : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function insideRoundedSquare(px, py, size, radius) {
  if (px < 0 || py < 0 || px > size || py > size) return false;
  const cx = Math.min(Math.max(px, radius), size - radius);
  const cy = Math.min(Math.max(py, radius), size - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function scaleSegments(scale) {
  return SEGMENTS.map(([x1, y1, x2, y2]) => [
    (x1 - CANVAS / 2) * scale + CANVAS / 2,
    (y1 - CANVAS / 2) * scale + CANVAS / 2,
    (x2 - CANVAS / 2) * scale + CANVAS / 2,
    (y2 - CANVAS / 2) * scale + CANVAS / 2,
  ]);
}

// fullBleed: pełne tło bez zaokrągleń (maskable / apple-touch-icon).
// glyphOnly: przezroczyste tło, tylko biały glif (adaptive icon Androida).
// scale: pomniejszenie glifu, by zmieścił się w bezpiecznej strefie maski.
function renderIcon(size, { fullBleed = false, glyphOnly = false, scale = 1 } = {}) {
  const samples = 3;
  const segments = scaleSegments(scale);
  const stroke = HALF_STROKE * scale;
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let backgroundHits = 0;
      let glyphHits = 0;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = ((px + (sx + 0.5) / samples) / size) * CANVAS;
          const y = ((py + (sy + 0.5) / samples) / size) * CANVAS;

          const inBackground =
            glyphOnly || fullBleed || insideRoundedSquare(x, y, CANVAS, RADIUS);
          if (!inBackground) continue;
          backgroundHits++;

          for (const [x1, y1, x2, y2] of segments) {
            if (distanceToSegment(x, y, x1, y1, x2, y2) <= stroke) {
              glyphHits++;
              break;
            }
          }
        }
      }

      const total = samples * samples;
      const offset = (py * size + px) * 4;

      if (glyphOnly) {
        pixels[offset] = FG[0];
        pixels[offset + 1] = FG[1];
        pixels[offset + 2] = FG[2];
        pixels[offset + 3] = Math.round((255 * glyphHits) / total);
        continue;
      }

      if (backgroundHits === 0) {
        pixels[offset + 3] = 0;
        continue;
      }

      const glyphRatio = glyphHits / backgroundHits;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.round(
          BG[channel] + (FG[channel] - BG[channel]) * glyphRatio
        );
      }
      pixels[offset + 3] = Math.round((255 * backgroundHits) / total);
    }
  }

  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filtr: brak
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bitów na kanał
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const OUTPUT = [
  { file: 'public/icon-192.png', size: 192, options: {} },
  { file: 'public/icon-512.png', size: 512, options: {} },
  { file: 'public/icon-maskable-512.png', size: 512, options: { fullBleed: true, scale: 0.78 } },
  { file: 'public/apple-touch-icon.png', size: 180, options: { fullBleed: true, scale: 0.82 } },
  { file: 'assets/icon.png', size: 1024, options: {} },
  { file: 'assets/splash-icon.png', size: 1024, options: { fullBleed: true } },
  { file: 'assets/adaptive-icon.png', size: 1024, options: { glyphOnly: true, scale: 0.62 } },
  { file: 'assets/favicon.png', size: 64, options: {} },
];

const root = process.cwd();
for (const { file, size, options } of OUTPUT) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const png = encodePng(size, renderIcon(size, options));
  fs.writeFileSync(target, png);
  console.log(`${file} — ${size}x${size}, ${(png.length / 1024).toFixed(1)} KB`);
}
console.log('Ikony PWA wygenerowane.');
