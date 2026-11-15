#!/usr/bin/env node
/**
 * Atlas de horizontes LOLA de toda la Luna para el mapa de calor (MAP-02, DEC-065).
 *
 * Para el centro de cada celda de una grilla equirectangular global (por
 * defecto 2° × 2°: 180 × 90 celdas, fila 0 al norte, columna 0 desde −180°)
 * calcula el horizonte con el algoritmo de TERRAIN-02 (DEC-030) sobre
 * `LDEM_16` + `LDEC_16` completos (~1,9 km/píxel): cada 5° de azimut, rayos
 * de 300 km, paso de 0,95 km (medio píxel), observador a 2 m. Escribe
 * `public/data/terrain/heat-atlas-global-<cellDeg>deg.bin` (misma codificación
 * que el atlas polar) y su `.json`. Determinista para los mismos rasters.
 *
 * Entrada: `data/raw/ldem16/ldem_16.img` y `ldec_16.img`, de las URLs de
 * `src/data/terrain/lola-ldem-16.js` (se verifican tamaño y MD5).
 *
 * Uso (desde web/): node scripts/build-global-heat-atlas.mjs [--raw data/raw/ldem16]
 *   [--out public/data/terrain] [--cell 2] [--az-step 5] [--skip-md5] [--limit N]
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LOLA_LDEM16_PRODUCT as P } from "../src/data/terrain/lola-ldem-16.js";
import { computeHorizonProfile, createGlobalCylindricalSampler } from "../src/lib/horizon-lola.js";
import { GLOBAL_HEAT_ATLAS_SCHEMA, globalCellCenter } from "../src/lib/heat-map.js";
import { md5File } from "./download-lola.mjs";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const MISSING = -32768;

export const GLOBAL_ATLAS_PARAMS = Object.freeze({ maxDistanceKm: 300, stepKm: 0.95, observerHeightM: 2 });

function readInt16(path, n) {
  const buf = readFileSync(path);
  if (buf.length !== n * 2) throw new Error(`${path}: ${buf.length} bytes, se esperaban ${n * 2}`);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2);
  return out;
}

export function buildGlobalAtlas(sampler, { cols, rows, azStep, limit = Infinity, onProgress }) {
  const azimuths = Math.round(360 / azStep);
  const cells = cols * rows;
  const horizon = new Int16Array(cells * azimuths).fill(MISSING);
  const groundM = new Int16Array(cells);
  const lowPct = new Uint8Array(cells);
  let done = 0;
  for (let c = 0; c < cells && done < limit; c++) {
    const center = globalCellCenter(c % cols, Math.floor(c / cols), cols, rows);
    const p = computeHorizonProfile(sampler, center, { ...GLOBAL_ATLAS_PARAMS, azimuthStepDeg: azStep, radiusKm: P.dem.referenceRadiusKm });
    for (let k = 0; k < azimuths; k++) {
      if (!Number.isFinite(p.elevationDeg[k])) throw new Error(`celda ${c} sin horizonte en ${k * azStep}°`);
      horizon[c * azimuths + k] = Math.round(p.elevationDeg[k] * 100);
    }
    groundM[c] = Math.round(p.observer.groundHeightKm * 1000);
    lowPct[c] = Math.round((100 * p.lowConfidence.filter(Boolean).length) / azimuths);
    done++;
    onProgress?.(done, cells);
  }
  return { horizon, groundM, lowPct, azimuths, cellsComputed: done };
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      raw: { type: "string", default: "data/raw/ldem16" },
      out: { type: "string", default: "public/data/terrain" },
      cell: { type: "string", default: "2" },
      "az-step": { type: "string", default: "5" },
      limit: { type: "string" },
      "skip-md5": { type: "boolean", default: false },
    },
  });
  const rawDir = resolve(WEB_ROOT, values.raw);
  const demPath = join(rawDir, P.dem.image.name);
  const countsPath = join(rawDir, P.counts.image.name);
  for (const [path, f] of [[demPath, P.dem.image], [countsPath, P.counts.image]]) {
    if (statSync(path).size !== f.bytes) throw new Error(`${path}: tamaño distinto del manifiesto`);
    if (!values["skip-md5"]) {
      const md5 = await md5File(path);
      if (md5 !== f.md5) throw new Error(`${path}: MD5 ${md5} ≠ ${f.md5}`);
    }
  }
  const n = P.grid.lines * P.grid.samples;
  const sampler = createGlobalCylindricalSampler({
    dem: readInt16(demPath, n),
    counts: readInt16(countsPath, n),
    grid: P.grid,
    scalingFactor: P.dem.scalingFactor,
  });

  const cellDeg = Number(values.cell);
  const azStep = Number(values["az-step"]);
  const cols = Math.round(360 / cellDeg);
  const rows = Math.round(180 / cellDeg);
  if (cols * cellDeg !== 360 || rows * cellDeg !== 180) throw new Error("--cell debe dividir 180°");
  const t0 = Date.now();
  const atlas = buildGlobalAtlas(sampler, {
    cols,
    rows,
    azStep,
    limit: values.limit ? Number(values.limit) : Infinity,
    onProgress: (done, total) => {
      if (done % 1000 === 0) console.log(`  ${done}/${total} celdas (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    },
  });

  const cells = cols * rows;
  const bin = Buffer.alloc(cells * atlas.azimuths * 2 + cells * 2 + cells);
  atlas.horizon.forEach((v, i) => bin.writeInt16LE(v, i * 2));
  const off = cells * atlas.azimuths * 2;
  atlas.groundM.forEach((v, i) => bin.writeInt16LE(v, off + i * 2));
  atlas.lowPct.forEach((v, i) => bin.writeUInt8(v, off + cells * 2 + i));

  const name = `heat-atlas-global-${cellDeg}deg`;
  const meta = {
    schema: GLOBAL_HEAT_ATLAS_SCHEMA,
    file: `${name}.bin`,
    sha256: createHash("sha256").update(bin).digest("hex"),
    grid: { cols, rows, cellDeg, azimuths: atlas.azimuths, azStepDeg: azStep, cells, order: "fila 0 al norte (centro 90° − cellDeg/2), columna 0 desde −180°" },
    params: { ...GLOBAL_ATLAS_PARAMS, azimuthStepDeg: azStep, algorithm: "selene-lola-horizon/v1" },
    encoding: {
      horizon: "int16 LE, centésimas de grado, cells × azimuths (celda por celda, azimut desde el norte)",
      groundM: "int16 LE, metros sobre la esfera de 1737,4 km, cells",
      lowPct: "uint8, % de azimuts cuyo horizonte usa píxeles con count = 0, cells",
    },
    source: {
      dataSetId: P.dataSetId,
      doi: P.doi,
      dem: { productId: P.dem.productId, productVersion: P.dem.productVersion, md5: P.dem.image.md5 },
      counts: { productId: P.counts.productId, productVersion: P.counts.productVersion, md5: P.counts.image.md5 },
    },
  };
  const outDir = resolve(WEB_ROOT, values.out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.bin`), bin);
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`${name}: ${atlas.cellsComputed} celdas en ${((Date.now() - t0) / 1000).toFixed(0)} s, ${bin.length} bytes`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
