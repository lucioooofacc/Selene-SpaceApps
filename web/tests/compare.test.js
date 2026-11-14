import test from "node:test";
import assert from "node:assert/strict";

import { computeScenario } from "../src/lib/analysis.js";
import { compareScenarios, longestWindowMinutes, scenarioMetrics } from "../src/lib/compare.js";

const startMs = Date.UTC(2026, 10, 14, 0);
const shackleton = { id: "a", lat: -89.9, lon: 0, relief: 0.7, elevationKm: 1 };
const cabeus = { id: "b", lat: -85.33, lon: -41.8, relief: 5 };

test("longestWindowMinutes devuelve 0 sin ventanas y la más larga si hay", () => {
  assert.equal(longestWindowMinutes([]), 0);
  const w = [
    { start: 0, end: 30 * 60_000 },
    { start: 60 * 60_000, end: 150 * 60_000 },
  ];
  assert.equal(longestWindowMinutes(w), 90);
});

test("las métricas salen del resumen del escenario sin transformarlo", () => {
  const scenario = computeScenario(shackleton, startMs, 2);
  const byKey = Object.fromEntries(scenarioMetrics(scenario).map((m) => [m.key, m.value]));
  assert.equal(byKey.illumination, scenario.summary.illumination);
  assert.equal(byKey.power, scenario.summary.power);
  assert.equal(byKey.linkMinutes, scenario.summary.linkMinutes);
  assert.equal(byKey.peakEarth, scenario.summary.peakEarth);
});

test("un sitio comparado consigo mismo empata en todo", () => {
  const scenario = computeScenario(shackleton, startMs, 2);
  const { rows, wins } = compareScenarios(scenario, scenario);
  assert.ok(rows.every((r) => r.better === null));
  assert.deepEqual(wins, { a: 0, b: 0 });
});

test("la comparación es simétrica y cuenta bien las victorias", () => {
  const a = computeScenario(shackleton, startMs, 3);
  const b = computeScenario(cabeus, startMs, 3);
  const ab = compareScenarios(a, b);
  const ba = compareScenarios(b, a);
  ab.rows.forEach((row, i) => {
    const flipped = { a: "b", b: "a", null: null }[row.better];
    assert.equal(ba.rows[i].better, flipped);
    if (row.better) assert.ok(row.better === "a" ? row.a > row.b : row.b > row.a);
  });
  assert.equal(ab.wins.a, ba.wins.b);
  assert.equal(ab.wins.a + ab.wins.b, ab.rows.filter((r) => r.better).length);
});
