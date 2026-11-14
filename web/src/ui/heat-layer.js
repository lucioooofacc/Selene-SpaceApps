/**
 * Capas calculadas de la pestaña ELEVACIÓN (interfaz de MAP-01, DEC-040).
 *
 * El motor (`computePolarHeatmap`, DEC-038) devuelve una grilla de 96 × 96
 * celdas hasta −80° con la misma orientación que la vista polar 2D (0° de
 * longitud arriba). Acá solo se colorea esa grilla con la paleta de la
 * configuración (estándar o apta para daltonismo) y se guarda como imagen.
 * Cada píxel es una celda (~6 km): la imagen se muestra sin suavizar para no
 * aparentar más resolución que la que hay.
 */
import { computePolarHeatmap, realDataVersion } from "../lib/analysis.js";
import { lut } from "./elevation.js";

/** Capas del selector. "elevation" es el mapa LOLA de siempre (DEC-026). */
export const HEAT_LAYERS = Object.freeze(["elevation", "sun", "earth", "both", "viability"]);

/** Borde del mapa calculado (latitud mínima de la grilla del motor). */
export const HEAT_MIN_LAT = -80;
export const HEAT_SIZE = 96;

const cache = new Map(); // clave → { url, source, layer }
const MAX_CACHE = 24;

const keyFor = (layer, startMs, windowDays, palette) => `${layer}|${startMs}|${windowDays}|${palette}|${realDataVersion()}`;

/** Resultado ya calculado para esos parámetros, o null. */
export function cachedHeatLayer(layer, startMs, windowDays, palette) {
  return cache.get(keyFor(layer, startMs, windowDays, palette)) ?? null;
}

/**
 * Calcula la capa (0,2–1 s en el hilo principal) y la colorea.
 * @returns {{url: string, source: {kind: string}, layer: string}}
 */
export function computeHeatLayer(layer, startMs, windowDays, palette) {
  const key = keyFor(layer, startMs, windowDays, palette);
  if (cache.has(key)) return cache.get(key);

  const map = computePolarHeatmap({ startMs, windowDays, mode: layer, size: HEAT_SIZE, minLat: HEAT_MIN_LAT });
  const table = lut(palette);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = map.size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(map.size, map.size);
  const px = img.data;
  for (let c = 0; c < map.values.length; c++) {
    const v = map.values[c];
    if (!(v >= 0)) continue; // fuera del disco: transparente
    const e = Math.round(Math.min(1, v) * 255) * 3;
    px[c * 4] = table[e];
    px[c * 4 + 1] = table[e + 1];
    px[c * 4 + 2] = table[e + 2];
    px[c * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const result = { url: canvas.toDataURL("image/png"), source: map.source, layer };
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}
