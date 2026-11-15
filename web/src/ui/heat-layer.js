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
import { computeGlobalHeatmap, computePolarHeatmap, limitsVersion, realDataVersion } from "../lib/analysis.js";
import { lut } from "./elevation.js";
import { loadedData, persist, persisted, runInWorker } from "./compute.js";

/** Capas del selector. "elevation" es el mapa LOLA de siempre (DEC-026). */
export const HEAT_LAYERS = Object.freeze(["elevation", "sun", "earth", "both", "viability", "night"]);

/** Borde del mapa calculado (latitud mínima de la grilla del motor). */
export const HEAT_MIN_LAT = -80;
export const HEAT_SIZE = 96;

const cache = new Map(); // clave → { url, source, layer }
const MAX_CACHE = 24;

const keyFor = (layer, startMs, windowDays, palette) => `${layer}|${startMs}|${windowDays}|${palette}|${realDataVersion()}`;
/** Clave persistente: solo tiene sentido con todos los datos reales del mapa cargados. */
const persistKey = (layer, startMs, windowDays, palette) => {
  const data = loadedData();
  // heat4: suavizada (DEC-051), con el resto de la Luna (MAP-02, DEC-065) y viabilidad por requisitos (DEC-071) con sus supuestos (DEC-083).
  return data.ephemerides && data.heatAtlas && data.globalHeatAtlas ? `heat4|${layer}|${startMs}|${windowDays}|${palette}|${limitsVersion()}` : null;
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
  if (!stored) return null;
  const g = stored.globalPacked && unpackGlobal(stored.globalPacked);
  return remember(key, { ...stored, layer, globalUrl: g ? colorizeGlobal(g.values, g.cols, g.rows, palette) : null });
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

/** Píxeles por celda de la imagen global suavizada: 180 × 90 celdas → 720 × 360 px. */
const SMOOTH_GLOBAL = 4;

/**
 * Colorea la grilla global equirectangular (MAP-02, DEC-065) como PNG, con la
 * misma interpolación bilineal de VALORES que la polar (DEC-051). La longitud
 * es circular (la columna de −180° es vecina de la de +180°); en latitud, las
 * filas extremas se repiten hasta el polo.
 */
function colorizeGlobal(values, cols, rows, palette) {
  const table = lut(palette);
  const w = cols * SMOOTH_GLOBAL;
  const h = rows * SMOOTH_GLOBAL;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const at = (x, y) => values[Math.min(rows - 1, Math.max(0, y)) * cols + (((x % cols) + cols) % cols)];
  for (let v = 0; v < h; v++) {
    const gy = (v + 0.5) / SMOOTH_GLOBAL - 0.5;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let u = 0; u < w; u++) {
      const gx = (u + 0.5) / SMOOTH_GLOBAL - 0.5;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      let sum = 0;
      let wsum = 0;
      for (const [x, y, wt] of [
        [x0, y0, (1 - fx) * (1 - fy)],
        [x0 + 1, y0, fx * (1 - fy)],
        [x0, y0 + 1, (1 - fx) * fy],
        [x0 + 1, y0 + 1, fx * fy],
      ]) {
        const val = at(x, y);
        if (val >= 0 && wt > 0) {
          sum += val * wt;
          wsum += wt;
        }
      }
      if (wsum === 0) continue;
      const e = Math.round(Math.min(1, sum / wsum) * 255) * 3;
      const o = (v * w + u) * 4;
      px[o] = table[e];
      px[o + 1] = table[e + 1];
      px[o + 2] = table[e + 2];
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Valores globales cuantizados a un byte (0–250; 255 = sin dato) en base64,
 * para la caché persistente: ~22 KB en lugar de una imagen de cientos de KB.
 */
function packGlobal({ values, cols, rows }) {
  const bytes = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) bytes[i] = values[i] < 0 ? 255 : Math.round(Math.min(1, values[i]) * 250);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { cols, rows, q: btoa(bin) };
}

function unpackGlobal({ cols, rows, q }) {
  const bin = atob(q);
  const values = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    const b = bin.charCodeAt(i);
    values[i] = b === 255 ? -1 : b / 250;
  }
  return { cols, rows, values };
}

/**
 * ¿Todas las celdas con dato quedaron en el nivel más bajo? En la capa de
 * viabilidad eso quiere decir que todas tienen noches de más de 24 h (la
 * comunicación nunca queda en "no cumple", DEC-071): el mapa lo explica con un
 * cartel (DEC-073).
 */
function allLowest(...grids) {
  let any = false;
  for (const values of grids) {
    if (!values) continue;
    for (const v of values) {
      if (v < 0) continue;
      if (v > 0) return false;
      any = true;
    }
  }
  return any;
}

/** Resultado de la capa listo para mostrar: imagen polar y, si hay, la global. */
function layerResult(map, global, palette, layer) {
  const packed = global ? packGlobal(global) : null;
  // La imagen global sale de los valores cuantizados: igual en memoria que desde la caché persistente.
  const g = packed && unpackGlobal(packed);
  return {
    url: colorize(map.values, map.size, palette),
    source: map.source,
    layer,
    globalUrl: g ? colorizeGlobal(g.values, g.cols, g.rows, palette) : null,
    globalSource: global?.source ?? null,
    globalPacked: packed,
    allLow: layer === "viability" && allLowest(map.values, global?.values),
  };
}

const args = (layer, startMs, windowDays) => ({ startMs, windowDays, mode: layer, size: HEAT_SIZE, minLat: HEAT_MIN_LAT });

/** Cálculo en el hilo principal (0,2–1 s): respaldo si no hay worker. */
export function computeHeatLayer(layer, startMs, windowDays, palette) {
  const key = keyFor(layer, startMs, windowDays, palette);
  if (cache.has(key)) return cache.get(key);
  const a = args(layer, startMs, windowDays);
  return remember(key, layerResult(computePolarHeatmap(a), computeGlobalHeatmap(a), palette, layer));
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
    result = remember(key, layerResult(map, map.global, palette, layer));
  } catch (error) {
    console.warn(`Worker del mapa no disponible (cálculo en la página): ${error.message}`);
    return computeHeatLayer(layer, startMs, windowDays, palette);
  }
  if (pk && result.source?.kind === "real" && result.globalUrl) {
    persist(pk, { url: result.url, source: result.source, globalPacked: result.globalPacked, globalSource: result.globalSource, allLow: result.allLow });
  }
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
 * Textura equirectangular (centrada en 0°, como la de moon3d.js): si hay capa
 * global (MAP-02, DEC-065), cubre toda la Luna; encima, la capa
 * calculada pintada en el casquete polar hasta HEAT_MIN_LAT: cada píxel toma
 * el píxel de la imagen suavizada que le corresponde por la misma proyección
 * polar (DEC-051). Se cachea por imagen de la capa.
 * @returns {Promise<HTMLCanvasElement>}
 */
export function heatLayerTexture(result) {
  const tkey = `${result.url}|${result.globalUrl ?? ""}`;
  if (!textures.has(tkey)) {
    textures.set(
      tkey,
      Promise.all([baseCanvas(), loadImage(result.url), result.globalUrl ? loadImage(result.globalUrl) : null]).then(([base, img, globalImg]) => {
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
        // Resto de la Luna: celdas de 2° del atlas global, debajo del casquete detallado.
        if (globalImg) ctx.drawImage(globalImg, 0, 0, TEX_W, TEX_H);
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
  return textures.get(tkey);
}
