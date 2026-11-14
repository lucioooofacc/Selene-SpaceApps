import test from "node:test";
import assert from "node:assert/strict";

import { CONFIDENCE_LEVELS, POINT_TYPES, SITES, SOURCE_URLS, findSite } from "../src/data/sites.js";
import {
  SITE_REFERENCE,
  assertLatitude,
  decimalPlaces,
  normalizeLongitude,
  quantizationMeters,
} from "../src/lib/coordinates.js";

// Valores confirmados por astronomía el 2026-11-14 (DEC-019). Cambiarlos exige
// actualizar DEC-019 y citar la fuente.
const CONFIRMED = {
  shackleton: [-89.7668, -171.87, "Shackleton Rim R04", "study-point"],
  malapert: [-85.9948, -0.23578, "Malapert Massif R23", "study-point"],
  cabeus: [-84.6796, -48.7093, "LCROSS Centaur impact site", "impact"],
  im1: [-80.1277, 1.4357, "IM-1 Odysseus lander", "lander"],
  chandrayaan3: [-69.3735, 32.3199, "Chandrayaan-3 Vikram lander", "lander"],
  change4: [-45.4561, 177.5885, "Chang'e 4 lander", "lander"],
  apollo11: [0.67416, 23.47314, "Apollo 11 Lunar Module", "lander"],
};

test("la referencia común es MOON_ME/DE421, planetocéntrica, este positivo, 1737,4 km", () => {
  assert.equal(SITE_REFERENCE.frame, "MOON_ME");
  assert.equal(SITE_REFERENCE.ephemeris, "DE421");
  assert.equal(SITE_REFERENCE.latitude, "planetocentric");
  assert.equal(SITE_REFERENCE.longitude, "east-positive [-180, 180)");
  assert.equal(SITE_REFERENCE.radiusKm, 1737.4);
  assert.ok(Object.isFrozen(SITE_REFERENCE));
});

test("normalizeLongitude lleva cualquier valor a [-180, 180)", () => {
  assert.equal(normalizeLongitude(180), -180);
  assert.equal(normalizeLongitude(-180), -180);
  assert.ok(Math.abs(normalizeLongitude(188.13) - -171.87) < 1e-9);
  assert.ok(Math.abs(normalizeLongitude(359.76422) - -0.23578) < 1e-9);
  assert.equal(normalizeLongitude(720), 0);
  assert.ok(Object.is(normalizeLongitude(-360), 0));
  for (let lon = -1080; lon <= 1080; lon += 7.25) {
    const n = normalizeLongitude(lon);
    assert.ok(n >= -180 && n < 180, `${lon} → ${n}`);
    assert.ok(Math.abs(((lon - n) / 360) % 1) < 1e-9, `${lon} y ${n} no son equivalentes`);
  }
  assert.throws(() => normalizeLongitude(Number.NaN), RangeError);
  assert.throws(() => normalizeLongitude(Infinity), RangeError);
});

test("assertLatitude rechaza valores fuera de [-90, 90] sin recortarlos", () => {
  assert.equal(assertLatitude(-90), -90);
  assert.equal(assertLatitude(90), 90);
  assert.throws(() => assertLatitude(-90.0001), RangeError);
  assert.throws(() => assertLatitude(Number.NaN), RangeError);
});

test("el catálogo tiene exactamente los 7 sitios confirmados con sus valores", () => {
  assert.deepEqual(
    SITES.map((s) => s.id),
    Object.keys(CONFIRMED),
  );
  for (const [id, [lat, lon, pointName, type]] of Object.entries(CONFIRMED)) {
    const site = findSite(id);
    assert.ok(site, id);
    assert.equal(site.lat, lat, `${id} lat`);
    assert.equal(site.lon, lon, `${id} lon`);
    assert.equal(site.point.name, pointName, `${id} punto`);
    assert.equal(site.point.type, type, `${id} tipo`);
  }
});

test("todos los sitios ya están normalizados y en rango", () => {
  for (const site of SITES) {
    assert.ok(site.lat >= -90 && site.lat <= 90, site.id);
    assert.ok(site.lon >= -180 && site.lon < 180, site.id);
    assert.equal(normalizeLongitude(site.lon), site.lon, site.id);
  }
});

test("cada sitio declara procedencia, tipo, confianza y precisión", () => {
  for (const site of SITES) {
    assert.ok(POINT_TYPES.includes(site.point.type), `${site.id} tipo`);
    assert.ok(CONFIDENCE_LEVELS.includes(site.confidence.level), `${site.id} confianza`);
    assert.ok(site.confidence.reason.length > 0, `${site.id} motivo`);
    assert.equal(site.provenance.confirmedOn, "2026-11-14");
    assert.ok(site.provenance.confirmedBy, site.id);
    assert.ok(site.provenance.reference.length > 0, `${site.id} referencia`);
    // El marco de la fuente queda explícito y explicado.
    assert.equal(typeof site.provenance.sourceFrameVerified, "boolean");
    assert.ok(site.provenance.frameNote.length > 0, `${site.id} nota de marco`);
    // Al menos una fuente oficial verificada, y solo de la lista verificada.
    const verified = Object.values(SOURCE_URLS);
    assert.ok(site.provenance.urls.length > 0, `${site.id} sin URL`);
    for (const url of [...site.provenance.urls, ...site.provenance.featureUrls]) {
      assert.ok(verified.includes(url), `${site.id}: URL no verificada ${url}`);
    }
    // Sin referencias candidatas sin verificar.
    assert.doesNotMatch(site.provenance.reference, /candidata|no verificada|a citar/i, site.id);
    // Exactitud desconocida = null explícito, nunca 0 ni inventada; siempre con su base.
    const { accuracyM, accuracyBasis } = site.precision;
    assert.ok(accuracyM === null || (Number.isFinite(accuracyM) && accuracyM > 0), site.id);
    assert.ok(accuracyBasis.length > 0, `${site.id} base de exactitud`);
  }
});

test("la exactitud declarada es la de la fuente, no la resolución de la cifra", () => {
  assert.equal(findSite("shackleton").precision.accuracyM, 10);
  assert.equal(findSite("malapert").precision.accuracyM, 10);
  assert.equal(findSite("cabeus").precision.accuracyM, 115);
  for (const id of ["im1", "chandrayaan3", "change4", "apollo11"]) {
    assert.equal(findSite(id).precision.accuracyM, null, id);
  }
  // Cabeus: 4 decimales (≈ 3 m de resolución) pero 115 m de exactitud 1σ.
  const site = findSite("cabeus");
  const q = quantizationMeters(site.lat, site.lon);
  assert.ok(site.precision.accuracyM > 10 * Math.max(q.northSouthM, q.eastWestM));
});

test("el marco solo se marca verificado si una fuente del valor declara Mean Earth", () => {
  const verifiedFrame = SITES.filter((s) => s.provenance.sourceFrameVerified).map((s) => s.id);
  assert.deepEqual(verifiedFrame, ["cabeus", "change4", "apollo11"]);
});

test("los ids siguen siendo únicos (la UI y los chips dependen de ellos)", () => {
  assert.equal(new Set(SITES.map((s) => s.id)).size, SITES.length);
  for (const id of ["shackleton", "malapert", "cabeus", "apollo11"]) assert.ok(findSite(id));
  assert.equal(findSite("no-existe"), null);
});

test("quantizationMeters describe la resolución de la cifra publicada", () => {
  assert.equal(decimalPlaces(-89.7668), 4);
  assert.equal(decimalPlaces(-171.87), 2);
  assert.equal(decimalPlaces(0.67416), 5);
  assert.equal(decimalPlaces(10), 0);
  // 1e-4° sobre 1737,4 km ≈ 3,03 m.
  const im1 = quantizationMeters(-80.1277, 1.4357);
  assert.ok(Math.abs(im1.northSouthM - 3.0323) < 1e-3);
  assert.ok(Math.abs(im1.eastWestM - 3.0323 * Math.cos((80.1277 * Math.PI) / 180)) < 1e-3);
  // Cerca del polo, 0,01° de longitud equivale a pocos metros.
  const shackleton = quantizationMeters(-89.7668, -171.87);
  assert.ok(shackleton.eastWestM < 1.5);
  for (const site of SITES) {
    const q = quantizationMeters(site.lat, site.lon);
    assert.ok(q.northSouthM <= 3.1 && q.eastWestM <= 3.1, `${site.id}: ${JSON.stringify(q)}`);
  }
});
