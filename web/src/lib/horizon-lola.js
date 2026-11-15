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
 *    estereográfica de `terrain-data.js` (LDEM_60S_240M) o, para los sitios
 *    fuera de −90°..−60°, en una ventana de la grilla cilíndrica global
 *    LDEM_128 (`createCylindricalWindowSampler`, TERRAIN-03, DEC-061).
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
 * Muestreador bilineal sobre una ventana de una grilla cilíndrica simple
 * global (LDEM_128 + LDEC_128, TERRAIN-03, DEC-061), con el mismo contrato que
 * `createRasterSampler`.
 * @param {object} args
 * @param {ArrayLike<number>} args.dem  DN int16 de la ventana (fila por fila).
 * @param {ArrayLike<number>} args.counts  conteos LDEC de la ventana.
 * @param {{line0:number, lines:number, sample0:number, samples:number}} args.window
 *   posición de la ventana en la grilla (0-based; `sample0` puede ser negativo:
 *   la longitud es circular).
 * @param {{lines:number, samples:number, pixelsPerDegree:number, lineProjectionOffset:number,
 *   sampleProjectionOffset:number, centerLatitude:number, centerLongitude:number}} args.grid
 * @param {number} args.scalingFactor  metros por DN (0,5 en LDEM_128).
 * @returns `null` fuera de la ventana (no se extrapola).
 */
export function createCylindricalWindowSampler({ dem, counts, window: w, grid, scalingFactor }) {
  const n = w.lines * w.samples;
  if (dem.length !== n || counts.length !== n) throw new RangeError(`la ventana debe tener ${n} valores`);
  const ppd = grid.pixelsPerDegree;
  const kmPerDn = scalingFactor / 1000;
  return function sample(lat, lon) {
    if (!(lat >= -90 && lat <= 90)) return null;
    const line = grid.lineProjectionOffset - ppd * (lat - grid.centerLatitude) - w.line0;
    const lon360 = ((lon % 360) + 360) % 360;
    let s = grid.sampleProjectionOffset + ppd * (lon360 - grid.centerLongitude) - w.sample0;
    s = ((s % grid.samples) + grid.samples) % grid.samples;
    const l0 = Math.floor(line);
    const s0 = Math.floor(s);
    if (l0 < 0 || s0 < 0 || l0 + 1 >= w.lines || s0 + 1 >= w.samples) return null;
    const fl = line - l0;
    const fs = s - s0;
    const i00 = l0 * w.samples + s0;
    const i01 = i00 + 1;
    const i10 = i00 + w.samples;
    const i11 = i10 + 1;
    const w00 = (1 - fl) * (1 - fs);
    const w01 = (1 - fl) * fs;
    const w10 = fl * (1 - fs);
    const w11 = fl * fs;
    const heightKm = (dem[i00] * w00 + dem[i01] * w01 + dem[i10] * w10 + dem[i11] * w11) * kmPerDn;
    const lowConfidence =
      (w00 > 0 && counts[i00] === 0) ||
      (w01 > 0 && counts[i01] === 0) ||
      (w10 > 0 && counts[i10] === 0) ||
      (w11 > 0 && counts[i11] === 0);
    return { heightKm, lowConfidence };
  };
}

/** Radio del entorno del que sale la altura del observador en LDEM_128 (TERRAIN-05, DEC-075). */
export const WINDOW_GROUND_RADIUS_KM = 1;

/**
 * Altura del suelo del observador en una ventana de LDEM_128 como la mediana
 * de los píxeles CON mediciones propias (`count > 0`) a menos de `radiusKm`
 * del punto (TERRAIN-05, DEC-075). En LDEM_128 el píxel del punto suele ser
 * interpolado y puede quedar decenas de metros por debajo del terreno medido,
 * lo que eleva todo el horizonte. Devuelve `null` si no hay píxeles medidos.
 * @returns {{heightKm:number, pixels:number, radiusKm:number} | null}
 */
export function windowGroundMedian({ dem, counts, window: w, grid, scalingFactor }, site, radiusKm = WINDOW_GROUND_RADIUS_KM) {
  const ppd = grid.pixelsPerDegree;
  const pxKm = (2 * Math.PI * (grid.radiusKm ?? 1737.4)) / (360 * ppd);
  const cosLat = Math.cos(site.lat * DEG);
  const line = grid.lineProjectionOffset - ppd * (site.lat - grid.centerLatitude) - w.line0;
  const lon360 = ((site.lon % 360) + 360) % 360;
  let s = grid.sampleProjectionOffset + ppd * (lon360 - grid.centerLongitude) - w.sample0;
  s = ((s % grid.samples) + grid.samples) % grid.samples;
  const l0 = Math.round(line);
  const s0 = Math.round(s);
  const rl = Math.ceil(radiusKm / pxKm);
  const rs = Math.ceil(radiusKm / (pxKm * Math.max(cosLat, 1e-6)));
  const values = [];
  for (let dl = -rl; dl <= rl; dl++) {
    for (let ds = -rs; ds <= rs; ds++) {
      const l = l0 + dl;
      const c = s0 + ds;
      if (l < 0 || c < 0 || l >= w.lines || c >= w.samples) continue;
      const dy = dl * pxKm;
      const dx = ds * pxKm * cosLat;
      if (dx * dx + dy * dy > radiusKm * radiusKm) continue;
      const i = l * w.samples + c;
      if (counts[i] > 0) values.push(dem[i]);
    }
  }
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const mid = values.length >> 1;
  const dn = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  return { heightKm: (dn * scalingFactor) / 1000, pixels: values.length, radiusKm };
}

/**
 * Muestreador bilineal sobre una grilla cilíndrica simple GLOBAL completa en
 * memoria (LDEM_16 + LDEC_16, MAP-02, DEC-065), con el mismo contrato que
 * `createRasterSampler`. A diferencia de la ventana, la longitud es circular
 * (el vecino de la última columna es la primera) y en las filas extremas
 * (a menos de medio píxel del polo) se usa la fila más cercana: así ningún
 * rayo se corta al cruzar 0° de longitud o pasar cerca de un polo.
 * @param {{dem: ArrayLike<number>, counts: ArrayLike<number>, grid: object, scalingFactor: number}} args
 *   `dem` en DN int16 (metros = DN × scalingFactor) y `grid` con `lines`,
 *   `samples`, `pixelsPerDegree`, `lineProjectionOffset`,
 *   `sampleProjectionOffset`, `centerLatitude` y `centerLongitude`.
 */
export function createGlobalCylindricalSampler({ dem, counts, grid, scalingFactor }) {
  const { lines, samples } = grid;
  const n = lines * samples;
  if (dem.length !== n || counts.length !== n) throw new RangeError(`los rasters deben tener ${n} valores`);
  const ppd = grid.pixelsPerDegree;
  const kmPerDn = scalingFactor / 1000;
  return function sample(lat, lon) {
    if (!(lat >= -90 && lat <= 90)) return null;
    const line = Math.min(lines - 1, Math.max(0, grid.lineProjectionOffset - ppd * (lat - grid.centerLatitude)));
    const lon360 = ((lon % 360) + 360) % 360;
    let s = grid.sampleProjectionOffset + ppd * (lon360 - grid.centerLongitude);
    s = ((s % samples) + samples) % samples;
    const l0 = Math.min(lines - 2, Math.floor(line));
    const s0 = Math.floor(s) % samples;
    const s1 = (s0 + 1) % samples;
    const fl = line - l0;
    const fs = s - Math.floor(s);
    const r0 = l0 * samples;
    const r1 = r0 + samples;
    const idx = [r0 + s0, r0 + s1, r1 + s0, r1 + s1];
    const w = [(1 - fl) * (1 - fs), (1 - fl) * fs, fl * (1 - fs), fl * fs];
    let h = 0;
    let low = false;
    for (let k = 0; k < 4; k++) {
      h += dem[idx[k]] * w[k];
      if (w[k] > 0 && counts[idx[k]] === 0) low = true;
    }
    return { heightKm: h * kmPerDn, lowConfidence: low };
  };
}

/**
 * Calcula el perfil de horizonte de un punto.
 * @param {(lat:number, lon:number) => ({heightKm:number, lowConfidence:boolean} | null)} sampler
 * @param {{lat:number, lon:number}} site
 * @param {Partial<typeof HORIZON_PARAMS> & {radiusKm?: number, ground?: {heightKm:number, pixels:number, radiusKm:number}}} [options]
 *   `ground`: altura del observador ya calculada (por ejemplo, la mediana de
 *   un entorno, `windowGroundMedian`); si falta, sale del muestreador.
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

  const own = sampler(site.lat, site.lon);
  if (!own) throw new RangeError(`(${site.lat}, ${site.lon}) está fuera de la cobertura del DEM`);
  const ground = options.ground ? { heightKm: options.ground.heightKm, lowConfidence: false } : own;
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
    observer: {
      lat: site.lat,
      lon: site.lon,
      groundHeightKm: ground.heightKm,
      lowConfidence: ground.lowConfidence,
      ...(options.ground ? { ground: { method: "median-measured", radiusKm: options.ground.radiusKm, pixels: options.ground.pixels } } : {}),
    },
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
 * Arma `horizon(azimuth) -> elevation` desde una entrada con la forma de la
 * tabla (`elevationDeg`, `distanceKm`, `lowConfidence` 0/1, `coverageKm`,
 * `observer`, `summary`, `lat`, `lon`). Interpolación lineal circular.
 */
function horizonFromEntry(entry, { siteId, product, algorithm, params, extra = {} }) {
  const values = Float64Array.from(entry.elevationDeg);
  const n = values.length;
  const step = 360 / n;
  const { maxDistanceKm } = params;

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
    product,
    algorithm,
    params,
    observer: entry.observer,
    summary: entry.summary,
    ...extra,
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
  // Las entradas calculadas con otro producto (LDEM_128, DEC-061) traen su
  // propio `source`; las demás usan el producto polar de la tabla.
  const product = entry.source ?? table.source;
  return horizonFromEntry(entry, { siteId, product, algorithm: table.algorithm, params: table.params });
}

/**
 * Horizonte desde un perfil recién calculado (`computeHorizonProfile`), con la
 * misma interfaz que `createLolaHorizon`. Lo usa el horizonte de puntos
 * propios sobre el DEM reducido (CORE-03, DEC-034); `extra` se agrega a `meta`
 * (por ejemplo, la resolución).
 */
export function createProfileHorizon(profile, { siteId = null, product, extra = {} } = {}) {
  const { maxDistanceKm } = profile.params;
  const entry = {
    lat: profile.observer.lat,
    lon: profile.observer.lon,
    observer: {
      groundHeightM: profile.observer.groundHeightKm * 1000,
      heightAboveGroundM: profile.params.observerHeightM,
      lowConfidence: profile.observer.lowConfidence,
    },
    elevationDeg: profile.elevationDeg,
    distanceKm: profile.distanceKm,
    lowConfidence: profile.lowConfidence.map((b) => (b ? 1 : 0)),
    coverageKm: profile.coverageKm,
  };
  if (entry.elevationDeg.some((e) => !Number.isFinite(e))) return null;
  entry.summary = summarizeProfile(entry, maxDistanceKm);
  return horizonFromEntry(entry, { siteId, product, algorithm: profile.algorithm, params: profile.params, extra });
}

/** Sitios con horizonte LOLA disponible y sitios excluidos (con motivo). */
export function lolaHorizonCoverage(table = LOLA_HORIZONS) {
  return { sites: Object.keys(table.sites), excluded: table.excluded };
}
