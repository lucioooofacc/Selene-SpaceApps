/**
 * Geometría sobre la esfera lunar para la vista 3D de la comparación
 * (DEC-054). Módulo puro: distancia por la superficie (círculo máximo),
 * punto medio y puntos del arco entre dos sitios.
 */
import { SITE_REFERENCE } from "./coordinates.js";

const DEG = Math.PI / 180;

const toVec = ({ lat, lon }) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)];
const toLatLon = ([x, y, z]) => {
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(z / r) / DEG, lon: Math.atan2(y, x) / DEG };
};

/** Ángulo central entre dos puntos, en radianes (fórmula del haversine). */
export function centralAngle(a, b) {
  const s =
    Math.sin(((b.lat - a.lat) * DEG) / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(((b.lon - a.lon) * DEG) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Distancia por la superficie en km (esfera de referencia de 1737,4 km). */
export function surfaceDistanceKm(a, b, radiusKm = SITE_REFERENCE.radiusKm) {
  return centralAngle(a, b) * radiusKm;
}

/**
 * `n + 1` puntos del arco de círculo máximo de `a` a `b` (interpolación
 * esférica). Si los puntos son antípodas, el arco no está definido: se
 * devuelven solo los extremos.
 */
export function greatCirclePoints(a, b, n = 32) {
  const omega = centralAngle(a, b);
  if (omega < 1e-9 || Math.PI - omega < 1e-6) return [a, b];
  const va = toVec(a);
  const vb = toVec(b);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const ka = Math.sin((1 - f) * omega) / Math.sin(omega);
    const kb = Math.sin(f * omega) / Math.sin(omega);
    pts.push(toLatLon([0, 1, 2].map((k) => ka * va[k] + kb * vb[k])));
  }
  return pts;
}

/** Punto medio del arco (o el de `a` si son el mismo punto). */
export function midpoint(a, b) {
  const pts = greatCirclePoints(a, b, 2);
  return pts.length === 3 ? pts[1] : { lat: (a.lat + b.lat) / 2, lon: a.lon };
}
