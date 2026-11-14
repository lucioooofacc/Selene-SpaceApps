/**
 * Geometría y lectura de recortes del DEM LOLA polar sur (TERRAIN-01, DEC-021).
 *
 * Módulo puro: sin DOM, red ni archivos. Implementa la proyección
 * estereográfica polar esférica de `catalog/dsmap_polar.cat` (LOLA GDR) para
 * `LDEM_60S_240M_FLOAT` / `LDEC_60S_240M` y la interpretación de los conteos.
 *
 * Convenciones:
 * - Latitud planetocéntrica y longitud este positiva en grados (MOON_ME/DE421).
 * - Píxeles con índice base 0: `line` (fila, 0 arriba) y `sample` (columna,
 *   0 a la izquierda). El centro del píxel (l, s) está en coordenadas enteras.
 * - Polo sur: longitud 0° hacia arriba, 90° E hacia la derecha.
 *   X = (s − offset)·escala, Y = −(l − offset)·escala, lon = atan2(X, Y),
 *   lat = −90° + 2·atan(ρ / 2R). La ecuación directa se obtiene invirtiendo esa.
 * - Elevación: el DEM está en km sobre la esfera de 1737,4 km; acá se expresa
 *   en metros. `count = 0` significa que el píxel no tiene mediciones LOLA
 *   directas: el valor del DEM existe pero es interpolado (baja confianza).
 */
import { LOLA_PRODUCT } from "../data/terrain/lola-ldem-60s-240m.js";
import { normalizeLongitude } from "./coordinates.js";

const DEG = Math.PI / 180;

/** Grilla del producto real. Los tests pueden pasar otra con la misma forma. */
export const LOLA_GRID = Object.freeze({
  lines: LOLA_PRODUCT.grid.lines,
  samples: LOLA_PRODUCT.grid.samples,
  lineOffset: LOLA_PRODUCT.grid.lineProjectionOffset,
  sampleOffset: LOLA_PRODUCT.grid.sampleProjectionOffset,
  scaleM: LOLA_PRODUCT.grid.mapScaleM,
  radiusM: LOLA_PRODUCT.projection.sphereRadiusM,
  maxLatitude: LOLA_PRODUCT.projection.maximumLatitude,
});

/** Lat/lon (grados) → posición fraccionaria de píxel `{ line, sample }`. */
export function latLonToPixel(lat, lon, grid = LOLA_GRID) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new RangeError(`latitud inválida: ${lat}`);
  if (!Number.isFinite(lon)) throw new RangeError(`longitud inválida: ${lon}`);
  if (lat > 0) throw new RangeError(`el producto es del polo sur; latitud ${lat} > 0`);
  const rho = 2 * grid.radiusM * Math.tan(((90 + lat) * DEG) / 2);
  const x = rho * Math.sin(lon * DEG);
  const y = rho * Math.cos(lon * DEG);
  return { line: grid.lineOffset - y / grid.scaleM, sample: grid.sampleOffset + x / grid.scaleM };
}

/** Píxel (puede ser fraccionario) → `{ lat, lon }` con lon en [-180, 180). */
export function pixelToLatLon(line, sample, grid = LOLA_GRID) {
  const x = (sample - grid.sampleOffset) * grid.scaleM;
  const y = -(line - grid.lineOffset) * grid.scaleM;
  const rho = Math.hypot(x, y);
  const lat = -90 + (2 * Math.atan(rho / (2 * grid.radiusM))) / DEG;
  const lon = rho === 0 ? 0 : normalizeLongitude(Math.atan2(x, y) / DEG);
  return { lat, lon };
}

/** Píxel más cercano `{ line, sample }` (enteros) o `null` si cae fuera de la grilla. */
export function nearestPixel(lat, lon, grid = LOLA_GRID) {
  const { line, sample } = latLonToPixel(lat, lon, grid);
  const l = Math.round(line);
  const s = Math.round(sample);
  if (l < 0 || s < 0 || l >= grid.lines || s >= grid.samples) return null;
  return { line: l, sample: s };
}

/**
 * Cobertura nominal del producto: latitud en [-90°, -60°] y píxel dentro de la
 * grilla. Las esquinas del raster llegan más al norte, pero fuera de la
 * cobertura nominal no se usan.
 */
export function isCovered(lat, lon, grid = LOLA_GRID) {
  if (!Number.isFinite(lat) || lat > grid.maxLatitude || lat < -90) return false;
  return nearestPixel(lat, lon, grid) !== null;
}

/** Interpreta el conteo LDEC de un píxel. */
export function measurementFromCount(count) {
  if (!Number.isInteger(count) || count < 0) throw new RangeError(`conteo LDEC inválido: ${count}`);
  return count === 0
    ? { count, direct: false, confidence: "baja" }
    : { count, direct: true, confidence: "medida" };
}

/**
 * Valida un recorte producido por `prepare-lola.mjs`. Devuelve la lista de
 * errores (vacía si es válido). No corrige valores.
 */
export function validateTile(tile) {
  const errors = [];
  const w = tile?.window;
  if (!w || ![w.line0, w.sample0, w.lines, w.samples].every(Number.isInteger)) {
    errors.push("window debe tener line0, sample0, lines y samples enteros");
    return errors;
  }
  if (w.lines <= 0 || w.samples <= 0) errors.push("window vacía");
  const n = w.lines * w.samples;
  if (!Array.isArray(tile.heightM) || tile.heightM.length !== n) errors.push(`heightM debe tener ${n} valores`);
  else if (!tile.heightM.every(Number.isFinite)) errors.push("heightM tiene valores no finitos");
  if (!Array.isArray(tile.counts) || tile.counts.length !== n) errors.push(`counts debe tener ${n} valores`);
  else if (!tile.counts.every((c) => Number.isInteger(c) && c >= 0)) errors.push("counts debe ser enteros ≥ 0");
  return errors;
}

/**
 * Valor del píxel más cercano a (lat, lon) dentro de un recorte:
 * `{ heightM, count, direct, confidence, line, sample }` o `null` si el punto
 * cae fuera del recorte.
 */
export function tileValueAt(tile, lat, lon, grid = LOLA_GRID) {
  const pixel = nearestPixel(lat, lon, grid);
  if (!pixel) return null;
  const { line0, sample0, lines, samples } = tile.window;
  const r = pixel.line - line0;
  const c = pixel.sample - sample0;
  if (r < 0 || c < 0 || r >= lines || c >= samples) return null;
  const i = r * samples + c;
  return { heightM: tile.heightM[i], ...measurementFromCount(tile.counts[i]), ...pixel };
}
