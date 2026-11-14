/**
 * Pruebas matemáticas del horizonte LOLA (TERRAIN-02, DEC-029) sobre grillas
 * SINTÉTICAS en memoria (no son datos LOLA): plano esférico, anillo de altura
 * conocida, montaña en un solo rumbo, count = 0, truncamiento por cobertura,
 * continuidad 0°/360° y determinismo. La tabla real se valida en
 * `horizon-lola.table.test.js`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeHorizonProfile,
  createLolaHorizon,
  createRasterSampler,
  destination,
  elevationAngleDeg,
  summarizeProfile,
} from "../src/lib/horizon-lola.js";
import { pixelToLatLon } from "../src/lib/terrain-data.js";
import { horizonDip } from "../src/lib/terrain.js";

const R = 1737.4;
const DEG = Math.PI / 180;

// Grilla de 241 × 241 píxeles de 240 m (±28,8 km). El polo queda 15 km "abajo"
// del centro para que el observador no esté en la singularidad del azimut.
const GRID = Object.freeze({
  lines: 241,
  samples: 241,
  lineOffset: 120 - 15000 / 240,
  sampleOffset: 120,
  scaleM: 240,
  radiusM: 1737400,
  maxLatitude: -60,
});
const OBSERVER = pixelToLatLon(120, 120, GRID);

/** Distancia (km) y rumbo (°) sobre la esfera desde el observador, calculados en forma independiente. */
function rangeBearing(lat, lon) {
  const p1 = OBSERVER.lat * DEG;
  const p2 = lat * DEG;
  const dl = (lon - OBSERVER.lon) * DEG;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const d = 2 * R * Math.asin(Math.sqrt(a));
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return { d, bearing: ((Math.atan2(y, x) / DEG) % 360 + 360) % 360 };
}

function makeRaster(heightKm, count = () => 1, grid = GRID) {
  const n = grid.lines * grid.samples;
  const dem = new Float32Array(n);
  const counts = new Int16Array(n);
  for (let l = 0; l < grid.lines; l++) {
    for (let s = 0; s < grid.samples; s++) {
      const { lat, lon } = pixelToLatLon(l, s, grid);
      const rb = rangeBearing(lat, lon);
      dem[l * grid.samples + s] = heightKm(rb);
      counts[l * grid.samples + s] = count(rb);
    }
  }
  return createRasterSampler({ dem, counts, grid });
}

const OPTS = { maxDistanceKm: 20, stepKm: 0.06, azimuthStepDeg: 5, observerHeightM: 2, radiusKm: R };

test("destination: rumbo 0° aumenta la latitud y la distancia es la pedida", () => {
  const p = destination(-85, 10, 0, 30 / R);
  assert.ok(p.lat > -85);
  assert.ok(Math.abs(p.lon - 10) < 1e-9);
  const q = destination(OBSERVER.lat, OBSERVER.lon, 90, 12 / R);
  const rb = rangeBearing(q.lat, q.lon);
  assert.ok(Math.abs(rb.d - 12) < 1e-6);
  assert.ok(Math.abs(rb.bearing - 90) < 1e-6);
});

test("elevationAngleDeg: casos geométricos exactos", () => {
  // Mismo radio a distancia δ: el punto queda δ/2 por debajo del plano tangente.
  const delta = 10 / R;
  assert.ok(Math.abs(elevationAngleDeg(R, R, delta) + delta / 2 / DEG) < 1e-9);
  // Punto muy cercano 1 km más alto a 10 km: ≈ atan(1/10) menos la curvatura.
  const e = elevationAngleDeg(R, R + 1, 10 / R);
  assert.ok(Math.abs(e - Math.atan(1 / 10) / DEG) < 0.2);
});

test("esfera lisa: el horizonte es la depresión del observador a 2 m", () => {
  const sampler = makeRaster(() => 0);
  const p = computeHorizonProfile(sampler, OBSERVER, OPTS);
  const dip = horizonDip(0.002); // ≈ 0,0869°
  for (let i = 0; i < p.elevationDeg.length; i++) {
    assert.ok(Math.abs(p.elevationDeg[i] + dip) < 0.002, `az ${i * 5}: ${p.elevationDeg[i]} vs ${-dip}`);
    // La tangente geométrica está a √(2Rh) ≈ 2,64 km.
    assert.ok(Math.abs(p.distanceKm[i] - Math.sqrt(2 * R * 0.002)) < 0.5);
  }
});

test("anillo de 1 km de altura a 10 km: elevación analítica en todos los azimuts", () => {
  const sampler = makeRaster(({ d }) => (d >= 10 && d <= 11 ? 1 : 0));
  const p = computeHorizonProfile(sampler, OBSERVER, OPTS);
  const expected = elevationAngleDeg(R + 0.002, R + 1, 10 / R);
  for (let i = 0; i < p.elevationDeg.length; i++) {
    // La interpolación bilineal suaviza el borde del anillo en ±1 píxel (240 m).
    assert.ok(Math.abs(p.elevationDeg[i] - expected) < 0.15, `az ${i * 5}: ${p.elevationDeg[i]} vs ${expected}`);
    assert.ok(p.distanceKm[i] >= 9.7 && p.distanceKm[i] <= 10.5);
  }
});

test("montaña solo hacia el este: el azimut se mide desde el norte en sentido horario", () => {
  const sampler = makeRaster(({ d, bearing }) => (bearing > 70 && bearing < 110 && d > 4 && d < 6 ? 2 : 0));
  const p = computeHorizonProfile(sampler, OBSERVER, OPTS);
  const at = (az) => p.elevationDeg[az / 5];
  assert.ok(at(90) > 15, `este: ${at(90)}`);
  for (const az of [0, 180, 270]) assert.ok(at(az) < 0, `az ${az}: ${at(az)}`);
});

test("count = 0 en el punto que define el horizonte se marca como baja confianza", () => {
  const ridge = ({ d }) => (d >= 10 && d <= 11 ? 1 : 0);
  const zeroEast = ({ bearing }) => (bearing > 60 && bearing < 120 ? 0 : 5);
  const p = computeHorizonProfile(makeRaster(ridge, zeroEast), OBSERVER, OPTS);
  assert.equal(p.lowConfidence[90 / 5], true);
  assert.equal(p.lowConfidence[270 / 5], false);
  // El valor del DEM se usa igual (no se convierte a 0 ni se descarta).
  assert.ok(Math.abs(p.elevationDeg[90 / 5] - p.elevationDeg[270 / 5]) < 0.15);
});

test("cobertura: el rayo se corta en el borde de la grilla y se registra", () => {
  const sampler = makeRaster(() => 0);
  const full = computeHorizonProfile(sampler, OBSERVER, { ...OPTS, maxDistanceKm: 20 });
  assert.ok(full.coverageKm.every((c) => Math.abs(c - 20) < 1e-9));
  const cut = computeHorizonProfile(sampler, OBSERVER, { ...OPTS, maxDistanceKm: 60 });
  assert.ok(cut.coverageKm.every((c) => c < 60 && c > 28));
  assert.equal(summarizeProfile(cut, 60).truncatedFraction, 1);
});

test("observador fuera de la cobertura: error explícito, sin extrapolar", () => {
  const sampler = makeRaster(() => 0);
  assert.throws(() => computeHorizonProfile(sampler, { lat: -60, lon: 0 }, OPTS), RangeError);
  assert.equal(sampler(-59, 0), null);
});

test("determinismo: mismos datos y parámetros, mismo perfil", () => {
  const h = ({ d, bearing }) => Math.sin(d) * 0.3 + Math.cos(bearing * DEG) * 0.2;
  const a = computeHorizonProfile(makeRaster(h), OBSERVER, OPTS);
  const b = computeHorizonProfile(makeRaster(h), OBSERVER, OPTS);
  assert.deepEqual(a, b);
});

const TABLE = {
  params: { maxDistanceKm: 300, azimuthStepDeg: 90 },
  source: { dataSetId: "SINTÉTICO" },
  algorithm: "test",
  sites: {
    x: {
      observer: {},
      summary: {},
      elevationDeg: [0, 4, 8, 12],
      distanceKm: [1, 2, 3, 4],
      lowConfidence: [0, 1, 0, 0],
      coverageKm: [300, 300, 120, 300],
    },
  },
  excluded: [{ id: "y", reason: "fuera" }],
};

test("createLolaHorizon: interpolación y continuidad circular 0°/360°", () => {
  const h = createLolaHorizon("x", TABLE);
  assert.equal(h(0), 0);
  assert.equal(h(45), 2);
  assert.equal(h(315), 6); // entre 270° (12) y 360° = 0° (0)
  assert.equal(h(360), h(0));
  assert.equal(h(-90), h(270));
  assert.equal(h(720 + 45), h(45));
  assert.ok(Math.abs(h(359.999) - h(0)) < 1e-3);
  assert.ok(Math.abs(h(0.001) - h(0)) < 1e-3);
});

test("createLolaHorizon: procedencia y calidad expuestas; null fuera de cobertura", () => {
  const h = createLolaHorizon("x", TABLE);
  assert.equal(h.source, "lola");
  assert.equal(h.meta.product.dataSetId, "SINTÉTICO");
  assert.deepEqual(h.detail(90), {
    azimuthDeg: 90,
    elevationDeg: 4,
    distanceKm: 2,
    lowConfidence: true,
    coverageKm: 300,
    truncated: false,
  });
  assert.equal(h.detail(180).truncated, true);
  assert.equal(h.detail(359).azimuthDeg, 0);
  assert.equal(createLolaHorizon("y", TABLE), null);
  assert.equal(createLolaHorizon("no-existe", TABLE), null);
});
