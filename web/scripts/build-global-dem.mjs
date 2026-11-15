#!/usr/bin/env node
/**
 * Empaqueta el DEM LOLA global de baja resolución para la página (TERRAIN-04,
 * DEC-067): `public/data/terrain/lola-global-16ppd.bin` con las alturas de
 * `LDEM_16` sin modificar (int16 LE, metros = DN × 0,5 sobre la esfera de
 * 1737,4 km) seguidas de un bit por píxel (LSB primero) que vale 1 si
 * `LDEC_16` trae `count = 0` (píxel interpolado), y su `.json`.
 *
 * Entrada: `data/raw/ldem16/ldem_16.img` y `ldec_16.img` (URLs, tamaño y MD5
 * en `src/data/terrain/lola-ldem-16.js`; se verifican antes de escribir).
 *
 * Uso (desde web/): node scripts/build-global-dem.mjs [--raw data/raw/ldem16] [--out public/data/terrain]
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LOLA_LDEM16_PRODUCT as P } from "../src/data/terrain/lola-ldem-16.js";
import { GLOBAL_DEM_SCHEMA } from "../src/lib/global-dem.js";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

export function packGlobalDem(demBuf, countsBuf, grid = P.grid) {
  const n = grid.lines * grid.samples;
  if (demBuf.length !== n * 2 || countsBuf.length !== n * 2) throw new Error("los rasters no tienen el tamaño de la grilla");
  const mask = Buffer.alloc(Math.ceil(n / 8));
  let interpolated = 0;
  for (let i = 0; i < n; i++) {
    if (countsBuf.readInt16LE(i * 2) === 0) {
      mask[i >> 3] |= 1 << (i & 7);
      interpolated++;
    }
  }
  return { bin: Buffer.concat([demBuf, mask]), interpolatedPct: (100 * interpolated) / n };
}

export function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({ args: argv, options: { raw: { type: "string", default: "data/raw/ldem16" }, out: { type: "string", default: "public/data/terrain" } } });
  const rawDir = resolve(WEB_ROOT, values.raw);
  const demBuf = readFileSync(join(rawDir, P.dem.image.name));
  const countsBuf = readFileSync(join(rawDir, P.counts.image.name));
  for (const [buf, f] of [[demBuf, P.dem.image], [countsBuf, P.counts.image]]) {
    if (buf.length !== f.bytes || md5(buf) !== f.md5) throw new Error(`${f.name}: tamaño o MD5 distinto del manifiesto`);
  }
  const { bin, interpolatedPct } = packGlobalDem(demBuf, countsBuf);
  const name = "lola-global-16ppd";
  const meta = {
    schema: GLOBAL_DEM_SCHEMA,
    file: `${name}.bin`,
    sha256: createHash("sha256").update(bin).digest("hex"),
    bytes: bin.length,
    grid: { ...P.grid },
    scalingFactor: P.dem.scalingFactor,
    referenceRadiusKm: P.dem.referenceRadiusKm,
    interpolatedPct: Math.round(interpolatedPct * 10) / 10,
    encoding: {
      height: "int16 LE, DN sin modificar de LDEM_16 (metros = DN × scalingFactor), fila por fila",
      mask: "1 bit por píxel después de las alturas, LSB primero: 1 = count 0 en LDEC_16 (interpolado)",
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
  console.log(`${name}: ${bin.length} bytes, ${meta.interpolatedPct} % de píxeles interpolados`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
