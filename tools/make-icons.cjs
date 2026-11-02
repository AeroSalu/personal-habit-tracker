// Draws the app icon to PNGs with no dependencies: node tools/make-icons.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [17, 19, 24];
const ACCENT = [163, 230, 53];

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Coverage of the mark at a point in 0..1 space: a ring around a check, inside the
// maskable safe zone.
function isMark(x, y) {
  const r = Math.hypot(x - 0.5, y - 0.5);
  if (r > 0.3 && r < 0.36) return true;
  const stroke = 0.04;
  return segmentDistance(x, y, 0.37, 0.51, 0.46, 0.6) < stroke ||
    segmentDistance(x, y, 0.46, 0.6, 0.64, 0.41) < stroke;
}

function pixels(size) {
  const samples = 4;
  const rows = Buffer.alloc((size * 3 + 1) * size);
  let at = 0;
  for (let y = 0; y < size; y += 1) {
    rows[at++] = 0;
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let i = 0; i < samples; i += 1) {
        for (let j = 0; j < samples; j += 1) {
          if (isMark((x + (i + 0.5) / samples) / size, (y + (j + 0.5) / samples) / size)) hits += 1;
        }
      }
      const share = hits / (samples * samples);
      for (let c = 0; c < 3; c += 1) rows[at++] = Math.round(BG[c] + (ACCENT[c] - BG[c]) * share);
    }
  }
  return rows;
}

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(pixels(size))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

[180, 192, 512].forEach((size) => {
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'icons', 'icon-' + size + '.png'), png(size));
});
