/**
 * Horizonte del punto sobre el DEM global LDEM_16 para puntos propios con
 * |lat| ≥ 60° (CORE-05, DEC-076): banda, orden de preferencia en el
 * escenario, caché y versión. DEM SINTÉTICO pequeño; la comparación con el
 * regional sobre datos reales está en tests/validacion/horizonte-polar-puntos.test.js.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { GLOBAL_DEM_SCHEMA, clearGlobalDem, decodeGlobalDem, globalDemVersion, globalHorizonFor, inPointHorizonBand, registerGlobalDem } from "../src/lib/global-dem.js";
import { needsGlobalDemHorizon, realDataVersion, scenarioHorizon } from "../src/lib/analysis.js";
import { SITES } from "../src/data/sites.js";

/** DEM global plano de 2 px/grado (altura 0). */
function flatDem() {
  const grid = { lines: 360, samples: 720, pixelsPerDegree: 2, lineProjectionOffset: 179.5, sampleProjectionOffset: 359.5, centerLatitude: 0, centerLongitude: 180, mapScaleKm: 15.16 };
  const n = grid.lines * grid.samples;
  const buf = new ArrayBuffer(n * 2 + Math.ceil(n / 8));
  const meta = {
    schema: GLOBAL_DEM_SCHEMA,
    grid,
    scalingFactor: 0.5,
    referenceRadiusKm: 1737.4,
    source: { dataSetId: "SINTÉTICO", doi: "10.0/x", dem: { productId: "LDEM_16", productVersion: "V3.1" } },
  };
  return decodeGlobalDem(buf, meta);
}

beforeEach(() => clearGlobalDem());

test("banda: |lat| ≥ 60°", () => {
  assert.equal(inPointHorizonBand(60), true);
  assert.equal(inPointHorizonBand(-60), true);
  assert.equal(inPointHorizonBand(59.9), false);
  assert.equal(inPointHorizonBand(-59.9), false);
  assert.equal(inPointHorizonBand(NaN), false);
});

test("needsGlobalDemHorizon: puntos propios entre −75° y −60° o al norte de +60°; nunca los curados", () => {
  const p = (lat) => ({ id: "custom-x", custom: true, lat, lon: 10 });
  assert.equal(needsGlobalDemHorizon(p(70)), true);
  assert.equal(needsGlobalDemHorizon(p(-65)), true);
  assert.equal(needsGlobalDemHorizon(p(-80)), false, "al sur de −75° manda el DEM polar reducido");
  assert.equal(needsGlobalDemHorizon(p(30)), false);
  for (const site of SITES) assert.equal(needsGlobalDemHorizon(site), false, site.id);
});

test("sin DEM global no hay horizonte del punto", () => {
  assert.equal(globalHorizonFor({ lat: 70, lon: 10 }), null);
});

test("con DEM: horizonte LOLA del punto en la banda, null fuera; esfera lisa → depresión del observador", () => {
  registerGlobalDem(flatDem());
  const h = globalHorizonFor({ lat: 70, lon: 10 });
  assert.equal(h.source, "lola");
  assert.equal(h.meta.global, true);
  assert.equal(h.meta.resolutionKm, 15.16);
  assert.equal(h.meta.product.dem.productId, "LDEM_16");
  for (const az of [0, 90, 180, 270]) assert.ok(h(az) < 0 && h(az) > -0.2, `azimut ${az}: ${h(az)}`);
  assert.equal(globalHorizonFor({ lat: 30, lon: 10 }), null);
  assert.equal(globalHorizonFor({ lat: 70, lon: 10 }), h, "cacheado por coordenadas");
});

test("escenario: el punto propio cerca del polo usa el horizonte del punto; los curados no cambian", () => {
  const before = realDataVersion();
  const v = globalDemVersion();
  registerGlobalDem(flatDem());
  assert.equal(globalDemVersion(), v + 1);
  assert.notEqual(realDataVersion(), before, "la versión de datos reales cambia y renueva los cachés");
  assert.equal(scenarioHorizon({ id: "custom-x", custom: true, lat: 75, lon: 0 }).meta.global, true);
  assert.equal(scenarioHorizon({ id: "custom-x", custom: true, lat: -65, lon: 0 }).meta.global, true);
  assert.notEqual(scenarioHorizon({ id: "custom-x", custom: true, lat: 20, lon: 0 }).meta?.global, true);
  for (const site of SITES) assert.notEqual(scenarioHorizon(site).meta?.global, true, site.id);
});
