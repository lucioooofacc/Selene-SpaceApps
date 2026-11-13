/**
 * Estado global mínimo con suscripción (sin framework).
 * Los módulos de ui/ leen el estado y llaman a setState; main.js redibuja.
 */
import { SITES } from "./data/sites.js";

const DEFAULT_SITE = SITES[0];

/** Fecha inicial por defecto: 14/11/2026 12:00 UTC (primer día de la hackathon). */
export const DEFAULT_START = Date.UTC(2026, 10, 14, 12, 0);

const state = {
  siteId: DEFAULT_SITE.id,
  lat: DEFAULT_SITE.lat,
  lon: DEFAULT_SITE.lon,
  startMs: DEFAULT_START,
  windowDays: 14,
  timeMs: DEFAULT_START + 15.5 * 3_600_000,
  playing: false,
  speed: 1, // horas simuladas por segundo real
  mapView: "polar", // "polar" | "global"
  heatMode: "sun", // "sun" | "earth"
  compare: [], // escenarios fijados para comparar
};

const listeners = new Set();

export function getState() {
  return state;
}

/** Aplica cambios y avisa qué claves cambiaron. */
export function setState(patch) {
  const changed = new Set();
  for (const [key, value] of Object.entries(patch)) {
    if (state[key] !== value) {
      state[key] = value;
      changed.add(key);
    }
  }
  if (changed.size) listeners.forEach((fn) => fn(state, changed));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
