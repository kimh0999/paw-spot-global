/**
 * `src/app/favicon.ico`를 브랜드 마크에서 생성한다.
 *
 * 도형과 색은 `src/components/brand/PawSpotMark.tsx`와 `src/app/globals.css`의
 * 토큰에서 그대로 옮겼다. **마크를 고치면 이 값도 함께 고치고 다시 실행한다.**
 * 바이너리 자산을 손으로 만들지 않기 위한 스크립트이며 빌드에는 관여하지 않는다.
 *
 *   node scripts/generate-favicon.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// PawSpotMark의 viewBox 24×24 좌표계를 그대로 쓴다.
const VIEWBOX = 24;
/** 핀 머리. path의 곡선을 같은 크기의 원으로 읽는다. */
const PIN_HEAD = { cx: 12, cy: 9.4, r: 7.2 };
/** 핀 끝. path가 내려오는 지점이다. */
const PIN_TIP = { x: 12, y: 21.6 };
/** 발바닥 — 핀 안쪽을 뚫어 배경이 비치게 한다. */
const PAW = [
  { cx: 12, cy: 11.6, rx: 3.1, ry: 2.6 },
  { cx: 8.5, cy: 7.9, rx: 1.35, ry: 1.35 },
  { cx: 11.2, cy: 6.7, rx: 1.35, ry: 1.35 },
  { cx: 14.1, cy: 7.2, rx: 1.35, ry: 1.35 },
  { cx: 16.1, cy: 9.6, rx: 1.2, ry: 1.2 },
];

// globals.css --color-primary / --color-surface
const PIN_COLOR = [0x3e, 0x32, 0x72];
const PAW_COLOR = [0xff, 0xff, 0xff];

/** 핀 끝에서 머리 원에 그은 두 접선의 접점. 이 둘과 끝점이 핀의 삼각형이다. */
function tangentPoints() {
  const dy = PIN_TIP.y - PIN_HEAD.cy;
  const d = Math.abs(dy);
  const cos = PIN_HEAD.r / d;
  const sin = Math.sqrt(1 - cos * cos);
  return [
    { x: PIN_HEAD.cx + PIN_HEAD.r * sin, y: PIN_HEAD.cy + PIN_HEAD.r * cos },
    { x: PIN_HEAD.cx - PIN_HEAD.r * sin, y: PIN_HEAD.cy + PIN_HEAD.r * cos },
  ];
}

const [T1, T2] = tangentPoints();

function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function inTriangle(x, y) {
  const d1 = sign(x, y, PIN_TIP.x, PIN_TIP.y, T1.x, T1.y);
  const d2 = sign(x, y, T1.x, T1.y, T2.x, T2.y);
  const d3 = sign(x, y, T2.x, T2.y, PIN_TIP.x, PIN_TIP.y);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inPin(x, y) {
  const dx = x - PIN_HEAD.cx;
  const dy = y - PIN_HEAD.cy;
  if (dx * dx + dy * dy <= PIN_HEAD.r * PIN_HEAD.r) return true;
  return inTriangle(x, y);
}

function inPaw(x, y) {
  return PAW.some(({ cx, cy, rx, ry }) => {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  });
}

/** 4×4 supersampling. 도형이 작아 계단이 그대로 보이므로 가장자리를 부드럽게 만든다. */
const SAMPLES = 4;

function renderRgba(size) {
  const data = Buffer.alloc(size * size * 4);
  const step = VIEWBOX / size / SAMPLES;
  const offset = step / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let pinHits = 0;
      let pawHits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px * VIEWBOX) / size + sx * step + offset;
          const y = (py * VIEWBOX) / size + sy * step + offset;
          if (!inPin(x, y)) continue;
          pinHits++;
          if (inPaw(x, y)) pawHits++;
        }
      }

      const total = SAMPLES * SAMPLES;
      const i = (py * size + px) * 4;
      if (pinHits === 0) continue;

      // 발바닥 비율만큼 흰색을 섞는다. 핀 밖에서는 발바닥을 그리지 않는다.
      const pawRatio = pawHits / pinHits;
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(PIN_COLOR[c] * (1 - pawRatio) + PAW_COLOR[c] * pawRatio);
      }
      data[i + 3] = Math.round((pinHits / total) * 255);
    }
  }
  return data;
}

// --- PNG ---
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** PNG를 담은 ICO. 모든 최신 브라우저가 읽는 형식이다. */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const images = [16, 32, 48].map((size) => ({
  size,
  png: encodePng(size, renderRgba(size)),
}));

writeFileSync("src/app/favicon.ico", encodeIco(images));
console.log(
  "src/app/favicon.ico 생성 —",
  images.map((i) => `${i.size}x${i.size}`).join(", "),
);
