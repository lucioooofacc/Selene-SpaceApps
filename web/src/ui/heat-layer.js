/**
 * Capas calculadas de la pestaña ELEVACIÓN (interfaz de MAP-01, DEC-040).
 *
 * El motor (`computePolarHeatmap`, DEC-038) devuelve una grilla de 96 × 96
 * celdas hasta −80° con la misma orientación que la vista polar 2D (0° de
 * longitud arriba). Acá solo se colorea esa grilla con la paleta de la
 * configuración (estándar o apta para daltonismo) y se guarda como imagen.
 * La imagen se suaviza interpolando los valores entre celdas (DEC-051); la
 * resolución real (~6 km por celda) se indica en el crédito. El cálculo corre en un worker
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
  return data.ephemerides && data.heatAtlas ? `heat2|${layer}|${startMs}|${windowDays}|${palette}` : null; // heat2: suavizada (DEC-051)
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

/** Píxeles por celda de la imagen suavizada (DEC-051): 96 celdas → 384 px. */
const SMOOTH = 4;

/**
 * Colorea la grilla y la devuelve como PNG (data URL), suavizada (DEC-051):
 * cada píxel interpola en forma bilineal los VALORES de las 4 celdas vecinas
 * (no los colores, para no inventar tonos) y recién después toma el color de
 * la paleta. Las celdas sin dato no participan; el borde del disco se suaviza.
 */
function colorize(values, size, palette) {
  const table = lut(palette);
  const out = size * SMOOTH;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(out, out);
  const px = img.data;
  const at = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? -1 : values[y * size + x]);
  for (let v = 0; v < out; v++) {
    const gy = (v + 0.5) / SMOOTH - 0.5;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let u = 0; u < out; u++) {
      // Borde del disco (radio 1 = borde de la grilla), con medio píxel de transición.
      const dx = (u + 0.5) / out - 0.5;
      const dy = (v + 0.5) / out - 0.5;
      const edge = Math.min(1, Math.max(0, (1 - Math.hypot(dx, dy) * 2) * out * 0.5 + 0.5));
      if (edge <= 0) continue;
      const gx = (u + 0.5) / SMOOTH - 0.5;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      let sum = 0;
      let wsum = 0;
      for (const [x, y, w] of [
        [x0, y0, (1 - fx) * (1 - fy)],
        [x0 + 1, y0, fx * (1 - fy)],
        [x0, y0 + 1, (1 - fx) * fy],
        [x0 + 1, y0 + 1, fx * fy],
      ]) {
        const val = at(x, y);
        if (val >= 0 && w > 0) {
          sum += val * w;
          wsum += w;
        }
      }
      if (wsum === 0) continue; // sin celdas con dato alrededor
      const e = Math.round(Math.min(1, sum / wsum) * 255) * 3;
      const o = (v * out + u) * 4;
      px[o] = table[e];
      px[o + 1] = table[e + 1];
      px[o + 2] = table[e + 2];
      px[o + 3] = Math.round(edge * 255);
    }
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

// ---------------------------------------------------------------------------
// Textura 3D de la capa (DEC-050)
// ---------------------------------------------------------------------------

const TEX_W = 4096;
const TEX_H = 2048;
let basePromise = null;
const textures = new Map(); // url de la capa → Promise<canvas>

/** Mosaico LROC equirectangular oscurecido: base fuera del casquete calculado. */
function baseCanvas() {
  basePromise ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = TEX_W;
      canvas.height = TEX_H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, TEX_W, TEX_H);
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)"; // la capa calculada resalta sobre el mosaico
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("no se pudo cargar el mosaico LROC"));
    img.src = "./nasa/lroc_color_4k.jpg";
  });
  return basePromise;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("no se pudo leer la capa"));
    img.src = url;
  });
}

/**
 * Textura equirectangular (centrada en 0°, como la de moon3d.js) con la capa
 * calculada pintada en el casquete polar hasta HEAT_MIN_LAT: cada píxel toma
 * el píxel de la imagen suavizada que le corresponde por la misma proyección
 * polar (DEC-051). Se cachea por imagen de la capa.
 * @returns {Promise<HTMLCanvasElement>}
 */
export function heatLayerTexture(result) {
  if (!textures.has(result.url)) {
    textures.set(
      result.url,
      Promise.all([baseCanvas(), loadImage(result.url)]).then(([base, img]) => {
        const size = img.naturalWidth;
        const grid = document.createElement("canvas");
        grid.width = grid.height = size;
        const gctx = grid.getContext("2d", { willReadFrequently: true });
        gctx.drawImage(img, 0, 0);
        const cells = gctx.getImageData(0, 0, size, size).data;

        const canvas = document.createElement("canvas");
        canvas.width = TEX_W;
        canvas.height = TEX_H;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(base, 0, 0);
        const y0 = Math.floor(((90 - HEAT_MIN_LAT) / 180) * TEX_H);
        const cap = ctx.getImageData(0, y0, TEX_W, TEX_H - y0);
        const out = cap.data;
        const span = 90 + HEAT_MIN_LAT;
        for (let y = y0; y < TEX_H; y++) {
          const lat = 90 - ((y + 0.5) / TEX_H) * 180;
          const r = (90 + lat) / span;
          if (r > 1) continue;
          for (let x = 0; x < TEX_W; x++) {
            const lon = (((x + 0.5) / TEX_W) * 360 - 180) * (Math.PI / 180);
            const gx = Math.min(size - 1, Math.floor((0.5 + 0.5 * r * Math.sin(lon)) * size));
            const gy = Math.min(size - 1, Math.floor((0.5 - 0.5 * r * Math.cos(lon)) * size));
            const c = (gy * size + gx) * 4;
            const a = cells[c + 3] / 255; // borde suavizado del disco
            if (a === 0) continue; // fuera del disco calculado
            const o = ((y - y0) * TEX_W + x) * 4;
            out[o] = out[o] * (1 - a) + cells[c] * a;
            out[o + 1] = out[o + 1] * (1 - a) + cells[c + 1] * a;
            out[o + 2] = out[o + 2] * (1 - a) + cells[c + 2] * a;
          }
        }
        ctx.putImageData(cap, 0, y0);
        return canvas;
      }),
    );
  }
  return textures.get(result.url);
}
