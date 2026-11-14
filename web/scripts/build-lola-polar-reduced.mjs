#!/usr/bin/env node
/**
 * DEM LOLA polar REDUCIDO para calcular en el navegador el horizonte de puntos
 * propios (CORE-03 parte B, DEC-034).
 *
 * Toma `LDEM_60S_240M_FLOAT` + `LDEC_60S_240M` verificados (DEC-025), promedia
 * bloques de `block × block` píxeles (4 → 960 m/píxel, alineados con la grilla
 * nativa) y recorta a la latitud `--max-lat` (−75° por defecto). Escribe:
 * - `public/data/terrain/lola-polar-<m>m.bin`: alturas int16 LE en metros sobre
 *   la esfera de 1737,4 km (promedio del bloque), seguidas de un uint8 por
 *   píxel con el % de píxeles nativos del bloque con `count = 0`.
 * - `public/data/terrain/lola-polar-<m>m.json`: grilla, codificación, fuente y
 *   SHA-256 del binario.
 * Determinista para los mismos rasters.
 *
 * Uso (desde web/): node scripts/build-lola-polar-reduced.mjs [--raw data/raw]
 *   [--out public/data/terrain] [--block 4] [--max-lat -75] [--skip-md5]
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LOLA_PRODUCT } from "../src/data/terrain/lola-ldem-60s-240m.js";
import { LOLA_GRID } from "../src/lib/terrain-data.js";
import { readRaster } from "./build-lola-horizons.mjs";
import { md5File } from "./download-lola.mjs";
import { DEFAULT_RAW, assertSizes } from "./prepare-lola.mjs";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "../..");

/** Promedia bloques y recorta. Devuelve grilla, alturas (m) y % de count = 0. */
export function reduceGrid({ dem, counts, grid = LOLA_GRID, block = 4, maxLatitude = -75 }) {
  const lines = Math.floor(grid.lines / block);
  const samples = Math.floor(grid.samples / block);
  // El bloque k cubre los píxeles nativos block·k … block·k + block − 1: su centro
  // está en block·k + (block − 1)/2 de la grilla nativa.
  const off = (grid.lineOffset - (block - 1) / 2) / block;
  const offS = (grid.sampleOffset - (block - 1) / 2) / block;
  const scaleM = grid.scaleM * block;
  const rhoMax = 2 * grid.radiusM * Math.tan(((90 + maxLatitude) * Math.PI) / 180 / 2);
  const halfPx = Math.ceil(rhoMax / scaleM) + 1;
  const l0 = Math.max(0, Math.floor(off) - halfPx);
  const s0 = Math.max(0, Math.floor(offS) - halfPx);
  const l1 = Math.min(lines - 1, Math.ceil(off) + halfPx);
  const s1 = Math.min(samples - 1, Math.ceil(offS) + halfPx);
  const outLines = l1 - l0 + 1;
  const outSamples = s1 - s0 + 1;
  const heightM = new Int16Array(outLines * outSamples);
  const zeroPct = new Uint8Array(outLines * outSamples);
  for (let r = 0; r < outLines; r++) {
    for (let c = 0; c < outSamples; c++) {
      let sum = 0;
      let zeros = 0;
      for (let i = 0; i < block; i++) {
        const row = ((l0 + r) * block + i) * grid.samples + (s0 + c) * block;
        for (let j = 0; j < block; j++) {
          const v = dem[row + j];
          if (!Number.isFinite(v)) throw new Error(`altura no finita en el bloque (${l0 + r}, ${s0 + c})`);
          sum += v;
          if (counts[row + j] === 0) zeros++;
        }
      }
      const k = r * outSamples + c;
      heightM[k] = Math.round((sum / (block * block)) * 1000);
      zeroPct[k] = Math.round((100 * zeros) / (block * block));
    }
  }
  return {
    grid: {
      lines: outLines,
      samples: outSamples,
      lineOffset: off - l0,
      sampleOffset: offS - s0,
      scaleM,
      radiusM: grid.radiusM,
      maxLatitude,
    },
    heightM,
    zeroPct,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      raw: { type: "string" },
      out: { type: "string", default: "public/data/terrain" },
      block: { type: "string", default: "4" },
      "max-lat": { type: "string", default: "-75" },
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
  const block = Number(values.block);
  const maxLatitude = Number(values["max-lat"]);
  const reduced = reduceGrid({ dem: readRaster(demPath, "float32"), counts: readRaster(countsPath, "int16"), block, maxLatitude });

  const n = reduced.heightM.length;
  const bin = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) bin.writeInt16LE(reduced.heightM[i], i * 2);
  Buffer.from(reduced.zeroPct.buffer).copy(bin, n * 2);
  const name = `lola-polar-${reduced.grid.scaleM}m`;
  const meta = {
    schema: "selene-lola-polar-reduced/v1",
    file: `${name}.bin`,
    sha256: createHash("sha256").update(bin).digest("hex"),
    grid: reduced.grid,
    encoding: {
      heightM: `int16 little-endian, ${n} valores, metros sobre la esfera de 1737,4 km (promedio de ${block}×${block} píxeles nativos)`,
      zeroPct: `uint8, ${n} valores a continuación, % de píxeles nativos del bloque con count = 0`,
      order: "fila por fila; line 0 arriba; misma proyección estereográfica polar sur que LDEM_60S_240M",
    },
    reduction: { block, nativeScaleM: LOLA_GRID.scaleM },
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
  console.log(`${name}: ${reduced.grid.lines}×${reduced.grid.samples} px, ${(bin.length / 1024).toFixed(0)} KiB, hasta ${maxLatitude}°`);
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
