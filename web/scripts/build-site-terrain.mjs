#!/usr/bin/env node
/**
 * Terreno precalculado de los sitios curados que quedan fuera del DEM polar
 * reducido (TERRAIN-04, DEC-067): altura, pendientes, rugosidad y desnivel
 * con `siteTerrain()` (DEC-059) sobre las ventanas de `LDEM_128` + `LDEC_128`
 * (237 m/píxel, TERRAIN-03, DEC-061). Escribe `src/data/terrain/site-terrain.js`.
 *
 * Usa el mismo paso (0,96 km) y radio (3 km) que el cálculo polar, para que
 * las cifras de todos los sitios de la lista sean comparables.
 *
 * Entrada: `data/derived/lola-128/` (lo genera `extract-lola-global.mjs`, que
 * verifica tamaño y MD5 de las imágenes completas).
 *
 * Uso (desde web/): node scripts/build-site-terrain.mjs [--global data/derived/lola-128]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { SITES } from "../src/data/sites.js";
import { LOLA_GLOBAL_PRODUCT as P } from "../src/data/terrain/lola-ldem-128.js";
import { createCylindricalWindowSampler } from "../src/lib/horizon-lola.js";
import { POLAR_DEM_COVERAGE_LATITUDE } from "../src/lib/polar-dem.js";
import { siteTerrain } from "../src/lib/site-terrain.js";
import { loadGlobalWindows } from "./build-lola-horizons.mjs";
import { DEFAULT_GLOBAL_OUT } from "./extract-lola-global.mjs";

const WEB_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
export const FINE_TERRAIN_PARAMS = Object.freeze({ stepKm: 0.96, radiusKm: 3 });
const round = (v, d) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Redondea las cifras a lo que muestra el informe (no agrega precisión falsa al archivo). */
function compact(t) {
  const a = t.area;
  return {
    heightKm: round(t.heightKm, 4),
    slopeDeg: round(t.slopeDeg, 2),
    area: {
      radiusKm: a.radiusKm,
      points: a.points,
      meanSlope: round(a.meanSlope, 2),
      maxSlope: round(a.maxSlope, 2),
      below: Object.fromEntries(Object.entries(a.below).map(([k, v]) => [k, round(v, 1)])),
      roughnessM: round(a.roughnessM, 1),
      reliefM: round(a.reliefM, 1),
      lowConfidencePct: round(a.lowConfidencePct, 1),
    },
  };
}

export function buildSiteTerrain(windows) {
  const sites = {};
  for (const site of SITES) {
    if (site.lat <= POLAR_DEM_COVERAGE_LATITUDE) continue; // lo cubre el DEM polar reducido
    const win = windows.sites[site.id];
    if (!win) throw new Error(`${site.id}: sin ventana de LDEM_128`);
    const sampler = createCylindricalWindowSampler({ dem: win.dem, counts: win.counts, window: win.window, grid: P.grid, scalingFactor: P.dem.scalingFactor });
    const terrain = siteTerrain(sampler, site, FINE_TERRAIN_PARAMS);
    if (!terrain) throw new Error(`${site.id}: la ventana no cubre el sitio`);
    sites[site.id] = { lat: site.lat, lon: site.lon, terrain: compact(terrain) };
  }
  return sites;
}

export function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({ args: argv, options: { global: { type: "string" } } });
  const windows = loadGlobalWindows(values.global ? resolve(process.cwd(), values.global) : DEFAULT_GLOBAL_OUT);
  const table = {
    schema: "selene-site-terrain/v1",
    resolutionM: P.grid.mapScaleM,
    params: FINE_TERRAIN_PARAMS,
    source: {
      dataSetId: P.dataSetId,
      doi: P.doi,
      dem: { productId: P.dem.productId, productVersion: P.productVersion, md5: P.dem.image.md5 },
      counts: { productId: P.counts.productId, md5: P.counts.image.md5 },
    },
    sites: buildSiteTerrain(windows),
  };
  const body = [
    "/**",
    " * GENERADO por web/scripts/build-site-terrain.mjs. No editar a mano.",
    " *",
    " * Terreno de los sitios curados fuera del DEM polar reducido (TERRAIN-04,",
    " * DEC-067), calculado con siteTerrain() (DEC-059) sobre LDEM_128 V3.0 +",
    " * LDEC_128 (237 m/píxel). heightKm: altura sobre la esfera de 1737,4 km;",
    " * pendientes en grados; rugosidad y desnivel en metros; lowConfidencePct:",
    " * % de puntos con píxeles interpolados (count = 0).",
    " */",
    `export const SITE_TERRAIN = Object.freeze(${JSON.stringify(table, null, 2)});`,
    "",
  ].join("\n");
  writeFileSync(resolve(WEB_ROOT, "src/data/terrain/site-terrain.js"), body);
  for (const [id, s] of Object.entries(table.sites)) console.log(`${id}: ${(s.terrain.heightKm * 1000).toFixed(0)} m, pendiente ${s.terrain.slopeDeg}°, media ${s.terrain.area.meanSlope}°`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
