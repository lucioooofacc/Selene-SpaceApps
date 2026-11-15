/**
 * DEM LOLA global de baja resolución para el terreno de puntos fuera del polo
 * sur (TERRAIN-04, DEC-067). Módulo puro: sin DOM ni red.
 *
 * `scripts/build-global-dem.mjs` empaqueta `LDEM_16` + `LDEC_16` (PDS,
 * 16 píxeles/grado, ~1,9 km/píxel en el ecuador; manifiesto en
 * `src/data/terrain/lola-ldem-16.js`) en `public/data/terrain/`: las alturas
 * tal como las publica PDS (int16 LE, metros = DN × 0,5) seguidas de un bit
 * por píxel que vale 1 si el píxel no tiene mediciones propias (`count = 0`,
 * interpolado). La interfaz lo baja solo cuando hace falta (~35 MiB) y lo
 * registra acá.
 */
import { computeHorizonProfile, createGlobalCylindricalSampler, createProfileHorizon } from "./horizon-lola.js";

export const GLOBAL_DEM_SCHEMA = "selene-lola-global/v1";

/**
 * Decodifica el binario con su JSON de metadatos.
 * @param {ArrayBuffer} buffer  alturas int16 LE seguidas de la máscara de bits
 * @returns {{meta: object, resolutionKm: number, sample: (lat:number, lon:number) => ({heightKm:number, lowConfidence:boolean} | null)}}
 */
export function decodeGlobalDem(buffer, meta) {
  if (meta?.schema !== GLOBAL_DEM_SCHEMA) throw new Error(`esquema de DEM global inesperado: ${meta?.schema}`);
  const { grid } = meta;
  const n = grid.lines * grid.samples;
  const maskBytes = Math.ceil(n / 8);
  if (buffer.byteLength !== n * 2 + maskBytes) throw new Error(`el DEM global debe tener ${n * 2 + maskBytes} bytes; tiene ${buffer.byteLength}`);
  const view = new DataView(buffer);
  const dem = new Int16Array(n);
  for (let i = 0; i < n; i++) dem[i] = view.getInt16(i * 2, true);
  // El muestreador espera conteos: 0 = sin mediciones propias, 1 = con mediciones.
  const mask = new Uint8Array(buffer, n * 2, maskBytes);
  const counts = new Uint8Array(n);
  for (let i = 0; i < n; i++) counts[i] = (mask[i >> 3] >> (i & 7)) & 1 ? 0 : 1;
  return Object.freeze({
    meta,
    resolutionKm: grid.mapScaleKm,
    sample: createGlobalCylindricalSampler({ dem, counts, grid, scalingFactor: meta.scalingFactor }),
  });
}

let registered = null;
let version = 0;
const cache = new Map();
const CACHE_LIMIT = 32;

export function registerGlobalDem(decoded) {
  registered = decoded;
  cache.clear();
  version++;
}
export function clearGlobalDem() {
  registered = null;
  cache.clear();
  version++;
}
/** Cambia cada vez que se registra el DEM global. Sirve como parte de claves de caché. */
export function globalDemVersion() {
  return version;
}
/** Resolución del DEM global registrado (km/píxel en el ecuador), o null. */
export function globalDemResolutionKm() {
  return registered?.resolutionKm ?? null;
}
/** Altura del DEM global en un punto, o null si no está cargado. */
export function globalDemSample(lat, lon) {
  return registered ? registered.sample(lat, lon) : null;
}

// ---------------------------------------------------------------------------
// Horizonte del punto cerca de los polos (CORE-05, DEC-076)
// ---------------------------------------------------------------------------

/**
 * A partir de esta latitud (en valor absoluto) el horizonte regional del
 * atlas de 2° deja de ser confiable (DEC-070) y los puntos propios usan el
 * horizonte del punto calculado sobre LDEM_16. Al sur de −75° manda el DEM
 * polar reducido (DEC-034), más fino.
 */
export const POINT_HORIZON_MIN_ABS_LAT = 60;

/** Parámetros del horizonte sobre LDEM_16: medio píxel de paso (~0,95 km), cada 1° de azimut. */
export const GLOBAL_HORIZON_PARAMS = Object.freeze({
  maxDistanceKm: 300,
  stepKm: 0.95,
  azimuthStepDeg: 1,
  observerHeightM: 2,
});

/** ¿La latitud está en la banda donde se usa el horizonte del punto sobre LDEM_16? */
export function inPointHorizonBand(lat) {
  return Number.isFinite(lat) && Math.abs(lat) >= POINT_HORIZON_MIN_ABS_LAT;
}

/**
 * Horizonte LOLA del punto sobre el DEM global LDEM_16 (`source = "lola"`,
 * `meta.global = true`), o `null` si el DEM no está registrado o el punto
 * está fuera de la banda |lat| ≥ 60°. Cacheado por coordenadas.
 */
export function globalHorizonFor(site) {
  if (!registered || !inPointHorizonBand(site?.lat) || !Number.isFinite(site?.lon)) return null;
  const key = `${site.lat},${site.lon}`;
  if (cache.has(key)) return cache.get(key);
  const { meta } = registered;
  const profile = computeHorizonProfile(registered.sample, site, { ...GLOBAL_HORIZON_PARAMS, radiusKm: meta.referenceRadiusKm ?? 1737.4 });
  const horizon = createProfileHorizon(profile, {
    siteId: site.id ?? null,
    product: { doi: meta.source.doi, productVersion: meta.source.dem.productVersion, dem: meta.source.dem },
    extra: { global: true, resolutionKm: registered.resolutionKm },
  });
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, horizon);
  return horizon;
}

