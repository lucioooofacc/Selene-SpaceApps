import test from "node:test";
import assert from "node:assert/strict";

import {
  DAY_MS,
  earthPhase,
  earthPosition,
  skyPosition,
  subEarthPoint,
  subSolarPoint,
  sunPosition,
  wrap180,
  wrap360,
} from "../src/lib/astro.js";

const EPS = 1e-9;
const close = (actual, expected, tolerance = EPS) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no está dentro de ${tolerance} de ${expected}`);

test("normaliza ángulos en los intervalos públicos", () => {
  for (let angle = -1440; angle <= 1440; angle += 7.25) {
    const a180 = wrap180(angle);
    const a360 = wrap360(angle);
    assert.ok(a180 >= -180 && a180 < 180);
    assert.ok(a360 >= 0 && a360 < 360);
    close(wrap360(a180), a360, 1e-10);
  }

  assert.equal(wrap360(-1), 359);
  assert.equal(wrap360(360), 0);
  assert.equal(wrap180(180), -180);
});

test("resuelve casos geométricos locales conocidos", () => {
  const site = { lat: 0, lon: 0 };
  const zenith = skyPosition(site, { lat: 0, lon: 0 });
  close(zenith.elevation, 90);

  const east = skyPosition(site, { lat: 0, lon: 90 });
  close(east.elevation, 0, 1e-8);
  close(east.azimuth, 90, 1e-8);

  const north = skyPosition(site, { lat: 90, lon: 0 });
  close(north.elevation, 0, 1e-8);
  close(north.azimuth, 0, 1e-8);
});

test("mantiene azimut, elevación, fase y puntos subyacentes en rangos válidos", () => {
  const sites = [
    { lat: 0, lon: 0 },
    { lat: -89.9, lon: 45 },
    { lat: 67, lon: -179.9 },
  ];
  const start = Date.UTC(2026, 10, 14, 12);

  for (let day = 0; day <= 40; day += 2.5) {
    const ms = start + day * DAY_MS;
    for (const point of [subSolarPoint(ms), subEarthPoint(ms)]) {
      assert.ok(point.lat >= -90 && point.lat <= 90);
      assert.ok(point.lon >= -180 && point.lon < 180);
    }
    for (const site of sites) {
      for (const position of [sunPosition(site, ms), earthPosition(site, ms)]) {
        assert.ok(position.azimuth >= 0 && position.azimuth < 360);
        assert.ok(position.elevation >= -90 && position.elevation <= 90);
      }
    }
    const phase = earthPhase(ms);
    assert.ok(phase >= 0 && phase <= 1);
  }
});

test("produce resultados deterministas para entradas idénticas", () => {
  const site = { lat: -85.99, lon: 0 };
  const ms = Date.UTC(2026, 10, 15, 3, 30);
  assert.deepEqual(sunPosition(site, ms), sunPosition(site, ms));
  assert.deepEqual(earthPosition(site, ms), earthPosition(site, ms));
  assert.equal(earthPhase(ms), earthPhase(ms));
});

