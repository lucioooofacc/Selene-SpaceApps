#!/usr/bin/env node
/**
 * Calcula el horizonte topográfico de los sitios curados desde el DEM LOLA
 * polar sur (TERRAIN-02, DEC-030) y escribe la tabla versionada
 * `src/data/terrain/lola-horizons.js`.
 *
 * Entradas: `ldem_60s_240m_float.img` y `ldec_60s_240m.img` verificados
 * (download-lola.mjs, DEC-025). Se cargan enteros en memoria (~345 MiB).
 * Algoritmo y parámetros: `src/lib/horizon-lola.js` (HORIZON_PARAMS).
 * La salida es determinista: no incluye fecha ni datos de la máquina.
 *
 * Uso (desde web/):
 *   node scripts/build-lola-horizons.mjs [--raw data/raw]
 *        [--out src/data/terrain/lola-horizons.js] [--svg ../docs/img/horizonte-lola.svg]
 *        [--skip-md5]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LOLA_PRODUCT } from "../src/data/terrain/lola-ldem-60s-240m.js";
import { SITES } from "../src/data/sites.js";
import { LOLA_GRID, isCovered } from "../src/lib/terrain-data.js";
import {
  HORIZON_ALGORITHM,
  HORIZON_PARAMS,
  computeHorizonProfile,
  createRasterSampler,
  summarizeProfile,
} from "../src/lib/horizon-lola.js";
import { createHorizon } from "../src/lib/terrain.js";
import { md5File } from "./download-lola.mjs";
import { assertSizes, DEFAULT_RAW } from "./prepare-lola.mjs";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = resolve(WEB_ROOT, "src/data/terrain/lola-horizons.js");

const round = (x, digits) => (x === null ? null : Math.round(x * 10 ** digits) / 10 ** digits);

/** Lee un raster crudo little-endian completo a un arreglo tipado. */
export function readRaster(path, type, grid = LOLA_GRID) {
  const buf = readFileSync(path);
  const n = grid.lines * grid.samples;
  if (type === "float32") {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
    return out;
  }
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2);
  return out;
}

/** Perfil → entrada compacta y redondeada de la tabla. Falla si hay huecos. */
export function toTableEntry(site, profile) {
  const bad = profile.elevationDeg.findIndex((e) => !Number.isFinite(e));
  if (bad !== -1) throw new Error(`${site.id}: sin datos en el azimut ${bad * profile.params.azimuthStepDeg}°`);
  const entry = {
    lat: site.lat,
    lon: site.lon,
    observer: {
      groundHeightM: round(profile.observer.groundHeightKm * 1000, 1),
      heightAboveGroundM: profile.params.observerHeightM,
      lowConfidence: profile.observer.lowConfidence,
    },
    elevationDeg: profile.elevationDeg.map((e) => round(e, 3)),
    distanceKm: profile.distanceKm.map((d) => round(d, 2)),
    lowConfidence: profile.lowConfidence.map((b) => (b ? 1 : 0)),
    coverageKm: profile.coverageKm.map((d) => round(d, 2)),
  };
  const s = summarizeProfile(entry, profile.params.maxDistanceKm);
  entry.summary = {
    minDeg: round(s.minDeg, 3),
    maxDeg: round(s.maxDeg, 3),
    meanDeg: round(s.meanDeg, 3),
    lowConfidenceFraction: round(s.lowConfidenceFraction, 4),
    truncatedFraction: round(s.truncatedFraction, 4),
  };
  return entry;
}

export function buildTable({ dem, counts, sites = SITES, grid = LOLA_GRID, params = HORIZON_PARAMS }) {
  const sampler = createRasterSampler({ dem, counts, grid });
  const table = {
    schema: "selene-lola-horizons/v1",
    algorithm: HORIZON_ALGORITHM,
    params: { ...params, radiusKm: grid.radiusM / 1000 },
    source: {
      dataSetId: LOLA_PRODUCT.dataSetId,
      doi: LOLA_PRODUCT.doi,
      productVersion: LOLA_PRODUCT.productVersion,
      dem: { productId: LOLA_PRODUCT.dem.productId, md5: LOLA_PRODUCT.dem.image.md5 },
      counts: { productId: LOLA_PRODUCT.counts.productId, md5: LOLA_PRODUCT.counts.image.md5 },
      frame: LOLA_PRODUCT.projection.frameName,
    },
    sites: {},
    excluded: [],
  };
  for (const site of sites) {
    if (!isCovered(site.lat, site.lon, grid)) {
      table.excluded.push({ id: site.id, reason: "fuera de la cobertura −90°..−60° de LDEM_60S_240M" });
      continue;
    }
    const profile = computeHorizonProfile(sampler, site, { ...params, radiusKm: grid.radiusM / 1000 });
    table.sites[site.id] = toTableEntry(site, profile);
  }
  return table;
}

export function renderModule(table) {
  const lines = [
    "/**",
    " * Horizonte topográfico LOLA de los sitios curados (TERRAIN-02, DEC-030).",
    " *",
    " * ARCHIVO GENERADO por `web/scripts/build-lola-horizons.mjs`; no editar a mano.",
    " * Fuente: NASA PDS LRO-L-LOLA-4-GDR-V1.0 (DOI 10.17189/1520642),",
    " * LDEM_60S_240M_FLOAT V2.1 + LDEC_60S_240M. Por azimut (paso params.azimuthStepDeg,",
    " * desde el norte, horario): elevación del horizonte (°), distancia del punto",
    " * que la define (km), 1 si ese punto usa píxeles con count = 0 (baja",
    " * confianza) y distancia alcanzada por el rayo (km; < maxDistanceKm si salió",
    " * de la cobertura: el horizonte es una cota inferior).",
    " */",
    `export const LOLA_HORIZONS = Object.freeze(${JSON.stringify(table)});`,
    "",
  ];
  return lines.join("\n");
}

/** SVG de comparación LOLA vs. sintético (solo documentación). */
export function renderComparisonSvg(table, sites = SITES) {
  const ids = Object.keys(table.sites);
  const W = 720;
  const H = 150;
  const PAD = 40;
  const panels = ids.map((id, k) => {
    const entry = table.sites[id];
    const site = sites.find((s) => s.id === id);
    const synthetic = createHorizon(site);
    const lola = entry.elevationDeg;
    const synth = lola.map((_, i) => synthetic((i * 360) / lola.length));
    const all = [...lola, ...synth];
    const lo = Math.floor(Math.min(...all)) - 0.5;
    const hi = Math.ceil(Math.max(...all)) + 0.5;
    const y = (e) => (H - 20 - ((e - lo) / (hi - lo)) * (H - 40)).toFixed(1);
    const x = (i) => (PAD + (i / lola.length) * (W - PAD - 10)).toFixed(1);
    const path = (arr) => arr.map((e, i) => `${i ? "L" : "M"}${x(i)} ${y(e)}`).join("");
    const lowMarks = entry.lowConfidence
      .map((b, i) => (b ? `<rect x="${x(i)}" y="${H - 18}" width="1" height="4" fill="#d95f02"/>` : ""))
      .join("");
    const truncMarks = entry.coverageKm
      .map((c, i) => (c < table.params.maxDistanceKm ? `<rect x="${x(i)}" y="${H - 13}" width="1" height="4" fill="#7570b3"/>` : ""))
      .join("");
    const ticks = [0, 90, 180, 270, 360]
      .map((a) => `<text x="${x((a / 360) * lola.length)}" y="${H - 2}" font-size="9" text-anchor="middle">${a}°</text>`)
      .join("");
    const zero = lo < 0 && hi > 0 ? `<line x1="${PAD}" x2="${W - 10}" y1="${y(0)}" y2="${y(0)}" stroke="#bbb" stroke-dasharray="3 3"/>` : "";
    return `<g transform="translate(0 ${k * H})">
<text x="${PAD}" y="12" font-size="11" font-weight="bold">${site.id} (${site.lat}°, ${site.lon}°) · suelo ${entry.observer.groundHeightM} m</text>
<text x="${PAD - 4}" y="${y(hi)}" font-size="9" text-anchor="end">${hi}°</text>
<text x="${PAD - 4}" y="${y(lo)}" font-size="9" text-anchor="end">${lo}°</text>
${zero}<path d="${path(synth)}" fill="none" stroke="#999" stroke-width="1"/>
<path d="${path(lola)}" fill="none" stroke="#1b9e77" stroke-width="1.5"/>${lowMarks}${truncMarks}${ticks}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${ids.length * H + 30}" font-family="sans-serif">
<rect width="100%" height="100%" fill="#fff"/>
${panels.join("\n")}
<g transform="translate(${PAD} ${ids.length * H + 14})" font-size="10">
<rect width="14" height="3" y="-4" fill="#1b9e77"/><text x="18">horizonte LOLA (${table.algorithm})</text>
<rect x="210" width="14" height="3" y="-4" fill="#999"/><text x="228">horizonte sintético v1 (terrain.js)</text>
<rect x="420" width="4" height="8" y="-7" fill="#d95f02"/><text x="428">count = 0</text>
<rect x="500" width="4" height="8" y="-7" fill="#7570b3"/><text x="508">rayo truncado por cobertura</text>
</g></svg>
`;
}

export async function main(argv = process.argv.slice(2)) {
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  const rawDir = value("raw") ? resolve(process.cwd(), value("raw")) : DEFAULT_RAW;
  const outPath = value("out") ? resolve(process.cwd(), value("out")) : DEFAULT_OUT;
  const svgPath = value("svg") ? resolve(process.cwd(), value("svg")) : null;

  const demPath = join(rawDir, LOLA_PRODUCT.dem.image.name);
  const countsPath = join(rawDir, LOLA_PRODUCT.counts.image.name);
  assertSizes(demPath, countsPath);
  if (!argv.includes("--skip-md5")) {
    for (const [path, md5] of [
      [demPath, LOLA_PRODUCT.dem.image.md5],
      [countsPath, LOLA_PRODUCT.counts.image.md5],
    ]) {
      const actual = await md5File(path);
      if (actual !== md5) throw new Error(`${path}: MD5 ${actual} ≠ ${md5}`);
    }
  }

  const dem = readRaster(demPath, "float32");
  const counts = readRaster(countsPath, "int16");
  const table = buildTable({ dem, counts });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderModule(table));
  for (const [id, e] of Object.entries(table.sites)) {
    const s = e.summary;
    console.log(
      `${id}: suelo ${e.observer.groundHeightM} m; horizonte ${s.minDeg}°..${s.maxDeg}° (media ${s.meanDeg}°); ` +
        `count=0 en ${(s.lowConfidenceFraction * 100).toFixed(1)} % de azimuts; truncado en ${(s.truncatedFraction * 100).toFixed(1)} %`,
    );
  }
  for (const e of table.excluded) console.log(`${e.id}: excluido (${e.reason})`);
  console.log(`Escrito en ${outPath}`);
  if (svgPath) {
    mkdirSync(dirname(svgPath), { recursive: true });
    writeFileSync(svgPath, renderComparisonSvg(table));
    console.log(`Comparación en ${svgPath}`);
  }
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
