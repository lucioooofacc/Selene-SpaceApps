/**
 * Datos reales para puntos propios (CORE-03, DEC-034): efemérides trasladadas
 * desde otro sitio y horizonte LOLA sobre el DEM polar reducido. Las
 * tolerancias son los errores medidos contra los datos completos (series
 * Horizons propias de cada sitio y horizonte LOLA de 240 m de TERRAIN-02).
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { clearEphemerides, decodeEphemeris, derivedEphemerisFor, positionsAt, registerEphemeris } from "../src/lib/ephemeris.js";
import {
  POLAR_DEM_COVERAGE_LATITUDE,
  clearPolarDem,
  decodePolarDem,
  polarDemCovers,
  polarDemVersion,
  polarHorizonFor,
  registerPolarDem,
} from "../src/lib/polar-dem.js";
import { createLolaHorizon } from "../src/lib/horizon-lola.js";
import { computeScenario, needsPolarDem, realDataVersion, scenarioHorizon } from "../src/lib/analysis.js";
import { SITES } from "../src/data/sites.js";

const PUB = resolve(import.meta.dirname, "../public/data");
const site = (id) => SITES.find((s) => s.id === id);
const eph = (id) => decodeEphemeris(JSON.parse(readFileSync(resolve(PUB, "ephemerides", `${id}.json`), "utf8")));
function level(m) {
  const meta = JSON.parse(readFileSync(resolve(PUB, "terrain", `lola-polar-${m}m.json`), "utf8"));
  const b = readFileSync(resolve(PUB, "terrain", `lola-polar-${m}m.bin`));
  return decodePolarDem(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), meta);
}
const angDiff = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

beforeEach(() => {
  clearEphemerides();
  clearPolarDem();
});

test("traslado: el Sol y la Tierra coinciden con la serie real de otro sitio", () => {
  // Pares que cruzan la Luna (Apollo 11 → Malapert) y vecinos polares.
  for (const [from, to, tolEarth] of [["apollo11", "malapert", 0.03], ["shackleton", "apollo11", 0.03], ["im1", "cabeus", 0.01]]) {
    clearEphemerides();
    registerEphemeris(eph(from));
    const target = eph(to);
    const d = derivedEphemerisFor({ ...target.site, custom: true });
    assert.equal(d.meta.derivedFrom, from);
    for (let k = 0; k < target.rows; k += 97) {
      const t = target.startMs + k * target.stepMs;
      const a = d.at(t);
      const b = positionsAt(target, t);
      assert.ok(Math.abs(a.sun.elevation - b.sun.elevation) < 0.003, `${from}→${to} Sol elev ${k}`);
      assert.ok(angDiff(a.sun.azimuth, b.sun.azimuth) * Math.cos((b.sun.elevation * Math.PI) / 180) < 0.003);
      assert.ok(Math.abs(a.earth.elevation - b.earth.elevation) < tolEarth, `${from}→${to} Tierra elev ${k}`);
      // La fase de la Tierra cambia apenas de un punto a otro (medido ≤ 0,12 %).
      assert.ok(Math.abs(a.earth.phase - b.earth.phase) < 0.002);
    }
  }
});

test("traslado: sin series registradas no hay datos; fuera del rango, null", () => {
  assert.equal(derivedEphemerisFor({ lat: -85, lon: 10 }), null);
  registerEphemeris(eph("malapert"));
  const d = derivedEphemerisFor({ lat: -85, lon: 10, custom: true });
  assert.equal(d.at(Date.UTC(2030, 0, 1)), null);
});

test("DEM reducido: archivos coherentes y cobertura hasta −75°", () => {
  const fine = level(480);
  const coarse = level(960);
  assert.equal(fine.grid.scaleM, 480);
  assert.equal(coarse.grid.scaleM, 960);
  assert.equal(coarse.grid.maxLatitude, POLAR_DEM_COVERAGE_LATITUDE);
  assert.equal(fine.meta.source.dem.md5, coarse.meta.source.dem.md5);
  const v = polarDemVersion();
  registerPolarDem([coarse, fine]);
  assert.ok(polarDemVersion() > v);
  assert.equal(polarDemCovers({ lat: -76, lon: 0 }), true);
  assert.equal(polarDemCovers({ lat: -74, lon: 0 }), false);
  assert.equal(polarHorizonFor({ lat: -70, lon: 10, custom: true }), null);
});

test("DEM reducido: horizonte cerca del de 240 m (errores medidos, DEC-034)", () => {
  registerPolarDem([level(480), level(960)]);
  // Error medio y máximo medidos al crear el DEM; margen pequeño por redondeos.
  // shackleton = R01 Connecting Ridge desde DEC-035 (medido 0,38° / 1,07°).
  const limits = { shackleton: [0.45, 1.2], malapert: [0.25, 1.0], cabeus: [0.05, 0.15], im1: [0.85, 2.0] };
  for (const [id, [meanMax, maxMax]] of Object.entries(limits)) {
    const full = createLolaHorizon(id);
    const red = polarHorizonFor({ ...site(id), custom: true });
    assert.equal(red.source, "lola");
    assert.equal(red.meta.reduced, true);
    assert.deepEqual(red.meta.resolutionsM, [480, 960]);
    let sum = 0;
    let max = 0;
    for (let a = 0; a < 360; a++) {
      const d = Math.abs(red(a) - full(a));
      sum += d;
      max = Math.max(max, d);
    }
    assert.ok(sum / 360 < meanMax, `${id}: error medio ${sum / 360}`);
    assert.ok(max < maxMax, `${id}: error máx ${max}`);
    assert.ok(Math.abs(red.meta.observer.groundHeightM - full.meta.observer.groundHeightM) < 20);
    assert.ok(Math.abs(red(0) - red(360)) < 1e-12);
    assert.ok(typeof red.detail(45).truncated === "boolean");
  }
});

test("selección del horizonte: curado 240 m > reducido > sintético", () => {
  const point = { id: "custom-1", lat: -85.2, lon: 20, custom: true };
  assert.equal(needsPolarDem(point), true);
  assert.equal(needsPolarDem(site("malapert")), false); // tiene el de 240 m
  assert.equal(needsPolarDem({ id: "custom-2", lat: -60, lon: 0, custom: true }), false);
  assert.equal(scenarioHorizon(point).source, undefined); // sin DEM cargado: sintético
  const before = realDataVersion();
  registerPolarDem([level(480), level(960)]);
  assert.notEqual(realDataVersion(), before);
  assert.equal(scenarioHorizon(point).meta.reduced, true);
  assert.equal(scenarioHorizon(site("malapert")).meta.reduced, undefined);
  const moved = { ...site("malapert"), lat: site("malapert").lat + 0.05 };
  assert.equal(scenarioHorizon(moved).meta.reduced, true);
});

test("escenario de un punto propio polar: Sol y Tierra trasladados y horizonte LOLA reducido", () => {
  for (const s of SITES) registerEphemeris(eph(s.id));
  registerPolarDem([level(480), level(960)]);
  const sc = computeScenario({ id: "custom-1", lat: -85.2, lon: 20, custom: true }, Date.UTC(2026, 10, 14), 2);
  assert.equal(sc.ephemeris.source, "horizons");
  assert.equal(sc.ephemeris.derived, true);
  assert.equal(sc.horizon.meta.reduced, true);
  assert.ok(sc.summary.illumination >= 0 && sc.summary.illumination <= 100);
});

test("Datos y fuentes: Sol y Tierra trasladados son reales; horizonte reducido, aproximado", async () => {
  const { qualityRows } = await import("../src/ui/provenance.js");
  for (const s of SITES) registerEphemeris(eph(s.id));
  registerPolarDem([level(480), level(960)]);
  const point = { id: "custom-1", lat: -85.2, lon: 20, custom: true };
  const sc = computeScenario(point, Date.UTC(2026, 10, 14), 1);
  const rows = Object.fromEntries(qualityRows(point, sc).map((r) => [r.key, r]));
  assert.equal(rows.ephemeris.kind, "real");
  assert.equal(rows.ephemeris.hint, "ephemerisDerived");
  assert.equal(rows.horizon.kind, "approx");
  assert.equal(rows.horizon.hint, "horizonReduced");
});
