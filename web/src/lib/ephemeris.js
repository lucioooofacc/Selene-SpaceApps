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
 * Formato de archivo (`selene-ephemeris/v1`): por sitio, una grilla regular
 * `startMs + k·stepMinutes` con azimut y elevación del Sol y la Tierra en
 * milésimas de grado (enteros) y el % iluminado de la Tierra en centésimas.
 * Entre muestras se interpola linealmente (el azimut, por el camino corto).
 */

export const EPHEMERIS_SCHEMA = "selene-ephemeris/v1";

const SERIES = ["sunAz", "sunEl", "earthAz", "earthEl", "earthIllum"];
const SCALE = { sunAz: 1000, sunEl: 1000, earthAz: 1000, earthEl: 1000, earthIllum: 100 };

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
 * @returns {{sun:{azimuth:number, elevation:number}, earth:{azimuth:number, elevation:number, phase:number}} | null}
 */
export function positionsAt(eph, ms) {
  if (!(ms >= eph.startMs && ms <= eph.stopMs)) return null;
  const x = (ms - eph.startMs) / eph.stepMs;
  const i = Math.min(Math.floor(x), eph.rows - 2);
  const f = x - i;
  const s = eph.series;
  const lerp = (arr) => arr[i] * (1 - f) + arr[i + 1] * f;
  return {
    sun: { azimuth: lerpAngle(s.sunAz[i], s.sunAz[i + 1], f), elevation: lerp(s.sunEl) },
    earth: {
      azimuth: lerpAngle(s.earthAz[i], s.earthAz[i + 1], f),
      elevation: lerp(s.earthEl),
      phase: lerp(s.earthIllum) / 100,
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
