/**
 * Análisis de un escenario (sitio + fecha de inicio + ventana de días).
 *
 * Muestrea el Sol y la Tierra cada 10 minutos y calcula:
 *  - visibilidad real (cuerpo por encima del horizonte del relieve: LOLA en
 *    los sitios curados cubiertos, sintético en el resto; ver scenarioHorizon),
 *  - potencia solar relativa y calidad de enlace,
 *  - ventanas de luz y de comunicación,
 *  - la viabilidad del escenario con criterios simples y explicables (DEC-007).
 */
import { DAY_MS, EARTH_RADIUS, SUN_RADIUS, earthPhase, earthPosition, sunPosition } from "./astro.js";
import { createHorizon } from "./terrain.js";
import { createLolaHorizon } from "./horizon-lola.js";
import { derivedEphemerisFor, ephemerisFor, ephemerisVersion, positionsAt } from "./ephemeris.js";
import { POLAR_DEM_COVERAGE_LATITUDE, polarDemVersion, polarHorizonFor } from "./polar-dem.js";
import { computeRealGlobalHeatStats, computeRealHeatStats, heatAtlasVersion } from "./heat-map.js";

export const STEP_MINUTES = 10;
const STEP_MS = STEP_MINUTES * 60_000;
/** Días extra calculados después de la ventana para encontrar el próximo amanecer/ocaso. */
const LOOKAHEAD_DAYS = 32;

/** Umbrales de viabilidad. Documentados en DEC-007; ajustables por el equipo. */
export const THRESHOLDS = {
  illumination: { high: 65, mid: 35 }, // % del tiempo con Sol visible
  power: { high: 0.35, mid: 0.15 }, // potencia relativa promedio (0-1)
  communication: { high: 50, mid: 20 }, // % del tiempo con Tierra visible
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Paneles verticales en zonas polares (el Sol siempre está bajo) y horizontales
 * en el resto. Potencia relativa 1 = Sol perpendicular al panel.
 */
function panelFactor(lat, elevationDeg) {
  const e = (elevationDeg * Math.PI) / 180;
  return Math.abs(lat) >= 60 ? Math.cos(e) : Math.max(0, Math.sin(e));
}

// ---------------------------------------------------------------------------
// Política de visibilidad única (CORE-02, DEC-036). La usan el escenario, la
// muestra instantánea (`sampleAt`, que lee las mismas series) y el mapa de
// calor. `margin` es la elevación del centro del disco menos la del horizonte
// en ese azimut (grados); el horizonte se toma localmente recto a la escala
// del disco. `radius` es el radio angular del disco (grados): el de JPL
// Horizons en cada instante, o el medio de astro.js con el modelo aproximado.
// ---------------------------------------------------------------------------

export const VISIBILITY_POLICY = Object.freeze({
  sun: "half-disc", // visible si asoma al menos la mitad del disco
  earth: "any-part", // visible si asoma cualquier parte del disco
  power: "visible-disc-fraction", // potencia ∝ fracción del disco que asoma
});

/** Fracción visible (0 a 1) de un disco cortado por un horizonte recto: área exacta del segmento circular. */
export function discFraction(margin, radius) {
  if (margin >= radius) return 1;
  if (margin <= -radius) return 0;
  const d = margin / radius;
  return 1 - (Math.acos(d) - d * Math.sqrt(1 - d * d)) / Math.PI;
}

/** Sol visible: asoma al menos la mitad del disco (centro sobre el horizonte). */
export function sunVisible(margin) {
  return margin > 0;
}

/** Tierra visible para comunicación: asoma cualquier parte del disco. */
export function earthVisible(margin, radius = EARTH_RADIUS) {
  return margin > -radius;
}

/** Calidad de enlace: crece con el margen de la Tierra sobre el horizonte (0 a 1). */
function linkQuality(margin, radius = EARTH_RADIUS) {
  if (!earthVisible(margin, radius)) return 0;
  return clamp01(0.04 + margin / 12);
}

/**
 * Ventanas continuas con flags[i] = 1. Los bordes que caen dentro del período
 * usan el instante refinado del cruce (SCIENCE-02, DEC-048) si está en
 * `cross` (índice de la primera muestra con el estado nuevo → instante); el
 * inicio y el fin del período quedan como están.
 */
function computeWindows(flags, start, end, times, cross = new Map()) {
  const windows = [];
  let open = -1;
  for (let i = start; i < end; i++) {
    if (flags[i] && open < 0) open = i;
    if (!flags[i] && open >= 0) {
      windows.push({ start: open > start ? (cross.get(open) ?? times[open]) : times[open], end: cross.get(i) ?? times[i] });
      open = -1;
    }
  }
  if (open >= 0) windows.push({ start: open > start ? (cross.get(open) ?? times[open]) : times[open], end: times[end - 1] + STEP_MS });
  return windows;
}

/** Tolerancia del refinamiento de cruces (SCIENCE-02, DEC-048). */
export const CROSSING_TOLERANCE_MS = 5_000;

/**
 * Instante del cruce entre dos muestras (t0 con estado `before`, t1 con el
 * contrario) por bisección sobre `visibleAt(t)`, que evalúa posiciones y
 * horizonte en el instante exacto. Supone un solo cruce en el intervalo (el
 * mismo supuesto que el muestreo de 10 min).
 */
function refineCrossing(t0, t1, before, visibleAt) {
  let lo = t0;
  let hi = t1;
  while (hi - lo > CROSSING_TOLERANCE_MS) {
    const mid = (lo + hi) / 2;
    if (visibleAt(mid) === before) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/** Cruces refinados de toda la serie: índice j (primera muestra con estado nuevo) → instante. */
function refineAll(flags, times, visibleAt) {
  const out = new Map();
  for (let j = 1; j < flags.length; j++) {
    if (flags[j] !== flags[j - 1]) out.set(j, refineCrossing(times[j - 1], times[j], Boolean(flags[j - 1]), visibleAt));
  }
  return out;
}

function level(value, { high, mid }) {
  if (value >= high) return "high";
  if (value >= mid) return "mid";
  return "low";
}

const LEVEL_POINTS = { high: 2, mid: 1, low: 0 };

/**
 * Horizonte del escenario, en orden de preferencia:
 * 1. LOLA de 240 m precalculado (TERRAIN-02, DEC-030/DEC-032), si el sitio es
 *    curado y conserva sus coordenadas.
 * 2. LOLA reducido (480/960 m) calculado al momento para puntos al sur de −75°,
 *    si el DEM polar reducido ya está cargado (CORE-03, DEC-034;
 *    `meta.reduced = true`).
 * 3. El sintético de `terrain.js` (DEC-005), sin `source`.
 */
export function scenarioHorizon(site) {
  return curatedLolaHorizon(site) ?? polarHorizonFor(site) ?? createHorizon(site);
}

/** Horizonte LOLA de 240 m precalculado, solo para el sitio curado con sus coordenadas. */
function curatedLolaHorizon(site) {
  if (site.custom || !site.id) return null;
  const lola = createLolaHorizon(site.id);
  return lola && lola.meta.lat === site.lat && lola.meta.lon === site.lon ? lola : null;
}

/**
 * ¿Este sitio usaría el DEM polar reducido si estuviera cargado? (CORE-03,
 * DEC-034). Sirve para que la interfaz lo baje solo cuando hace falta.
 */
export function needsPolarDem(site) {
  return Number.isFinite(site?.lat) && site.lat <= POLAR_DEM_COVERAGE_LATITUDE && !curatedLolaHorizon(site);
}

/**
 * Versión de los datos reales cargados (efemérides y DEM polar). Cambia cuando
 * llega algo nuevo: los cachés de escenarios la incluyen en su clave.
 */
export function realDataVersion() {
  return `${ephemerisVersion()}.${polarDemVersion()}.${heatAtlasVersion()}`;
}

/**
 * Origen de las posiciones del Sol y la Tierra (CORE-01 parte B, DEC-033):
 * JPL Horizons si hay serie registrada para el sitio y cubre el instante; si
 * no, el modelo aproximado de astro.js (DEC-004).
 */
function makePositions(site) {
  const own = ephemerisFor(site);
  // Puntos propios (o sitios con coordenadas editadas): serie trasladada (DEC-034).
  const derived = own ? null : derivedEphemerisFor(site);
  const eph = own ?? derived;
  const at = own ? (t) => positionsAt(own, t) : derived ? (t) => derived.at(t) : () => null;
  return {
    eph,
    derived: Boolean(derived),
    at(t) {
      const p = at(t);
      if (p) return { sun: p.sun, earth: p.earth, phase: p.earth.phase, real: true };
      return { sun: sunPosition(site, t), earth: earthPosition(site, t), phase: earthPhase(t), real: false };
    },
  };
}

export function computeScenario(site, startMs, windowDays) {
  const horizon = scenarioHorizon(site);
  const positions = makePositions(site);
  let realWindow = 0;
  let realTotal = 0;
  const windowSteps = Math.round((windowDays * DAY_MS) / STEP_MS);
  const total = windowSteps + Math.round((LOOKAHEAD_DAYS * DAY_MS) / STEP_MS);

  const s = {
    times: new Float64Array(total),
    sunEl: new Float32Array(total),
    sunAz: new Float32Array(total),
    sunHz: new Float32Array(total),
    earthEl: new Float32Array(total),
    earthAz: new Float32Array(total),
    earthHz: new Float32Array(total),
    sunVis: new Uint8Array(total),
    earthVis: new Uint8Array(total),
    earthPhase: new Float32Array(total),
    power: new Float32Array(total),
    link: new Float32Array(total),
  };

  for (let i = 0; i < total; i++) {
    const t = startMs + i * STEP_MS;
    const { sun, earth, phase, real } = positions.at(t);
    const sunRadius = sun.radius ?? SUN_RADIUS;
    const earthRadius = earth.radius ?? EARTH_RADIUS;
    if (real) {
      realTotal++;
      if (i < windowSteps) realWindow++;
    }
    s.earthPhase[i] = phase;
    const sunHz = horizon(sun.azimuth);
    const earthHz = horizon(earth.azimuth);
    const sunMargin = sun.elevation - sunHz;
    const earthMargin = earth.elevation - earthHz;
    const sunFraction = discFraction(sunMargin, sunRadius);

    s.times[i] = t;
    s.sunEl[i] = sun.elevation;
    s.sunAz[i] = sun.azimuth;
    s.sunHz[i] = sunHz;
    s.earthEl[i] = earth.elevation;
    s.earthAz[i] = earth.azimuth;
    s.earthHz[i] = earthHz;
    s.sunVis[i] = sunVisible(sunMargin) ? 1 : 0;
    s.earthVis[i] = earthVisible(earthMargin, earthRadius) ? 1 : 0;
    s.power[i] = sunFraction * panelFactor(site.lat, sun.elevation);
    s.link[i] = linkQuality(earthMargin, earthRadius);
  }

  // Resumen solo dentro de la ventana elegida.
  let sunSteps = 0;
  let earthSteps = 0;
  let powerSum = 0;
  let peakSun = -90;
  let peakEarth = -90;
  for (let i = 0; i < windowSteps; i++) {
    sunSteps += s.sunVis[i];
    earthSteps += s.earthVis[i];
    powerSum += s.power[i];
    peakSun = Math.max(peakSun, s.sunEl[i]);
    peakEarth = Math.max(peakEarth, s.earthEl[i]);
  }

  const illumination = (100 * sunSteps) / windowSteps;
  const power = powerSum / windowSteps;
  const communication = (100 * earthSteps) / windowSteps;
  // Cruces refinados (SCIENCE-02, DEC-048): mismas posiciones y horizonte que las muestras.
  s.sunCross = refineAll(s.sunVis, s.times, (t) => {
    const p = positions.at(t).sun;
    return sunVisible(p.elevation - horizon(p.azimuth));
  });
  s.earthCross = refineAll(s.earthVis, s.times, (t) => {
    const p = positions.at(t).earth;
    return earthVisible(p.elevation - horizon(p.azimuth), p.radius ?? EARTH_RADIUS);
  });
  // Los porcentajes y minutos del resumen siguen contando muestras (no cambian el ranking);
  // los bordes de las ventanas usan los cruces refinados.
  const lightWindows = computeWindows(s.sunVis, 0, windowSteps, s.times, s.sunCross);
  const linkWindows = computeWindows(s.earthVis, 0, windowSteps, s.times, s.earthCross);

  const criteria = {
    illumination: { value: illumination, level: level(illumination, THRESHOLDS.illumination) },
    power: { value: power, level: level(power, THRESHOLDS.power) },
    communication: { value: communication, level: level(communication, THRESHOLDS.communication) },
  };
  const points = Object.values(criteria).reduce((sum, c) => sum + LEVEL_POINTS[c.level], 0);
  const overall = points >= 5 ? "high" : points >= 3 ? "mid" : "low";

  return {
    site,
    startMs,
    endMs: startMs + windowDays * DAY_MS,
    windowDays,
    windowSteps,
    series: s,
    horizon,
    visibility: VISIBILITY_POLICY,
    ephemeris: {
      // "horizons": toda la ventana con JPL Horizons; "approximate": nada;
      // "mixed": parte de la ventana fuera de la cobertura de las series.
      source: realWindow === windowSteps ? "horizons" : realWindow === 0 ? "approximate" : "mixed",
      windowFraction: realWindow / windowSteps,
      // Los días extra (próximo amanecer/ocaso) también pueden salir del rango.
      lookaheadComplete: realTotal === total,
      // true si las posiciones se trasladaron desde la serie de otro sitio (DEC-034).
      derived: positions.derived && realTotal > 0,
      // Procedencia de la serie, solo si se usó para alguna muestra.
      meta: realTotal > 0 ? positions.eph.meta : null,
    },
    summary: {
      illumination,
      sunMinutes: sunSteps * STEP_MINUTES,
      power,
      communication,
      linkMinutes: earthSteps * STEP_MINUTES,
      peakSun,
      peakEarth,
      lightWindows,
      linkWindows,
    },
    viability: { criteria, points, maxPoints: 6, overall },
  };
}

/** Próximo cambio de visibilidad desde el índice i: instante refinado (DEC-048) e índice de la muestra. */
function nextChange(flags, times, i, cross) {
  const current = flags[i];
  for (let j = i + 1; j < flags.length; j++) {
    if (flags[j] !== current) return { visible: Boolean(current), at: cross?.get(j) ?? times[j], index: j };
  }
  return { visible: Boolean(current), at: null, index: -1 };
}

/**
 * Estado instantáneo de un cuerpo en `ms`: si el cruce refinado ya pasó
 * dentro del intervalo de 10 min, el estado es el nuevo y "próximo cambio"
 * es el siguiente.
 */
function bodyState(flags, times, i, cross, ms) {
  let next = nextChange(flags, times, i, cross);
  let visible = Boolean(flags[i]);
  if (next.at !== null && next.at <= ms) {
    visible = !visible;
    next = nextChange(flags, times, next.index, cross);
  }
  return { visible, next: { visible: next.visible, at: next.at } };
}

/** Estado instantáneo en el momento `ms` (interpolado entre muestras). */
export function sampleAt(scenario, ms) {
  const s = scenario.series;
  const pos = Math.max(0, Math.min(s.times.length - 1.001, (ms - scenario.startMs) / STEP_MS));
  const i = Math.floor(pos);
  const f = pos - i;
  const lerp = (arr) => arr[i] * (1 - f) + arr[i + 1] * f;
  const lerpAngle = (arr) => {
    let d = arr[i + 1] - arr[i];
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return (((arr[i] + d * f) % 360) + 360) % 360;
  };

  const sunEl = lerp(s.sunEl);
  const sunAz = lerpAngle(s.sunAz);
  const earthEl = lerp(s.earthEl);
  const earthAz = lerpAngle(s.earthAz);
  const sunHz = scenario.horizon(sunAz);
  const earthHz = scenario.horizon(earthAz);

  const sunState = bodyState(s.sunVis, s.times, i, s.sunCross, ms);
  const earthState = bodyState(s.earthVis, s.times, i, s.earthCross, ms);

  // Luz y enlace acumulados desde el inicio hasta este instante.
  let sunSteps = 0;
  let earthSteps = 0;
  for (let j = 0; j <= i && j < scenario.windowSteps; j++) {
    sunSteps += s.sunVis[j];
    earthSteps += s.earthVis[j];
  }

  return {
    ms,
    index: i,
    sun: {
      elevation: sunEl,
      azimuth: sunAz,
      horizon: sunHz,
      margin: sunEl - sunHz,
      visible: sunState.visible,
      power: lerp(s.power),
      next: sunState.next,
    },
    earth: {
      elevation: earthEl,
      azimuth: earthAz,
      horizon: earthHz,
      margin: earthEl - earthHz,
      visible: earthState.visible,
      link: lerp(s.link),
      phase: lerp(s.earthPhase),
      next: earthState.next,
    },
    accumulated: {
      sunMinutes: sunSteps * STEP_MINUTES,
      linkMinutes: earthSteps * STEP_MINUTES,
      elapsedMinutes: Math.min(i + 1, scenario.windowSteps) * STEP_MINUTES,
    },
  };
}

/**
 * Mapa de calor del polo sur: % de tiempo con Sol (o Tierra) visible en cada
 * punto de una grilla, usando pocas muestras para que sea rápido.
 * Devuelve una matriz size×size en proyección azimutal equidistante.
 */
/** Modos del mapa de calor (MAP-01, DEC-038). */
export const HEAT_MODES = Object.freeze(["sun", "earth", "both", "viability"]);

/** Potencia relativa de una muestra: fracción visible del disco × orientación del panel. */
function sunPower(margin, radius, lat, elevation) {
  return discFraction(margin, radius) * panelFactor(lat, elevation);
}

/** Estadísticas aproximadas por celda (modelo periódico + horizonte sintético), misma forma que las reales. */
function approxHeatStats({ startMs, windowDays, size, minLat, need }) {
  const samples = Math.max(16, Math.round(windowDays * 4));
  const stepMs = (windowDays * DAY_MS) / samples;
  const cells = size * size;
  const mk = (on) => (on ? new Float32Array(cells).fill(-1) : null);
  const out = { sun: mk(need.sun), earth: mk(need.earth), both: mk(need.sun && need.earth), power: mk(need.sun) };
  const span = 90 + minLat; // grados desde el polo hasta el borde

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      if (r > 1) continue;
      const lat = -90 + r * span;
      const lon = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const site = { lat, lon };
      const horizon = createHorizon(site, { precompute: false });
      let sunHits = 0;
      let earthHits = 0;
      let bothHits = 0;
      let powerSum = 0;
      for (let k = 0; k < samples; k++) {
        const t = startMs + k * stepMs;
        let sunUp = false;
        let earthUp = false;
        if (need.sun) {
          const pos = sunPosition(site, t);
          const margin = pos.elevation - horizon(pos.azimuth);
          // Misma política que el escenario (CORE-02, DEC-036).
          sunUp = sunVisible(margin);
          powerSum += sunPower(margin, SUN_RADIUS, lat, pos.elevation);
        }
        if (need.earth) {
          const pos = earthPosition(site, t);
          earthUp = earthVisible(pos.elevation - horizon(pos.azimuth), EARTH_RADIUS);
        }
        sunHits += sunUp;
        earthHits += earthUp;
        bothHits += sunUp && earthUp;
      }
      const c = y * size + x;
      if (out.sun) out.sun[c] = sunHits / samples;
      if (out.earth) out.earth[c] = earthHits / samples;
      if (out.both) out.both[c] = bothHits / samples;
      if (out.power) out.power[c] = powerSum / samples;
    }
  }
  return { ...out, size, minLat, source: { kind: "approximate", ephemeris: "periodic-model", horizon: "synthetic" } };
}

/**
 * Mapa de calor del polo sur (MAP-01, DEC-038). Modos:
 * - `"sun"`: fracción del tiempo con el Sol visible;
 * - `"earth"`: fracción con la Tierra visible;
 * - `"both"`: fracción con el Sol y la Tierra visibles a la vez (energía y
 *   comunicación al mismo tiempo);
 * - `"viability"`: puntos de viabilidad 0–6 de cada celda con los mismos
 *   criterios y umbrales que los sitios y el ranking "Global" (DEC-007);
 *   `values` = puntos / 6, `points` trae el entero y `components` las
 *   fracciones de luz y Tierra y la potencia media de cada celda.
 * Con el atlas LOLA y las efemérides cargados usa datos reales; si no, o si la
 * ventana sale de la cobertura de Horizons, el modelo aproximado y el
 * horizonte sintético. `source.kind` indica cuál ("real" | "approximate").
 */
export function computePolarHeatmap({ startMs, windowDays, mode, size = 96, minLat = -80 }) {
  if (!HEAT_MODES.includes(mode)) throw new RangeError(`modo de mapa de calor desconocido: ${mode}`);
  const need = { sun: mode !== "earth", earth: mode !== "sun" };
  const stats =
    computeRealHeatStats({ startMs, windowDays, size, minLat, need, sunVisible, earthVisible, sunPower }) ??
    approxHeatStats({ startMs, windowDays, size, minLat, need });
  return heatResult({ size, minLat, mode, source: stats.source }, stats, mode);
}

/** Valores de la capa pedida; en "viability", los puntos de cada celda con los criterios de DEC-007. */
function heatResult(base, stats, mode) {
  if (mode !== "viability") return { ...base, values: stats[mode] };
  const values = new Float32Array(stats.sun.length).fill(-1);
  const points = new Int8Array(stats.sun.length).fill(-1);
  for (let c = 0; c < values.length; c++) {
    if (stats.sun[c] < 0) continue;
    const p =
      LEVEL_POINTS[level(100 * stats.sun[c], THRESHOLDS.illumination)] +
      LEVEL_POINTS[level(stats.power[c], THRESHOLDS.power)] +
      LEVEL_POINTS[level(100 * stats.earth[c], THRESHOLDS.communication)];
    points[c] = p;
    values[c] = p / 6;
  }
  // Componentes por celda (fracciones de tiempo y potencia media) para leyendas o tooltips.
  return { ...base, values, points, maxPoints: 6, components: { sun: stats.sun, earth: stats.earth, power: stats.power } };
}

/**
 * Mapa de calor de toda la Luna (MAP-02, DEC-065): las mismas capas y la
 * misma política que `computePolarHeatmap`, sobre la grilla equirectangular
 * del atlas global (LDEM_16; `cols × rows`, fila 0 al norte, columna 0 desde
 * −180°). Solo con datos reales: devuelve `null` si falta el atlas global, no
 * hay efemérides o la ventana sale de la cobertura de Horizons (no hay versión
 * aproximada: fuera del casquete polar la interfaz no pinta nada).
 */
export function computeGlobalHeatmap({ startMs, windowDays, mode }) {
  if (!HEAT_MODES.includes(mode)) throw new RangeError(`modo de mapa de calor desconocido: ${mode}`);
  const need = { sun: mode !== "earth", earth: mode !== "sun" };
  const stats = computeRealGlobalHeatStats({ startMs, windowDays, need, sunVisible, earthVisible, sunPower });
  if (!stats) return null;
  return heatResult({ cols: stats.cols, rows: stats.rows, mode, source: stats.source }, stats, mode);
}
