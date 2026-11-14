#!/usr/bin/env node
/**
 * Arma las series de efemérides que usa la web (CORE-01 parte B, DEC-033)
 * desde la caché validada de `fetch-horizons.mjs` (ASTRO-01, DEC-024).
 *
 * Por cada sitio curado busca en `<cache>/manifest.json` las consultas del Sol
 * y de la Tierra con el rango y paso acordados, verifica que sean completas,
 * regulares y del mismo sitio, y escribe `public/data/ephemerides/<id>.json`
 * (`selene-ephemeris/v1`, ángulos en milésimas de grado) más `index.json`.
 * No consulta la red: si falta algo, primero hay que correr fetch-horizons.
 * La salida es determinista para la misma caché.
 *
 * Uso (desde web/):
 *   node scripts/build-ephemerides.mjs [--cache .cache/horizons]
 *        [--out public/data/ephemerides]
 *        [--start 2026-11-01T00:00Z] [--stop 2028-01-01T00:00Z] [--step-min 60]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { SITES } from "../src/data/sites.js";
import { EPHEMERIS_SCHEMA, decodeEphemeris } from "../src/lib/ephemeris.js";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Rango y paso acordados para la parte B (Issue #11). */
export const EPHEMERIS_RANGE = Object.freeze({
  start: "2026-11-01T00:00Z",
  stop: "2028-01-01T00:00Z",
  stepMinutes: 60,
});

const int = (x, scale) => Math.round(x * scale);

/** Busca la entrada normalizada de un objetivo para un sitio, rango y paso. */
function findEntry(manifest, cacheDir, site, target, { startMs, stopMs, stepMinutes }) {
  const matches = manifest.entries
    .filter((e) => e.target === target)
    .map((e) => JSON.parse(readFileSync(join(cacheDir, e.normalized), "utf8")))
    .filter(
      (n) =>
        n.request.site.id === site.id &&
        n.request.site.lat === site.lat &&
        n.request.site.lon === site.lon &&
        n.request.startMs === startMs &&
        n.request.stopMs === stopMs &&
        n.request.stepMinutes === stepMinutes,
    );
  if (matches.length === 0) throw new Error(`${site.id}: falta ${target} en la caché (correr fetch-horizons.mjs)`);
  if (matches.length > 1) throw new Error(`${site.id}: hay ${matches.length} consultas de ${target} para el mismo rango`);
  return matches[0];
}

export function buildSiteEphemeris(site, sun, earth) {
  for (const n of [sun, earth]) {
    if (!n.coverage.complete) throw new Error(`${site.id}: ${n.request.target} tiene valores faltantes`);
  }
  if (sun.request.site.altitudeKm !== earth.request.site.altitudeKm) {
    throw new Error(`${site.id}: el Sol y la Tierra se pidieron con alturas distintas`);
  }
  const n = sun.samples.timeMs.length;
  if (earth.samples.timeMs.length !== n || sun.samples.timeMs.some((t, i) => t !== earth.samples.timeMs[i])) {
    throw new Error(`${site.id}: las series del Sol y la Tierra no tienen los mismos instantes`);
  }
  const provenance = (x) => ({
    queryUrl: x.source.queryUrl,
    retrievedAt: x.source.retrievedAt,
    rawSha256: x.source.rawSha256,
    generatedAt: x.source.generatedAt,
    ephemeris: x.target.ephemeris,
  });
  const out = {
    schema: EPHEMERIS_SCHEMA,
    site: { id: site.id, lat: site.lat, lon: site.lon },
    meta: {
      source: "jpl-horizons",
      name: sun.source.name,
      endpoint: sun.source.endpoint,
      apiVersion: sun.source.apiVersionReturned,
      ephemeris: sun.target.ephemeris,
      profile: sun.profile.version,
      centerPole: sun.frame.centerPole,
      observer: { altitudeKm: sun.request.site.altitudeKm, altitudeBasis: sun.request.site.altitudeBasis },
      sun: provenance(sun),
      earth: provenance(earth),
      units: {
        azimuth: "milésimas de grado desde el norte, sentido horario (aparente, sin aire)",
        elevation: "milésimas de grado sobre el plano tangente local (sin topografía)",
        earthIllum: "centésimas de % del disco terrestre iluminado",
        radius: "diezmilésimas de grado (mitad del diámetro angular de Horizons)",
      },
      assumptions: [...new Set([...sun.assumptions, ...earth.assumptions])],
    },
    coverage: { startMs: sun.coverage.startMs, stepMinutes: sun.coverage.stepMinutes, rows: n },
    series: {
      sunAz: sun.samples.azimuthDeg.map((v) => int(v, 1000)),
      sunEl: sun.samples.elevationDeg.map((v) => int(v, 1000)),
      earthAz: earth.samples.azimuthDeg.map((v) => int(v, 1000)),
      earthEl: earth.samples.elevationDeg.map((v) => int(v, 1000)),
      earthIllum: earth.samples.illuminatedPct.map((v) => int(v, 100)),
      sunRadius: sun.samples.angularDiameterArcsec.map((v) => int(v / 7200, 10000)),
      earthRadius: earth.samples.angularDiameterArcsec.map((v) => int(v / 7200, 10000)),
    },
  };
  decodeEphemeris(out); // misma validación que en el navegador
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      cache: { type: "string", default: ".cache/horizons" },
      out: { type: "string", default: "public/data/ephemerides" },
      start: { type: "string", default: EPHEMERIS_RANGE.start },
      stop: { type: "string", default: EPHEMERIS_RANGE.stop },
      "step-min": { type: "string", default: String(EPHEMERIS_RANGE.stepMinutes) },
    },
  });
  const cacheDir = resolve(WEB_ROOT, values.cache);
  const outDir = resolve(WEB_ROOT, values.out);
  const range = { startMs: Date.parse(values.start), stopMs: Date.parse(values.stop), stepMinutes: Number(values["step-min"]) };
  const manifest = JSON.parse(readFileSync(join(cacheDir, "manifest.json"), "utf8"));

  mkdirSync(outDir, { recursive: true });
  const index = { schema: "selene-ephemeris-index/v1", range: { ...range }, sites: [] };
  for (const site of SITES) {
    const sun = findEntry(manifest, cacheDir, site, "sun", range);
    const earth = findEntry(manifest, cacheDir, site, "earth", range);
    const eph = buildSiteEphemeris(site, sun, earth);
    const text = `${JSON.stringify(eph)}\n`;
    writeFileSync(join(outDir, `${site.id}.json`), text);
    index.sites.push({ id: site.id, file: `${site.id}.json`, bytes: Buffer.byteLength(text), observer: eph.meta.observer });
    console.log(`${site.id}: ${eph.coverage.rows} filas, ${(Buffer.byteLength(text) / 1024).toFixed(0)} KiB, altura ${eph.meta.observer.altitudeKm} km (${eph.meta.observer.altitudeBasis})`);
  }
  writeFileSync(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Escrito en ${outDir}`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
