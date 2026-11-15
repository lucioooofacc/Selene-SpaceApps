import test from "node:test";
import assert from "node:assert/strict";

import { computeScenario } from "../src/lib/analysis.js";
import { CATEGORIES, rankEntries } from "../src/lib/ranking.js";
import { SITES } from "../src/data/sites.js";
import { SITE_TRAITS, TRAIT_SOURCES, traitsFor } from "../src/data/site-traits.js";

const start = Date.UTC(2026, 10, 14);
const entries = SITES.map((site) => ({ site, scenario: computeScenario(site, start, 2), traits: traitsFor(site.id).length }));

test("cada categoría ordena de mayor a menor por su métrica principal", () => {
  const metric = {
    // Nivel global y, a igualdad, requisitos cumplidos (DEC-071): una sola cifra ordenable.
    overall: (e) => ({ low: 0, mid: 1, high: 2 })[e.scenario.viability.overall] * 10 + e.scenario.viability.met,
    science: (e) => e.traits,
    communication: (e) => e.scenario.summary.communication,
    light: (e) => e.scenario.summary.power,
  };
  for (const category of CATEGORIES) {
    const ranked = rankEntries(entries, category);
    assert.equal(ranked.length, entries.length);
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(metric[category](ranked[i - 1]) >= metric[category](ranked[i]), `${category} en ${i}`);
    }
  }
});

test("el orden es determinista y respeta el límite", () => {
  const a = rankEntries(entries, "science", 5).map((e) => e.site.id);
  const b = rankEntries([...entries].reverse(), "science", 5).map((e) => e.site.id);
  assert.deepEqual(a, b);
  assert.equal(a.length, 5);
});

test("una categoría desconocida usa el orden global", () => {
  assert.deepEqual(rankEntries(entries, "xyz"), rankEntries(entries, "overall"));
});

test("los rasgos apuntan a sitios existentes y a fuentes citadas", () => {
  const ids = new Set(SITES.map((s) => s.id));
  for (const [id, traits] of Object.entries(SITE_TRAITS)) {
    assert.ok(ids.has(id), `sitio ${id}`);
    for (const t of traits) {
      assert.ok(TRAIT_SOURCES[t.source], `fuente ${t.source}`);
      assert.match(TRAIT_SOURCES[t.source].url, /^https:\/\//);
    }
  }
});
