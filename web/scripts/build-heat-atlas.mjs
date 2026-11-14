#!/usr/bin/env node
/**
 * Atlas de horizontes LOLA para el mapa de calor del polo sur (MAP-01, DEC-038).
 *
 * Para el centro de cada celda de la grilla de `computePolarHeatmap()` (96 × 96
 * hasta −80° por defecto) calcula el horizonte con el algoritmo de TERRAIN-02
 * (DEC-030) sobre `LDEM_60S_240M` completo: cada 5° de azimut, rayos de 300 km,
 * paso de 240 m, observador a 2 m. Escribe `public/data/terrain/heat-atlas-<size>.bin`
 * (horizontes int16 en centésimas de grado, −32768 fuera del disco; altura del
 * suelo int16 en m; % de azimuts de baja confianza uint8) y su `.json`.
 * Determinista para los mismos rasters.
 *
 * Uso (desde web/): node scripts/build-heat-atlas.mjs [--raw data/raw]
 *   [--out public/data/terrain] [--size 96] [--min-lat=-80] [--az-step 5] [--skip-md5] [--limit N]
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LOLA_PRODUCT } from "../src/data/terrain/lola-ldem-60s-240m.js";
import { computeHorizonProfile, createRasterSampler } from "../src/lib/horizon-lola.js";
import { HEAT_ATLAS_SCHEMA, cellCenter } from "../src/lib/heat-map.js";
import { readRaster } from "./build-lola-horizons.mjs";
import { md5File } from "./download-lola.mjs";
import { DEFAULT_RAW, assertSizes } from "./prepare-lola.mjs";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const MISSING = -32768;

export const ATLAS_PARAMS = Object.freeze({ maxDistanceKm: 300, stepKm: 0.24, observerHeightM: 2 });

export function buildAtlas(sampler, { size, minLat, azStep, limit = Infinity, onProgress }) {
  const azimuths = Math.round(360 / azStep);
  const cells = size * size;
  const horizon = new Int16Array(cells * azimuths).fill(MISSING);
  const groundM = new Int16Array(cells);
  const lowPct = new Uint8Array(cells);
  let done = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const center = cellCenter(x, y, size, minLat);
      if (!center || done >= limit) continue;
      const c = y * size + x;
      const p = computeHorizonProfile(sampler, center, { ...ATLAS_PARAMS, azimuthStepDeg: azStep });
      for (let k = 0; k < azimuths; k++) {
        if (!Number.isFinite(p.elevationDeg[k])) throw new Error(`celda (${x}, ${y}) sin horizonte en ${k * azStep}°`);
        horizon[c * azimuths + k] = Math.round(p.elevationDeg[k] * 100);
      }
      groundM[c] = Math.round(p.observer.groundHeightKm * 1000);
      lowPct[c] = Math.round((100 * p.lowConfidence.filter(Boolean).length) / azimuths);
      done++;
      onProgress?.(done);
    }
  }
  return { horizon, groundM, lowPct, azimuths, cellsComputed: done };
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      raw: { type: "string" },
      out: { type: "string", default: "public/data/terrain" },
      size: { type: "string", default: "96" },
      "min-lat": { type: "string", default: "-80" },
      "az-step": { type: "string", default: "5" },
      limit: { type: "string" },
      "skip-md5": { type: "boolean", default: false },
    },
  });
  const rawDir = values.raw ? resolve(process.cwd(), values.raw) : DEFAULT_RAW;
  const demPath = join(rawDir, LOLA_PRODUCT.dem.image.name);
  const countsPath = join(rawDir, LOLA_PRODUCT.counts.image.name);
  assertSizes(demPath, countsPath);
  if (!values["skip-md5"]) {
    for (const [path, md5] of [[demPath, LOLA_PRODUCT.dem.image.md5], [countsPath, LOLA_PRODUCT.counts.image.md5]]) {
      const actual = await md5File(path);
      if (actual !== md5) throw new Error(`${path}: MD5 ${actual} ≠ ${md5}`);
    }
  }
  const size = Number(values.size);
  const minLat = Number(values["min-lat"]);
  const azStep = Number(values["az-step"]);
  const sampler = createRasterSampler({ dem: readRaster(demPath, "float32"), counts: readRaster(countsPath, "int16") });
  const t0 = Date.now();
  const atlas = buildAtlas(sampler, {
    size,
    minLat,
    azStep,
    limit: values.limit ? Number(values.limit) : Infinity,
    onProgress: (n) => n % 500 === 0 && console.log(`${n} celdas, ${((Date.now() - t0) / 1000).toFixed(0)} s`),
  });
  if (values.limit) {
    console.log(`${atlas.cellsComputed} celdas en ${((Date.now() - t0) / 1000).toFixed(1)} s (prueba, no se escribe)`);
    return 0;
  }
  const cells = size * size;
  const bin = Buffer.alloc(cells * atlas.azimuths * 2 + cells * 3);
  Buffer.from(atlas.horizon.buffer).copy(bin, 0);
  Buffer.from(atlas.groundM.buffer).copy(bin, cells * atlas.azimuths * 2);
  Buffer.from(atlas.lowPct.buffer).copy(bin, cells * atlas.azimuths * 2 + cells * 2);
  const name = `heat-atlas-${size}`;
  const meta = {
    schema: HEAT_ATLAS_SCHEMA,
    file: `${name}.bin`,
    sha256: createHash("sha256").update(bin).digest("hex"),
    grid: { size, minLat, azimuths: atlas.azimuths, azStepDeg: azStep, cells: atlas.cellsComputed },
    params: { ...ATLAS_PARAMS, azimuthStepDeg: azStep, algorithm: "selene-lola-horizon/v1" },
    encoding: {
      horizon: "int16 LE, centésimas de grado, size² × azimuths (fila por fila, azimut desde el norte); −32768 fuera del disco",
      groundM: "int16 LE, metros sobre la esfera de 1737,4 km, size²",
      lowPct: "uint8, % de azimuts cuyo horizonte usa píxeles con count = 0, size²",
    },
    source: {
      dataSetId: LOLA_PRODUCT.dataSetId,
      doi: LOLA_PRODUCT.doi,
      productVersion: LOLA_PRODUCT.productVersion,
      dem: { productId: LOLA_PRODUCT.dem.productId, md5: LOLA_PRODUCT.dem.image.md5 },
      counts: { productId: LOLA_PRODUCT.counts.productId, md5: LOLA_PRODUCT.counts.image.md5 },
    },
  };
  const outDir = resolve(WEB_ROOT, values.out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.bin`), bin);
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`${name}: ${atlas.cellsComputed} celdas, ${(bin.length / 1024).toFixed(0)} KiB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
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
