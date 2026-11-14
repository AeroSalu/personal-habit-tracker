// Draws the app icon to PNGs with no dependencies: node tools/make-icons.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [14, 15, 18];
const EDGE = [42, 46, 140];
const TOP = [180, 184, 255];
const MID = [124, 131, 255];
const LOW = [79, 86, 232];
const CHECK = [236, 237, 239];

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// The mark in 0..1 space, inside the maskable safe zone: an indigo ring lit from the top left
// over a deeper extruded edge offset down and right, which reads as a 3D ring, plus a light
// check on the front. Returns a color, or null for background.
function colorAt(x, y) {
  const ring = (cx, cy) => {
    const r = Math.hypot(x - cx, y - cy);
    return r > 0.3 && r < 0.36;
  };
  const check =
    segmentDistance(x, y, 0.37, 0.51, 0.46, 0.6) < 0.04 || segmentDistance(x, y, 0.46, 0.6, 0.64, 0.41) < 0.04;
  if (check) return CHECK;
  if (ring(0.5, 0.5)) {
    const t = Math.max(0, Math.min(1, (x + y - 0.2) / 1.6));
    return t < 0.5 ? mix(TOP, MID, t * 2) : mix(MID, LOW, (t - 0.5) * 2);
  }
  for (let k = 1; k <= 4; k += 1) if (ring(0.5 + k * 0.006, 0.5 + k * 0.009)) return EDGE;
  return null;
}

function pixels(size) {
  const samples = 4;
  const rows = Buffer.alloc((size * 3 + 1) * size);
  let at = 0;
  for (let y = 0; y < size; y += 1) {
    rows[at++] = 0;
    for (let x = 0; x < size; x += 1) {
      const sum = [0, 0, 0];
      for (let i = 0; i < samples; i += 1) {
        for (let j = 0; j < samples; j += 1) {
          const c = colorAt((x + (i + 0.5) / samples) / size, (y + (j + 0.5) / samples) / size) || BG;
          for (let k = 0; k < 3; k += 1) sum[k] += c[k];
        }
      }
      for (let c = 0; c < 3; c += 1) rows[at++] = Math.round(sum[c] / (samples * samples));
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
