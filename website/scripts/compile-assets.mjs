import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const publicDir = join(process.cwd(), 'public');
mkdirSync(publicDir, { recursive: true });

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function rgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    255,
  ];
}

function inRoundedRect(x, y, rectX, rectY, rectW, rectH, radius) {
  const cx = Math.max(rectX + radius, Math.min(x, rectX + rectW - radius));
  const cy = Math.max(rectY + radius, Math.min(y, rectY + rectH - radius));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function createPng(width, height, colorAt) {
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = colorAt((x + 0.5) / width, (y + 0.5) / height);
      const offset = row + 1 + x * 4;
      raw[offset] = pixel[0];
      raw[offset + 1] = pixel[1];
      raw[offset + 2] = pixel[2];
      raw[offset + 3] = pixel[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    pngSignature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND'),
  ]);
}

function createIconPng(size) {
  const bgTop = rgb('#111418');
  const bgBottom = rgb('#070a10');
  const panel = rgb('#f5f1e7');
  const green = rgb('#46a67e');
  const red = rgb('#d85842');
  const ink = rgb('#111418');

  return createPng(size, size, (x, y) => {
    let color = mix(bgTop, bgBottom, y);

    const panelX = 0.18;
    const panelY = 0.24;
    const panelW = 0.64;
    const panelH = 0.42;
    if (inRoundedRect(x, y, panelX, panelY, panelW, panelH, 0.095)) color = panel;

    const d1 = Math.hypot(x - 0.39, y - 0.43);
    const d2 = Math.hypot(x - 0.61, y - 0.43);
    if (d1 <= 0.095) color = green;
    if (d2 <= 0.095) color = red;

    if (inRoundedRect(x, y, 0.32, 0.56, 0.36, 0.045, 0.02)) color = ink;
    return color;
  });
}

const manifest = {
  name: 'EntranceKit',
  short_name: 'EntranceKit',
  description:
    'Build a local React app entrance from an MP4 or PNG asset and copy a self-contained AppEntrance component.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#111418',
  theme_color: '#111418',
  icons: [
    {
      src: './icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: './icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

const ogImage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="EntranceKit social preview">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#151922" />
      <stop offset="1" stop-color="#070a10" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#64b3f4" />
      <stop offset="1" stop-color="#4fb88a" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="72" y="72" width="1056" height="486" rx="44" fill="#111418" stroke="#2d3441" stroke-width="2" />
  <g transform="translate(778 148)">
    <rect x="0" y="0" width="286" height="180" rx="28" fill="#f5f1e7" />
    <circle cx="110" cy="80" r="40" fill="#46a67e" />
    <circle cx="184" cy="80" r="40" fill="#d85842" />
    <rect x="76" y="126" width="134" height="14" rx="7" fill="#111418" />
  </g>
  <circle cx="932" cy="414" r="92" fill="url(#accent)" opacity=".18" />
  <text x="128" y="238" fill="#f7f4ee" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="82" font-weight="800">EntranceKit</text>
  <text x="132" y="310" fill="#b8c0cc" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="34" font-weight="500">Turn an MP4 or PNG into a self-contained app entrance.</text>
  <text x="132" y="386" fill="#f7f4ee" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">Upload. Tune. Preview. Copy AppEntrance.tsx.</text>
</svg>
`;

writeFileSync(join(publicDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(publicDir, 'apple-touch-icon.png'), createIconPng(180));
writeFileSync(join(publicDir, 'icon-192.png'), createIconPng(192));
writeFileSync(join(publicDir, 'icon-512.png'), createIconPng(512));
writeFileSync(join(publicDir, 'og-image.svg'), ogImage);

console.log('Compiled website public assets.');
