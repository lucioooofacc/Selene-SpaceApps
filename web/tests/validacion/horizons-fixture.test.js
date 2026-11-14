// Validación contra respuestas oficiales de JPL Horizons (ASTRO-01, DEC-024).
// Separada de las pruebas unitarias: los fixtures se obtuvieron con
// scripts/fetch-horizons.mjs y su procedencia está en fixtures/horizons/README.md.
// Tolerancia: 0 (comparación exacta), porque solo se verifica el parseo y la
// conversión de la respuesta oficial; no se compara contra otro modelo.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { ALTITUDE_BASIS, HORIZONS_PROFILE, cacheKey, normalizeHorizons, buildQueryUrl } from "../../src/lib/horizons.js";
import { SITES } from "../../src/data/sites.js";

/** Punto de los fixtures: Shackleton Rim R04 (DEC-019), antes de DEC-035. */
const R04 = Object.freeze({ lat: -89.7668, lon: -171.87 });

const DIR = new URL("../fixtures/horizons/", import.meta.url);
const read = (name) => readFile(new URL(name, DIR), "utf8");
const manifest = JSON.parse(await read("manifest.json"));

test("el manifiesto contiene Sol y Tierra desde el mismo sitio", () => {
  assert.deepEqual(manifest.entries.map((e) => e.target).sort(), ["earth", "sun"]);
});

for (const entry of manifest.entries) {
  const raw = await read(entry.raw);
  const fixture = JSON.parse(await read(entry.normalized));

  test(`${entry.target}: metadatos completos de fuente, consulta, fecha, marco, unidades y cobertura`, () => {
    const { source, frame, units, coverage, request, profile } = fixture;
    assert.equal(source.endpoint, "https://ssd.jpl.nasa.gov/api/horizons.api");
    assert.equal(source.apiVersionReturned, "1.2");
    assert.equal(source.ephemeris, "DE441");
    assert.equal(source.httpStatus, 200);
    assert.match(source.retrievedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(source.generatedAt);
    assert.equal(source.queryUrl, buildQueryUrl(request));
    assert.equal(source.rawFile, entry.raw);
    assert.equal(profile.version, HORIZONS_PROFILE.version);
    assert.equal(frame.center.id, "301");
    assert.equal(frame.centerPole, "MEAN_ME (high precision)");
    assert.deepEqual(frame.centerRadiiKm, [1737.4, 1737.4, 1737.4]);
    assert.equal(frame.refSystemRequested, "ICRF");
    assert.match(frame.apparent, /AIRLESS/);
    for (const k of ["timeMs", "azimuthDeg", "elevationDeg", "illuminatedPct", "angularDiameterArcsec"]) {
      assert.ok(units[k], `unidad ${k}`);
    }
    assert.equal(coverage.rows, 49);
    assert.equal(coverage.startMs, Date.UTC(2026, 10, 14));
    assert.equal(coverage.stopMs, Date.UTC(2026, 10, 16));
    assert.equal(coverage.stepMinutes, 60);
    assert.equal(coverage.complete, true);
  });

  test(`${entry.target}: la altura 0 está declarada como supuesto, no como medida`, () => {
    // El fixture se obtuvo para Shackleton R04 (DEC-019), reemplazado en el
    // catálogo por R01 (DEC-035); se conserva como descarga histórica.
    const site = { ...SITES.find((s) => s.id === fixture.request.site.id), ...R04 };
    assert.equal(fixture.request.site.lat, site.lat);
    assert.equal(fixture.request.site.lon, site.lon);
    assert.equal(fixture.request.site.altitudeKm, 0);
    assert.equal(fixture.request.site.altitudeBasis, ALTITUDE_BASIS.assumedZero);
    assert.notEqual(fixture.request.site.altitudeKm, site.elevationKm, "no usa elevationKm sintético");
    assert.ok(fixture.assumptions.some((a) => a.includes("SUPUESTO")));
  });

  test(`${entry.target}: crudo íntegro, clave de caché y normalización reproducibles`, () => {
    assert.equal(createHash("sha256").update(raw).digest("hex"), fixture.source.rawSha256);
    assert.equal(fixture.cacheKey, entry.cacheKey);
    assert.equal(cacheKey(fixture.request), entry.cacheKey);
    assert.equal(createHash("sha256").update(entry.cacheKey).digest("hex").slice(0, 16), entry.hash);
    const again = normalizeHorizons(raw, fixture.request, {
      queryUrl: fixture.source.queryUrl,
      retrievedAt: fixture.source.retrievedAt,
      httpStatus: fixture.source.httpStatus,
      rawFile: fixture.source.rawFile,
      rawSha256: fixture.source.rawSha256,
    });
    assert.deepEqual(again, fixture);
  });

  test(`${entry.target}: valores iguales a la tabla oficial y en rango`, () => {
    const result = JSON.parse(raw).result;
    const table = result.slice(result.indexOf("$$SOE") + 5, result.indexOf("$$EOE")).trim().split("\n");
    assert.equal(table.length, fixture.samples.timeMs.length);
    table.forEach((line, i) => {
      const c = line.split(",").map((s) => s.trim());
      assert.equal(fixture.samples.azimuthDeg[i], Number(c[3]));
      assert.equal(fixture.samples.elevationDeg[i], Number(c[4]));
      assert.equal(fixture.samples.illuminatedPct[i], Number(c[5]));
      assert.equal(fixture.samples.angularDiameterArcsec[i], Number(c[6]));
    });
    fixture.samples.timeMs.forEach((t, i) => assert.equal(t, fixture.coverage.startMs + i * 3_600_000));
    for (const az of fixture.samples.azimuthDeg) assert.ok(az >= 0 && az < 360);
    for (const el of fixture.samples.elevationDeg) assert.ok(el >= -90 && el <= 90);
  });
}

test("Sol: 100 % iluminado; Tierra: fracción iluminada variable (fase)", async () => {
  const byTarget = {};
  for (const e of manifest.entries) byTarget[e.target] = JSON.parse(await read(e.normalized));
  assert.ok(byTarget.sun.samples.illuminatedPct.every((v) => v === 100));
  const earth = byTarget.earth.samples.illuminatedPct;
  assert.ok(Math.max(...earth) - Math.min(...earth) > 1);
});
