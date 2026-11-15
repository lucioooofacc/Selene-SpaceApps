/**
 * DEM LOLA global y elección de la fuente del terreno (TERRAIN-04, DEC-067).
 * Usa un DEM SINTÉTICO pequeño; el archivo real se valida en
 * tests/validacion/terreno-global.test.js.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { GLOBAL_DEM_SCHEMA, clearGlobalDem, decodeGlobalDem, globalDemSample, registerGlobalDem } from "../src/lib/global-dem.js";
import { GLOBAL_TERRAIN_PARAMS, needsGlobalDem, terrainForSite } from "../src/lib/site-terrain.js";

/** DEM de 2 px/grado: plano inclinado hacia el norte (10 m por grado de latitud). */
function syntheticDem({ interpolated = [] } = {}) {
  const grid = { lines: 360, samples: 720, pixelsPerDegree: 2, lineProjectionOffset: 179.5, sampleProjectionOffset: 359.5, centerLatitude: 0, centerLongitude: 180, mapScaleKm: 15.16 };
  const n = grid.lines * grid.samples;
  const buf = new ArrayBuffer(n * 2 + Math.ceil(n / 8));
  const view = new DataView(buf);
  for (let line = 0; line < grid.lines; line++) {
    const lat = (grid.lineProjectionOffset - line) / grid.pixelsPerDegree;
    for (let s = 0; s < grid.samples; s++) view.setInt16((line * grid.samples + s) * 2, Math.round(lat * 10 * 2), true); // DN = metros × 2
  }
  const mask = new Uint8Array(buf, n * 2);
  for (const i of interpolated) mask[i >> 3] |= 1 << (i & 7);
  return { buf, meta: { schema: GLOBAL_DEM_SCHEMA, grid, scalingFactor: 0.5 } };
}

beforeEach(() => clearGlobalDem());

test("decodeGlobalDem: valida esquema y tamaño, y lee alturas y máscara", () => {
  const { buf, meta } = syntheticDem({ interpolated: [0] });
  assert.throws(() => decodeGlobalDem(buf, { ...meta, schema: "otro" }), /esquema/);
  assert.throws(() => decodeGlobalDem(new ArrayBuffer(8), meta), /bytes/);
  const dem = decodeGlobalDem(buf, meta);
  assert.equal(dem.resolutionKm, 15.16);
  assert.ok(Math.abs(dem.sample(30, 45).heightKm - 0.3) < 1e-9, "30° N → 300 m");
  assert.equal(dem.sample(30, 45).lowConfidence, false);
  assert.equal(dem.sample(89.75, 0).lowConfidence, true, "el píxel 0 está marcado como interpolado");
});

test("globalDemSample: null hasta registrar el DEM", () => {
  assert.equal(globalDemSample(0, 0), null);
  const { buf, meta } = syntheticDem();
  registerGlobalDem(decodeGlobalDem(buf, meta));
  assert.ok(globalDemSample(0, 0));
});

test("needsGlobalDem: solo fuera del DEM polar y sin terreno precalculado", () => {
  assert.equal(needsGlobalDem({ lat: -80, lon: 0 }), false, "lo cubre el DEM polar reducido");
  assert.equal(needsGlobalDem({ lat: 10, lon: 20 }), true, "punto propio fuera del polo");
  assert.equal(needsGlobalDem({ lat: NaN, lon: 0 }), false);
});

test("terrainForSite: usa el DEM global con sus parámetros y avisa la fuente", () => {
  assert.equal(terrainForSite({ lat: 10, lon: 20 }), null, "sin DEM cargado no hay terreno");
  const { buf, meta } = syntheticDem();
  registerGlobalDem(decodeGlobalDem(buf, meta));
  const found = terrainForSite({ lat: 10, lon: 20 });
  assert.equal(found.source, "global");
  assert.equal(found.resolutionM, 15160);
  assert.equal(found.terrain.area.radiusKm, GLOBAL_TERRAIN_PARAMS.radiusKm);
  // Plano de 10 m por grado (30,32 km): pendiente de atan(0,01 / 30,32) ≈ 0,019°.
  assert.ok(Math.abs(found.terrain.slopeDeg - 0.0189) < 0.002);
  assert.ok(Math.abs(found.terrain.area.meanSlope - found.terrain.slopeDeg) < 0.002);
});
