/**
 * Efemérides JPL Horizons en el cálculo (CORE-01 parte B, DEC-033):
 * decodificación, interpolación, registro, carga con fallos, selección por
 * sitio y uso en computeScenario. Usa los archivos versionados de
 * `public/data/ephemerides/` y los cruza con los fixtures crudos de ASTRO-01.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  EPHEMERIS_SCHEMA,
  clearEphemerides,
  decodeEphemeris,
  derivedEphemerisFor,
  ephemerisFor,
  ephemerisVersion,
  loadEphemerides,
  positionsAt,
  registerEphemeris,
} from "../src/lib/ephemeris.js";
import { computeScenario, sampleAt } from "../src/lib/analysis.js";
import { sunPosition } from "../src/lib/astro.js";
import { SITES } from "../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../public/data/ephemerides");
const readSite = (id) => JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8"));
const site = (id) => SITES.find((s) => s.id === id);
const H = 3_600_000;

/** Archivo mínimo sintético (no es dato de Horizons). */
function tiny(overrides = {}) {
  return {
    schema: EPHEMERIS_SCHEMA,
    site: { id: "x", lat: -85, lon: 10 },
    meta: { source: "test" },
    coverage: { startMs: 0, stepMinutes: 60, rows: 3 },
    series: {
      sunAz: [359000, 1000, 3000],
      sunEl: [1000, 2000, 4000],
      earthAz: [90000, 90000, 90000],
      earthEl: [5000, 5000, 5000],
      earthIllum: [5000, 6000, 7000],
      sunRadius: [2670, 2670, 2670],
      earthRadius: [9500, 9600, 9700],
    },
    ...overrides,
  };
}

beforeEach(() => clearEphemerides());

test("decode: valida esquema, longitudes y faltantes", () => {
  const eph = decodeEphemeris(tiny());
  assert.equal(eph.stopMs, 2 * H);
  assert.throws(() => decodeEphemeris({ ...tiny(), schema: "otro" }));
  assert.throws(() => decodeEphemeris(tiny({ series: { ...tiny().series, sunEl: [1, 2] } })));
  assert.throws(() => decodeEphemeris(tiny({ series: { ...tiny().series, sunEl: [1, null, 3] } })));
});

test("positionsAt: valores exactos, interpolación, azimut por el camino corto y fuera de rango", () => {
  const eph = decodeEphemeris(tiny());
  assert.deepEqual(positionsAt(eph, 0).sun, { azimuth: 359, elevation: 1, radius: 0.267 });
  assert.ok(Math.abs(positionsAt(eph, H / 2).earth.radius - 0.955) < 1e-12);
  const mid = positionsAt(eph, H / 2);
  assert.ok(Math.abs(mid.sun.azimuth - 0) < 1e-9 || Math.abs(mid.sun.azimuth - 360) < 1e-9); // 359 → 1 pasa por 0
  assert.ok(Math.abs(mid.sun.elevation - 1.5) < 1e-12);
  assert.ok(Math.abs(mid.earth.phase - 0.55) < 1e-12);
  assert.equal(positionsAt(eph, 2 * H).sun.elevation, 4);
  assert.equal(positionsAt(eph, -1), null);
  assert.equal(positionsAt(eph, 2 * H + 1), null);
});

test("registro: solo para el sitio curado con las mismas coordenadas", () => {
  const v = ephemerisVersion();
  registerEphemeris(decodeEphemeris(tiny()));
  assert.ok(ephemerisVersion() > v);
  assert.ok(ephemerisFor({ id: "x", lat: -85, lon: 10 }));
  assert.equal(ephemerisFor({ id: "x", lat: -85, lon: 10, custom: true }), null);
  assert.equal(ephemerisFor({ id: "x", lat: -85.1, lon: 10 }), null);
  assert.equal(ephemerisFor({ id: "y", lat: -85, lon: 10 }), null);
});

test("loadEphemerides: un archivo fallido no impide cargar el resto", async () => {
  const result = await loadEphemerides(["x", "roto", "otro"], async (id) => {
    if (id === "roto") throw new Error("HTTP 404");
    return id === "x" ? tiny() : tiny({ site: { id: "z", lat: 0, lon: 0 } });
  });
  assert.deepEqual(result.loaded, ["x"]);
  assert.deepEqual(result.failed.map((f) => f.id), ["roto", "otro"]);
  assert.ok(ephemerisFor({ id: "x", lat: -85, lon: 10 }));
});

test("archivos versionados: los 7 sitios, rango acordado y coordenadas del catálogo", () => {
  const index = JSON.parse(readFileSync(resolve(DIR, "index.json"), "utf8"));
  assert.equal(index.range.startMs, Date.UTC(2026, 10, 1));
  assert.equal(index.range.stopMs, Date.UTC(2028, 0, 1));
  assert.equal(index.range.stepMinutes, 60);
  for (const s of SITES) {
    const eph = decodeEphemeris(readSite(s.id));
    assert.equal(eph.site.lat, s.lat);
    assert.equal(eph.site.lon, s.lon);
    assert.equal(eph.startMs, index.range.startMs);
    assert.equal(eph.stopMs, index.range.stopMs);
    assert.equal(eph.meta.source, "jpl-horizons");
    assert.match(eph.meta.ephemeris, /^DE4\d\d/);
  }
});

test("cruce con el fixture crudo de ASTRO-01 (Shackleton R04, 14–16/11/2026)", () => {
  // El fixture es del punto R04 (DEC-019); el sitio ahora es R01 (DEC-035), a
  // ~10 km. Se compara la serie de R01 trasladada a R04 (DEC-034).
  registerEphemeris(decodeEphemeris(readSite("shackleton")));
  const eph = derivedEphemerisFor({ id: "r04", lat: -89.7668, lon: -171.87, custom: true });
  const fx = (name) => JSON.parse(readFileSync(resolve(import.meta.dirname, "fixtures/horizons", name), "utf8")).samples;
  const sun = fx("sun-a821ce09040a6d31.normalized.json");
  const earth = fx("earth-83a4e9a22af040bb.normalized.json");
  // El fixture usa altura 0 km y la serie de R01 la del suelo LOLA + 2 m:
  // a la distancia del Sol y la Tierra la diferencia es < 0,001°.
  for (let i = 0; i < sun.timeMs.length; i++) {
    const p = eph.at(sun.timeMs[i]);
    assert.ok(Math.abs(p.sun.elevation - sun.elevationDeg[i]) < 0.002, `Sol fila ${i}`);
    assert.ok(Math.abs(p.earth.elevation - earth.elevationDeg[i]) < 0.002, `Tierra fila ${i}`);
    assert.ok(Math.abs(p.earth.phase - earth.illuminatedPct[i] / 100) < 0.001);
  }
});

test("computeScenario usa Horizons dentro del rango y lo informa", () => {
  registerEphemeris(decodeEphemeris(readSite("malapert")));
  const start = Date.UTC(2026, 10, 14);
  const sc = computeScenario(site("malapert"), start, 3);
  assert.equal(sc.ephemeris.source, "horizons");
  assert.equal(sc.ephemeris.windowFraction, 1);
  assert.equal(sc.ephemeris.lookaheadComplete, true);
  assert.equal(sc.ephemeris.meta.source, "jpl-horizons");
  const eph = ephemerisFor(site("malapert"));
  const t = start + 5 * H + 20 * 60_000;
  const i = (t - start) / (10 * 60_000);
  assert.ok(Math.abs(sc.series.sunEl[i] - positionsAt(eph, t).sun.elevation) < 1e-4);
  const sample = sampleAt(sc, t);
  assert.ok(Math.abs(sample.earth.phase - positionsAt(eph, t).earth.phase) < 1e-4);
});

test("fuera del rango o sin datos: modelo aproximado, informado como tal", () => {
  registerEphemeris(decodeEphemeris(readSite("malapert")));
  const late = computeScenario(site("malapert"), Date.UTC(2028, 5, 1), 2);
  assert.equal(late.ephemeris.source, "approximate");
  assert.equal(late.ephemeris.meta, null);
  assert.ok(Math.abs(late.series.sunEl[0] - sunPosition(site("malapert"), Date.UTC(2028, 5, 1)).elevation) < 1e-4);

  const edge = computeScenario(site("malapert"), Date.UTC(2027, 11, 30), 5);
  assert.equal(edge.ephemeris.source, "mixed");
  assert.ok(edge.ephemeris.windowFraction > 0 && edge.ephemeris.windowFraction < 1);

  const nearEnd = computeScenario(site("malapert"), Date.UTC(2027, 11, 20), 3);
  assert.equal(nearEnd.ephemeris.source, "horizons");
  assert.equal(nearEnd.ephemeris.lookaheadComplete, false);

  // Cabeus sin serie propia registrada: también se traslada desde Malapert.
  const cabeus = computeScenario(site("cabeus"), Date.UTC(2026, 10, 14), 1).ephemeris;
  assert.equal(cabeus.derived, true);
  assert.equal(cabeus.meta.derivedFrom, "malapert");
  // Un punto propio usa la serie trasladada (CORE-03, DEC-034), no la del sitio.
  const own = computeScenario({ ...site("malapert"), custom: true }, Date.UTC(2026, 10, 14), 1).ephemeris;
  assert.equal(own.source, "horizons");
  assert.equal(own.derived, true);
  // Sin ninguna serie registrada: modelo aproximado.
  clearEphemerides();
  assert.equal(computeScenario(site("cabeus"), Date.UTC(2026, 10, 14), 1).ephemeris.source, "approximate");
});

test("determinismo con Horizons", () => {
  registerEphemeris(decodeEphemeris(readSite("im1")));
  const a = computeScenario(site("im1"), Date.UTC(2027, 2, 3), 2);
  const b = computeScenario({ ...site("im1") }, Date.UTC(2027, 2, 3), 2);
  assert.deepEqual(a.summary, b.summary);
  assert.deepEqual(Array.from(a.series.earthEl), Array.from(b.series.earthEl));
  assert.ok(a.series.earthEl.every(Number.isFinite));
});

test("Datos y fuentes: la fila del Sol y la Tierra refleja el origen real del escenario", async () => {
  const { qualityRows } = await import("../src/ui/provenance.js");
  const row = (source) => qualityRows(site("malapert"), { site: site("malapert"), ephemeris: { source } }).find((r) => r.key === "ephemeris");
  assert.equal(row("horizons").kind, "real");
  assert.equal(row("mixed").kind, "approx");
  assert.equal(row("approximate").kind, "approx");
  assert.equal(row(undefined).kind, "approx");
});
