import { test } from "node:test";
import assert from "node:assert/strict";
import { earthDistanceFromRadius, hohmannTransfer, missionTimeline } from "../src/lib/trajectory.js";
import { siteTerrain, slopeAt } from "../src/lib/site-terrain.js";

const close = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b} (±${tol})`);

test("Hohmann LEO 185 km → distancia lunar media: valores de libro", () => {
  const h = hohmannTransfer();
  close(h.tofDays, 4.98, 0.05); // ~5 días
  close(h.dvTLI, 3.13, 0.03); // ~3,1 km/s
  close(h.dvDescent, 1.633, 0.005); // velocidad de una órbita lunar de 100 km
  assert.ok(h.dvLOI > 0.6 && h.dvLOI < 1.0); // captura en órbita baja ~0,8 km/s
  close(h.dvTotal, h.dvTLI + h.dvLOI + h.dvDescent, 1e-9);
});

test("distancia desde el radio angular y cronograma hacia atrás", () => {
  // Radio angular de la Tierra a 384 400 km: asin(6378,137/384400) ≈ 0,9507°
  close(earthDistanceFromRadius(0.9507), 384400, 300);
  assert.equal(earthDistanceFromRadius(0), null);
  const tl = missionTimeline(Date.UTC(2027, 0, 10), 5, 1);
  assert.equal(tl.arrivalMs, Date.UTC(2027, 0, 9));
  assert.equal(tl.tliMs, Date.UTC(2027, 0, 4));
});

test("terreno: plano inclinado conocido y punto sin datos", () => {
  // Altura que sube 0,1 km por km hacia el norte: pendiente atan(0,1) = 5,71°.
  const KM_PER_DEG = (Math.PI / 180) * 1737.4;
  const tilted = (lat) => ({ heightKm: (lat + 85) * KM_PER_DEG * 0.1, lowConfidence: false });
  close(slopeAt(tilted, -85, 30, 0.96), 5.71, 0.05);
  const t = siteTerrain(tilted, { lat: -85, lon: 30 }, { stepKm: 0.96, radiusKm: 3 });
  close(t.area.meanSlope, 5.71, 0.1);
  assert.equal(t.area.below[5], 0);
  assert.equal(t.area.below[10], 100);
  assert.equal(siteTerrain(() => null, { lat: -85, lon: 30 }), null);
});
