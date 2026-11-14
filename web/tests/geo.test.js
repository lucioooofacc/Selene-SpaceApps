import { test } from "node:test";
import assert from "node:assert/strict";
import { greatCirclePoints, midpoint, surfaceDistanceKm } from "../src/lib/geo.js";

const close = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

test("distancia por la superficie: un cuarto de meridiano y polos opuestos", () => {
  close(surfaceDistanceKm({ lat: 0, lon: 0 }, { lat: 90, lon: 0 }), (Math.PI / 2) * 1737.4, 1e-6);
  close(surfaceDistanceKm({ lat: -90, lon: 0 }, { lat: 90, lon: 0 }), Math.PI * 1737.4, 1e-6);
  assert.equal(surfaceDistanceKm({ lat: 10, lon: 20 }, { lat: 10, lon: 20 }), 0);
});

test("el arco empieza y termina en los sitios y su punto medio equidista", () => {
  const a = { lat: -89.46, lon: -137.49 };
  const b = { lat: -85.99, lon: -0.24 };
  const pts = greatCirclePoints(a, b, 20);
  assert.equal(pts.length, 21);
  close(pts[0].lat, a.lat, 1e-9);
  close(pts[20].lat, b.lat, 1e-9);
  const m = midpoint(a, b);
  close(surfaceDistanceKm(a, m), surfaceDistanceKm(m, b), 1e-6);
  // Pasar cerca del polo es más corto que seguir el paralelo: el arco baja de −89,46°.
  assert.ok(Math.min(...pts.map((p) => p.lat)) <= a.lat);
});
