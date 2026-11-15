/**
 * Mapa de calor de toda la Luna (MAP-02, DEC-065): grilla global, decodificación
 * del atlas, muestreador LOLA global y coherencia con el traslado de efemérides
 * de CORE-03. Usa un atlas SINTÉTICO pequeño (horizonte conocido); el atlas real
 * se valida en tests/validacion/heat-atlas-global.test.js.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GLOBAL_HEAT_ATLAS_SCHEMA,
  clearGlobalHeatAtlas,
  decodeGlobalHeatAtlas,
  globalCellCenter,
  registerGlobalHeatAtlas,
} from "../src/lib/heat-map.js";
import { clearEphemerides, decodeEphemeris, derivedEphemerisFor, registerEphemeris } from "../src/lib/ephemeris.js";
import { computeGlobalHeatmap, earthVisible, sunVisible } from "../src/lib/analysis.js";
import { createGlobalCylindricalSampler } from "../src/lib/horizon-lola.js";
import { SITES } from "../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const loadAll = () => {
  for (const s of SITES) registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, `${s.id}.json`), "utf8"))));
};

/** Atlas global sintético: horizonte constante `h` (grados) en todas las celdas. */
function flatGlobalAtlas(cols, rows, h, azimuths = 72) {
  const cells = cols * rows;
  const buf = new ArrayBuffer(cells * azimuths * 2 + cells * 3);
  const view = new DataView(buf);
  for (let c = 0; c < cells; c++) {
    for (let k = 0; k < azimuths; k++) view.setInt16((c * azimuths + k) * 2, Math.round(h * 100), true);
  }
  const meta = { schema: GLOBAL_HEAT_ATLAS_SCHEMA, grid: { cols, rows, cellDeg: 360 / cols, azimuths }, source: { dataSetId: "SINTÉTICO" } };
  return decodeGlobalHeatAtlas(buf, meta);
}

beforeEach(() => {
  clearGlobalHeatAtlas();
  clearEphemerides();
});

test("globalCellCenter: fila 0 al norte y columna 0 desde −180°", () => {
  assert.deepEqual(globalCellCenter(0, 0, 180, 90), { lat: 89, lon: -179 });
  assert.deepEqual(globalCellCenter(179, 89, 180, 90), { lat: -89, lon: 179 });
  assert.deepEqual(globalCellCenter(90, 45, 180, 90), { lat: -1, lon: 1 });
});

test("decodeGlobalHeatAtlas: valida esquema y tamaño", () => {
  const a = flatGlobalAtlas(8, 4, 1.5);
  assert.equal(a.cols, 8);
  assert.equal(a.horizon[0], 1.5);
  assert.throws(() => decodeGlobalHeatAtlas(new ArrayBuffer(10), a.meta), /tamaño/);
  assert.throws(() => decodeGlobalHeatAtlas(new ArrayBuffer(10), { ...a.meta, schema: "otro" }), /esquema/);
});

test("muestreador global: longitud circular y polos sin cortes", () => {
  // Grilla de 2 px/grado con altura = número de columna (DN × 0,5 m → km).
  const grid = { lines: 360, samples: 720, pixelsPerDegree: 2, lineProjectionOffset: 179.5, sampleProjectionOffset: 359.5, centerLatitude: 0, centerLongitude: 180 };
  const n = grid.lines * grid.samples;
  const dem = new Int16Array(n);
  for (let i = 0; i < n; i++) dem[i] = (i % grid.samples) * 2; // metros = columna
  const counts = new Int16Array(n).fill(1);
  const sample = createGlobalCylindricalSampler({ dem, counts, grid, scalingFactor: 0.5 });
  // lon 359,9° → columna 719,3: entre la última (719) y la primera (0).
  const seam = sample(0, 359.9);
  assert.ok(seam, "no se corta en 0°/360°");
  assert.ok(Math.abs(seam.heightKm - (719 * 0.7 + 0 * 0.3) / 1000) < 1e-9);
  assert.ok(sample(90, 10) && sample(-90, 200), "el polo devuelve un valor");
  assert.equal(sample(91, 0), null);
  assert.equal(sample(0, 10).lowConfidence, false);
});

test("sin atlas global o sin efemérides: null (no hay versión aproximada)", () => {
  assert.equal(computeGlobalHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 2, mode: "sun" }), null);
  loadAll();
  assert.equal(computeGlobalHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 2, mode: "sun" }), null);
  registerGlobalHeatAtlas(flatGlobalAtlas(8, 4, 0));
  assert.equal(computeGlobalHeatmap({ startMs: Date.UTC(2029, 0, 1), windowDays: 2, mode: "sun" }), null, "fuera de Horizons");
  assert.throws(() => computeGlobalHeatmap({ startMs: 0, windowDays: 2, mode: "x" }), RangeError);
});

test("con atlas y efemérides: cada celda coincide con el traslado de CORE-03", () => {
  loadAll();
  registerGlobalHeatAtlas(flatGlobalAtlas(8, 4, 0.3));
  const startMs = Date.UTC(2026, 11, 1);
  const windowDays = 3;
  for (const mode of ["sun", "earth"]) {
    const map = computeGlobalHeatmap({ startMs, windowDays, mode });
    assert.equal(map.source.kind, "real");
    assert.equal(map.source.horizon, "lola-global-atlas");
    assert.equal(map.values.length, 32);
    const steps = windowDays * 24;
    for (const c of [0, 9, 18, 27, 31]) {
      const center = globalCellCenter(c % 8, Math.floor(c / 8), 8, 4);
      const d = derivedEphemerisFor({ ...center, custom: true });
      let hits = 0;
      for (let k = 0; k < steps; k++) {
        const p = d.at(startMs + k * 3_600_000);
        hits += mode === "earth" ? earthVisible(p.earth.elevation - 0.3, p.earth.radius) : sunVisible(p.sun.elevation - 0.3);
      }
      assert.ok(Math.abs(map.values[c] - hits / steps) <= 1 / steps + 1e-9, `${mode} celda ${c}`);
    }
  }
});

test("la cara oculta no ve la Tierra y la visible sí (cerca del ecuador)", () => {
  loadAll();
  registerGlobalHeatAtlas(flatGlobalAtlas(8, 4, 0));
  const map = computeGlobalHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 3, mode: "earth" });
  // Fila 1 (lat 22,5°): columna 4 (lon 22,5°) cara visible, columna 0 (lon −157,5°) cara oculta.
  assert.equal(map.values[1 * 8 + 4], 1);
  assert.equal(map.values[1 * 8 + 0], 0);
});

test("viabilidad global: puntos 0–6 con los mismos umbrales", () => {
  loadAll();
  registerGlobalHeatAtlas(flatGlobalAtlas(8, 4, 0));
  const map = computeGlobalHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 3, mode: "viability" });
  assert.equal(map.maxPoints, 6);
  for (let c = 0; c < 32; c++) {
    assert.ok(map.points[c] >= 0 && map.points[c] <= 6);
    assert.ok(Math.abs(map.values[c] - map.points[c] / 6) < 1e-6);
  }
});
