/**
 * Horizonte topográfico real desde el DEM LOLA polar sur (TERRAIN-02, DEC-030).
 *
 * Módulo puro: sin DOM, red ni archivos. Tiene dos partes:
 *
 * 1. Cálculo (lo usa `scripts/build-lola-horizons.mjs`, fuera del navegador):
 *    por cada azimut se recorre un rayo sobre el círculo máximo que sale del
 *    sitio y se toma el máximo ángulo de elevación del terreno. La curvatura es
 *    exacta: el terreno a distancia angular δ = d / R con radio r se ve desde un
 *    observador de radio r₀ con elevación atan2(r·cos δ − r₀, r·sin δ) sobre el
 *    plano tangente local. Las alturas se interpolan bilinealmente en la grilla
 *    estereográfica de `terrain-data.js`.
 *
 * 2. Consulta (la usará CORE-01): `createLolaHorizon(siteId)` arma
 *    `horizon(azimuth) -> elevation` en grados desde la tabla precalculada
 *    `data/terrain/lola-horizons.js`, con continuidad circular 0°/360°.
 *
 * Convenciones: azimut en grados desde el norte lunar, sentido horario;
 * elevación en grados sobre el plano tangente local; alturas del DEM en km
 * sobre la esfera de 1737,4 km; distancias en km sobre esa esfera.
 *
 * Calidad: un punto del rayo es de baja confianza si alguno de los píxeles que
 * entran en su interpolación tiene `count = 0` (valor interpolado por LOLA, sin
 * medición directa). Si el rayo sale de la cobertura nominal (−90°..−60°) o de
 * la grilla antes de `maxDistanceKm`, se corta ahí y se registra la distancia
 * alcanzada: el horizonte de ese azimut es una cota inferior. Nunca se
 * extrapola fuera de la cobertura.
 */
import { LOLA_HORIZONS } from "../data/terrain/lola-horizons.js";
import { LOLA_GRID, latLonToPixel } from "./terrain-data.js";
import { normalizeLongitude } from "./coordinates.js";

const DEG = Math.PI / 180;

/** Versión del algoritmo. Cambiarla si cambia cualquier resultado. */
export const HORIZON_ALGORITHM = "selene-lola-horizon/v1";

/** Parámetros acordados para TERRAIN-02 (DEC-030). */
export const HORIZON_PARAMS = Object.freeze({
  maxDistanceKm: 300,
  stepKm: 0.12, // medio píxel de 240 m
  azimuthStepDeg: 0.5,
  observerHeightM: 2,
  minDistanceKm: 0,
});

/** Punto a distancia angular `delta` (rad) y rumbo `azimuthDeg` desde (lat, lon), sobre la esfera. */
export function destination(lat, lon, azimuthDeg, delta) {
  const phi1 = lat * DEG;
  const theta = azimuthDeg * DEG;
  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));
  const dLon = Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * sinPhi2,
  );
  return { lat: phi2 / DEG, lon: normalizeLongitude((lon * DEG + dLon) / DEG) };
}

/**
 * Elevación (grados) sobre el plano tangente local de un punto de radio
 * `targetRadiusKm` a distancia angular `delta` (rad), visto desde un
 * observador de radio `observerRadiusKm`. Incluye la curvatura sin aproximar.
 */
export function elevationAngleDeg(observerRadiusKm, targetRadiusKm, delta) {
  return (
    Math.atan2(targetRadiusKm * Math.cos(delta) - observerRadiusKm, targetRadiusKm * Math.sin(delta)) / DEG
  );
}

/**
 * Muestreador bilineal sobre rasters completos en memoria.
 * @param {{dem: ArrayLike<number>, counts: ArrayLike<number>, grid?: object}} raster
 *   `dem` en km sobre la esfera de referencia y `counts` LDEC, ambos en orden
 *   fila por fila con la forma de `grid`.
 * @returns {(lat:number, lon:number) => ({heightKm:number, lowConfidence:boolean} | null)}
 *   `null` fuera de la cobertura nominal o si falta algún vecino de la grilla.
 */
export function createRasterSampler({ dem, counts, grid = LOLA_GRID }) {
  const n = grid.lines * grid.samples;
  if (dem.length !== n || counts.length !== n) throw new RangeError(`los rasters deben tener ${n} valores`);
  return function sample(lat, lon) {
    if (!(lat <= grid.maxLatitude) || lat < -90) return null;
    const { line, sample: s } = latLonToPixel(lat, lon, grid);
    const l0 = Math.floor(line);
    const s0 = Math.floor(s);
    if (l0 < 0 || s0 < 0 || l0 + 1 >= grid.lines || s0 + 1 >= grid.samples) return null;
    const fl = line - l0;
    const fs = s - s0;
    const i00 = l0 * grid.samples + s0;
    const i01 = i00 + 1;
    const i10 = i00 + grid.samples;
    const i11 = i10 + 1;
    const w00 = (1 - fl) * (1 - fs);
    const w01 = (1 - fl) * fs;
    const w10 = fl * (1 - fs);
    const w11 = fl * fs;
    const heightKm = dem[i00] * w00 + dem[i01] * w01 + dem[i10] * w10 + dem[i11] * w11;
    if (!Number.isFinite(heightKm)) return null;
    const lowConfidence =
      (w00 > 0 && counts[i00] === 0) ||
      (w01 > 0 && counts[i01] === 0) ||
      (w10 > 0 && counts[i10] === 0) ||
      (w11 > 0 && counts[i11] === 0);
    return { heightKm, lowConfidence };
  };
}

/**
 * Calcula el perfil de horizonte de un punto.
 * @param {(lat:number, lon:number) => ({heightKm:number, lowConfidence:boolean} | null)} sampler
 * @param {{lat:number, lon:number}} site
 * @param {Partial<typeof HORIZON_PARAMS> & {radiusKm?: number}} [options]
 * @returns perfil con arreglos de longitud 360 / azimuthStepDeg:
 *   `elevationDeg` (máximo del rayo), `distanceKm` (punto que lo define),
 *   `lowConfidence` (ese punto usa píxeles con count = 0) y `coverageKm`
 *   (distancia alcanzada; menor que `maxDistanceKm` si el rayo salió de la
 *   cobertura).
 */
export function computeHorizonProfile(sampler, site, options = {}) {
  const params = { ...HORIZON_PARAMS, ...options };
  const radiusKm = options.radiusKm ?? LOLA_GRID.radiusM / 1000;
  const { maxDistanceKm, stepKm, azimuthStepDeg, observerHeightM, minDistanceKm } = params;
  const count = Math.round(360 / azimuthStepDeg);
  if (!(stepKm > 0) || !(maxDistanceKm >= stepKm) || Math.abs(count * azimuthStepDeg - 360) > 1e-9) {
    throw new RangeError("parámetros de horizonte inválidos");
  }

  const ground = sampler(site.lat, site.lon);
  if (!ground) throw new RangeError(`(${site.lat}, ${site.lon}) está fuera de la cobertura del DEM`);
  const observerRadiusKm = radiusKm + ground.heightKm + observerHeightM / 1000;

  const elevationDeg = new Array(count);
  const distanceKm = new Array(count);
  const lowConfidence = new Array(count);
  const coverageKm = new Array(count);
  const steps = Math.ceil(maxDistanceKm / stepKm - 1e-9);

  for (let k = 0; k < count; k++) {
    const azimuth = k * azimuthStepDeg;
    let best = -Infinity;
    let bestD = null;
    let bestLow = false;
    let reached = 0;
    for (let j = 1; j <= steps; j++) {
      const d = Math.min(j * stepKm, maxDistanceKm); // la última muestra cae justo en maxDistanceKm
      if (d < minDistanceKm - 1e-9) continue;
      const delta = d / radiusKm;
      const p = destination(site.lat, site.lon, azimuth, delta);
      const v = sampler(p.lat, p.lon);
      if (!v) break; // fuera de cobertura: no se extrapola
      reached = d;
      const e = elevationAngleDeg(observerRadiusKm, radiusKm + v.heightKm, delta);
      if (e > best) {
        best = e;
        bestD = d;
        bestLow = v.lowConfidence;
      }
    }
    elevationDeg[k] = Number.isFinite(best) ? best : null;
    distanceKm[k] = bestD;
    lowConfidence[k] = bestLow;
    coverageKm[k] = reached;
  }

  return {
    algorithm: HORIZON_ALGORITHM,
    params: { maxDistanceKm, stepKm, azimuthStepDeg, observerHeightM, minDistanceKm, radiusKm },
    observer: { lat: site.lat, lon: site.lon, groundHeightKm: ground.heightKm, lowConfidence: ground.lowConfidence },
    elevationDeg,
    distanceKm,
    lowConfidence,
    coverageKm,
  };
}

/** Resumen de calidad de un perfil (o de una entrada de la tabla). */
export function summarizeProfile({ elevationDeg, lowConfidence, coverageKm }, maxDistanceKm) {
  const n = elevationDeg.length;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let low = 0;
  let truncated = 0;
  for (let i = 0; i < n; i++) {
    const e = elevationDeg[i];
    if (e < min) min = e;
    if (e > max) max = e;
    sum += e;
    if (lowConfidence[i]) low++;
    if (coverageKm[i] < maxDistanceKm - 1e-9) truncated++;
  }
  return {
    minDeg: min,
    maxDeg: max,
    meanDeg: sum / n,
    lowConfidenceFraction: low / n,
    truncatedFraction: truncated / n,
  };
}

/**
 * Horizonte LOLA de un sitio curado: `horizon(azimuth) -> elevation` (grados),
 * con interpolación lineal circular entre muestras. Devuelve `null` si el
 * sitio no está en la tabla (fuera de cobertura o no calculado); quien lo use
 * decide qué mostrar en ese caso.
 *
 * Además de la función expone:
 * - `horizon.source = "lola"` (lo lee `ui/panorama.js`).
 * - `horizon.meta`: producto, algoritmo, parámetros y resumen de calidad.
 * - `horizon.detail(azimuth)`: datos de la muestra más cercana
 *   `{ azimuthDeg, elevationDeg, distanceKm, lowConfidence, coverageKm, truncated }`.
 */
export function createLolaHorizon(siteId, table = LOLA_HORIZONS) {
  const entry = table?.sites?.[siteId];
  if (!entry) return null;
  const values = Float64Array.from(entry.elevationDeg);
  const n = values.length;
  const step = 360 / n;
  const { maxDistanceKm } = table.params;

  const horizon = function horizon(azimuth) {
    const a = ((azimuth % 360) + 360) % 360;
    const x = a / step;
    const i = Math.floor(x) % n;
    const f = x - Math.floor(x);
    return values[i] * (1 - f) + values[(i + 1) % n] * f;
  };

  horizon.source = "lola";
  horizon.meta = Object.freeze({
    source: "lola",
    siteId,
    lat: entry.lat,
    lon: entry.lon,
    product: table.source,
    algorithm: table.algorithm,
    params: table.params,
    observer: entry.observer,
    summary: entry.summary,
  });
  horizon.detail = function detail(azimuth) {
    const a = ((azimuth % 360) + 360) % 360;
    const i = Math.round(a / step) % n;
    return {
      azimuthDeg: i * step,
      elevationDeg: values[i],
      distanceKm: entry.distanceKm[i],
      lowConfidence: entry.lowConfidence[i] === 1,
      coverageKm: entry.coverageKm[i],
      truncated: entry.coverageKm[i] < maxDistanceKm - 1e-9,
    };
  };
  return horizon;
}

/** Sitios con horizonte LOLA disponible y sitios excluidos (con motivo). */
export function lolaHorizonCoverage(table = LOLA_HORIZONS) {
  return { sites: Object.keys(table.sites), excluded: table.excluded };
}
