/**
 * Análisis de un escenario (sitio + fecha de inicio + ventana de días).
 *
 * Muestrea el Sol y la Tierra cada 10 minutos y calcula:
 *  - visibilidad real (cuerpo por encima del horizonte del relieve),
 *  - potencia solar relativa y calidad de enlace,
 *  - ventanas de luz y de comunicación,
 *  - la viabilidad del escenario con criterios simples y explicables (DEC-007).
 */
import { DAY_MS, EARTH_RADIUS, SUN_RADIUS, earthPhase, earthPosition, sunPosition } from "./astro.js";
import { createHorizon } from "./terrain.js";

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

/** Calidad de enlace: crece con el margen de la Tierra sobre el horizonte (0 a 1). */
function linkQuality(margin) {
  if (margin <= -EARTH_RADIUS) return 0;
  return clamp01(0.04 + margin / 12);
}

function computeWindows(flags, start, end, times) {
  const windows = [];
  let open = -1;
  for (let i = start; i < end; i++) {
    if (flags[i] && open < 0) open = i;
    if (!flags[i] && open >= 0) {
      windows.push({ start: times[open], end: times[i] });
      open = -1;
    }
  }
  if (open >= 0) windows.push({ start: times[open], end: times[end - 1] + STEP_MS });
  return windows;
}

function level(value, { high, mid }) {
  if (value >= high) return "high";
  if (value >= mid) return "mid";
  return "low";
}

const LEVEL_POINTS = { high: 2, mid: 1, low: 0 };

export function computeScenario(site, startMs, windowDays) {
  const horizon = createHorizon(site);
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
    power: new Float32Array(total),
    link: new Float32Array(total),
  };

  for (let i = 0; i < total; i++) {
    const t = startMs + i * STEP_MS;
    const sun = sunPosition(site, t);
    const earth = earthPosition(site, t);
    const sunHz = horizon(sun.azimuth);
    const earthHz = horizon(earth.azimuth);
    const sunMargin = sun.elevation - sunHz;
    const earthMargin = earth.elevation - earthHz;
    const sunFraction = clamp01((sunMargin + SUN_RADIUS) / (2 * SUN_RADIUS));

    s.times[i] = t;
    s.sunEl[i] = sun.elevation;
    s.sunAz[i] = sun.azimuth;
    s.sunHz[i] = sunHz;
    s.earthEl[i] = earth.elevation;
    s.earthAz[i] = earth.azimuth;
    s.earthHz[i] = earthHz;
    s.sunVis[i] = sunFraction > 0.5 ? 1 : 0;
    s.earthVis[i] = earthMargin > -EARTH_RADIUS ? 1 : 0;
    s.power[i] = sunFraction * panelFactor(site.lat, sun.elevation);
    s.link[i] = linkQuality(earthMargin);
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
  const lightWindows = computeWindows(s.sunVis, 0, windowSteps, s.times);
  const linkWindows = computeWindows(s.earthVis, 0, windowSteps, s.times);

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

/** Busca el próximo cambio de visibilidad a partir del índice i. */
function nextChange(flags, times, i) {
  const current = flags[i];
  for (let j = i + 1; j < flags.length; j++) {
    if (flags[j] !== current) return { visible: Boolean(current), at: times[j] };
  }
  return { visible: Boolean(current), at: null };
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
      visible: Boolean(s.sunVis[i]),
      power: lerp(s.power),
      next: nextChange(s.sunVis, s.times, i),
    },
    earth: {
      elevation: earthEl,
      azimuth: earthAz,
      horizon: earthHz,
      margin: earthEl - earthHz,
      visible: Boolean(s.earthVis[i]),
      link: lerp(s.link),
      phase: earthPhase(ms),
      next: nextChange(s.earthVis, s.times, i),
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
export function computePolarHeatmap({ startMs, windowDays, mode, size = 96, minLat = -80 }) {
  const samples = Math.max(16, Math.round(windowDays * 4));
  const stepMs = (windowDays * DAY_MS) / samples;
  const sunSub = [];
  const earthSub = [];
  for (let k = 0; k < samples; k++) {
    const t = startMs + k * stepMs;
    sunSub.push(t);
    earthSub.push(t);
  }
  const values = new Float32Array(size * size).fill(-1);
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
      let hits = 0;
      for (let k = 0; k < samples; k++) {
        const pos = mode === "earth" ? earthPosition(site, earthSub[k]) : sunPosition(site, sunSub[k]);
        if (pos.elevation > horizon(pos.azimuth)) hits++;
      }
      values[y * size + x] = hits / samples;
    }
  }
  return { values, size, minLat };
}
