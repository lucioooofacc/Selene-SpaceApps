/**
 * Terreno alrededor de un sitio para el informe (DEC-059). `siteTerrain()`
 * recibe una función de muestreo `sample(lat, lon)` →
 * `{heightKm, lowConfidence} | null`; `terrainForSite()` elige la fuente:
 * DEM polar reducido (480 m hasta −80°, 960 m hasta −75°, DEC-034), tabla
 * precalculada de LDEM_128 o DEM global LDEM_16 (TERRAIN-04, DEC-067).
 * Módulo puro.
 *
 * - Pendiente: diferencias centradas a ±`stepKm` en norte–sur y este–oeste.
 * - Alrededores: grilla de puntos cada `stepKm` dentro de `radiusKm`;
 *   pendiente media y máxima, % del área con pendiente menor que cada umbral,
 *   rugosidad (desvío estándar de la altura) y desnivel (máx − mín).
 * La resolución del DEM suaviza pendientes de escala menor que ~1 km: los
 * valores son de escala kilométrica, no de la zona exacta de contacto.
 */
import { destination } from "./horizon-lola.js";
import { POLAR_DEM_COVERAGE_LATITUDE, polarDemResolutionM, polarDemSample } from "./polar-dem.js";
import { globalDemResolutionKm, globalDemSample } from "./global-dem.js";
import { SITE_TERRAIN } from "../data/terrain/site-terrain.js";
import { withSlope } from "./analysis.js";

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

/**
 * Parámetros del terreno con el DEM global de baja resolución (TERRAIN-04,
 * DEC-067): diferencias a ±2 píxeles de LDEM_16 y un radio de ~3 pasos, la
 * misma proporción que el cálculo polar. Son pendientes de escala regional.
 */
export const GLOBAL_TERRAIN_PARAMS = Object.freeze({ stepKm: 3.8, radiusKm: 12 });

/** Entrada precalculada (LDEM_128) de un sitio curado que conserva sus coordenadas, o null. */
function precomputed(site) {
  const entry = site?.id ? SITE_TERRAIN.sites[site.id] : null;
  return entry && entry.lat === site.lat && entry.lon === site.lon ? entry : null;
}

/**
 * ¿Hace falta bajar el DEM global para el terreno de este sitio? Sí cuando
 * queda fuera del DEM polar reducido y no tiene terreno precalculado.
 */
export function needsGlobalDem(site) {
  return Number.isFinite(site?.lat) && site.lat > POLAR_DEM_COVERAGE_LATITUDE && !precomputed(site);
}

/**
 * Terreno de un sitio con la mejor fuente disponible, en este orden:
 * 1. `"polar"`: DEM polar reducido registrado (480/960 m, al sur de −75°).
 * 2. `"fine"`: tabla precalculada desde LDEM_128 (237 m) para los sitios
 *    curados fuera del polo, si conservan sus coordenadas.
 * 3. `"global"`: DEM global LDEM_16 registrado (~1,9 km), escala regional.
 * @returns {null | {source: "polar"|"fine"|"global", resolutionM: number, terrain: object}}
 */
export function terrainForSite(site) {
  const polarRes = polarDemResolutionM();
  const polar = polarRes ? siteTerrain(polarDemSample, site, { stepKm: (polarRes * 2) / 1000 }) : null;
  if (polar) return { source: "polar", resolutionM: polarRes, terrain: polar };
  const entry = precomputed(site);
  if (entry) return { source: "fine", resolutionM: SITE_TERRAIN.resolutionM, terrain: entry.terrain };
  const globalRes = globalDemResolutionKm();
  const global = globalRes ? siteTerrain(globalDemSample, site, GLOBAL_TERRAIN_PARAMS) : null;
  return global ? { source: "global", resolutionM: globalRes * 1000, terrain: global } : null;
}

/**
 * Pendiente del sitio para el requisito de viabilidad (DEC-071): la del punto
 * (o la media del entorno si falta) cuando el terreno sale del DEM polar o de
 * la tabla de LDEM_128, de escala kilométrica. Con el DEM global (escala
 * regional, ~4 km) o sin datos devuelve null: no se evalúa.
 */
export function slopeForViability(site) {
  const found = terrainForSite(site);
  if (!found || found.source === "global") return null;
  return found.terrain.slopeDeg ?? found.terrain.area.meanSlope;
}

/** Viabilidad del escenario con la pendiente sumada cuando hay datos de terreno (DEC-071). */
export function siteViability(site, scenario) {
  return withSlope(scenario.viability, slopeForViability(site));
}
