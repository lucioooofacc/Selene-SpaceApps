#!/usr/bin/env node
/**
 * Prepara recortes por sitio del producto LOLA seleccionado (TERRAIN-01, DEC-021).
 *
 * Entradas (descargadas con download-lola.mjs):
 * - `ldem_60s_240m_float.img`: float32 little-endian, altura en km sobre la
 *   esfera de 1737,4 km, 7760 × 7760, estereográfica polar sur.
 * - `ldec_60s_240m.img`: int16 little-endian, cantidad de mediciones LOLA por
 *   píxel de la misma grilla.
 *
 * Por cada sitio del catálogo dentro de la cobertura nominal (−90°..−60°)
 * extrae una ventana cuadrada centrada en el píxel más cercano y escribe un JSON
 * con alturas en metros y conteos. `count = 0` se marca como valor interpolado
 * (sin medición directa, confianza baja) aunque el DEM tenga un valor.
 * Los sitios fuera de cobertura se listan como excluidos; no se inventan datos.
 *
 * Uso (desde web/):
 *   node scripts/prepare-lola.mjs [--raw data/raw] [--out data/derived/lola-60s-240m]
 *                                 [--radius-px 64] [--skip-md5]
 */
import { closeSync, mkdirSync, openSync, readSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LOLA_PRODUCT } from "../src/data/terrain/lola-ldem-60s-240m.js";
import { SITES } from "../src/data/sites.js";
import { LOLA_GRID, isCovered, measurementFromCount, nearestPixel } from "../src/lib/terrain-data.js";
import { md5File } from "./download-lola.mjs";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_RAW = resolve(WEB_ROOT, "data/raw");
export const DEFAULT_OUT = resolve(WEB_ROOT, "data/derived/lola-60s-240m");
// Ventana provisoria (±64 px ≈ ±15 km). El radio que necesita el horizonte lo
// define TERRAIN-02; este valor solo sirve para inspeccionar los datos.
export const DEFAULT_RADIUS_PX = 64;

const DEM_BYTES = 4;
const COUNT_BYTES = 2;

/** Comprueba que los archivos tengan exactamente el tamaño de la grilla. */
export function assertSizes(demPath, countsPath, grid = LOLA_GRID) {
  const pixels = grid.lines * grid.samples;
  for (const [path, bytes] of [
    [demPath, pixels * DEM_BYTES],
    [countsPath, pixels * COUNT_BYTES],
  ]) {
    const size = statSync(path).size;
    if (size !== bytes) throw new Error(`${path}: ${size} bytes; se esperaban ${bytes}`);
  }
}

/** Lee una ventana de un raster crudo fila por fila sin cargar el archivo entero. */
function readWindow(path, bytesPerSample, decode, grid, { line0, sample0, lines, samples }) {
  const fd = openSync(path, "r");
  try {
    const row = Buffer.alloc(samples * bytesPerSample);
    const out = new Array(lines * samples);
    for (let r = 0; r < lines; r++) {
      const position = ((line0 + r) * grid.samples + sample0) * bytesPerSample;
      const read = readSync(fd, row, 0, row.length, position);
      if (read !== row.length) throw new Error(`${path}: lectura corta en la línea ${line0 + r}`);
      for (let c = 0; c < samples; c++) out[r * samples + c] = decode(row, c * bytesPerSample);
    }
    return out;
  } finally {
    closeSync(fd);
  }
}

/** Ventana de ±radiusPx alrededor de `center`, recortada a la grilla. */
export function windowAround(center, radiusPx, grid = LOLA_GRID) {
  const line0 = Math.max(0, center.line - radiusPx);
  const sample0 = Math.max(0, center.sample - radiusPx);
  const line1 = Math.min(grid.lines - 1, center.line + radiusPx);
  const sample1 = Math.min(grid.samples - 1, center.sample + radiusPx);
  return { line0, sample0, lines: line1 - line0 + 1, samples: sample1 - sample0 + 1 };
}

/**
 * Extrae el recorte de un sitio. Alturas: float32 km → metros redondeados a
 * 1 mm. Rechaza alturas no finitas y conteos negativos en lugar de corregirlos.
 */
export function extractTile(site, { demPath, countsPath, radiusPx = DEFAULT_RADIUS_PX, grid = LOLA_GRID }) {
  const center = nearestPixel(site.lat, site.lon, grid);
  const window = windowAround(center, radiusPx, grid);
  const heightKm = readWindow(demPath, DEM_BYTES, (b, o) => b.readFloatLE(o), grid, window);
  const counts = readWindow(countsPath, COUNT_BYTES, (b, o) => b.readInt16LE(o), grid, window);

  const heightM = heightKm.map((km, i) => {
    if (!Number.isFinite(km)) throw new Error(`${site.id}: altura no finita en el píxel ${i} de la ventana`);
    return Math.round(km * 1e6) / 1e3;
  });
  if (counts.some((c) => c < 0)) throw new Error(`${site.id}: conteo LDEC negativo`);

  const ci = (center.line - window.line0) * window.samples + (center.sample - window.sample0);
  const zeroCount = counts.filter((c) => c === 0).length;
  return {
    schema: "selene-lola-tile/v1",
    site: { id: site.id, lat: site.lat, lon: site.lon },
    source: {
      dataSetId: LOLA_PRODUCT.dataSetId,
      doi: LOLA_PRODUCT.doi,
      productVersion: LOLA_PRODUCT.productVersion,
      dem: { productId: LOLA_PRODUCT.dem.productId, md5: LOLA_PRODUCT.dem.image.md5 },
      counts: { productId: LOLA_PRODUCT.counts.productId, md5: LOLA_PRODUCT.counts.image.md5 },
    },
    units: { height: "m above 1737.4 km sphere", count: "LOLA measurements per pixel", pixel: `${grid.scaleM} m` },
    window,
    center: { ...center, heightM: heightM[ci], ...measurementFromCount(counts[ci]) },
    stats: {
      pixels: counts.length,
      zeroCountPixels: zeroCount,
      zeroCountFraction: Math.round((zeroCount / counts.length) * 1e4) / 1e4,
      minHeightM: Math.min(...heightM),
      maxHeightM: Math.max(...heightM),
    },
    heightM,
    counts,
  };
}

/** Divide el catálogo en sitios cubiertos y excluidos y extrae los recortes. */
export function prepareSites({ demPath, countsPath, sites = SITES, radiusPx, grid = LOLA_GRID }) {
  assertSizes(demPath, countsPath, grid);
  const tiles = [];
  const excluded = [];
  for (const site of sites) {
    if (isCovered(site.lat, site.lon, grid)) tiles.push(extractTile(site, { demPath, countsPath, radiusPx, grid }));
    else excluded.push({ id: site.id, lat: site.lat, lon: site.lon, reason: "fuera de la cobertura −90°..−60°" });
  }
  return { tiles, excluded };
}

export async function main(argv = process.argv.slice(2)) {
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  const rawDir = value("raw") ? resolve(WEB_ROOT, value("raw")) : DEFAULT_RAW;
  const outDir = value("out") ? resolve(WEB_ROOT, value("out")) : DEFAULT_OUT;
  const radiusPx = value("radius-px") === undefined ? DEFAULT_RADIUS_PX : Number(value("radius-px"));
  if (!Number.isInteger(radiusPx) || radiusPx < 0) throw new Error("--radius-px debe ser un entero ≥ 0");

  const demPath = join(rawDir, LOLA_PRODUCT.dem.image.name);
  const countsPath = join(rawDir, LOLA_PRODUCT.counts.image.name);
  if (!argv.includes("--skip-md5")) {
    for (const [path, md5] of [
      [demPath, LOLA_PRODUCT.dem.image.md5],
      [countsPath, LOLA_PRODUCT.counts.image.md5],
    ]) {
      const actual = await md5File(path);
      if (actual !== md5) throw new Error(`${path}: MD5 ${actual} ≠ ${md5}`);
    }
  }

  const { tiles, excluded } = prepareSites({ demPath, countsPath, radiusPx });
  mkdirSync(outDir, { recursive: true });
  for (const tile of tiles) writeFileSync(join(outDir, `${tile.site.id}.json`), `${JSON.stringify(tile)}\n`);
  const index = {
    schema: "selene-lola-index/v1",
    source: tiles[0]?.source ?? null,
    radiusPx,
    sites: tiles.map((t) => ({ id: t.site.id, file: `${t.site.id}.json`, center: t.center, stats: t.stats })),
    excluded,
  };
  writeFileSync(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

  for (const t of tiles) {
    const c = t.center;
    console.log(
      `${t.site.id}: píxel (${c.line}, ${c.sample}) altura ${c.heightM} m, count ${c.count}` +
        ` (${c.direct ? "medición directa" : "interpolado, confianza baja"}); ` +
        `ventana ${t.window.lines}×${t.window.samples}, count=0 en ${(t.stats.zeroCountFraction * 100).toFixed(1)} %`,
    );
  }
  for (const e of excluded) console.log(`${e.id}: excluido (${e.reason})`);
  console.log(`Escrito en ${outDir}`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().then(
    (code) => (process.exitCode = code),
    (error) => {
      console.error(`ERROR: ${error.message}`);
      process.exitCode = 1;
    },
  );
}
