/**
 * Modelo astronómico APROXIMADO (v1).
 *
 * Calcula dónde están el Sol y la Tierra en el cielo de un punto de la Luna.
 * Usa movimientos medios periódicos, no efemérides reales. Sirve para que la
 * interfaz se comporte de forma coherente; el día de la hackathon se puede
 * reemplazar por datos de JPL Horizons sin tocar la interfaz (ver DEC-004).
 *
 * Convenciones:
 *  - Latitud y longitud selenográficas en grados (longitud este positiva).
 *  - Elevación en grados sobre el horizonte matemático (0° = horizonte plano).
 *  - Azimut en grados desde el norte lunar, en sentido horario (90° = este).
 */

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;

/** Períodos en días. */
export const SYNODIC_MONTH = 29.530589; // día lunar: amanecer a amanecer
export const ANOMALISTIC_MONTH = 27.55455; // libración en longitud
export const DRACONIC_MONTH = 27.212221; // libración en latitud
export const ECLIPSE_YEAR = 346.62; // "estaciones" lunares del Sol

/** Luna nueva de referencia: 6 de enero de 2000, 18:14 UTC. */
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14) / DAY_MS;

/** Amplitudes en grados. */
const SUN_DECLINATION_MAX = 1.54; // inclinación del ecuador lunar respecto de la eclíptica
const LIBRATION_LON_MAX = 7.9;
const LIBRATION_LAT_MAX = 6.68;

/** Radios angulares aparentes (grados). */
export const SUN_RADIUS = 0.27;
export const EARTH_RADIUS = 0.95;

const wrap180 = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
const wrap360 = (deg) => ((deg % 360) + 360) % 360;

function daysSinceNewMoon(ms) {
  return ms / DAY_MS - NEW_MOON_EPOCH;
}

/** Punto subsolar: el lugar de la Luna donde el Sol está en el cenit. */
export function subSolarPoint(ms) {
  const d = daysSinceNewMoon(ms);
  return {
    lat: SUN_DECLINATION_MAX * Math.sin((2 * Math.PI * d) / ECLIPSE_YEAR),
    // En luna nueva el Sol ilumina la cara oculta (longitud 180°).
    lon: wrap180(180 - (360 * d) / SYNODIC_MONTH),
  };
}

/** Punto subterrestre: dónde se ve la Tierra en el cenit (cerca de 0°, 0° por la libración). */
export function subEarthPoint(ms) {
  const d = daysSinceNewMoon(ms);
  return {
    lat: LIBRATION_LAT_MAX * Math.sin((2 * Math.PI * d) / DRACONIC_MONTH),
    lon: LIBRATION_LON_MAX * Math.sin((2 * Math.PI * d) / ANOMALISTIC_MONTH),
  };
}

/**
 * Posición en el cielo local de un cuerpo lejano cuyo punto subyacente es `sub`.
 * Usa vectores: dirección al cuerpo proyectada sobre los ejes arriba/este/norte del sitio.
 */
export function skyPosition(site, sub) {
  // Evita la singularidad exacta del polo, donde el "norte" no está definido.
  const lat = Math.max(-89.99, Math.min(89.99, site.lat)) * DEG;
  const lon = site.lon * DEG;
  const bLat = sub.lat * DEG;
  const bLon = sub.lon * DEG;

  const bx = Math.cos(bLat) * Math.cos(bLon);
  const by = Math.cos(bLat) * Math.sin(bLon);
  const bz = Math.sin(bLat);

  const up = bx * Math.cos(lat) * Math.cos(lon) + by * Math.cos(lat) * Math.sin(lon) + bz * Math.sin(lat);
  const east = -bx * Math.sin(lon) + by * Math.cos(lon);
  const north = -bx * Math.sin(lat) * Math.cos(lon) - by * Math.sin(lat) * Math.sin(lon) + bz * Math.cos(lat);

  return {
    elevation: Math.asin(Math.max(-1, Math.min(1, up))) / DEG,
    azimuth: wrap360(Math.atan2(east, north) / DEG),
  };
}

export function sunPosition(site, ms) {
  return skyPosition(site, subSolarPoint(ms));
}

export function earthPosition(site, ms) {
  return skyPosition(site, subEarthPoint(ms));
}

/**
 * Fracción iluminada de la Tierra vista desde la Luna (0 a 1).
 * Es la fase complementaria de la Luna: en luna nueva se ve "Tierra llena".
 */
export function earthPhase(ms) {
  const angle = (2 * Math.PI * daysSinceNewMoon(ms)) / SYNODIC_MONTH;
  return (1 + Math.cos(angle)) / 2;
}

export { DAY_MS, wrap180, wrap360 };
