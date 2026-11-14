/**
 * Convenciones de coordenadas de sitios (DEC-019).
 *
 * Sin DOM ni dependencias de ui/. Solo normalización y medidas de precisión
 * nominal; no transforma entre marcos (no hay conversión MOON_PA ↔ MOON_ME).
 */

/**
 * Referencia común de los sitios curados. Es la convención de LRO/LOLA:
 * "Mean-Earth/polar axis of DE421", planetocéntrica, radio 1737,4 km
 * (LOLA RDR SIS, secc. 2.4.3:
 * https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/rdrsis.htm).
 * LOLA archiva la longitud en [0, 360); acá se usa [-180, 180).
 */
export const SITE_REFERENCE = Object.freeze({
  frame: "MOON_ME",
  ephemeris: "DE421",
  latitude: "planetocentric",
  longitude: "east-positive [-180, 180)",
  radiusKm: 1737.4,
  units: "deg",
});

/** Lleva una longitud este positiva al rango [-180, 180). */
export function normalizeLongitude(lon) {
  if (!Number.isFinite(lon)) throw new RangeError(`longitud inválida: ${lon}`);
  // Valores ya en rango se devuelven tal cual: el módulo flotante agregaría
  // error de redondeo (p. ej. -0.23578 → -0.235779999999977).
  if (lon >= -180 && lon < 180) return Object.is(lon, -0) ? 0 : lon;
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/** Valida una latitud planetocéntrica en [-90, 90] (no la recorta). */
export function assertLatitude(lat) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new RangeError(`latitud fuera de [-90, 90]: ${lat}`);
  }
  return lat;
}

/** Cantidad de decimales con que se escribió un valor (p. ej. -89.7668 → 4). */
export function decimalPlaces(value) {
  const text = String(value);
  if (/e/i.test(text)) throw new RangeError(`notación exponencial no soportada: ${text}`);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Paso nominal en metros que representa el último decimal publicado,
 * sobre una esfera de radio `SITE_REFERENCE.radiusKm`.
 * Es la resolución de la cifra, NO la exactitud de la fuente.
 */
export function quantizationMeters(lat, lon, radiusKm = SITE_REFERENCE.radiusKm) {
  const metersPerDeg = (radiusKm * 1000 * Math.PI) / 180;
  const latStep = 10 ** -decimalPlaces(lat);
  const lonStep = 10 ** -decimalPlaces(lon);
  return {
    northSouthM: latStep * metersPerDeg,
    eastWestM: lonStep * metersPerDeg * Math.cos((lat * Math.PI) / 180),
  };
}
