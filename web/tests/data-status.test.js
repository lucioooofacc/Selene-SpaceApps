/**
 * UI-01 (DEC-039): bloque de efemérides de "Datos y fuentes" y estados de
 * carga, error y faltante de los datos reales.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { clearEphemerides, decodeEphemeris, registerEphemeris } from "../src/lib/ephemeris.js";
import { computeScenario } from "../src/lib/analysis.js";
import { SITES } from "../src/data/sites.js";
import { setDataStatus } from "../src/ui/data-status.js";
import { ephemerisHtml, qualityRows } from "../src/ui/provenance.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const readSite = (id) => JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8"));
const site = (id) => SITES.find((s) => s.id === id);
const ephRow = (s, scenario) => qualityRows(s, scenario).find((r) => r.key === "ephemeris");

beforeEach(() => {
  clearEphemerides();
  setDataStatus("ephemerides", { state: "idle", loaded: [], failed: [] });
  setDataStatus("polarDem", { state: "idle", error: null });
});

test("mientras cargan las efemérides, la fila y el bloque dicen 'cargando'", () => {
  setDataStatus("ephemerides", { state: "loading" });
  const scenario = computeScenario(site("malapert"), Date.UTC(2027, 0, 10), 2);
  assert.equal(scenario.ephemeris.source, "approximate");
  assert.equal(ephRow(site("malapert"), scenario).kind, "loading");
  assert.match(ephemerisHtml(scenario), /q-loading/);
});

test("si fallan todas, se informa el error y el dato queda como aproximado", () => {
  setDataStatus("ephemerides", { state: "error", loaded: [], failed: SITES.map((s) => ({ id: s.id, error: "HTTP 404" })) });
  const scenario = computeScenario(site("malapert"), Date.UTC(2027, 0, 10), 2);
  const row = ephRow(site("malapert"), scenario);
  assert.equal(row.kind, "approx");
  assert.equal(row.hint, "ephemerisError");
});

test("con la serie cargada, el bloque muestra fuente, cobertura y altura medida", () => {
  registerEphemeris(decodeEphemeris(readSite("malapert")));
  setDataStatus("ephemerides", { state: "ready", loaded: ["malapert"], failed: [] });
  const scenario = computeScenario(site("malapert"), Date.UTC(2027, 0, 10), 2);
  assert.equal(scenario.ephemeris.source, "horizons");
  const html = ephemerisHtml(scenario);
  assert.match(html, /q-real/);
  assert.match(html, /DE441/);
  assert.match(html, /ssd\.jpl\.nasa\.gov\/horizons/);
  assert.match(html, /100 %/);
  assert.doesNotMatch(html, /0 m supuesto/);
});

test("fuera de la cobertura de la serie se marca como aproximado, no como error", () => {
  registerEphemeris(decodeEphemeris(readSite("malapert")));
  setDataStatus("ephemerides", { state: "ready", loaded: ["malapert"], failed: [] });
  const scenario = computeScenario(site("malapert"), Date.UTC(2030, 0, 10), 2);
  assert.equal(scenario.ephemeris.source, "approximate");
  const row = ephRow(site("malapert"), scenario);
  assert.equal(row.kind, "approx");
  assert.equal(row.hint, undefined);
});

test("un punto propio con la serie trasladada dice desde qué sitio y la altura supuesta", () => {
  registerEphemeris(decodeEphemeris(readSite("shackleton")));
  setDataStatus("ephemerides", { state: "ready", loaded: ["shackleton"], failed: [] });
  const own = { id: "custom-1", name: "Punto", lat: -88.5, lon: 10, custom: true };
  const scenario = computeScenario(own, Date.UTC(2027, 0, 10), 2);
  assert.equal(scenario.ephemeris.derived, true);
  const html = ephemerisHtml(scenario);
  assert.match(html, new RegExp(site("shackleton").name.replace(/[()]/g, "\\$&")));
  assert.match(html, /0 m supuesto/);
});

test("el horizonte de un punto propio informa la carga y el error del DEM reducido", () => {
  const own = { id: "custom-2", name: "Punto", lat: -85, lon: 40, custom: true };
  const scenario = computeScenario(own, Date.UTC(2027, 0, 10), 1);
  const horizonRow = () => qualityRows(own, scenario).find((r) => r.key === "horizon");
  setDataStatus("polarDem", { state: "loading" });
  assert.equal(horizonRow().kind, "loading");
  setDataStatus("polarDem", { state: "error", error: "HTTP 500" });
  assert.equal(horizonRow().kind, "synthetic");
  assert.equal(horizonRow().hint, "horizonError");
});
