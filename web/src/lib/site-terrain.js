/**
 * Terreno alrededor de un sitio para el informe (DEC-059), con el DEM LOLA
 * polar reducido registrado (480 m hasta −80°, 960 m hasta −75°, DEC-034).
 * Módulo puro: recibe una función de muestreo `sample(lat, lon)` →
 * `{heightKm, lowConfidence} | null`.
 *
 * - Pendiente: diferencias centradas a ±`stepKm` en norte–sur y este–oeste.
 * - Alrededores: grilla de puntos cada `stepKm` dentro de `radiusKm`;
 *   pendiente media y máxima, % del área con pendiente menor que cada umbral,
 *   rugosidad (desvío estándar de la altura) y desnivel (máx − mín).
 * La resolución del DEM suaviza pendientes de escala menor que ~1 km: los
 * valores son de escala kilométrica, no de la zona exacta de contacto.
 */
import { destination } from "./horizon-lola.js";

const RADIUS_KM = 1737.4;

/** Pendiente (grados) en un punto, o null si falta algún vecino. */
export function slopeAt(sample, lat, lon, stepKm) {
  const d = stepKm / RADIUS_KM;
  const n = sample(...Object.values(destination(lat, lon, 0, d)));
  const s = sample(...Object.values(destination(lat, lon, 180, d)));
  const e = sample(...Object.values(destination(lat, lon, 90, d)));
  const w = sample(...Object.values(destination(lat, lon, 270, d)));
  if (!n || !s || !e || !w) return null;
  const dzdy = (n.heightKm - s.heightKm) / (2 * stepKm);
  const dzdx = (e.heightKm - w.heightKm) / (2 * stepKm);
  return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
}

/**
 * @param {(lat:number, lon:number) => ({heightKm:number, lowConfidence:boolean}|null)} sample
 * @param {{lat:number, lon:number}} site
 * @param {{stepKm?: number, radiusKm?: number, thresholds?: number[]}} [o]
 * @returns {null | {heightKm:number, slopeDeg:number|null, area:{radiusKm:number, points:number, meanSlope:number, maxSlope:number, below:Record<number, number>, roughnessM:number, reliefM:number, lowConfidencePct:number}}}
 */
export function siteTerrain(sample, site, { stepKm = 0.96, radiusKm = 3, thresholds = [5, 10, 15] } = {}) {
  const center = sample(site.lat, site.lon);
  if (!center) return null;
  const slopes = [];
  const heights = [];
  let low = 0;
  const n = Math.floor(radiusKm / stepKm);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const r = Math.hypot(i, j) * stepKm;
      if (r > radiusKm) continue;
      const az = (Math.atan2(j, i) * 180) / Math.PI; // i: norte, j: este
      const p = r === 0 ? { lat: site.lat, lon: site.lon } : destination(site.lat, site.lon, az, r / RADIUS_KM);
      const h = sample(p.lat, p.lon);
      const sl = slopeAt(sample, p.lat, p.lon, stepKm);
      if (!h || sl === null) continue;
      heights.push(h.heightKm * 1000);
      slopes.push(sl);
      if (h.lowConfidence) low++;
    }
  }
  if (!slopes.length) return null;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const hMean = mean(heights);
  const below = {};
  for (const t of thresholds) below[t] = (100 * slopes.filter((s) => s < t).length) / slopes.length;
  return {
    heightKm: center.heightKm,
    slopeDeg: slopeAt(sample, site.lat, site.lon, stepKm),
    area: {
      radiusKm,
      points: slopes.length,
      meanSlope: mean(slopes),
      maxSlope: Math.max(...slopes),
      below,
      roughnessM: Math.sqrt(mean(heights.map((h) => (h - hMean) ** 2))),
      reliefM: Math.max(...heights) - Math.min(...heights),
      lowConfidencePct: (100 * low) / slopes.length,
    },
  };
}
