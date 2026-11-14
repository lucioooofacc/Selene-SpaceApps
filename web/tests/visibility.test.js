/**
 * Política de visibilidad única (CORE-02, DEC-036): Sol visible con al menos
 * medio disco, Tierra visible con cualquier parte, potencia ∝ fracción del
 * disco, radios de Horizons por instante y la misma regla en el mapa de calor.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VISIBILITY_POLICY,
  computePolarHeatmap,
  computeScenario,
  discFraction,
  earthVisible,
  sunVisible,
} from "../src/lib/analysis.js";
import { clearEphemerides, decodeEphemeris, positionsAt, registerEphemeris } from "../src/lib/ephemeris.js";
import { EARTH_RADIUS, SUN_RADIUS, earthPosition, sunPosition } from "../src/lib/astro.js";
import { createHorizon } from "../src/lib/terrain.js";
import { SITES } from "../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const eph = (id) => decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8")));
const site = (id) => SITES.find((s) => s.id === id);

beforeEach(() => clearEphemerides());

test("discFraction: área exacta del segmento circular", () => {
  assert.equal(discFraction(-1, 0.25), 0);
  assert.equal(discFraction(-0.25, 0.25), 0);
  assert.ok(Math.abs(discFraction(0, 0.25) - 0.5) < 1e-12);
  assert.equal(discFraction(0.25, 0.25), 1);
  // Simetría: lo que falta arriba es lo que asoma abajo.
  for (const m of [0.05, 0.1, 0.2]) assert.ok(Math.abs(discFraction(m, 0.25) + discFraction(-m, 0.25) - 1) < 1e-12);
  // Centro a medio radio sobre el horizonte: 1 − (acos(0,5) − 0,5·√0,75)/π ≈ 0,8045.
  assert.ok(Math.abs(discFraction(0.125, 0.25) - 0.8045) < 1e-4);
  // Monótona.
  let prev = -1;
  for (let m = -0.3; m <= 0.3; m += 0.01) {
    const f = discFraction(m, 0.25);
    assert.ok(f >= prev);
    prev = f;
  }
});

test("Sol: visible con al menos medio disco; Tierra: con cualquier parte", () => {
  assert.deepEqual(VISIBILITY_POLICY, { sun: "half-disc", earth: "any-part", power: "visible-disc-fraction" });
  assert.equal(sunVisible(0.001), true);
  assert.equal(sunVisible(0), false);
  assert.equal(sunVisible(-0.1), false);
  assert.equal(earthVisible(-0.94, 0.95), true);
  assert.equal(earthVisible(-0.95, 0.95), false);
  assert.equal(earthVisible(-0.94, 0.9), false); // con un radio real menor, ya no asoma
});

test("el escenario usa la política y los radios de Horizons en cada muestra", () => {
  registerEphemeris(eph("malapert"));
  const start = Date.UTC(2026, 10, 14);
  const sc = computeScenario(site("malapert"), start, 3);
  assert.equal(sc.visibility, VISIBILITY_POLICY);
  const e = sc.series;
  for (let i = 0; i < sc.windowSteps; i++) {
    const p = positionsAt(eph("malapert"), e.times[i]);
    const sunMargin = e.sunEl[i] - e.sunHz[i];
    const earthMargin = e.earthEl[i] - e.earthHz[i];
    assert.equal(e.sunVis[i], sunVisible(sunMargin) ? 1 : 0);
    assert.equal(e.earthVis[i], earthVisible(earthMargin, p.earth.radius) ? 1 : 0);
    assert.ok(e.power[i] <= discFraction(sunMargin, p.sun.radius) + 1e-6);
  }
  assert.ok(sc.windowSteps > 0);
});

test("sin Horizons, el escenario usa los radios medios", () => {
  const sc = computeScenario({ id: "x", lat: -85, lon: 10, custom: true }, Date.UTC(2026, 10, 14), 1);
  const e = sc.series;
  for (let i = 0; i < sc.windowSteps; i++) {
    assert.equal(e.earthVis[i], earthVisible(e.earthEl[i] - e.earthHz[i], EARTH_RADIUS) ? 1 : 0);
  }
  assert.ok(SUN_RADIUS > 0.26 && SUN_RADIUS < 0.28);
});

test("mapa de calor y escenario concuerdan con los mismos datos y pasos", () => {
  // El mapa usa el modelo aproximado y el horizonte sintético: se compara una
  // celda con un escenario construido con esos mismos datos e instantes.
  const startMs = Date.UTC(2026, 10, 14);
  const windowDays = 4;
  const size = 8;
  for (const mode of ["sun", "earth"]) {
    const map = computePolarHeatmap({ startMs, windowDays, mode, size, minLat: -80 });
    const samples = Math.max(16, Math.round(windowDays * 4));
    const stepMs = (windowDays * 86_400_000) / samples;
    // Celda (x = 2, y = 3), mismas cuentas que computePolarHeatmap.
    const dx = 2.5 / size - 0.5;
    const dy = 3.5 / size - 0.5;
    const lat = -90 + Math.hypot(dx, dy) * 2 * 10;
    const lon = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const horizon = createHorizon({ lat, lon }, { precompute: false });
    let hits = 0;
    for (let k = 0; k < samples; k++) {
      const t = startMs + k * stepMs;
      const p = mode === "earth" ? earthPosition({ lat, lon }, t) : sunPosition({ lat, lon }, t);
      const m = p.elevation - horizon(p.azimuth);
      if (mode === "earth" ? earthVisible(m, EARTH_RADIUS) : sunVisible(m)) hits++;
    }
    assert.ok(Math.abs(map.values[3 * size + 2] - hits / samples) < 1e-6, mode);
  }
});
