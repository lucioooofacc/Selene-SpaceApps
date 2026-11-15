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
import { createProfileHorizon } from "./horizon-lola.js";

export const HEAT_ATLAS_SCHEMA = "selene-heat-atlas/v1";
/** Atlas de toda la Luna en grilla equirectangular (MAP-02, DEC-065). */
export const GLOBAL_HEAT_ATLAS_SCHEMA = "selene-heat-atlas-global/v1";
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
 * Centro de la celda (x, y) de la grilla global equirectangular de `cols × rows`
 * (MAP-02, DEC-065): fila 0 al norte, columna 0 desde −180° de longitud, como
 * la textura de la Luna 3D.
 */
export function globalCellCenter(x, y, cols, rows) {
  return { lat: 90 - ((y + 0.5) * 180) / rows, lon: -180 + ((x + 0.5) * 360) / cols };
}

/** Decodifica el atlas global: misma codificación que el polar, `cols × rows` celdas. */
export function decodeGlobalHeatAtlas(buffer, meta) {
  if (meta?.schema !== GLOBAL_HEAT_ATLAS_SCHEMA) throw new Error(`esquema de atlas global inesperado: ${meta?.schema}`);
  const { cols, rows, azimuths } = meta.grid;
  const decoded = decodeCells(buffer, cols * rows, azimuths);
  return Object.freeze({ meta, cols, rows, azimuths, ...decoded });
}

/** Horizontes (centésimas de grado → grados, −32768 → NaN), altura del suelo y % de baja confianza. */
function decodeCells(buffer, cells, azimuths) {
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
  return { horizon, groundM, lowPct };
}

/**
 * Decodifica el atlas: horizontes int16 en centésimas de grado (72 por celda,
 * −32768 fuera del disco), altura del suelo int16 en m y % de azimuts de baja
 * confianza (uint8) por celda.
 */
export function decodeHeatAtlas(buffer, meta) {
  if (meta?.schema !== HEAT_ATLAS_SCHEMA) throw new Error(`esquema de atlas inesperado: ${meta?.schema}`);
  const { size, azimuths } = meta.grid;
  const decoded = decodeCells(buffer, size * size, azimuths);
  return Object.freeze({ meta, size, minLat: meta.grid.minLat, azimuths, ...decoded });
}

let atlas = null;
let globalAtlas = null;
let version = 0;

export function registerHeatAtlas(decoded) {
  atlas = decoded;
  version++;
}
export function clearHeatAtlas() {
  atlas = null;
  version++;
}
/** Registra el atlas de toda la Luna (MAP-02, DEC-065). */
export function registerGlobalHeatAtlas(decoded) {
  globalAtlas = decoded;
  version++;
}
export function clearGlobalHeatAtlas() {
  globalAtlas = null;
  version++;
}
/** Atlas global registrado, o null. */
export function globalHeatAtlas() {
  return globalAtlas;
}
export function heatAtlasVersion() {
  return version;
}
/** Atlas registrado para esa grilla, o null. */
export function heatAtlasFor(size, minLat) {
  return atlas && atlas.size === size && atlas.minLat === minLat ? atlas : null;
}

const regionalCache = new Map(); // "lat,lon|versión" → horizonte
const REGIONAL_CACHE_LIMIT = 64;

/**
 * Horizonte LOLA REGIONAL de cualquier punto (DEC-068): interpola en forma
 * bilineal, azimut por azimut, los horizontes de los cuatro centros de celda
 * vecinos del atlas global (celdas de 2°, LDEM_16; MAP-02, DEC-065). La
 * longitud es circular y, pasado el último centro hacia un polo, se usa esa
 * fila. Es el relieve medido de la zona, no el del punto exacto: las celdas
 * miden ~60 km y LDEM_16 no resuelve relieve menor a ~2 km.
 *
 * Devuelve una función con la misma interfaz que `createLolaHorizon`
 * (`source = "lola"`, `meta`, `detail`) y `meta.regional = true`, o `null`
 * si el atlas global no está registrado. El atlas no guarda la distancia ni
 * la confianza por azimut: `detail().distanceKm` es `null` y la baja confianza
 * se informa como el % medio de las celdas (`meta.lowConfidencePct`).
 */
export function regionalHorizonFor(site) {
  const a = globalAtlas;
  if (!a || !Number.isFinite(site?.lat) || !Number.isFinite(site?.lon)) return null;
  const key = `${site.lat},${site.lon}|${version}`;
  if (regionalCache.has(key)) return regionalCache.get(key);
  const { cols, rows, azimuths } = a;
  const gx = ((site.lon + 180) / 360) * cols - 0.5;
  const gy = ((90 - site.lat) / 180) * rows - 0.5;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const cell = (x, y) => Math.min(rows - 1, Math.max(0, y)) * cols + (((x % cols) + cols) % cols);
  const parts = [
    [cell(x0, y0), (1 - fx) * (1 - fy)],
    [cell(x0 + 1, y0), fx * (1 - fy)],
    [cell(x0, y0 + 1), (1 - fx) * fy],
    [cell(x0 + 1, y0 + 1), fx * fy],
  ];
  const mix = (pick) => parts.reduce((sum, [c, w]) => sum + pick(c) * w, 0);
  const elevationDeg = Array.from({ length: azimuths }, (_, k) => mix((c) => a.horizon[c * azimuths + k]));
  const params = { ...a.meta.params, azimuthStepDeg: 360 / azimuths };
  const lowConfidencePct = mix((c) => a.lowPct[c]);
  const horizon = createProfileHorizon(
    {
      algorithm: a.meta.params?.algorithm,
      params,
      observer: { lat: site.lat, lon: site.lon, groundHeightKm: mix((c) => a.groundM[c]) / 1000, lowConfidence: false },
      elevationDeg,
      distanceKm: new Array(azimuths).fill(null),
      lowConfidence: new Array(azimuths).fill(false),
      coverageKm: new Array(azimuths).fill(params.maxDistanceKm),
    },
    {
      siteId: site.id ?? null,
      product: { doi: a.meta.source.doi, productVersion: a.meta.source.dem.productVersion, dem: a.meta.source.dem },
      extra: { regional: true, cellDeg: a.meta.grid.cellDeg, lowConfidencePct },
    },
  );
  if (regionalCache.size >= REGIONAL_CACHE_LIMIT) regionalCache.delete(regionalCache.keys().next().value);
  regionalCache.set(key, horizon);
  return horizon;
}

/** Máximo de instantes por mapa: fija el paso (múltiplo de 1 h) para que el cálculo siga siendo rápido. */
export const MAX_HEAT_SAMPLES = 360;

/** Paso en minutos: 1 h, o el múltiplo de 1 h que deja ≤ MAX_HEAT_SAMPLES instantes. */
export function heatStepMinutes(windowDays) {
  return 60 * Math.max(1, Math.ceil((windowDays * 24) / MAX_HEAT_SAMPLES));
}

/**
 * Estadísticas reales por celda, o `null` si falta el atlas para esa grilla,
 * no hay efemérides registradas o la ventana sale de su cobertura (quien llama
 * usa entonces el cálculo aproximado). Calcula solo los cuerpos pedidos:
 * - `sun`: fracción de instantes con el Sol visible;
 * - `earth`: fracción con la Tierra visible;
 * - `both`: fracción con los dos visibles a la vez (si se piden los dos);
 * - `power`: potencia relativa media (si se pide el Sol).
 * Las celdas fuera del disco valen −1.
 * @param {{startMs:number, windowDays:number, size:number, minLat:number, stepMinutes?:number,
 *   need:{sun?:boolean, earth?:boolean}, sunVisible:Function, earthVisible:Function,
 *   sunPower:(margin:number, radius:number, lat:number, elevation:number)=>number}} o
 */
export function computeRealHeatStats({ startMs, windowDays, size, minLat, stepMinutes = heatStepMinutes(windowDays), need, sunVisible, earthVisible, sunPower }) {
  const a = heatAtlasFor(size, minLat);
  if (!a) return null;
  const series = bodySeries(startMs, windowDays, stepMinutes, need);
  if (!series) return null;
  const out = atlasStats(a, size * size, (c) => cellCenter(c % size, Math.floor(c / size), size, minLat), series, { sunVisible, earthVisible, sunPower });
  return {
    ...out,
    size,
    minLat,
    source: {
      kind: "real",
      ephemeris: "jpl-horizons",
      ephemerisFrom: series.refId,
      horizon: "lola-atlas",
      cellKm: Math.round(((2 * (90 + minLat) * DEG * MOON_RADIUS_KM) / size) * 10) / 10,
      stepMinutes,
      atlas: a.meta.source,
    },
  };
}

/**
 * Lo mismo que `computeRealHeatStats` sobre el atlas global equirectangular
 * (MAP-02, DEC-065): `cols × rows` celdas, fila 0 al norte. `null` si falta el
 * atlas global, no hay efemérides o la ventana sale de su cobertura.
 */
export function computeRealGlobalHeatStats({ startMs, windowDays, stepMinutes = heatStepMinutes(windowDays), need, sunVisible, earthVisible, sunPower }) {
  const a = globalAtlas;
  if (!a) return null;
  const series = bodySeries(startMs, windowDays, stepMinutes, need);
  if (!series) return null;
  const { cols, rows } = a;
  const out = atlasStats(a, cols * rows, (c) => globalCellCenter(c % cols, Math.floor(c / cols), cols, rows), series, { sunVisible, earthVisible, sunPower });
  return {
    ...out,
    cols,
    rows,
    source: {
      kind: "real",
      ephemeris: "jpl-horizons",
      ephemerisFrom: series.refId,
      horizon: "lola-global-atlas",
      cellDeg: a.meta.grid.cellDeg,
      cellKm: Math.round(a.meta.grid.cellDeg * DEG * MOON_RADIUS_KM),
      stepMinutes,
      atlas: a.meta.source,
    },
  };
}

/** Vectores del Sol y la Tierra (planos) en cada instante, o null si alguno sale de la cobertura. */
function bodySeries(startMs, windowDays, stepMinutes, need) {
  const steps = Math.max(1, Math.round((windowDays * 1440) / stepMinutes));
  const bodies = [];
  for (let k = 0; k < steps; k++) {
    const v = bodyVectorsAt(startMs + k * stepMinutes * 60_000);
    if (!v) return null;
    bodies.push(v);
  }
  const n = bodies.length;
  const flat = (pick) => {
    const out = { x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n), r: new Float64Array(n) };
    for (let k = 0; k < n; k++) {
      const [vec, radius] = pick(bodies[k]);
      out.x[k] = vec[0];
      out.y[k] = vec[1];
      out.z[k] = vec[2];
      out.r[k] = radius;
    }
    return out;
  };
  return {
    n,
    refId: bodies[0].refId,
    S: need.sun ? flat((b) => [b.sunDir, b.sunRadius]) : null,
    T: need.earth ? flat((b) => [b.earthPos, b.earthRadius]) : null,
  };
}

/** Fracciones de visibilidad y potencia media por celda de un atlas (−1 donde no hay horizonte). */
function atlasStats(a, cells, centerOf, { n, S, T }, { sunVisible, earthVisible, sunPower }) {
  const mk = (on) => (on ? new Float32Array(cells).fill(-1) : null);
  const out = { sun: mk(S), earth: mk(T), both: mk(S && T), power: mk(S) };
  const azStep = 360 / a.azimuths;

  // Elevación y margen sobre el horizonte del atlas de un vector visto desde la celda.
  const look = (vx, vy, vz, f, base) => {
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const el = Math.asin((vx * f.up[0] + vy * f.up[1] + vz * f.up[2]) / len) / DEG;
    let az = Math.atan2(vx * f.east[0] + vy * f.east[1] + vz * f.east[2], vx * f.north[0] + vy * f.north[1] + vz * f.north[2]) / DEG;
    if (az < 0) az += 360;
    const xi = az / azStep;
    const i0 = Math.floor(xi) % a.azimuths;
    const fr = xi - Math.floor(xi);
    const hz = a.horizon[base + i0] * (1 - fr) + a.horizon[base + ((i0 + 1) % a.azimuths)] * fr;
    return { el, margin: el - hz };
  };

  for (let c = 0; c < cells; c++) {
    const base = c * a.azimuths;
    if (Number.isNaN(a.horizon[base])) continue;
    const center = centerOf(c);
    const f = localFrame(center.lat, center.lon);
    // Para la Tierra, vector desde la celda (paralaje); para el Sol, la dirección.
    const r = MOON_RADIUS_KM + a.groundM[c] / 1000;
    let sunHits = 0;
    let earthHits = 0;
    let bothHits = 0;
    let powerSum = 0;
    for (let k = 0; k < n; k++) {
      let sunUp = false;
      let earthUp = false;
      if (S) {
        const v = look(S.x[k], S.y[k], S.z[k], f, base);
        sunUp = sunVisible(v.margin);
        powerSum += sunPower(v.margin, S.r[k], center.lat, v.el);
      }
      if (T) {
        const v = look(T.x[k] - f.up[0] * r, T.y[k] - f.up[1] * r, T.z[k] - f.up[2] * r, f, base);
        earthUp = earthVisible(v.margin, T.r[k]);
      }
      sunHits += sunUp;
      earthHits += earthUp;
      bothHits += sunUp && earthUp;
    }
    if (out.sun) out.sun[c] = sunHits / n;
    if (out.earth) out.earth[c] = earthHits / n;
    if (out.both) out.both[c] = bothHits / n;
    if (out.power) out.power[c] = powerSum / n;
  }
  return out;
}

/** Compatibilidad: mapa de un solo cuerpo (`mode` "sun" | "earth"), o `null`. */
export function computeRealHeatmap({ mode, ...o }) {
  const stats = computeRealHeatStats({ ...o, need: { sun: mode !== "earth", earth: mode === "earth" }, sunPower: o.sunPower ?? (() => 0) });
  if (!stats) return null;
  return { values: mode === "earth" ? stats.earth : stats.sun, size: stats.size, minLat: stats.minLat, source: stats.source };
}
