// Pruebas unitarias del adaptador Horizons (ASTRO-01, DEC-023).
// Usan textos construidos en la prueba; la validación contra la respuesta
// oficial está separada en horizons.fixture.test.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ALTITUDE_BASIS,
  EXPECTED_COLUMNS,
  HORIZONS_PROFILE,
  HORIZONS_SOURCE,
  HorizonsError,
  buildQueryParams,
  buildQueryUrl,
  cacheKey,
  formatHorizonsTime,
  jdToUnixMs,
  normalizeHorizons,
  normalizeRequest,
  parseObserverTable,
  unwrapApiResponse,
} from "../src/lib/horizons.js";

const START = Date.UTC(2026, 10, 14, 0, 0);
const HOUR = 3_600_000;

const SITE = { id: "test", lat: -89.7668, lon: -171.87, altitudeKm: 0, altitudeBasis: ALTITUDE_BASIS.assumedZero };
const REQ = { target: "sun", site: SITE, startMs: START, stopMs: START + 2 * HOUR, stepMinutes: 60 };

const throwsCode = (fn, code) =>
  assert.throws(fn, (err) => err instanceof HorizonsError && err.code === code, `se esperaba ${code}`);

/** Texto `result` mínimo con la forma de una tabla OBSERVER del perfil. */
function resultText(rows, { target = "Sun (10)", geodetic = "188.13, -89.7668, 0" } = {}) {
  return [
    "Ephemeris / API_USER Sat Nov  4 05:25:08 2026 Pasadena, USA      / Horizons",
    `Target body name: ${target}                        {source: DE441}`,
    "Center body name: Moon (301)                      {source: DE441}",
    "Center-site name: (user defined site below)",
    "Step-size       : 60 minutes",
    `Center geodetic : ${geodetic}   {E-lon(deg),Lat(deg),Alt(km)}`,
    "Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}",
    "Center radii    : 1737.4, 1737.4, 1737.4 km       {Equator_a, b, pole_c}",
    "Atmos refraction: NO (AIRLESS)",
    "RA format       : DEG",
    "Time format     : JD  ",
    "Table format    : Comma Separated Values (spreadsheet)",
    "*******************************************************************************",
    "Date_________JDUT, , ,Azi_(a-app), Elev_(a-app),      Illu%,  Ang-diam,",
    "***********************************************************************",
    "$$SOE",
    ...rows,
    "$$EOE",
    "*******************************************************************************",
  ].join("\n");
}

const ROWS = [
  "2461358.500000000,*, , 298.481697,     1.667824,  100.00000,  1942.009,",
  "2461358.541666667,*, , 297.973806,     1.666013,  100.00000,  1941.994,",
  "2461358.583333333,*, , 297.465925,     1.664193,  100.00000,  1941.980,",
];

const envelope = (result, extra = {}) =>
  JSON.stringify({ signature: { source: HORIZONS_SOURCE.name, version: "1.2" }, result, ...extra });

// --- Petición -------------------------------------------------------------

test("normalizeRequest valida y normaliza el sitio", () => {
  const r = normalizeRequest({ ...REQ, site: { ...SITE, lon: 188.13 } });
  assert.equal(r.site.lon, -171.87);
  assert.equal(r.command, "10");
  assert.equal(r.expectedRows, 3);
  throwsCode(() => normalizeRequest({ ...REQ, site: { ...SITE, lat: -95 } }), "invalid-site");
  throwsCode(() => normalizeRequest({ ...REQ, site: { ...SITE, lon: NaN } }), "invalid-site");
  throwsCode(() => normalizeRequest({ ...REQ, target: "moon" }), "invalid-target");
});

test("la altura es obligatoria y no se toma de elevationKm sintético", () => {
  const { altitudeKm, altitudeBasis, ...noAlt } = SITE;
  throwsCode(() => normalizeRequest({ ...REQ, site: noAlt }), "missing-altitude");
  assert.throws(
    () => normalizeRequest({ ...REQ, site: { ...noAlt, elevationKm: 1 } }),
    /elevationKm es sintético/,
  );
  throwsCode(() => normalizeRequest({ ...REQ, site: { ...SITE, altitudeBasis: undefined } }), "invalid-altitude");
  throwsCode(() => normalizeRequest({ ...REQ, site: { ...SITE, altitudeKm: 0.5 } }), "invalid-altitude");
  const measured = normalizeRequest({ ...REQ, site: { ...SITE, altitudeKm: 1.9, altitudeBasis: ALTITUDE_BASIS.measured } });
  assert.equal(measured.site.altitudeKm, 1.9);
});

test("intervalo y paso: rangos y divisibilidad", () => {
  throwsCode(() => normalizeRequest({ ...REQ, stopMs: START }), "invalid-interval");
  throwsCode(() => normalizeRequest({ ...REQ, startMs: START + 1 }), "invalid-interval");
  // Enteros seguros en minuto exacto pero fuera del rango de Date: HorizonsError, no RangeError.
  const beyondDate = 8.64e15 + 60_000;
  throwsCode(() => normalizeRequest({ ...REQ, startMs: -beyondDate }), "invalid-interval");
  throwsCode(() => normalizeRequest({ ...REQ, stopMs: beyondDate }), "invalid-interval");
  // Intervalo corto entero fuera de rango: antes llegaba a toISOString() y lanzaba RangeError.
  const outOfRange = { ...REQ, startMs: beyondDate, stopMs: beyondDate + 60 * 60_000, stepMinutes: 60 };
  throwsCode(() => normalizeRequest(outOfRange), "invalid-interval");
  throwsCode(() => buildQueryParams(outOfRange), "invalid-interval");
  throwsCode(() => normalizeRequest({ ...REQ, stepMinutes: 0 }), "invalid-step");
  throwsCode(() => normalizeRequest({ ...REQ, stepMinutes: 1.5 }), "invalid-step");
  throwsCode(() => normalizeRequest({ ...REQ, stepMinutes: 7 }), "invalid-step");
  throwsCode(() => normalizeRequest({ ...REQ, stopMs: START + 400 * 24 * HOUR, stepMinutes: 10 }), "too-many-rows");
});

// --- Constructor de consulta ---------------------------------------------

test("buildQueryParams usa exactamente el perfil acordado", () => {
  const p = Object.fromEntries(buildQueryParams(REQ));
  assert.deepEqual(p, {
    format: "json",
    COMMAND: "'10'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: "'-171.87,-89.7668,0'",
    START_TIME: "'2026-11-14 00:00'",
    STOP_TIME: "'2026-11-14 02:00'",
    STEP_SIZE: "'60 m'",
    TIME_TYPE: "'UT'",
    CAL_FORMAT: "'JD'",
    ANG_FORMAT: "'DEG'",
    APPARENT: "'AIRLESS'",
    REF_SYSTEM: "'ICRF'",
    QUANTITIES: "'4,10,13'",
    CSV_FORMAT: "'YES'",
    ELEV_CUT: "'-90'",
  });
  assert.equal(Object.fromEntries(buildQueryParams({ ...REQ, target: "earth" })).COMMAND, "'399'");
  assert.ok(Object.isFrozen(HORIZONS_PROFILE.params));
});

test("buildQueryUrl apunta al endpoint oficial y es determinista", () => {
  const url = buildQueryUrl(REQ);
  assert.ok(url.startsWith("https://ssd.jpl.nasa.gov/api/horizons.api?format=json&"));
  assert.equal(url, buildQueryUrl({ ...REQ }));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("SITE_COORD"), "'-171.87,-89.7668,0'");
  assert.equal(parsed.searchParams.get("CENTER"), "'coord@301'");
});

test("formatHorizonsTime y jdToUnixMs", () => {
  assert.equal(formatHorizonsTime(START), "2026-11-14 00:00");
  assert.equal(jdToUnixMs("2440587.5"), 0);
  assert.equal(jdToUnixMs("2461358.500000000"), START);
  assert.equal(jdToUnixMs("2461358.541666667"), START + HOUR);
  assert.equal(jdToUnixMs("2461358.506944444"), START + 10 * 60_000);
  throwsCode(() => jdToUnixMs("n.a."), "invalid-value");
});

// --- Clave de caché ------------------------------------------------------

test("cacheKey cambia con fuente, versión, coordenadas, altura, intervalo y paso", () => {
  const base = cacheKey(REQ);
  assert.equal(base, cacheKey({ ...REQ }));
  assert.equal(base, cacheKey({ ...REQ, site: { ...SITE, lon: 188.13 } }), "lon equivalente → misma clave");
  const variants = [
    cacheKey(REQ, { source: "otra-fuente" }),
    cacheKey(REQ, { apiVersion: "1.3" }),
    cacheKey(REQ, { profileVersion: "selene-observer-v2" }),
    cacheKey({ ...REQ, target: "earth" }),
    cacheKey({ ...REQ, site: { ...SITE, lat: -89.7667 } }),
    cacheKey({ ...REQ, site: { ...SITE, lon: -171.86 } }),
    cacheKey({ ...REQ, site: { ...SITE, altitudeKm: 0, altitudeBasis: ALTITUDE_BASIS.measured } }),
    cacheKey({ ...REQ, site: { ...SITE, altitudeKm: 1.9, altitudeBasis: ALTITUDE_BASIS.measured } }),
    cacheKey({ ...REQ, startMs: START - HOUR }),
    cacheKey({ ...REQ, stopMs: START + 3 * HOUR }),
    cacheKey({ ...REQ, stepMinutes: 30 }),
  ];
  for (const v of variants) assert.notEqual(v, base);
  assert.equal(new Set(variants).size, variants.length);
  for (const part of ["src=jpl-horizons-api", "api=1.2", "profile=selene-observer-v1", "lon=-171.87", "lat=-89.7668", "altKm=0", "stepMin=60"]) {
    assert.ok(base.includes(part), part);
  }
});

// --- Envoltura y parser --------------------------------------------------

test("unwrapApiResponse: errores de API y firmas inválidas", () => {
  assert.equal(unwrapApiResponse(envelope("x")).result, "x");
  // La API devuelve errores de consulta con HTTP 200 y el campo "error".
  throwsCode(() => unwrapApiResponse(envelope("\nGeodetic latitude not in the range\n", { error: "Geodetic latitude not in the range -90 to 90 degrees" })), "api-error");
  throwsCode(() => unwrapApiResponse("<html>"), "invalid-envelope");
  throwsCode(() => unwrapApiResponse(JSON.stringify({ signature: { source: "otro" }, result: "x" })), "invalid-envelope");
  throwsCode(() => unwrapApiResponse(JSON.stringify({ signature: { source: HORIZONS_SOURCE.name } })), "invalid-envelope");
});

test("parseObserverTable lee encabezado, columnas y filas", () => {
  const { meta, columns, samples, missing } = parseObserverTable(resultText(ROWS));
  assert.deepEqual(columns, [...EXPECTED_COLUMNS]);
  assert.deepEqual(meta.target, { name: "Sun", id: "10", ephemeris: "DE441" });
  assert.equal(meta.center.id, "301");
  assert.deepEqual(meta.centerGeodetic, { lonEDeg: 188.13, latDeg: -89.7668, altKm: 0 });
  assert.equal(meta.centerPole, "MEAN_ME (high precision)");
  assert.deepEqual(meta.centerRadiiKm, [1737.4, 1737.4, 1737.4]);
  assert.equal(meta.generatedAt, "Sat Nov  4 05:25:08 2026");
  assert.deepEqual(samples.timeMs, [START, START + HOUR, START + 2 * HOUR]);
  assert.deepEqual(samples.azimuthDeg, [298.481697, 297.973806, 297.465925]);
  assert.deepEqual(samples.elevationDeg, [1.667824, 1.666013, 1.664193]);
  assert.deepEqual(samples.solarPresence, ["*", "*", "*"]);
  assert.deepEqual(samples.interfererPresence, ["", "", ""]);
  assert.deepEqual(missing, { azimuthDeg: 0, elevationDeg: 0, illuminatedPct: 0, angularDiameterArcsec: 0 });
});

test('"n.a." es un faltante explícito (null), no cero', () => {
  const rows = [ROWS[0], ROWS[1].replace("1941.994", "n.a."), ROWS[2].replace("1.664193", "    n.a.")];
  const { samples, missing } = parseObserverTable(resultText(rows));
  assert.equal(samples.angularDiameterArcsec[1], null);
  assert.equal(samples.elevationDeg[2], null);
  assert.equal(missing.angularDiameterArcsec, 1);
  assert.equal(missing.elevationDeg, 1);
  const norm = normalizeHorizons(envelope(resultText(rows)), REQ);
  assert.equal(norm.coverage.complete, false);
  assert.ok(norm.warnings.some((w) => w.includes('"n.a."')));
  assert.equal(norm.samples.elevationDeg[2], null);
});

test("parser rechaza tablas ausentes, vacías, columnas o valores inválidos", () => {
  throwsCode(() => parseObserverTable("No ephemeris for target \"Sun\" after A.D. 9999"), "no-ephemeris");
  throwsCode(() => parseObserverTable(resultText([])), "empty-table");
  throwsCode(() => parseObserverTable(resultText(ROWS).replace("Illu%", "Illum")), "unexpected-columns");
  throwsCode(() => parseObserverTable(resultText([ROWS[0].replace("298.481697", "abc")])), "invalid-value");
  throwsCode(() => parseObserverTable(resultText([ROWS[0].replace(" 1942.009,", "")])), "invalid-row");
  throwsCode(() => parseObserverTable(resultText([ROWS[1], ROWS[0]])), "non-monotonic");
});

test("rangos: valores fuera de rango son error, no se recortan", () => {
  const cases = [
    ["298.481697", "360.000000"],
    ["298.481697", "-0.100000"],
    ["1.667824", "90.500000"],
    ["100.00000", "100.50000"],
    ["1942.009", "0.000"],
  ];
  for (const [from, to] of cases) {
    throwsCode(() => parseObserverTable(resultText([ROWS[0].replace(from, to)])), "out-of-range");
  }
  // Bordes válidos.
  assert.doesNotThrow(() => parseObserverTable(resultText([ROWS[0].replace("298.481697", "0.000000").replace("1.667824", "-90.000000")])));
});

// --- Normalización -------------------------------------------------------

test("normalizeHorizons valida contra la petición y registra supuestos", () => {
  const norm = normalizeHorizons(envelope(resultText(ROWS)), REQ, { retrievedAt: "2026-11-14T00:00:00.000Z" });
  assert.equal(norm.schema, "selene.horizons.observer/1");
  assert.equal(norm.cacheKey, cacheKey(REQ));
  assert.equal(norm.coverage.rows, 3);
  assert.equal(norm.coverage.complete, true);
  assert.equal(norm.source.queryUrl, buildQueryUrl(REQ));
  assert.equal(norm.source.ephemeris, "DE441");
  assert.ok(norm.assumptions.some((a) => a.includes("SUPUESTO")));
  assert.deepEqual(norm.warnings, []);
  assert.deepEqual(norm, normalizeHorizons(envelope(resultText(ROWS)), REQ, { retrievedAt: "2026-11-14T00:00:00.000Z" }));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(norm)));

  const measured = normalizeHorizons(envelope(resultText(ROWS)), { ...REQ, site: { ...SITE, altitudeBasis: ALTITUDE_BASIS.measured } });
  assert.ok(!measured.assumptions.some((a) => a.includes("SUPUESTO")));
});

test("normalizeHorizons detecta discrepancias con la petición", () => {
  const ok = envelope(resultText(ROWS));
  throwsCode(() => normalizeHorizons(ok, { ...REQ, target: "earth" }), "target-mismatch");
  throwsCode(() => normalizeHorizons(ok, { ...REQ, site: { ...SITE, lat: -89 } }), "site-mismatch");
  throwsCode(() => normalizeHorizons(envelope(resultText(ROWS, { geodetic: "188.13, -89.7668, 0.5" })), REQ), "site-mismatch");
  throwsCode(() => normalizeHorizons(ok, { ...REQ, stopMs: START + 3 * HOUR }), "coverage-mismatch");
  throwsCode(() => normalizeHorizons(ok, { ...REQ, startMs: START - HOUR, stopMs: START + HOUR }), "coverage-mismatch");
  throwsCode(() => normalizeHorizons(envelope(resultText(ROWS).replace("NO (AIRLESS)", "YES")), REQ), "profile-mismatch");
  const gap = [ROWS[0], ROWS[2], "2461358.625000000,*, , 296.958054,     1.662361,  100.00000,  1941.966,"];
  throwsCode(
    () => normalizeHorizons(envelope(resultText(gap)), { ...REQ, stopMs: START + 3 * HOUR, stepMinutes: 90 }),
    "step-mismatch",
  );
  const v13 = JSON.stringify({ signature: { source: HORIZONS_SOURCE.name, version: "1.3" }, result: resultText(ROWS) });
  assert.ok(normalizeHorizons(v13, REQ).warnings.some((w) => w.includes("1.3")));
});

test("el módulo del navegador no hace red ni importa Node", async () => {
  const src = await readFile(new URL("../src/lib/horizons.js", import.meta.url), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|WebSocket|node:|require\(|document\./);
});
