import test from "node:test";
import assert from "node:assert/strict";

import { createHorizon, estimateRelief, horizonDip } from "../src/lib/terrain.js";

const site = { lat: -89.9, lon: 0, relief: 0.7, elevationKm: 1 };

test("el horizonte sintético es determinista", () => {
  const a = createHorizon(site);
  const b = createHorizon({ ...site });
  for (let azimuth = -720; azimuth <= 720; azimuth += 0.25) {
    assert.equal(a(azimuth), b(azimuth));
    assert.ok(Number.isFinite(a(azimuth)));
  }
  assert.equal(estimateRelief(-87.5, 32), estimateRelief(-87.5, 32));
});

test("es periódico y continuo en el límite 0°/360°", () => {
  const horizon = createHorizon(site);
  assert.equal(horizon(0), horizon(360));
  assert.equal(horizon(-360), horizon(720));
  assert.ok(Math.abs(horizon(359.999) - horizon(0.001)) < 0.01);
});

test("la tabla precalculada conserva la forma del evaluador directo", () => {
  const table = createHorizon(site);
  const direct = createHorizon(site, { precompute: false });
  for (let azimuth = 0; azimuth < 360; azimuth += 15) {
    assert.ok(Math.abs(table(azimuth) - direct(azimuth)) < 1e-5);
  }
});

test("la depresión por altura tiene dominio y tendencia esperados", () => {
  assert.equal(horizonDip(-1), 0);
  assert.equal(horizonDip(0), 0);
  assert.ok(horizonDip(1) > 0);
  assert.ok(horizonDip(2) > horizonDip(1));
});

