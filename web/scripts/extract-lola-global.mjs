#!/usr/bin/env node
/**
 * Extrae ventanas del DEM LOLA global `LDEM_128` + `LDEC_128` (TERRAIN-03,
 * DEC-061) alrededor de los sitios curados que quedan fuera de
 * `LDEM_60S_240M`, sin guardar las imágenes completas (~2 GiB cada una).
 *
 * Cada imagen se recorre en streaming desde PDS Geosciences (URL fija del
 * manifiesto `src/data/terrain/lola-ldem-128.js`): se cuentan los bytes y se
 * calcula el MD5 del archivo completo, y solo se copian las filas y columnas
 * de cada ventana. Si el tamaño o el MD5 no coinciden con el manifiesto, no
 * se escribe nada. Con `md5: "PENDIENTE"` en el manifiesto (primera
 * descarga) se informa el MD5 calculado para registrarlo.
 *
 * La ventana cubre el radio del horizonte (HORIZON_PARAMS.maxDistanceKm) más
 * un margen, en latitud y en longitud (ensanchada por 1/cos φ).
 *
 * Salida en `data/derived/lola-128/` (ignorado por git):
 *   <sitio>.dem.i16, <sitio>.counts.i16 (int16 LE, fila por fila) y
 *   index.json (ventanas, MD5 de origen y de cada ventana).
 *
 * Uso (desde web/):
 *   node scripts/extract-lola-global.mjs [--out data/derived/lola-128] [--src <dir local con las .img>]
 */
import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import { LOLA_GLOBAL_PRODUCT } from "../src/data/terrain/lola-ldem-128.js";
import { SITES } from "../src/data/sites.js";
import { HORIZON_PARAMS } from "../src/lib/horizon-lola.js";
import { isCovered } from "../src/lib/terrain-data.js";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_GLOBAL_OUT = resolve(WEB_ROOT, "data/derived/lola-128");
const G = LOLA_GLOBAL_PRODUCT.grid;
const R_KM = LOLA_GLOBAL_PRODUCT.projection.sphereRadiusM / 1000;
const MARGIN_DEG = 0.25;

/**
 * Ventana de la grilla (líneas y samples, 0-based) que cubre un radio
 * `radiusKm` alrededor de (lat, lon). `sample0` puede quedar fuera de
 * 0..samples-1: se lee con módulo (la longitud es circular).
 */
export function windowFor({ lat, lon }, radiusKm = HORIZON_PARAMS.maxDistanceKm, grid = G) {
  const dLat = (radiusKm / R_KM) * (180 / Math.PI) + MARGIN_DEG;
  const north = Math.min(90, lat + dLat);
  const south = Math.max(-90, lat - dLat);
  const worst = Math.max(Math.abs(north), Math.abs(south));
  if (worst >= 89) throw new RangeError("ventana demasiado cerca del polo para la cilíndrica");
  const dLon = dLat / Math.cos((worst * Math.PI) / 180);
  const ppd = grid.pixelsPerDegree;
  const line0 = Math.max(0, Math.floor(grid.lineProjectionOffset - ppd * (north - grid.centerLatitude)));
  const line1 = Math.min(grid.lines - 1, Math.ceil(grid.lineProjectionOffset - ppd * (south - grid.centerLatitude)));
  const lon360 = ((lon % 360) + 360) % 360;
  const sample0 = Math.floor(grid.sampleProjectionOffset + ppd * (lon360 - dLon - grid.centerLongitude));
  const sample1 = Math.ceil(grid.sampleProjectionOffset + ppd * (lon360 + dLon - grid.centerLongitude));
  return { line0, lines: line1 - line0 + 1, sample0, samples: sample1 - sample0 + 1 };
}

/**
 * Sitio curado cubierto también por LDEM_60S_240M que se extrae solo para
 * validar: su horizonte con LDEM_128 se compara con el de la tabla polar
 * (tests/validacion/horizonte-lola-global.test.js). No entra en la tabla.
 */
export const VALIDATION_SITE_ID = "chandrayaan3";

/** Sitios curados fuera de LDEM_60S_240M más el de validación, con su ventana. */
export function globalSites(sites = SITES) {
  return sites
    .filter((s) => !isCovered(s.lat, s.lon) || s.id === VALIDATION_SITE_ID)
    .map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, validationOnly: isCovered(s.lat, s.lon), window: windowFor(s) }));
}

/**
 * Recorre `stream` (imagen completa) y copia cada ventana a un Buffer.
 * Devuelve `{ bytes, md5, buffers }`.
 */
export async function extractWindows(stream, windows, grid = G, onProgress) {
  const rowBytes = grid.recordBytes;
  const buffers = windows.map((w) => Buffer.alloc(w.lines * w.samples * 2));
  const hash = createHash("md5");
  const row = Buffer.alloc(rowBytes);
  let rowFill = 0;
  let line = 0;
  let bytes = 0;

  const flushRow = () => {
    windows.forEach((w, k) => {
      const r = line - w.line0;
      if (r < 0 || r >= w.lines) return;
      const dst = buffers[k];
      for (let c = 0; c < w.samples; ) {
        const s = (((w.sample0 + c) % grid.samples) + grid.samples) % grid.samples;
        const run = Math.min(w.samples - c, grid.samples - s);
        row.copy(dst, (r * w.samples + c) * 2, s * 2, (s + run) * 2);
        c += run;
      }
    });
    line++;
  };

  for await (const chunk of stream) {
    hash.update(chunk);
    bytes += chunk.length;
    onProgress?.(bytes);
    let pos = 0;
    while (pos < chunk.length) {
      const take = Math.min(rowBytes - rowFill, chunk.length - pos);
      chunk.copy(row, rowFill, pos, pos + take);
      rowFill += take;
      pos += take;
      if (rowFill === rowBytes) {
        if (line < grid.lines) flushRow();
        rowFill = 0;
      }
    }
  }
  return { bytes, md5: hash.digest("hex"), buffers };
}

async function openImage(entry, srcDir) {
  if (srcDir) return createReadStream(join(srcDir, entry.name), { highWaterMark: 1 << 20 });
  const response = await fetch(entry.url, { redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} al descargar ${entry.url}`);
  return Readable.fromWeb(response.body);
}

export async function main(argv = process.argv.slice(2)) {
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  const outDir = value("out") ? resolve(process.cwd(), value("out")) : DEFAULT_GLOBAL_OUT;
  const srcDir = value("src") ? resolve(process.cwd(), value("src")) : null;
  const sites = globalSites();
  const windows = sites.map((s) => s.window);
  for (const s of sites) console.log(`${s.id}: ventana ${JSON.stringify(s.window)}`);

  const layers = [
    ["dem", LOLA_GLOBAL_PRODUCT.dem.image],
    ["counts", LOLA_GLOBAL_PRODUCT.counts.image],
  ];
  const started = Date.now();
  const progress = {};
  const report = () => {
    const mb = Object.values(progress).reduce((a, b) => a + b, 0) / 1e6;
    process.stdout.write(`\r${mb.toFixed(0)} MB de ${(layers.length * 2123.4).toFixed(0)} MB (${(mb / ((Date.now() - started) / 1000)).toFixed(1)} MB/s)   `);
  };
  const timer = setInterval(report, 5000);
  let results;
  try {
    results = await Promise.all(
      layers.map(async ([name, entry]) =>
        extractWindows(await openImage(entry, srcDir), windows, G, (b) => (progress[name] = b)),
      ),
    );
  } finally {
    clearInterval(timer);
    report();
    process.stdout.write("\n");
  }

  const errors = [];
  layers.forEach(([name, entry], k) => {
    const { bytes, md5 } = results[k];
    console.log(`${entry.name}: ${bytes} bytes, MD5 ${md5}`);
    if (bytes !== entry.bytes) errors.push(`${entry.name}: ${bytes} bytes ≠ ${entry.bytes}`);
    if (entry.md5 !== "PENDIENTE" && md5 !== entry.md5) errors.push(`${entry.name}: MD5 ${md5} ≠ ${entry.md5}`);
  });
  if (errors.length) throw new Error(errors.join("; "));

  mkdirSync(outDir, { recursive: true });
  const index = {
    schema: "selene-lola-128-windows/v1",
    product: {
      dataSetId: LOLA_GLOBAL_PRODUCT.dataSetId,
      doi: LOLA_GLOBAL_PRODUCT.doi,
      productVersion: LOLA_GLOBAL_PRODUCT.productVersion,
      dem: { productId: LOLA_GLOBAL_PRODUCT.dem.productId, md5: results[0].md5, bytes: results[0].bytes },
      counts: { productId: LOLA_GLOBAL_PRODUCT.counts.productId, md5: results[1].md5, bytes: results[1].bytes },
    },
    sites: {},
  };
  sites.forEach((s, k) => {
    const files = {};
    layers.forEach(([name], j) => {
      const fileName = `${s.id}.${name}.i16`;
      writeFileSync(join(outDir, fileName), results[j].buffers[k]);
      files[name] = { file: fileName, md5: createHash("md5").update(results[j].buffers[k]).digest("hex") };
    });
    index.sites[s.id] = { lat: s.lat, lon: s.lon, validationOnly: s.validationOnly, window: s.window, files };
  });
  writeFileSync(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
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
