/**
 * Capas calculadas de la pestaña ELEVACIÓN (interfaz de MAP-01, DEC-040).
 *
 * El motor (`computePolarHeatmap`, DEC-038) devuelve una grilla de 96 × 96
 * celdas hasta −80° con la misma orientación que la vista polar 2D (0° de
 * longitud arriba). Acá solo se colorea esa grilla con la paleta de la
 * configuración (estándar o apta para daltonismo) y se guarda como imagen.
 * Cada píxel es una celda (~6 km): la imagen se muestra sin suavizar para no
 * aparentar más resolución que la que hay. El cálculo corre en un worker
 * cuando se puede (PERF-01, DEC-047).
 */
import { computePolarHeatmap, realDataVersion } from "../lib/analysis.js";
import { lut } from "./elevation.js";
import { loadedData, persist, persisted, runInWorker } from "./compute.js";

/** Capas del selector. "elevation" es el mapa LOLA de siempre (DEC-026). */
export const HEAT_LAYERS = Object.freeze(["elevation", "sun", "earth", "both", "viability"]);

/** Borde del mapa calculado (latitud mínima de la grilla del motor). */
export const HEAT_MIN_LAT = -80;
export const HEAT_SIZE = 96;

const cache = new Map(); // clave → { url, source, layer }
const MAX_CACHE = 24;

const keyFor = (layer, startMs, windowDays, palette) => `${layer}|${startMs}|${windowDays}|${palette}|${realDataVersion()}`;
/** Clave persistente: solo tiene sentido con todos los datos reales del mapa cargados. */
const persistKey = (layer, startMs, windowDays, palette) => {
  const data = loadedData();
  return data.ephemerides && data.heatAtlas ? `heat|${layer}|${startMs}|${windowDays}|${palette}` : null;
};

function remember(key, result) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}

/** Resultado ya calculado (en memoria o en la caché persistente, DEC-047), o null. */
export function cachedHeatLayer(layer, startMs, windowDays, palette) {
  const key = keyFor(layer, startMs, windowDays, palette);
  if (cache.has(key)) return cache.get(key);
  const pk = persistKey(layer, startMs, windowDays, palette);
  const stored = pk && persisted(pk);
  return stored ? remember(key, { ...stored, layer }) : null;
}

/** Colorea la grilla con la paleta y la devuelve como PNG (data URL). */
function colorize(values, size, palette) {
  const table = lut(palette);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  const px = img.data;
  for (let c = 0; c < values.length; c++) {
    const v = values[c];
    if (!(v >= 0)) continue; // fuera del disco: transparente
    const e = Math.round(Math.min(1, v) * 255) * 3;
    px[c * 4] = table[e];
    px[c * 4 + 1] = table[e + 1];
    px[c * 4 + 2] = table[e + 2];
    px[c * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

const args = (layer, startMs, windowDays) => ({ startMs, windowDays, mode: layer, size: HEAT_SIZE, minLat: HEAT_MIN_LAT });

/** Cálculo en el hilo principal (0,2–1 s): respaldo si no hay worker. */
export function computeHeatLayer(layer, startMs, windowDays, palette) {
  const key = keyFor(layer, startMs, windowDays, palette);
  if (cache.has(key)) return cache.get(key);
  const map = computePolarHeatmap(args(layer, startMs, windowDays));
  return remember(key, { url: colorize(map.values, map.size, palette), source: map.source, layer });
}

/**
 * Calcula la capa en el worker (PERF-01) sin bloquear la página; si el
 * worker no está disponible o falla, en el hilo principal. Guarda en la caché
 * persistente los mapas reales calculados con todos los datos cargados.
 * @returns {Promise<{url: string, source: object, layer: string}>}
 */
export async function heatLayerAsync(layer, startMs, windowDays, palette) {
  const hit = cachedHeatLayer(layer, startMs, windowDays, palette);
  if (hit) return hit;
  const key = keyFor(layer, startMs, windowDays, palette);
  const pk = persistKey(layer, startMs, windowDays, palette);
  let result;
  try {
    const job = runInWorker("heat", args(layer, startMs, windowDays));
    if (!job) return computeHeatLayer(layer, startMs, windowDays, palette);
    const map = await job;
    result = remember(key, { url: colorize(map.values, map.size, palette), source: map.source, layer });
  } catch (error) {
    console.warn(`Worker del mapa no disponible (cálculo en la página): ${error.message}`);
    return computeHeatLayer(layer, startMs, windowDays, palette);
  }
  if (pk && result.source?.kind === "real") persist(pk, { url: result.url, source: result.source });
  return result;
}
