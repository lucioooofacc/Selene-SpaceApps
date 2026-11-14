/**
 * Horizonte LOLA de puntos propios desde un DEM polar REDUCIDO (CORE-03 parte
 * B, DEC-034). Módulo puro: sin DOM ni red.
 *
 * `scripts/build-lola-polar-reduced.mjs` genera, desde `LDEM_60S_240M`
 * (DEC-025), dos niveles en `public/data/terrain/`: 480 m/píxel hasta −80° y
 * 960 m/píxel hasta −75°. La interfaz los baja y los registra acá;
 * `polarHorizonFor(site)` calcula entonces el horizonte de cualquier punto al
 * sur de −75° con el mismo algoritmo que TERRAIN-02 (DEC-030): cada muestra del
 * rayo sale del nivel más fino que la cubra. Cada 1° de azimut y paso de 240 m.
 * Un bloque es de baja confianza si al menos la mitad de sus píxeles nativos
 * tienen `count = 0`. Los resultados se cachean por coordenadas.
 */
import { computeHorizonProfile, createProfileHorizon, createRasterSampler } from "./horizon-lola.js";

export const POLAR_DEM_SCHEMA = "selene-lola-polar-reduced/v1";

/** Parámetros del horizonte sobre el DEM reducido. */
export const REDUCED_HORIZON_PARAMS = Object.freeze({
  maxDistanceKm: 300,
  stepKm: 0.24, // medio píxel del nivel fino (480 m)
  azimuthStepDeg: 1,
  observerHeightM: 2,
});

/** Latitud hasta la que cubre el nivel más grueso (la usa la interfaz para saber si conviene bajar el DEM). */
export const POLAR_DEM_COVERAGE_LATITUDE = -75;

/** Umbral de baja confianza del bloque: % de píxeles nativos con count = 0. */
export const LOW_CONFIDENCE_ZERO_PCT = 50;

/**
 * Decodifica el binario del DEM reducido con su JSON de metadatos.
 * @param {ArrayBuffer} buffer  alturas int16 LE (m) seguidas de uint8 (% count = 0)
 */
export function decodePolarDem(buffer, meta) {
  if (meta?.schema !== POLAR_DEM_SCHEMA) throw new Error(`esquema de DEM reducido inesperado: ${meta?.schema}`);
  const { grid } = meta;
  const n = grid.lines * grid.samples;
  if (buffer.byteLength !== n * 3) throw new Error(`el DEM reducido debe tener ${n * 3} bytes; tiene ${buffer.byteLength}`);
  const view = new DataView(buffer);
  const dem = new Float32Array(n);
  const counts = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    dem[i] = view.getInt16(i * 2, true) / 1000;
    counts[i] = view.getUint8(n * 2 + i) >= LOW_CONFIDENCE_ZERO_PCT ? 0 : 1;
  }
  return Object.freeze({ meta, grid, sampler: createRasterSampler({ dem, counts, grid }) });
}

let current = null;
let version = 0;
const cache = new Map();
const CACHE_LIMIT = 64;

/**
 * Registra uno o más niveles decodificados (cualquier orden): se ordenan del
 * más fino al más grueso y cada muestra sale del primero que la cubra.
 */
export function registerPolarDem(levels) {
  const list = (Array.isArray(levels) ? levels : [levels]).slice().sort((a, b) => a.grid.scaleM - b.grid.scaleM);
  const samplers = list.map((l) => l.sampler);
  current = {
    levels: list,
    maxLatitude: Math.max(...list.map((l) => l.grid.maxLatitude)),
    radiusM: list[0].grid.radiusM,
    sampler(lat, lon) {
      for (const sample of samplers) {
        const v = sample(lat, lon);
        if (v) return v;
      }
      return null;
    },
  };
  cache.clear();
  version++;
}

export function clearPolarDem() {
  current = null;
  cache.clear();
  version++;
}

/** Cambia cada vez que se registra un DEM. Sirve como parte de claves de caché. */
export function polarDemVersion() {
  return version;
}

/**
 * Altura del DEM reducido registrado en (lat, lon): `{heightKm, lowConfidence}`
 * o `null` fuera de cobertura o sin DEM. Solo lectura (lo usa el análisis de
 * terreno del informe, DEC-059).
 */
export function polarDemSample(lat, lon) {
  return current ? current.sampler(lat, lon) : null;
}

/** Resolución (m) del nivel más fino registrado, o null. */
export function polarDemResolutionM() {
  return current ? current.levels[0].grid.scaleM : null;
}

/** ¿El punto está dentro de la cobertura del DEM reducido registrado? */
export function polarDemCovers(site) {
  return Boolean(current && Number.isFinite(site?.lat) && site.lat <= current.maxLatitude && current.sampler(site.lat, site.lon));
}

/**
 * Horizonte LOLA reducido de un punto (con `source = "lola"` y
 * `meta.reduced = true`), o `null` si no hay DEM registrado o el punto está
 * fuera de su cobertura.
 */
export function polarHorizonFor(site) {
  if (!polarDemCovers(site)) return null;
  const key = `${site.lat},${site.lon}`;
  if (cache.has(key)) return cache.get(key);
  const profile = computeHorizonProfile(current.sampler, site, { ...REDUCED_HORIZON_PARAMS, radiusKm: current.radiusM / 1000 });
  const horizon = createProfileHorizon(profile, {
    siteId: site.id ?? null,
    product: current.levels[0].meta.source,
    extra: {
      reduced: true,
      resolutionsM: current.levels.map((l) => l.grid.scaleM),
      levels: current.levels.map((l) => ({ scaleM: l.grid.scaleM, maxLatitude: l.grid.maxLatitude })),
      coverageLatitude: current.maxLatitude,
    },
  });
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, horizon);
  return horizon;
}
