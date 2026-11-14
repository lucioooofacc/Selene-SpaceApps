/**
 * SCIENCE-02 (DEC-048): cruces refinados por bisección. Se comparan con el
 * paso de 10 min y se verifica que las ventanas sigan ordenadas y dentro del
 * período.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clearEphemerides, decodeEphemeris, registerEphemeris } from "../src/lib/ephemeris.js";
import { CROSSING_TOLERANCE_MS, STEP_MINUTES, computeScenario, sampleAt } from "../src/lib/analysis.js";
import { SITES } from "../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const STEP_MS = STEP_MINUTES * 60_000;
const site = (id) => SITES.find((s) => s.id === id);

before(() => {
  clearEphemerides();
  for (const id of ["malapert", "shackleton", "apollo11"]) {
    registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8"))));
  }
});

for (const id of ["malapert", "shackleton", "apollo11"]) {
  test(`${id}: ventanas refinadas ordenadas, dentro del período y a menos de un paso de las muestras`, () => {
    const sc = computeScenario(site(id), Date.UTC(2027, 0, 1), 30);
    for (const key of ["lightWindows", "linkWindows"]) {
      const ws = sc.summary[key];
      const cross = key === "lightWindows" ? sc.series.sunCross : sc.series.earthCross;
      for (let k = 0; k < ws.length; k++) {
        const w = ws[k];
        assert.ok(w.start >= sc.startMs && w.end <= sc.endMs, "dentro del período");
        assert.ok(w.end > w.start, "duración positiva");
        if (k > 0) assert.ok(w.start >= ws[k - 1].end, "ordenadas y sin superponerse");
      }
      // Cada cruce refinado cae dentro del intervalo de 10 min que lo encierra.
      for (const [j, at] of cross) {
        assert.ok(at >= sc.series.times[j - 1] && at <= sc.series.times[j], `cruce ${j} dentro de su intervalo`);
      }
    }
  });
}

test("el estado instantáneo cambia en el cruce refinado, no en la muestra siguiente", () => {
  const sc = computeScenario(site("malapert"), Date.UTC(2027, 0, 1), 30);
  const [j, at] = [...sc.series.sunCross].find(([, t]) => t < sc.endMs);
  const beforeState = Boolean(sc.series.sunVis[j - 1]);
  assert.equal(sampleAt(sc, at - 2 * CROSSING_TOLERANCE_MS).sun.visible, beforeState);
  assert.equal(sampleAt(sc, at + 2 * CROSSING_TOLERANCE_MS).sun.visible, !beforeState);
  // Antes del cruce, "próximo cambio" apunta al instante refinado.
  assert.equal(sampleAt(sc, at - 2 * CROSSING_TOLERANCE_MS).sun.next.at, at);
});

test("los porcentajes del resumen no cambian (siguen contando muestras)", () => {
  const sc = computeScenario(site("malapert"), Date.UTC(2027, 0, 1), 10);
  let sun = 0;
  for (let i = 0; i < sc.windowSteps; i++) sun += sc.series.sunVis[i];
  assert.equal(sc.summary.sunMinutes, sun * STEP_MINUTES);
});
