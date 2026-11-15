/**
 * Estado global mínimo con suscripción (sin framework).
 * Los módulos de ui/ leen el estado y llaman a setState; main.js redibuja.
 */
import { SITES } from "./data/sites.js";

export const CUSTOM_ID = "custom";
const HOUR = 3_600_000;

/** Inicio por defecto: 14/11/2026 00:00 UTC (primer día de la hackathon). */
export const DEFAULT_START = Date.UTC(2026, 10, 14, 0, 0);

const state = {
  // Igual que el Figma: sitio personalizado en (-66.52, -110.98).
  siteId: CUSTOM_ID,
  lat: -66.52,
  lon: -110.98,
  startMs: DEFAULT_START,
  windowDays: 2, // la línea de tiempo del Figma muestra 48 h
  dateChosen: false, // hasta elegir fechas, el campo muestra "Elegir"
  siteChosen: false, // hasta elegir un sitio o un punto, no se muestra la "Ventana de análisis" (DEC-049)
  timeMs: DEFAULT_START + 15.5 * HOUR, // T+15:30, como en el Figma
  playing: false,
  speed: 1, // horas simuladas por segundo real
  mapView: "global", // "global" | "heat" | "polar"; abre en GLOBAL (DEC-082)
  placesCategory: "overall", // ranking de "Mejores lugares": overall | science | communication | light (UI-13)
  placesMode: "sites", // panel de ranking: "sites" (mejores lugares) | "dates" (mejores fechas, DEC-046)
  mapMode: "3d", // GLOBAL y POLO SUR: "3d" (modelo) | "2d" (imagen NASA), DEC-021
  heatLayer: "elevation", // pestaña ELEVACIÓN: elevation | sun | earth | both | viability (MAP-01, DEC-040)
  customSites: [], // sitios agregados con el botón "+"
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

/** Sitios curados más los agregados por el usuario. */
export function allSites() {
  return [...SITES, ...state.customSites];
}

export function getSite(id) {
  return allSites().find((site) => site.id === id) ?? null;
}

export function chooseSite(id) {
  const site = getSite(id);
  if (site) setState({ siteId: id, lat: site.lat, lon: site.lon, siteChosen: true });
}

export function chooseCoordinates(lat, lon) {
  setState({
    siteId: CUSTOM_ID,
    lat: Math.max(-90, Math.min(90, Number(lat.toFixed(2)))),
    lon: Math.max(-180, Math.min(180, Number(lon.toFixed(2)))),
    siteChosen: true,
  });
}
