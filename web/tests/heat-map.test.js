/**
 * Mapa de calor con datos reales (MAP-01, DEC-038): geometría de la grilla,
 * decodificación del atlas, coherencia con el traslado de efemérides de
 * CORE-03 y caída al cálculo aproximado. Usa un atlas SINTÉTICO pequeño
 * (horizonte conocido); el atlas real se valida en tests/validacion/.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HEAT_ATLAS_SCHEMA,
  cellCenter,
  clearHeatAtlas,
  computeRealHeatmap,
  decodeHeatAtlas,
  heatAtlasFor,
  registerHeatAtlas,
} from "../src/lib/heat-map.js";
import { clearEphemerides, decodeEphemeris, derivedEphemerisFor, registerEphemeris } from "../src/lib/ephemeris.js";
import { computePolarHeatmap, earthVisible, sunVisible } from "../src/lib/analysis.js";
import { SITES } from "../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const loadAll = () => {
  for (const s of SITES) registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, `${s.id}.json`), "utf8"))));
};

/** Atlas sintético: horizonte constante `h` (grados) en todas las celdas del disco. */
function flatAtlas(size, minLat, h, azimuths = 72) {
  const cells = size * size;
  const buf = new ArrayBuffer(cells * azimuths * 2 + cells * 3);
  const view = new DataView(buf);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = y * size + x;
      const inside = cellCenter(x, y, size, minLat) !== null;
      for (let k = 0; k < azimuths; k++) view.setInt16((c * azimuths + k) * 2, inside ? Math.round(h * 100) : -32768, true);
      view.setInt16(cells * azimuths * 2 + c * 2, 0, true);
    }
  }
  const meta = { schema: HEAT_ATLAS_SCHEMA, grid: { size, minLat, azimuths, azStepDeg: 360 / azimuths }, source: { dataSetId: "SINTÉTICO" } };
  return decodeHeatAtlas(buf, meta);
}

beforeEach(() => {
  clearHeatAtlas();
  clearEphemerides();
});

test("cellCenter: disco hasta minLat, celdas fuera del disco nulas", () => {
  assert.equal(cellCenter(0, 0, 8, -80), null); // esquina
  const c = cellCenter(4, 4, 8, -80);
  assert.ok(c.lat < -88 && c.lat > -90);
  const edge = cellCenter(0, 3, 8, -80);
  assert.ok(edge.lat <= -80 && edge.lat > -81.5);
});

test("decodeHeatAtlas: valida esquema y tamaño", () => {
  const a = flatAtlas(4, -80, 1);
  assert.equal(a.size, 4);
  assert.throws(() => decodeHeatAtlas(new ArrayBuffer(10), a.meta));
  assert.throws(() => decodeHeatAtlas(new ArrayBuffer(10), { schema: "otro" }));
});

test("sin atlas o sin efemérides: cálculo aproximado, informado", () => {
  const map = computePolarHeatmap({ startMs: Date.UTC(2026, 10, 14), windowDays: 2, mode: "sun", size: 8, minLat: -80 });
  assert.equal(map.source.kind, "approximate");
  registerHeatAtlas(flatAtlas(8, -80, 0));
  assert.equal(heatAtlasFor(8, -80).size, 8);
  assert.equal(heatAtlasFor(16, -80), null);
  // Atlas sí, efemérides no: sigue aproximado.
  assert.equal(computePolarHeatmap({ startMs: Date.UTC(2026, 10, 14), windowDays: 2, mode: "sun", size: 8, minLat: -80 }).source.kind, "approximate");
});

test("con atlas y efemérides: real, y cada celda coincide con el traslado de CORE-03", () => {
  loadAll();
  registerHeatAtlas(flatAtlas(8, -80, 0.3));
  const startMs = Date.UTC(2026, 11, 1);
  const windowDays = 5;
  for (const mode of ["sun", "earth"]) {
    const map = computePolarHeatmap({ startMs, windowDays, mode, size: 8, minLat: -80 });
    assert.equal(map.source.kind, "real");
    assert.equal(map.source.horizon, "lola-atlas");
    const steps = windowDays * 24;
    for (const [x, y] of [[4, 4], [2, 3], [6, 5], [1, 4]]) {
      const center = cellCenter(x, y, 8, -80);
      const d = derivedEphemerisFor({ ...center, custom: true });
      let hits = 0;
      for (let k = 0; k < steps; k++) {
        const p = d.at(startMs + k * 3_600_000);
        hits += mode === "earth" ? earthVisible(p.earth.elevation - 0.3, p.earth.radius) : sunVisible(p.sun.elevation - 0.3);
      }
      // Mismo cálculo por dos caminos; puede diferir en una muestra justo en el borde.
      assert.ok(Math.abs(map.values[y * 8 + x] - hits / steps) <= 1 / steps + 1e-9, `${mode} (${x}, ${y})`);
    }
    assert.equal(map.values[0], -1); // fuera del disco
  }
});

test("fuera del rango de Horizons: vuelve al aproximado", () => {
  loadAll();
  registerHeatAtlas(flatAtlas(8, -80, 0));
  const map = computePolarHeatmap({ startMs: Date.UTC(2029, 0, 1), windowDays: 2, mode: "sun", size: 8, minLat: -80 });
  assert.equal(map.source.kind, "approximate");
  assert.equal(computeRealHeatmap({ startMs: Date.UTC(2029, 0, 1), windowDays: 2, mode: "sun", size: 8, minLat: -80, sunVisible, earthVisible }), null);
});

test("modos nuevos: 'both' acota a luz y Tierra; 'viability' usa los requisitos de los sitios", async () => {
  const { HEAT_MODES, viabilityFrom } = await import("../src/lib/analysis.js");
  assert.deepEqual(HEAT_MODES, ["sun", "earth", "both", "viability"]);
  assert.throws(() => computePolarHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 2, mode: "otro", size: 8, minLat: -80 }), RangeError);
  for (const real of [false, true]) {
    clearEphemerides();
    clearHeatAtlas();
    if (real) {
      loadAll();
      registerHeatAtlas(flatAtlas(8, -80, 0.3));
    }
    const o = { startMs: Date.UTC(2026, 11, 1), windowDays: 5, size: 8, minLat: -80 };
    const sun = computePolarHeatmap({ ...o, mode: "sun" });
    const earth = computePolarHeatmap({ ...o, mode: "earth" });
    const both = computePolarHeatmap({ ...o, mode: "both" });
    const via = computePolarHeatmap({ ...o, mode: "viability" });
    assert.equal(both.source.kind, real ? "real" : "approximate");
    for (let c = 0; c < 64; c++) {
      if (sun.values[c] < 0) {
        assert.equal(via.levels[c], null);
        continue;
      }
      const s = sun.values[c];
      const e = earth.values[c];
      assert.ok(both.values[c] <= Math.min(s, e) + 1e-6, `celda ${c}`);
      assert.ok(both.values[c] >= s + e - 1 - 1e-6, `celda ${c}`);
      assert.equal(via.components.sun[c], s);
      assert.equal(via.components.earth[c], e);
      // Mismo cálculo que un sitio (DEC-071): noche más larga y % con la Tierra.
      const expected = viabilityFrom({ light: via.components.night[c], communication: 100 * e }).overall;
      assert.equal(via.levels[c], expected);
      assert.equal(via.values[c], { low: 0, mid: 0.5, high: 1 }[expected]);
    }
  }
});
