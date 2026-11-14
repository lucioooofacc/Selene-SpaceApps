#!/usr/bin/env node
/**
 * Genera los mapas de elevación de la pestaña MAPA DE CALOR (UI-11, DEC-024)
 * a partir del DEM LOLA del CGI Moon Kit de NASA SVS.
 *
 * Entrada: ldem_16.tif (https://svs.gsfc.nasa.gov/4720/), 5760×2880,
 *   float32 sin compresión, elevación en km respecto de un radio de
 *   1737,4 km, equirectangular centrado en 0° de longitud (16 px por grado).
 *
 * Salida (no se sube el .tif, solo lo derivado):
 *   web/public/nasa/lola_polar_1024.png   polo sur hasta −60°, azimutal
 *       equidistante con 0° arriba (la misma proyección que map.js).
 *   web/public/nasa/lola_global_2048.png  globo equirectangular 2048×1024.
 *   web/src/data/lola-maps.js             rangos, proyección y procedencia.
 *
 * Cada PNG es RGB: R = elevación cuantizada a 8 bits entre minKm y maxKm,
 * G = sombreado del relieve (hillshade, luz desde el noroeste a 45°, relieve
 * exagerado ×Z_FACTOR solo para el sombreado), B = 255 (dato válido) o 0.
 * El color lo aplica el navegador (src/ui/elevation.js), así cambia con la
 * paleta para daltonismo.
 *
 * Uso:  node web/scripts/build-lola-maps.mjs /ruta/a/ldem_16.tif
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";

const MOON_RADIUS_KM = 1737.4;
const POLAR_EDGE_LAT = -60;
const POLAR_SIZE = 1024;
const GLOBAL_W = 2048;
const GLOBAL_H = 1024;
const Z_FACTOR = 4; // exageración vertical SOLO para el sombreado
const LOW_PCT = 0.01; // percentiles para el rango de color
const HIGH_PCT = 0.99;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input) {
  console.error("Uso: node web/scripts/build-lola-maps.mjs /ruta/a/ldem_16.tif");
  process.exit(1);
}

// ---------- Lectura del TIFF (float32, sin compresión, una tira por fila) ----------
function readTiff(path) {
  const buf = readFileSync(path);
  const le = buf.toString("latin1", 0, 2) === "II";
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const ifd = u32(4);
  const tags = {};
  for (let i = 0, n = u16(ifd); i < n; i++) {
    const e = ifd + 2 + i * 12;
    const type = u16(e + 2);
    const count = u32(e + 4);
    const size = type === 3 ? 2 : 4;
    const at = count * size > 4 ? u32(e + 8) : e + 8;
    const read = (k) => (type === 3 ? u16(at + k * 2) : u32(at + k * 4));
    tags[u16(e)] = count === 1 ? read(0) : { count, read };
  }
  const width = tags[256];
  const height = tags[257];
  if (tags[259] !== 1 || tags[258] !== 32 || tags[339] !== 3) {
    throw new Error("Se esperaba float32 sin compresión (ldem_16.tif del CGI Moon Kit).");
  }
  const data = new Float32Array(width * height);
  const offsets = tags[273];
  for (let y = 0; y < height; y++) {
    const off = offsets.count ? offsets.read(y) : offsets + y * width * 4;
    for (let x = 0; x < width; x++) {
      data[y * width + x] = le ? buf.readFloatLE(off + x * 4) : buf.readFloatBE(off + x * 4);
    }
  }
  return { width, height, data, sha256: createHash("sha256").update(buf).digest("hex") };
}

// Interpolación bilineal en la grilla equirectangular (longitud con vuelta).
function sampler({ width, height, data }) {
  return (lat, lon) => {
    const fx = ((lon + 180) / 360) * width - 0.5;
    const fy = Math.min(height - 1, Math.max(0, ((90 - lat) / 180) * height - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const X = (x) => ((x % width) + width) % width;
    const y1 = Math.min(height - 1, y0 + 1);
    const a = data[y0 * width + X(x0)];
    const b = data[y0 * width + X(x0 + 1)];
    const c = data[y1 * width + X(x0)];
    const d = data[y1 * width + X(x0 + 1)];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
}

// ---------- Sombreado (fórmula clásica de hillshade, luz NO a 45°) ----------
function hillshade(elev, w, h, cellX, cellY, valid) {
  const out = new Uint8Array(w * h);
  const zen = (45 * Math.PI) / 180;
  const az = ((360 - 315 + 90) * Math.PI) / 180;
  const at = (x, y) => elev[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    const cx = cellX(y);
    for (let x = 0; x < w; x++) {
      if (valid && !valid[y * w + x]) continue;
      const [a, b, c, d, f, g, hh, i] = [
        at(x - 1, y - 1), at(x, y - 1), at(x + 1, y - 1),
        at(x - 1, y), at(x + 1, y),
        at(x - 1, y + 1), at(x, y + 1), at(x + 1, y + 1),
      ];
      const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * cx);
      const dzdy = (g + 2 * hh + i - (a + 2 * b + c)) / (8 * cellY);
      const slope = Math.atan(Z_FACTOR * Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const v = Math.cos(zen) * Math.cos(slope) + Math.sin(zen) * Math.sin(slope) * Math.cos(az - aspect);
      out[y * w + x] = Math.round(255 * Math.max(0, v));
    }
  }
  return out;
}

function percentileRange(values) {
  const sorted = Float32Array.from(values).sort();
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  // Redondeo hacia afuera a medio km para que la leyenda sea legible.
  return { minKm: Math.floor(pick(LOW_PCT) * 2) / 2, maxKm: Math.ceil(pick(HIGH_PCT) * 2) / 2 };
}

// ---------- PNG RGB de 8 bits (zlib nativo) ----------
function writePng(path, w, h, rgb) {
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type, "latin1"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(tb));
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // sin filtro
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  return png.length;
}

function pack(elev, shade, valid, range) {
  const rgb = new Uint8Array(elev.length * 3);
  const span = range.maxKm - range.minKm;
  for (let i = 0; i < elev.length; i++) {
    if (valid && !valid[i]) continue;
    rgb[i * 3] = Math.round(255 * Math.min(1, Math.max(0, (elev[i] - range.minKm) / span)));
    rgb[i * 3 + 1] = shade[i];
    rgb[i * 3 + 2] = 255;
  }
  return rgb;
}

// ---------- Proceso ----------
const dem = readTiff(input);
console.log(`DEM ${dem.width}×${dem.height}, SHA-256 ${dem.sha256}`);
const sample = sampler(dem);

// Polo sur: azimutal equidistante hasta POLAR_EDGE_LAT, 0° arriba (map.js / polar2d.js).
const span = 90 + POLAR_EDGE_LAT;
const polar = new Float32Array(POLAR_SIZE * POLAR_SIZE);
const polarValid = new Uint8Array(POLAR_SIZE * POLAR_SIZE);
const polarValues = [];
for (let y = 0; y < POLAR_SIZE; y++) {
  for (let x = 0; x < POLAR_SIZE; x++) {
    const dx = (x + 0.5) / POLAR_SIZE - 0.5;
    const dy = (y + 0.5) / POLAR_SIZE - 0.5;
    const r = Math.hypot(dx, dy) * 2;
    if (r > 1) continue;
    const v = sample(-90 + r * span, (Math.atan2(dx, -dy) * 180) / Math.PI);
    polar[y * POLAR_SIZE + x] = v;
    polarValid[y * POLAR_SIZE + x] = 1;
    polarValues.push(v);
  }
}
const polarCellKm = ((span * Math.PI) / 180) * MOON_RADIUS_KM / (POLAR_SIZE / 2);
const polarRange = percentileRange(polarValues);
const polarShade = hillshade(polar, POLAR_SIZE, POLAR_SIZE, () => polarCellKm, polarCellKm, polarValid);
const polarBytes = writePng(
  resolve(root, "public/nasa/lola_polar_1024.png"),
  POLAR_SIZE,
  POLAR_SIZE,
  pack(polar, polarShade, polarValid, polarRange),
);

// Globo: equirectangular 2048×1024.
const global = new Float32Array(GLOBAL_W * GLOBAL_H);
for (let y = 0; y < GLOBAL_H; y++) {
  const lat = 90 - ((y + 0.5) / GLOBAL_H) * 180;
  for (let x = 0; x < GLOBAL_W; x++) global[y * GLOBAL_W + x] = sample(lat, ((x + 0.5) / GLOBAL_W) * 360 - 180);
}
const globalRange = percentileRange(global);
const cellY = (Math.PI * MOON_RADIUS_KM) / GLOBAL_H;
const cellX = (y) => {
  const lat = 90 - ((y + 0.5) / GLOBAL_H) * 180;
  return Math.max(0.05, Math.cos((lat * Math.PI) / 180)) * ((2 * Math.PI * MOON_RADIUS_KM) / GLOBAL_W);
};
const globalShade = hillshade(global, GLOBAL_W, GLOBAL_H, cellX, cellY, null);
const globalBytes = writePng(
  resolve(root, "public/nasa/lola_global_2048.png"),
  GLOBAL_W,
  GLOBAL_H,
  pack(global, globalShade, null, globalRange),
);

const meta = {
  source: {
    name: "NASA SVS CGI Moon Kit — ldem_16.tif (LOLA)",
    url: "https://svs.gsfc.nasa.gov/4720/",
    sha256: dem.sha256,
    units: "km respecto de un radio de 1737,4 km",
  },
  zFactor: Z_FACTOR,
  polar: { file: "./nasa/lola_polar_1024.png", size: POLAR_SIZE, edgeLat: POLAR_EDGE_LAT, cellKm: Number(polarCellKm.toFixed(3)), ...polarRange },
  global: { file: "./nasa/lola_global_2048.png", width: GLOBAL_W, height: GLOBAL_H, ...globalRange },
};
writeFileSync(
  resolve(root, "src/data/lola-maps.js"),
  `/**
 * Metadatos de los mapas de elevación de MAPA DE CALOR (UI-11, DEC-024).
 * ARCHIVO GENERADO por web/scripts/build-lola-maps.mjs: no editar a mano.
 * R de cada PNG = elevación cuantizada entre minKm y maxKm (8 bits);
 * G = sombreado (relieve exagerado ×zFactor solo para el sombreado);
 * B = 255 si hay dato.
 */
export const LOLA_MAPS = ${JSON.stringify(meta, null, 2)};
`,
);
console.log(`Polar: ${polarRange.minKm}…${polarRange.maxKm} km, ${(polarBytes / 1e6).toFixed(2)} MB`);
console.log(`Global: ${globalRange.minKm}…${globalRange.maxKm} km, ${(globalBytes / 1e6).toFixed(2)} MB`);
