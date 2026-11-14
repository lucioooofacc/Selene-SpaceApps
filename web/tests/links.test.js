import test from "node:test";
import assert from "node:assert/strict";

import { missionQuery, parseCompareQuery, parseMissionQuery, parseSiteParam, siteParam } from "../src/ui/links.js";
import { SITES } from "../src/data/sites.js";

const start = Date.UTC(2026, 10, 14);

test("la selección de la misión va y vuelve por la URL", () => {
  const site = SITES[0];
  const q = missionQuery({ site, startMs: start, windowDays: 5, dateChosen: true });
  assert.equal(q, `?site=${site.id}&start=2026-11-14&days=5`);
  assert.deepEqual(parseMissionQuery(q), { site, startMs: start, windowDays: 5 });
});

test("sin fechas elegidas, la URL solo lleva el sitio", () => {
  const q = missionQuery({ site: { id: "custom", lat: -66.52, lon: -110.98 }, startMs: start, windowDays: 2, dateChosen: false });
  assert.equal(q, "?site=pt%3A-66.52%2C-110.98");
  const parsed = parseMissionQuery(q);
  assert.equal(parsed.site.lat, -66.52);
  assert.equal(parsed.site.lon, -110.98);
  assert.equal(parsed.startMs, null);
});

test("los parámetros inválidos se ignoran", () => {
  for (const search of ["?site=pluton", "?site=pt:95,0", "?site=pt:abc"]) {
    assert.equal(parseMissionQuery(search).site, null, search);
  }
  for (const search of ["?start=2026-02-31&days=3", "?start=2026-11-14&days=0", "?start=2026-11-14&days=31", "?start=14/11/2026&days=2", "?start=2026-11-14&days=2.5"]) {
    const p = parseMissionQuery(search);
    assert.equal(p.startMs, null, search);
    assert.equal(p.windowDays, null, search);
  }
});

test("la comparación usa los valores por defecto ante fechas inválidas", () => {
  const defaults = { a: SITES[0], b: SITES[1], startMs: start, windowDays: 2 };
  assert.deepEqual(parseCompareQuery("?start=2026-13-01&days=99", defaults), defaults);
});

test("un sitio propio viaja como punto y se reconoce", () => {
  const value = siteParam({ id: "custom-1", lat: -80.5, lon: 12.25 });
  assert.equal(value, "pt:-80.50,12.25");
  assert.equal(parseSiteParam(value).custom, true);
});

// DEC-049: el nombre de un sitio propio viaja en la URL.
import { cleanLabel, parseSiteParam as parseSite, siteParam as toParam } from "../src/ui/links.js";

test("un sitio propio con nombre conserva el nombre en la URL, limpio", () => {
  const param = toParam({ id: "custom-abc", name: "Cráter Norte", lat: -85.1234, lon: 40.5, custom: true });
  assert.equal(param, "pt:-85.12,40.50~Cráter Norte");
  const back = parseSite(param);
  assert.equal(back.name, "Cráter Norte");
  assert.equal(back.label, "Cráter Norte");
  assert.equal(toParam(back), param); // ida y vuelta estable
  assert.equal(parseSite("pt:-85,40~<img src=x>").name, "img src=x");
  assert.equal(cleanLabel("x".repeat(60)).length, 40);
  // Sin nombre: como antes.
  assert.equal(toParam({ id: "custom", lat: -85, lon: 40 }), "pt:-85.00,40.00");
  assert.equal(parseSite("pt:-85,40").label, null);
});
