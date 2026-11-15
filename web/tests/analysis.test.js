import test from "node:test";
import assert from "node:assert/strict";

import { DAY_MS } from "../src/lib/astro.js";
import { STEP_MINUTES, computePolarHeatmap, computeScenario, sampleAt } from "../src/lib/analysis.js";

const site = { id: "test", lat: -89.9, lon: 0 };
const startMs = Date.UTC(2026, 10, 14, 12);

function assertOrderedWindows(windows, start, end) {
  let cursor = start;
  for (const window of windows) {
    assert.ok(window.start >= cursor);
    assert.ok(window.end > window.start);
    assert.ok(window.end <= end);
    cursor = window.end;
  }
}

test("calcula porcentajes, métricas y ventanas en rangos válidos", () => {
  const scenario = computeScenario(site, startMs, 2);
  const { summary, viability } = scenario;

  assert.ok(summary.illumination >= 0 && summary.illumination <= 100);
  assert.ok(summary.communication >= 0 && summary.communication <= 100);
  assert.ok(summary.power >= 0 && summary.power <= 1);
  assert.ok(summary.peakSun >= -90 && summary.peakSun <= 90);
  assert.ok(summary.peakEarth >= -90 && summary.peakEarth <= 90);
  assert.ok(viability.met >= 0 && viability.met <= viability.total);
  assert.deepEqual(Object.keys(viability.criteria), ["light", "communication"]);
  assert.ok(summary.longestNightH >= 0 && summary.longestNightH <= 48);
  assert.ok(["low", "mid", "high"].includes(viability.overall));
  assertOrderedWindows(summary.lightWindows, scenario.startMs, scenario.endMs);
  assertOrderedWindows(summary.linkWindows, scenario.startMs, scenario.endMs);
});

test("las duraciones agregadas coinciden con ventanas y pasos", () => {
  const scenario = computeScenario(site, startMs, 3);
  const sumMinutes = (windows) => windows.reduce((sum, window) => sum + (window.end - window.start) / 60_000, 0);

  assert.equal(sumMinutes(scenario.summary.lightWindows), scenario.summary.sunMinutes);
  assert.equal(sumMinutes(scenario.summary.linkWindows), scenario.summary.linkMinutes);
  assert.equal(scenario.windowSteps, (3 * 24 * 60) / STEP_MINUTES);
  assert.equal(scenario.summary.illumination, (scenario.summary.sunMinutes / (3 * 24 * 60)) * 100);
  assert.equal(scenario.summary.communication, (scenario.summary.linkMinutes / (3 * 24 * 60)) * 100);
});

test("scenario y sampleAt son deterministas para entradas idénticas", () => {
  const first = computeScenario(site, startMs, 1);
  const second = computeScenario({ ...site }, startMs, 1);

  assert.deepEqual(first.summary, second.summary);
  assert.deepEqual(first.viability, second.viability);
  assert.deepEqual(Array.from(first.series.sunEl), Array.from(second.series.sunEl));
  assert.deepEqual(Array.from(first.series.earthVis), Array.from(second.series.earthVis));

  const instant = startMs + DAY_MS / 2;
  assert.deepEqual(sampleAt(first, instant), sampleAt(first, instant));
});

test("interpola azimuts sin salir de rango y mantiene acumulados válidos", () => {
  const scenario = computeScenario(site, startMs, 2);
  for (let step = 0; step <= 48; step++) {
    const sample = sampleAt(scenario, startMs + (step / 48) * 2 * DAY_MS);
    for (const body of [sample.sun, sample.earth]) {
      assert.ok(body.azimuth >= 0 && body.azimuth < 360);
      assert.ok(body.elevation >= -90 && body.elevation <= 90);
      assert.ok(Number.isFinite(body.margin));
    }
    assert.ok(sample.sun.power >= 0 && sample.sun.power <= 1);
    assert.ok(sample.earth.link >= 0 && sample.earth.link <= 1);
    assert.ok(sample.earth.phase >= 0 && sample.earth.phase <= 1);
    assert.ok(sample.accumulated.sunMinutes <= sample.accumulated.elapsedMinutes);
    assert.ok(sample.accumulated.linkMinutes <= sample.accumulated.elapsedMinutes);
  }
});

test("el mapa de calor conserva forma, rangos y determinismo", () => {
  const options = { startMs, windowDays: 1, mode: "sun", size: 16, minLat: -80 };
  const first = computePolarHeatmap(options);
  const second = computePolarHeatmap(options);
  assert.equal(first.values.length, 16 * 16);
  assert.deepEqual(Array.from(first.values), Array.from(second.values));
  for (const value of first.values) assert.ok(value === -1 || (value >= 0 && value <= 1));
});


// ---------- CORE-01 parte A: horizonte LOLA en el cálculo (DEC-032) ----------
import { SITES } from "../src/data/sites.js";
import { scenarioHorizon } from "../src/lib/analysis.js";

const curated = (id) => SITES.find((s) => s.id === id);

test("scenarioHorizon: LOLA para los sitios curados cubiertos", () => {
  for (const id of ["shackleton", "malapert", "cabeus", "im1", "chandrayaan3"]) {
    const h = scenarioHorizon(curated(id));
    assert.equal(h.source, "lola", id);
    assert.equal(h.meta.siteId, id);
  }
});

test("scenarioHorizon: Chang'e 4 y Apollo 11 usan LOLA de LDEM_128 (TERRAIN-03, DEC-061)", () => {
  for (const id of ["change4", "apollo11"]) {
    const h = scenarioHorizon(curated(id));
    assert.equal(h.source, "lola", id);
    assert.equal(h.meta.product.dem.productId, "LDEM_128", id);
  }
});

test("scenarioHorizon: sintético en sitios propios o con coordenadas distintas", () => {
  const apollo = curated("apollo11");
  assert.equal(scenarioHorizon({ ...apollo, lat: apollo.lat + 0.01 }).source, undefined);
  const shackleton = curated("shackleton");
  assert.equal(scenarioHorizon({ ...shackleton, custom: true }).source, undefined);
  assert.equal(scenarioHorizon({ ...shackleton, lat: shackleton.lat + 0.01 }).source, undefined);
  assert.equal(scenarioHorizon({ id: "custom-1", lat: -85, lon: 10, custom: true }).source, undefined);
});

test("computeScenario expone el horizonte usado y la interfaz lo puede identificar", () => {
  const scenario = computeScenario(curated("malapert"), startMs, 1);
  assert.equal(scenario.horizon.source, "lola");
  const sample = sampleAt(scenario, startMs + DAY_MS / 2);
  assert.equal(sample.sun.horizon, scenario.horizon(sample.sun.azimuth));
});

test("Cabeus (impacto LCROSS, sombra permanente) no recibe Sol con el horizonte LOLA", () => {
  // Control físico: el sintético le daba ~20–40 % de luz; el relieve real lo deja en sombra.
  const scenario = computeScenario(curated("cabeus"), startMs, 30);
  assert.equal(scenario.summary.illumination, 0);
});
