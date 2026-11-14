/**
 * Mapa de calor del polo sur con datos reales (MAP-01, DEC-038). Módulo puro.
 *
 * Grilla: la misma de `computePolarHeatmap()` (celdas de `size × size` sobre
 * un disco centrado en el polo hasta `minLat`, latitud lineal con la distancia
 * al centro, 0° de longitud hacia abajo). Para cada celda:
 * - horizonte: atlas LOLA precalculado en su centro (`scripts/build-heat-atlas.mjs`,
 *   72 azimuts cada 5°, desde `LDEM_60S_240M`);
 * - Sol y Tierra: direcciones de JPL Horizons en el marco fijo a la Luna
 *   (`bodyVectorsAt`), proyectadas en los ejes locales de la celda (DEC-034);
 * - visibilidad: la política única (DEC-036).
 * El valor de cada celda es la fracción de instantes (cada 1 h, o cada 2 h o más
 * en ventanas largas: ≤ 360 instantes) con el cuerpo visible. Es el valor del CENTRO de la celda, no un promedio del área.
 */
import { bodyVectorsAt, localFrame } from "./ephemeris.js";

export const HEAT_ATLAS_SCHEMA = "selene-heat-atlas/v1";
const MISSING = -32768;
const MOON_RADIUS_KM = 1737.4;
const DEG = Math.PI / 180;

/** Centro de la celda (x, y) de la grilla, o null si cae fuera del disco. Igual que computePolarHeatmap. */
export function cellCenter(x, y, size, minLat) {
  const dx = (x + 0.5) / size - 0.5;
  const dy = (y + 0.5) / size - 0.5;
  const r = Math.hypot(dx, dy) * 2;
  if (r > 1) return null;
  return { lat: -90 + r * (90 + minLat), lon: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

/**
 * Decodifica el atlas: horizontes int16 en centésimas de grado (72 por celda,
 * −32768 fuera del disco), altura del suelo int16 en m y % de azimuts de baja
 * confianza (uint8) por celda.
 */
export function decodeHeatAtlas(buffer, meta) {
  if (meta?.schema !== HEAT_ATLAS_SCHEMA) throw new Error(`esquema de atlas inesperado: ${meta?.schema}`);
  const { size, azimuths } = meta.grid;
  const cells = size * size;
  if (buffer.byteLength !== cells * azimuths * 2 + cells * 2 + cells) {
    throw new Error("el atlas no tiene el tamaño esperado");
  }
  const view = new DataView(buffer);
  const horizon = new Float32Array(cells * azimuths);
  for (let i = 0; i < cells * azimuths; i++) {
    const v = view.getInt16(i * 2, true);
    horizon[i] = v === MISSING ? NaN : v / 100;
  }
  const off = cells * azimuths * 2;
  const groundM = new Int16Array(cells);
  const lowPct = new Uint8Array(cells);
  for (let c = 0; c < cells; c++) {
    groundM[c] = view.getInt16(off + c * 2, true);
    lowPct[c] = view.getUint8(off + cells * 2 + c);
  }
  return Object.freeze({ meta, size, minLat: meta.grid.minLat, azimuths, horizon, groundM, lowPct });
}

let atlas = null;
let version = 0;

export function registerHeatAtlas(decoded) {
  atlas = decoded;
  version++;
}
export function clearHeatAtlas() {
  atlas = null;
  version++;
}
export function heatAtlasVersion() {
  return version;
}
/** Atlas registrado para esa grilla, o null. */
export function heatAtlasFor(size, minLat) {
  return atlas && atlas.size === size && atlas.minLat === minLat ? atlas : null;
}

/**
 * Mapa de calor real, o `null` si falta el atlas para esa grilla, no hay
 * efemérides registradas o la ventana sale de su cobertura (quien llama usa
 * entonces el cálculo aproximado).
 * @param {{startMs:number, windowDays:number, mode:"sun"|"earth", size:number, minLat:number,
 *   stepMinutes?:number, sunVisible:(m:number)=>boolean, earthVisible:(m:number, r:number)=>boolean}} o
 */
/** Máximo de instantes por mapa: fija el paso (múltiplo de 1 h) para que el cálculo siga siendo rápido. */
export const MAX_HEAT_SAMPLES = 360;

/** Paso en minutos: 1 h, o el múltiplo de 1 h que deja ≤ MAX_HEAT_SAMPLES instantes. */
export function heatStepMinutes(windowDays) {
  return 60 * Math.max(1, Math.ceil((windowDays * 24) / MAX_HEAT_SAMPLES));
}

export function computeRealHeatmap({ startMs, windowDays, mode, size, minLat, stepMinutes = heatStepMinutes(windowDays), sunVisible, earthVisible }) {
  const a = heatAtlasFor(size, minLat);
  if (!a) return null;
  const steps = Math.max(1, Math.round((windowDays * 1440) / stepMinutes));
  const bodies = [];
  for (let k = 0; k < steps; k++) {
    const v = bodyVectorsAt(startMs + k * stepMinutes * 60_000);
    if (!v) return null;
    bodies.push(v);
  }
  // Vectores por instante en arreglos planos (sin crear objetos en el bucle por celda).
  const n = bodies.length;
  const bx = new Float64Array(n);
  const by = new Float64Array(n);
  const bz = new Float64Array(n);
  const rad = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const v = mode === "earth" ? bodies[k].earthPos : bodies[k].sunDir;
    bx[k] = v[0];
    by[k] = v[1];
    bz[k] = v[2];
    rad[k] = mode === "earth" ? bodies[k].earthRadius : bodies[k].sunRadius;
  }
  const azStep = 360 / a.azimuths;
  const values = new Float32Array(size * size).fill(-1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = y * size + x;
      const base = c * a.azimuths;
      if (Number.isNaN(a.horizon[base])) continue;
      const center = cellCenter(x, y, size, minLat);
      const { up, east, north } = localFrame(center.lat, center.lon);
      // Para la Tierra, vector desde la celda (paralaje); para el Sol, la dirección.
      const r = mode === "earth" ? MOON_RADIUS_KM + a.groundM[c] / 1000 : 0;
      let hits = 0;
      for (let k = 0; k < n; k++) {
        const vx = bx[k] - up[0] * r;
        const vy = by[k] - up[1] * r;
        const vz = bz[k] - up[2] * r;
        const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const el = Math.asin((vx * up[0] + vy * up[1] + vz * up[2]) / len) / DEG;
        let az = Math.atan2(vx * east[0] + vy * east[1] + vz * east[2], vx * north[0] + vy * north[1] + vz * north[2]) / DEG;
        if (az < 0) az += 360;
        const xi = az / azStep;
        const i0 = Math.floor(xi) % a.azimuths;
        const f = xi - Math.floor(xi);
        const hz = a.horizon[base + i0] * (1 - f) + a.horizon[base + ((i0 + 1) % a.azimuths)] * f;
        const m = el - hz;
        if (mode === "earth" ? earthVisible(m, rad[k]) : sunVisible(m)) hits++;
      }
      values[c] = hits / n;
    }
  }
  return {
    values,
    size,
    minLat,
    source: {
      kind: "real",
      ephemeris: "jpl-horizons",
      ephemerisFrom: bodies[0].refId,
      horizon: "lola-atlas",
      cellKm: Math.round(((2 * (90 + minLat) * DEG * MOON_RADIUS_KM) / size) * 10) / 10,
      stepMinutes,
      atlas: a.meta.source,
    },
  };
}
