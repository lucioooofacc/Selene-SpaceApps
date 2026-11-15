/**
 * Horizonte LOLA regional de puntos propios (DEC-068): interpolación del atlas
 * global, interfaz de horizonte LOLA y orden de preferencia en el escenario.
 * Atlas SINTÉTICO para la interpolación y atlas REAL para la coherencia con
 * los horizontes de alta resolución en latitudes medias.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GLOBAL_HEAT_ATLAS_SCHEMA, clearGlobalHeatAtlas, decodeGlobalHeatAtlas, globalCellCenter, regionalHorizonFor, registerGlobalHeatAtlas } from "../src/lib/heat-map.js";
import { clearEphemerides, decodeEphemeris, registerEphemeris } from "../src/lib/ephemeris.js";
import { computeScenario, needsRegionalAtlas, scenarioHorizon } from "../src/lib/analysis.js";
import { SITES } from "../src/data/sites.js";

const PUBLIC = resolve(import.meta.dirname, "../public/data");

/** Atlas global sintético de 8 × 4 celdas: horizonte = `value(celda)` grados en todos los azimuts. */
function atlas(value, azimuths = 8) {
  const cols = 8;
  const rows = 4;
  const cells = cols * rows;
  const buf = new ArrayBuffer(cells * azimuths * 2 + cells * 3);
  const view = new DataView(buf);
  for (let c = 0; c < cells; c++) {
    for (let k = 0; k < azimuths; k++) view.setInt16((c * azimuths + k) * 2, Math.round(value(c, k) * 100), true);
    view.setInt16(cells * azimuths * 2 + c * 2, 100 * c, true); // suelo: 100 m por celda
    view.setUint8(cells * azimuths * 2 + cells * 2 + c, 10);
  }
  const meta = {
    schema: GLOBAL_HEAT_ATLAS_SCHEMA,
    grid: { cols, rows, cellDeg: 45, azimuths },
    params: { maxDistanceKm: 300, stepKm: 0.95, observerHeightM: 2, algorithm: "selene-lola-horizon/v1" },
    source: { dataSetId: "SINTÉTICO", doi: "10.0/x", dem: { productId: "LDEM_16", productVersion: "V3.1" } },
  };
  return decodeGlobalHeatAtlas(buf, meta);
}

beforeEach(() => {
  clearGlobalHeatAtlas();
  clearEphemerides();
});

test("sin atlas global no hay horizonte regional", () => {
  assert.equal(regionalHorizonFor({ lat: 10, lon: 20 }), null);
  assert.equal(scenarioHorizon({ id: "custom", custom: true, lat: 10, lon: 20 }).source, undefined, "cae al sintético");
});

test("en el centro de una celda devuelve su horizonte; entre dos, el promedio", () => {
  registerGlobalHeatAtlas(atlas((c) => c)); // la celda c vale c grados
  const a = globalCellCenter(2, 1, 8, 4); // celda 10
  const b = globalCellCenter(3, 1, 8, 4); // celda 11
  assert.ok(Math.abs(regionalHorizonFor(a)(90) - 10) < 1e-6);
  assert.ok(Math.abs(regionalHorizonFor({ lat: a.lat, lon: (a.lon + b.lon) / 2 })(90) - 10.5) < 1e-6);
});

test("la longitud es circular y los polos repiten la última fila", () => {
  registerGlobalHeatAtlas(atlas((c) => c % 8)); // vale el número de columna
  // En 180° de longitud está el borde entre la columna 7 y la 0: promedio 3,5.
  assert.ok(Math.abs(regionalHorizonFor({ lat: 22.5, lon: 180 })(0) - 3.5) < 1e-6);
  assert.ok(Math.abs(regionalHorizonFor({ lat: 22.5, lon: -180 })(0) - 3.5) < 1e-6);
  assert.ok(Number.isFinite(regionalHorizonFor({ lat: 90, lon: 0 })(0)));
  assert.ok(Number.isFinite(regionalHorizonFor({ lat: -90, lon: 0 })(0)));
});

test("tiene la interfaz de un horizonte LOLA y se declara regional", () => {
  registerGlobalHeatAtlas(atlas((c, k) => k)); // vale el índice de azimut
  const h = regionalHorizonFor({ lat: 10, lon: 20 });
  assert.equal(h.source, "lola");
  assert.equal(h.meta.regional, true);
  assert.equal(h.meta.cellDeg, 45);
  assert.equal(h.meta.lowConfidencePct, 10);
  assert.equal(h.meta.product.dem.productId, "LDEM_16");
  assert.ok(Math.abs(h(45) - 1) < 1e-6 && Math.abs(h(67.5) - 1.5) < 1e-6, "interpola entre azimuts");
  assert.equal(h.detail(45).distanceKm, null, "el atlas no guarda la distancia");
  assert.equal(h.detail(45).truncated, false);
  assert.equal(h.meta.summary.truncatedFraction, 0);
});

test("orden de preferencia: un sitio curado conserva su horizonte de alta resolución", () => {
  registerGlobalHeatAtlas(atlas(() => 1));
  const apollo = SITES.find((s) => s.id === "apollo11");
  assert.equal(needsRegionalAtlas(apollo), false);
  assert.notEqual(scenarioHorizon(apollo).meta.regional, true);
  const moved = { ...apollo, lat: apollo.lat + 1 };
  assert.equal(needsRegionalAtlas(moved), true);
  assert.equal(scenarioHorizon(moved).meta.regional, true, "con coordenadas editadas usa el regional");
});

test("atlas real: en latitudes medias el regional da la misma luz que el horizonte de alta resolución", () => {
  for (const s of SITES) registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(PUBLIC, `ephemerides/${s.id}.json`), "utf8"))));
  const bin = readFileSync(resolve(PUBLIC, "terrain/heat-atlas-global-2deg.bin"));
  const meta = JSON.parse(readFileSync(resolve(PUBLIC, "terrain/heat-atlas-global-2deg.json"), "utf8"));
  registerGlobalHeatAtlas(decodeGlobalHeatAtlas(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta));
  const startMs = Date.UTC(2026, 11, 1);
  for (const id of ["chandrayaan3", "change4", "apollo11"]) {
    const site = SITES.find((s) => s.id === id);
    const fine = computeScenario(site, startMs, 30);
    const regional = computeScenario({ id: "custom", custom: true, lat: site.lat, lon: site.lon }, startMs, 30);
    assert.equal(regional.horizon.meta.regional, true);
    // Tolerancia del equipo: 2 p. p. (medido: hasta 0,9 p. p.).
    assert.ok(Math.abs(regional.summary.illumination - fine.summary.illumination) < 2, `${id}: luz`);
    assert.ok(Math.abs(regional.summary.communication - fine.summary.communication) < 2, `${id}: Tierra`);
  }
});
