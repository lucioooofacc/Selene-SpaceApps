import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clearEphemerides, decodeEphemeris, registerEphemeris } from "../src/lib/ephemeris.js";
import { dateScenarios } from "../src/lib/dates.js";
import { rankEntries } from "../src/lib/ranking.js";
import { SITES } from "../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const site = (id) => SITES.find((s) => s.id === id);

beforeEach(() => clearEphemerides());

test("sin serie de Horizons no hay candidatas", () => {
  assert.equal(dateScenarios(site("malapert"), 2), null);
});

test("candidatas diarias dentro de la cobertura, todas con datos de Horizons", () => {
  registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, "malapert.json"), "utf8"))));
  const res = dateScenarios(site("malapert"), 10, { strideDays: 7 });
  assert.ok(res.items.length > 50);
  for (const { startMs, scenario } of res.items) {
    assert.equal(startMs % 86_400_000, 0);
    assert.ok(startMs + 10 * 86_400_000 <= res.coverage.stopMs);
    assert.equal(scenario.ephemeris.source, "horizons");
  }
  // El orden "Global" reutiliza el ranking de los lugares.
  const ranked = rankEntries(res.items.map((it) => ({ site: { name: String(it.startMs) }, scenario: it.scenario, traits: 0 })), "overall", 5);
  assert.equal(ranked.length, 5);
  const rank = { low: 0, mid: 1, high: 2 };
  assert.ok(rank[ranked[0].scenario.viability.overall] >= rank[ranked[4].scenario.viability.overall]);
});

import { pickDistinct } from "../src/lib/dates.js";

test("pickDistinct no repite períodos superpuestos", () => {
  const D = 86_400_000;
  const ranked = [0, 1, 2, 10, 11, 25, 40].map((d) => ({ startMs: d * D }));
  assert.deepEqual(pickDistinct(ranked, 10, 3).map((x) => x.startMs / D), [0, 10, 25]);
});
