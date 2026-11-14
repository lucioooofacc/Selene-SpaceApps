/**
 * Validación de la tabla versionada `src/data/terrain/lola-horizons.js`
 * (TERRAIN-02, DEC-030; TERRAIN-03, DEC-061): procedencia, forma, rangos,
 * unidades y cobertura. La prueba final, opcional, regenera las entradas
 * polares desde los rasters LOLA reales si están en LOLA_RAW_DIR (por defecto
 * web/data/raw) y exige que coincidan. Las de LDEM_128 se validan en
 * horizonte-lola-global.test.js.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { LOLA_HORIZONS } from "../../src/data/terrain/lola-horizons.js";
import { LOLA_PRODUCT } from "../../src/data/terrain/lola-ldem-60s-240m.js";
import { LOLA_GLOBAL_PRODUCT } from "../../src/data/terrain/lola-ldem-128.js";
import { SITES } from "../../src/data/sites.js";
import { HORIZON_ALGORITHM, HORIZON_PARAMS, createLolaHorizon, lolaHorizonCoverage } from "../../src/lib/horizon-lola.js";
import { isCovered } from "../../src/lib/terrain-data.js";

const T = LOLA_HORIZONS;
const N = 360 / HORIZON_PARAMS.azimuthStepDeg;

test("tabla: procedencia y parámetros coinciden con el producto y el algoritmo vigentes", () => {
  assert.equal(T.schema, "selene-lola-horizons/v1");
  assert.equal(T.algorithm, HORIZON_ALGORITHM);
  assert.deepEqual(T.params, { ...HORIZON_PARAMS, radiusKm: 1737.4 });
  assert.equal(T.source.doi, LOLA_PRODUCT.doi);
  assert.equal(T.source.dem.md5, LOLA_PRODUCT.dem.image.md5);
  assert.equal(T.source.counts.md5, LOLA_PRODUCT.counts.image.md5);
});

test("tabla: los 7 sitios curados tienen perfil; polar donde cubre LDEM_60S_240M y LDEM_128 en el resto", () => {
  const { sites, excluded } = lolaHorizonCoverage();
  assert.deepEqual(excluded, []);
  for (const site of SITES) {
    assert.ok(sites.includes(site.id), site.id);
    const { product } = createLolaHorizon(site.id).meta;
    if (isCovered(site.lat, site.lon)) {
      assert.equal(T.sites[site.id].source, undefined, site.id);
      assert.equal(product.dem.productId, LOLA_PRODUCT.dem.productId, site.id);
    } else {
      assert.equal(product.dem.productId, LOLA_GLOBAL_PRODUCT.dem.productId, site.id);
      assert.equal(product.productVersion, LOLA_GLOBAL_PRODUCT.productVersion, site.id);
      assert.equal(product.dem.md5, LOLA_GLOBAL_PRODUCT.dem.image.md5, site.id);
      assert.equal(product.counts.md5, LOLA_GLOBAL_PRODUCT.counts.image.md5, site.id);
      assert.equal(product.doi, LOLA_GLOBAL_PRODUCT.doi, site.id);
    }
  }
});

test("tabla: valores finitos, en rango y con la misma coordenada del catálogo", () => {
  for (const [id, e] of Object.entries(T.sites)) {
    const site = SITES.find((s) => s.id === id);
    assert.equal(e.lat, site.lat);
    assert.equal(e.lon, site.lon);
    for (const key of ["elevationDeg", "distanceKm", "lowConfidence", "coverageKm"]) assert.equal(e[key].length, N, `${id}.${key}`);
    for (let i = 0; i < N; i++) {
      assert.ok(Number.isFinite(e.elevationDeg[i]) && Math.abs(e.elevationDeg[i]) < 90, `${id} elev ${i}`);
      assert.ok(e.distanceKm[i] > 0 && e.distanceKm[i] <= e.coverageKm[i] + 1e-9, `${id} dist ${i}`);
      assert.ok(e.coverageKm[i] > 0 && e.coverageKm[i] <= T.params.maxDistanceKm, `${id} cov ${i}`);
      assert.ok(e.lowConfidence[i] === 0 || e.lowConfidence[i] === 1);
    }
    const h = createLolaHorizon(id);
    assert.equal(h.source, "lola");
    assert.ok(Math.abs(h(360) - h(0)) < 1e-12);
    assert.ok(Math.abs(h(359.99) - h(0)) < 0.05, `${id}: salto en 0°/360°`);
  }
});

test("tabla: Chandrayaan-3 (−69,4°) tiene rayos al norte truncados por el borde −60°", () => {
  const h = createLolaHorizon("chandrayaan3");
  assert.equal(h.detail(0).truncated, true);
  assert.equal(h.detail(180).truncated, false);
  assert.ok(h.meta.summary.truncatedFraction > 0);
});

// Prueba opcional con el producto real. No descarga nada.
const rawDir = process.env.LOLA_RAW_DIR ?? resolve(import.meta.dirname, "../../data/raw");
const demPath = join(rawDir, LOLA_PRODUCT.dem.image.name);
const countsPath = join(rawDir, LOLA_PRODUCT.counts.image.name);
const hasReal = existsSync(demPath) && existsSync(countsPath);

test("producto real: las entradas polares de la tabla se reproducen exactamente", { skip: !hasReal && "sin rasters reales" }, async () => {
  const { buildTable, readRaster } = await import("../../scripts/build-lola-horizons.mjs");
  const table = buildTable({ dem: readRaster(demPath, "float32"), counts: readRaster(countsPath, "int16") });
  const polar = Object.fromEntries(Object.entries(T.sites).filter(([, e]) => !e.source));
  assert.deepEqual(JSON.parse(JSON.stringify(table.sites)), JSON.parse(JSON.stringify(polar)));
  assert.deepEqual(table.source, T.source);
});
