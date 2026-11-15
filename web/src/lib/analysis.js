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
import { globalDemVersion, globalHorizonFor, inPointHorizonBand } from "./global-dem.js";
import { computeRealGlobalHeatStats, computeRealHeatStats, heatAtlasVersion, regionalHorizonFor } from "./heat-map.js";

export const STEP_MINUTES = 10;
const STEP_MS = STEP_MINUTES * 60_000;
/** Días extra calculados después de la ventana para encontrar el próximo amanecer/ocaso. */
const LOOKAHEAD_DAYS = 32;

/**
 * Requisitos de misión para la viabilidad (VIAB-01, DEC-071; reemplaza los
 * umbrales de DEC-007). Cada uno tiene tres niveles: "high" = cumple,
 * "mid" = al límite, "low" = no cumple.
 * - light: noche más larga del período, en horas. Cumple sin noche, como
 *   exige Artemis III (Sol continuo toda la estadía, NASA 2022); al límite
 *   hasta 24 h (SUPUESTO del equipo: autonomía de baterías de un módulo chico;
 *   Odysseus tenía 10–20 h); no cumple con noches más largas.
 * - communication: % del período con la Tierra visible. Cumple desde 80 %
 *   (enlace directo casi permanente; SUPUESTO del equipo, no hay un umbral
 *   publicado). Por debajo queda al límite y nunca "no cumple": se asume un
 *   satélite de relevo, como en los planes de Artemis (decisión de Lucio).
 * - slope: pendiente del terreno en grados, solo donde hay datos. Cumple
 *   por debajo de 8° (tolerancia de inclinación del HLS), al límite por
 *   debajo de 10° (pendiente de aterrizaje del HLS en 100 m, NASA 2024).
 */
export const REQUIREMENTS = Object.freeze({
  light: Object.freeze({ unit: "h", meets: 0, limit: 24, better: "lower", source: "assumed-partial" }),
  communication: Object.freeze({ unit: "%", meets: 80, limit: 0, better: "higher", source: "assumed-relay" }),
  slope: Object.freeze({ unit: "°", meets: 8, limit: 10, better: "lower", strict: true, source: "nasa-hls-2024" }),
});

/**
 * Supuestos del equipo que se pueden cambiar desde "Parámetros de la misión"
 * (DEC-083): la autonomía de las baterías (límite de `light`, en horas) y la
 * comunicación mínima (`meets` de `communication`, en %). Los valores por
 * defecto son los de DEC-071. La pendiente sale de la NASA y no se cambia.
 */
export const DEFAULT_LIMITS = Object.freeze({
  batteryHours: REQUIREMENTS.light.limit,
  commsMinPct: REQUIREMENTS.communication.meets,
});

/** Rango admitido de cada supuesto: 0 a 360 h (una noche lunar) y 0 a 100 %, en enteros. */
export const LIMIT_RANGES = Object.freeze({
  batteryHours: Object.freeze({ min: 0, max: 360 }),
  commsMinPct: Object.freeze({ min: 0, max: 100 }),
});

let limits = { ...DEFAULT_LIMITS };
let effective = REQUIREMENTS;

/** Entero dentro del rango del supuesto, o null si no es un número. */
export function cleanLimit(key, value) {
  const n = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
  if (!Number.isFinite(n)) return null;
  const { min, max } = LIMIT_RANGES[key];
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Supuestos vigentes: { batteryHours, commsMinPct }. */
export function missionLimits() {
  return { ...limits };
}

/**
 * Cambia los supuestos vigentes (lo inválido o ausente queda como estaba).
 * Devuelve true si cambió algo. Los cachés de escenarios lo notan porque
 * `realDataVersion()` incluye `limitsVersion()`.
 */
export function setMissionLimits(patch = {}) {
  const next = { ...limits };
  for (const key of Object.keys(DEFAULT_LIMITS)) {
    const v = cleanLimit(key, patch[key]);
    if (v != null) next[key] = v;
  }
  if (next.batteryHours === limits.batteryHours && next.commsMinPct === limits.commsMinPct) return false;
  limits = next;
  effective = Object.freeze({
    ...REQUIREMENTS,
    light: Object.freeze({ ...REQUIREMENTS.light, limit: limits.batteryHours }),
    communication: Object.freeze({ ...REQUIREMENTS.communication, meets: limits.commsMinPct }),
  });
  return true;
}

/** Requisitos con los supuestos vigentes (mismas claves que REQUIREMENTS). */
export function currentRequirements() {
  return effective;
}

/** true si los supuestos son los de DEC-071. */
export const limitsAreDefault = () =>
  limits.batteryHours === DEFAULT_LIMITS.batteryHours && limits.commsMinPct === DEFAULT_LIMITS.commsMinPct;

/** Identificador de los supuestos vigentes, para las claves de caché. */
export const limitsVersion = () => `b${limits.batteryHours}c${limits.commsMinPct}`;

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

/**
 * Nivel de un requisito (DEC-071): "high" (cumple), "mid" (al límite) o
 * "low" (no cumple). En los de "menor es mejor", `meets` es inclusivo para la
 * luz (0 h de noche cumple) y estricto para la pendiente (< 8° cumple).
 */
export function requirementLevel(key, value) {
  const r = effective[key];
  if (r.better === "higher") return value >= r.meets ? "high" : value >= r.limit ? "mid" : "low";
  const within = (x, bound) => (r.strict ? x < bound : x <= bound);
  return within(value, r.meets) ? "high" : within(value, r.limit) ? "mid" : "low";
}

const LEVEL_RANK = { low: 0, mid: 1, high: 2 };

/**
 * Viabilidad a partir de los requisitos evaluados: la global es la del peor
 * (si uno no se cumple, el sitio no es viable, como en una misión real) y
 * `met` cuenta los que se cumplen del todo.
 * @param {Record<string, number>} values  valor de cada requisito presente
 */
export function viabilityFrom(values) {
  const criteria = {};
  for (const [key, value] of Object.entries(values)) {
    if (Number.isFinite(value)) criteria[key] = { value, level: requirementLevel(key, value) };
  }
  const levels = Object.values(criteria).map((c) => c.level);
  const overall = levels.reduce((worst, l) => (LEVEL_RANK[l] < LEVEL_RANK[worst] ? l : worst), "high");
  return { criteria, met: levels.filter((l) => l === "high").length, total: levels.length, overall };
}

/**
 * Viabilidad con la pendiente del terreno sumada como requisito (DEC-071).
 * Solo para pendientes de escala kilométrica o más fina (DEM polar o LDEM_128);
 * con `slopeDeg` no finito devuelve la viabilidad sin cambios.
 */
export function withSlope(viability, slopeDeg) {
  if (!Number.isFinite(slopeDeg)) return viability;
  const values = Object.fromEntries(Object.entries(viability.criteria).map(([k, c]) => [k, c.value]));
  return viabilityFrom({ ...values, slope: slopeDeg });
}

/** Orden de los niveles de viabilidad, para comparar (mayor es mejor). */
export const viabilityRank = (v) => LEVEL_RANK[v.overall];

/** Noche más larga (horas) de una serie de visibilidad del Sol en las muestras [0, n). */
function longestDarkHours(vis, n, stepMinutes) {
  let best = 0;
  let run = 0;
  for (let i = 0; i < n; i++) {
    run = vis[i] ? 0 : run + 1;
    if (run > best) best = run;
  }
  return (best * stepMinutes) / 60;
}

/**
 * Horizonte del escenario, en orden de preferencia:
 * 1. LOLA de 240 m precalculado (TERRAIN-02, DEC-030/DEC-032), si el sitio es
 *    curado y conserva sus coordenadas.
 * 2. LOLA reducido (480/960 m) calculado al momento para puntos al sur de −75°,
 *    si el DEM polar reducido ya está cargado (CORE-03, DEC-034;
 *    `meta.reduced = true`).
 * 3. LOLA del punto sobre el DEM global LDEM_16 para puntos con |lat| ≥ 60°,
 *    si el DEM global ya está cargado (CORE-05, DEC-076; `meta.global = true`).
 *    Ahí el regional no es confiable (DEC-070).
 * 4. LOLA regional interpolado del atlas global (celdas de 2°, LDEM_16), si
 *    el atlas ya está cargado (DEC-068; `meta.regional = true`).
 * 5. El sintético de `terrain.js` (DEC-005), sin `source`: solo mientras
 *    cargan los datos anteriores o si fallan.
 */
export function scenarioHorizon(site) {
  return curatedLolaHorizon(site) ?? polarHorizonFor(site) ?? globalHorizonFor(site) ?? regionalHorizonFor(site) ?? createHorizon(site);
}

/**
 * ¿Este sitio usaría el horizonte del punto sobre LDEM_16 si el DEM global
 * estuviera cargado? (CORE-05, DEC-076): puntos sin horizonte curado con
 * |lat| ≥ 60° y fuera de la cobertura del DEM polar reducido. Sirve para que
 * la interfaz baje el DEM global (~35 MiB) solo cuando hace falta.
 */
export function needsGlobalDemHorizon(site) {
  return inPointHorizonBand(site?.lat) && site.lat > POLAR_DEM_COVERAGE_LATITUDE && !curatedLolaHorizon(site);
}

/**
 * ¿Este sitio usaría el atlas global para su horizonte si estuviera cargado?
 * (DEC-068). Todo punto sin horizonte curado: los que están al sur de −75° lo
 * usan hasta que llega el DEM polar reducido.
 */
export function needsRegionalAtlas(site) {
  return Number.isFinite(site?.lat) && !curatedLolaHorizon(site);
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
 * Versión de los datos reales cargados (efemérides, DEM polar, atlas y DEM global) y de los
 * supuestos de viabilidad (DEC-083). Cambia cuando llega algo nuevo o cambian las baterías o la
 * comunicación mínima: los cachés de escenarios la incluyen en su clave.
 */
export function realDataVersion() {
  return `${ephemerisVersion()}.${polarDemVersion()}.${heatAtlasVersion()}.${globalDemVersion()}.${limitsVersion()}`;
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

  // Viabilidad por requisitos de misión (DEC-071). La pendiente se suma donde hay datos de terreno (withSlope).
  const longestNightH = longestDarkHours(s.sunVis, windowSteps, STEP_MINUTES);
  const viability = viabilityFrom({ light: longestNightH, communication });

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
      longestNightH,
      lightWindows,
      linkWindows,
    },
    viability,
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
export const HEAT_MODES = Object.freeze(["sun", "earth", "both", "viability", "night"]);

/** Tope de la capa "night" (h): la noche lunar dura ~14,8 días; más no puede haber. */
const NIGHT_CAP_H = 360;

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
  const out = { sun: mk(need.sun), earth: mk(need.earth), both: mk(need.sun && need.earth), power: mk(need.sun), night: mk(need.sun) };
  const span = 90 + minLat; // grados desde el polo hasta el borde
  const stepH = stepMs / 3_600_000;

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
      let darkRun = 0;
      let darkMax = 0;
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
        darkRun = sunUp ? 0 : darkRun + 1;
        if (darkRun > darkMax) darkMax = darkRun;
      }
      const c = y * size + x;
      if (out.night) out.night[c] = darkMax * stepH;
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
 * - `"night"`: noche más larga de cada celda (h, requisito de luz continua,
 *   DEC-072). `values` = 1 − noche / tope, con tope = la duración del período
 *   (máx. 360 h): más claro es mejor, igual que en las otras capas; `nightH`
 *   trae las horas y `capH` el tope.
 * - `"viability"`: viabilidad de cada celda con los mismos requisitos que
 *   los sitios y el ranking "Global" (DEC-071), sin la pendiente: `values` =
 *   0 (no cumple), 0,5 (al límite) o 1 (cumple); `levels` trae el nivel y
 *   `components` la noche más larga (h) y las fracciones de luz y Tierra.
 * Con el atlas LOLA y las efemérides cargados usa datos reales; si no, o si la
 * ventana sale de la cobertura de Horizons, el modelo aproximado y el
 * horizonte sintético. `source.kind` indica cuál ("real" | "approximate").
 */
export function computePolarHeatmap({ startMs, windowDays, mode, size = 96, minLat = -80 }) {
  if (!HEAT_MODES.includes(mode)) throw new RangeError(`modo de mapa de calor desconocido: ${mode}`);
  const need = { sun: mode !== "earth", earth: mode !== "sun" && mode !== "night" };
  const stats =
    computeRealHeatStats({ startMs, windowDays, size, minLat, need, sunVisible, earthVisible, sunPower }) ??
    approxHeatStats({ startMs, windowDays, size, minLat, need });
  return heatResult({ size, minLat, mode, source: stats.source }, stats, mode, windowDays);
}

/** Valores de la capa pedida; en "viability", el nivel de cada celda con los requisitos de DEC-071. */
function heatResult(base, stats, mode, windowDays) {
  if (mode === "night") {
    const capH = Math.min(NIGHT_CAP_H, windowDays * 24);
    const values = new Float32Array(stats.night.length).fill(-1);
    for (let c = 0; c < values.length; c++) if (stats.night[c] >= 0) values[c] = 1 - Math.min(stats.night[c], capH) / capH;
    return { ...base, values, nightH: stats.night, capH };
  }
  if (mode !== "viability") return { ...base, values: stats[mode] };
  const values = new Float32Array(stats.sun.length).fill(-1);
  const levels = new Array(stats.sun.length).fill(null);
  for (let c = 0; c < values.length; c++) {
    if (stats.sun[c] < 0) continue;
    const v = viabilityFrom({ light: stats.night[c], communication: 100 * stats.earth[c] });
    levels[c] = v.overall;
    values[c] = viabilityRank(v) / 2;
  }
  return { ...base, values, levels, components: { night: stats.night, sun: stats.sun, earth: stats.earth } };
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
  const need = { sun: mode !== "earth", earth: mode !== "sun" && mode !== "night" };
  const stats = computeRealGlobalHeatStats({ startMs, windowDays, need, sunVisible, earthVisible, sunPower });
  if (!stats) return null;
  return heatResult({ cols: stats.cols, rows: stats.rows, mode, source: stats.source }, stats, mode, windowDays);
}
