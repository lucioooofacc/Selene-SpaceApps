/**
 * Pruebas matemáticas del horizonte LOLA (TERRAIN-02, DEC-030) sobre grillas
 * SINTÉTICAS en memoria (no son datos LOLA): plano esférico, anillo de altura
 * conocida, montaña en un solo rumbo, count = 0, truncamiento por cobertura,
 * continuidad 0°/360° y determinismo. La tabla real se valida en
 * `horizon-lola.table.test.js`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeHorizonProfile,
  createCylindricalWindowSampler,
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

// --- Ventana cilíndrica global (LDEM_128, TERRAIN-03, DEC-061) ---
// Grilla SINTÉTICA de 2 px/grado (720 × 360) con la misma convención que
// LDEM_128: pixel registered, línea 0 al norte, sample 0 en longitud 0° E.
const CYL = Object.freeze({
  lines: 360,
  samples: 720,
  pixelsPerDegree: 2,
  lineProjectionOffset: 179.5,
  sampleProjectionOffset: 359.5,
  centerLatitude: 0,
  centerLongitude: 180,
});

function cylWindow(win, valueAt) {
  const dem = new Int16Array(win.lines * win.samples);
  const counts = new Int16Array(win.lines * win.samples).fill(1);
  for (let r = 0; r < win.lines; r++) {
    for (let c = 0; c < win.samples; c++) {
      const s = (((win.sample0 + c) % CYL.samples) + CYL.samples) % CYL.samples;
      dem[r * win.samples + c] = valueAt(win.line0 + r, s);
    }
  }
  return { dem, counts };
}

test("ventana cilíndrica: centros de píxel, escala de DN y cruce de 0°/360°", () => {
  const win = { line0: 170, lines: 20, sample0: -10, samples: 20 }; // 355°..5° E
  const { dem, counts } = cylWindow(win, (l, s) => (l - 170) * 1000 + s); // cabe en int16
  const sample = createCylindricalWindowSampler({ dem, counts, window: win, grid: CYL, scalingFactor: 0.5 });
  // Centro del píxel (línea 179, sample 0) = lat 0,25°, lon 0,25°.
  assert.equal(sample(0.25, 0.25).heightKm, ((9 * 1000 + 0) * 0.5) / 1000);
  // Píxel 719 (lon 359,75°) dentro de la misma ventana, también como −0,25°.
  assert.equal(sample(0.25, 359.75).heightKm, ((9 * 1000 + 719) * 0.5) / 1000);
  assert.equal(sample(0.25, -0.25).heightKm, sample(0.25, 359.75).heightKm);
  // Fuera de la ventana no se extrapola.
  assert.equal(sample(0.25, 10), null);
  assert.equal(sample(30, 0.25), null);
});

test("ventana cilíndrica: count = 0 marca baja confianza; tamaño validado", () => {
  const win = { line0: 170, lines: 20, sample0: 350, samples: 20 };
  const { dem, counts } = cylWindow(win, () => 0);
  counts[9 * 20 + 9] = 0; // línea 179, sample 359 → centro (0,25°, 179,75°)
  const sample = createCylindricalWindowSampler({ dem, counts, window: win, grid: CYL, scalingFactor: 0.5 });
  assert.equal(sample(0.25, 179.75).lowConfidence, true);
  assert.equal(sample(0.25, 182).lowConfidence, false);
  assert.throws(() => createCylindricalWindowSampler({ dem: [], counts, window: win, grid: CYL, scalingFactor: 0.5 }), RangeError);
});

test("ventana cilíndrica: sobre una esfera lisa el horizonte es la depresión del observador", () => {
  const win = { line0: 140, lines: 80, sample0: 320, samples: 80 }; // ±20° alrededor de (0°, 180°)
  const { dem, counts } = cylWindow(win, () => 0);
  const sampler = createCylindricalWindowSampler({ dem, counts, window: win, grid: CYL, scalingFactor: 0.5 });
  const p = computeHorizonProfile(sampler, { lat: 0, lon: 180 }, { maxDistanceKm: 300, stepKm: 2, azimuthStepDeg: 45, radiusKm: R });
  const dip = horizonDip(2 / 1000);
  for (const e of p.elevationDeg) assert.ok(e < 0 && e > -1, `elevación ${e}`);
  for (const c of p.coverageKm) assert.equal(c, 300);
  // Con 300 km de rayo, el máximo está en la primera muestra: casi la depresión geométrica.
  assert.ok(Math.abs(Math.max(...p.elevationDeg) - -dip) < 0.1);
});

test("createLolaHorizon: una entrada con `source` propio usa ese producto", () => {
  const table = { ...TABLE, sites: { z: { ...TABLE.sites.x, source: { dataSetId: "GLOBAL" } } } };
  assert.equal(createLolaHorizon("z", table).meta.product.dataSetId, "GLOBAL");
  assert.equal(createLolaHorizon("x", TABLE).meta.product.dataSetId, "SINTÉTICO");
});
