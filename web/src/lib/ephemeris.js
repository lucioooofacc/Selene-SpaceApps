/**
 * Efemérides reales de JPL Horizons para el cálculo (CORE-01 parte B, DEC-033).
 *
 * Módulo puro: sin DOM ni red. Las series las genera fuera del navegador
 * `scripts/build-ephemerides.mjs` desde la caché de `fetch-horizons.mjs`
 * (ASTRO-01, DEC-024) y la interfaz las carga y las registra acá. El cálculo
 * (`analysis.js`) consulta el registro en forma sincrónica: si hay serie para
 * el sitio y cubre el instante, usa Horizons; si no, el modelo aproximado de
 * `astro.js` (DEC-004), marcado como tal.
 *
 * Formato de archivo (`selene-ephemeris/v2`): por sitio, una grilla regular
 * `startMs + k·stepMinutes` con azimut y elevación del Sol y la Tierra en
 * milésimas de grado (enteros), el % iluminado de la Tierra en centésimas y
 * los radios angulares del Sol y la Tierra en diezmilésimas de grado (v2,
 * CORE-02, DEC-036).
 * Entre muestras se interpola linealmente (el azimut, por el camino corto).
 */

export const EPHEMERIS_SCHEMA = "selene-ephemeris/v2";

const SERIES = ["sunAz", "sunEl", "earthAz", "earthEl", "earthIllum", "sunRadius", "earthRadius"];
const SCALE = { sunAz: 1000, sunEl: 1000, earthAz: 1000, earthEl: 1000, earthIllum: 100, sunRadius: 10000, earthRadius: 10000 };

/** Valida y decodifica un archivo de efemérides. Lanza si algo no cuadra. */
export function decodeEphemeris(json) {
  if (json?.schema !== EPHEMERIS_SCHEMA) throw new Error(`esquema de efemérides inesperado: ${json?.schema}`);
  const { site, coverage } = json;
  if (!site?.id || !Number.isFinite(site.lat) || !Number.isFinite(site.lon)) throw new Error("sitio inválido");
  const { startMs, stepMinutes, rows } = coverage ?? {};
  if (!Number.isInteger(startMs) || !Number.isInteger(stepMinutes) || stepMinutes < 1 || !Number.isInteger(rows) || rows < 2) {
    throw new Error(`${site.id}: cobertura inválida`);
  }
  const series = {};
  for (const name of SERIES) {
    const raw = json.series?.[name];
    if (!Array.isArray(raw) || raw.length !== rows) throw new Error(`${site.id}: ${name} debe tener ${rows} valores`);
    const arr = new Float64Array(rows);
    for (let i = 0; i < rows; i++) {
      if (!Number.isInteger(raw[i])) throw new Error(`${site.id}: ${name}[${i}] no es entero (faltante)`);
      arr[i] = raw[i] / SCALE[name];
    }
    series[name] = arr;
  }
  const stepMs = stepMinutes * 60_000;
  return Object.freeze({
    site: Object.freeze({ ...site }),
    startMs,
    stepMs,
    stopMs: startMs + (rows - 1) * stepMs,
    rows,
    series,
    meta: Object.freeze({ ...json.meta, coverage: { ...coverage, stopMs: startMs + (rows - 1) * stepMs } }),
  });
}

/** Interpolación de un ángulo en grados por el camino más corto, resultado en [0, 360). */
function lerpAngle(a, b, f) {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (((a + d * f) % 360) + 360) % 360;
}

/**
 * Posiciones en el instante `ms` o `null` si cae fuera de la cobertura.
 * @returns {{sun:{azimuth:number, elevation:number, radius:number}, earth:{azimuth:number, elevation:number, phase:number, radius:number}} | null}
 */
export function positionsAt(eph, ms) {
  if (!(ms >= eph.startMs && ms <= eph.stopMs)) return null;
  const x = (ms - eph.startMs) / eph.stepMs;
  const i = Math.min(Math.floor(x), eph.rows - 2);
  const f = x - i;
  const s = eph.series;
  const lerp = (arr) => arr[i] * (1 - f) + arr[i + 1] * f;
  return {
    sun: { azimuth: lerpAngle(s.sunAz[i], s.sunAz[i + 1], f), elevation: lerp(s.sunEl), radius: lerp(s.sunRadius) },
    earth: {
      azimuth: lerpAngle(s.earthAz[i], s.earthAz[i + 1], f),
      elevation: lerp(s.earthEl),
      phase: lerp(s.earthIllum) / 100,
      radius: lerp(s.earthRadius),
    },
  };
}

// ---------------------------------------------------------------------------
// Registro en memoria
// ---------------------------------------------------------------------------

const registry = new Map();
let version = 0;

/** Registra (o reemplaza) la serie de un sitio. Sube la versión del registro. */
export function registerEphemeris(eph) {
  registry.set(eph.site.id, eph);
  version++;
  return eph;
}

/** Versión del registro: cambia cada vez que llegan datos. Sirve como parte de claves de caché. */
export function ephemerisVersion() {
  return version;
}

/** Vacía el registro (pruebas). */
export function clearEphemerides() {
  registry.clear();
  version++;
}

/**
 * Serie registrada para un sitio curado, o `null`. Como con el horizonte LOLA
 * (DEC-032), solo se usa si el sitio no es propio y sus coordenadas coinciden
 * exactamente con las de la serie.
 */
export function ephemerisFor(site) {
  if (!site || site.custom || !site.id) return null;
  const eph = registry.get(site.id);
  return eph && eph.site.lat === site.lat && eph.site.lon === site.lon ? eph : null;
}

/**
 * Carga y registra las series de varios sitios con `fetchJson(siteId)`.
 * Los errores no detienen al resto: se devuelven por sitio y el cálculo de ese
 * sitio sigue con el modelo aproximado.
 * @returns {Promise<{loaded: string[], failed: {id: string, error: string}[]}>}
 */
export async function loadEphemerides(siteIds, fetchJson) {
  const results = await Promise.allSettled(
    siteIds.map(async (id) => {
      const eph = decodeEphemeris(await fetchJson(id));
      if (eph.site.id !== id) throw new Error(`el archivo de ${id} trae el sitio ${eph.site.id}`);
      return eph;
    }),
  );
  const loaded = [];
  const failed = [];
  results.forEach((r, k) => {
    if (r.status === "fulfilled") {
      registerEphemeris(r.value);
      loaded.push(siteIds[k]);
    } else failed.push({ id: siteIds[k], error: String(r.reason?.message ?? r.reason) });
  });
  return { loaded, failed };
}

// ---------------------------------------------------------------------------
// Traslado a cualquier punto (CORE-03 parte A, DEC-034)
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180;
const MOON_RADIUS_KM = 1737.4;
/**
 * Distancia Tierra–Luna usada para la paralaje de la Tierra entre dos puntos
 * de la Luna. La real varía entre ~356 500 y ~406 700 km; con un valor fijo el
 * error de la corrección es < 0,02° (la paralaje máxima es ~0,26°).
 */
export const EARTH_DISTANCE_KM = 384_400;

/** Ejes locales (arriba, este, norte) de un punto en el marco fijo a la Luna. */
function localFrame(lat, lon) {
  const p = lat * DEG;
  const l = lon * DEG;
  return {
    up: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
    east: [-Math.sin(l), Math.cos(l), 0],
    north: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)],
  };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Azimut/elevación locales → vector unitario en el marco fijo a la Luna. */
function toBody(f, azimuth, elevation) {
  const az = azimuth * DEG;
  const el = elevation * DEG;
  const e = Math.cos(el) * Math.sin(az);
  const n = Math.cos(el) * Math.cos(az);
  const u = Math.sin(el);
  return [0, 1, 2].map((i) => e * f.east[i] + n * f.north[i] + u * f.up[i]);
}

/** Vector en el marco fijo → azimut/elevación locales (grados). */
function toLocal(f, v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  const elevation = Math.asin(Math.max(-1, Math.min(1, dot(v, f.up) / len))) / DEG;
  const azimuth = ((Math.atan2(dot(v, f.east), dot(v, f.north)) / DEG) % 360 + 360) % 360;
  return { azimuth, elevation };
}

/** Distancia angular (rad) entre dos puntos de la esfera. */
function angularDistance(a, b) {
  const s = Math.sin(((b.lat - a.lat) * DEG) / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(((b.lon - a.lon) * DEG) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Posiciones del Sol y la Tierra para cualquier punto, trasladadas desde la
 * serie registrada más cercana. El Sol está tan lejos que su dirección es la
 * misma en toda la Luna (diferencia < 0,0007°); la Tierra se corrige por
 * paralaje con `EARTH_DISTANCE_KM`. El observador se toma sobre la esfera de
 * 1737,4 km. Devuelve `null` si no hay ninguna serie registrada.
 * @returns {{ref: object, meta: object, at: (ms:number) => object | null} | null}
 */
export function derivedEphemerisFor(site) {
  if (!site || !Number.isFinite(site.lat) || !Number.isFinite(site.lon) || registry.size === 0) return null;
  let ref = null;
  let best = Infinity;
  for (const eph of registry.values()) {
    const d = angularDistance(site, eph.site);
    if (d < best) {
      best = d;
      ref = eph;
    }
  }
  const fRef = localFrame(ref.site.lat, ref.site.lon);
  const fP = localFrame(site.lat, site.lon);
  const refRadius = MOON_RADIUS_KM + (ref.meta.observer?.altitudeKm ?? 0);
  const rRef = fRef.up.map((x) => x * refRadius);
  const rP = fP.up.map((x) => x * MOON_RADIUS_KM);
  return {
    ref,
    meta: Object.freeze({
      ...ref.meta,
      derivedFrom: ref.site.id,
      derivedDistanceKm: Math.round(best * MOON_RADIUS_KM),
      earthDistanceKm: EARTH_DISTANCE_KM,
      observer: { altitudeKm: 0, altitudeBasis: "assumed-zero-reference-sphere" },
    }),
    at(ms) {
      const p = positionsAt(ref, ms);
      if (!p) return null;
      // Los radios angulares cambian < 0,5 % entre dos puntos de la Luna: se conservan.
      const sun = { ...toLocal(fP, toBody(fRef, p.sun.azimuth, p.sun.elevation)), radius: p.sun.radius };
      const u = toBody(fRef, p.earth.azimuth, p.earth.elevation);
      const earthPos = [0, 1, 2].map((i) => rRef[i] + u[i] * EARTH_DISTANCE_KM - rP[i]);
      const earth = toLocal(fP, earthPos);
      return { sun, earth: { ...earth, phase: p.earth.phase, radius: p.earth.radius } };
    },
  };
}
