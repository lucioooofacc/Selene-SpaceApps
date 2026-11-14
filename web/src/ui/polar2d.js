/**
 * Vista 2D del polo sur generada desde el mosaico LROC equirectangular
 * (UI-07, DEC-021). Se reproyecta una sola vez en el navegador a una
 * proyección azimutal equidistante centrada en el polo sur, con 0° de
 * longitud arriba y borde en `edgeLat`: la misma que usa map.js para ubicar
 * los marcadores, así que la imagen y los sitios coinciden por construcción.
 * Es transformación de imagen para mostrar, no un cálculo científico.
 */
const cache = new Map();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
    img.src = url;
  });
}

/**
 * @param {string} url      textura equirectangular (lon −180..180 de izquierda a derecha, lat 90..−90).
 * @param {number} edgeLat  latitud del borde del disco (p. ej. −60).
 * @param {number} size     lado de la imagen de salida en píxeles.
 * @returns {Promise<string>} URL (blob) de un PNG con el disco polar.
 */
export function polarImage(url, edgeLat, size = 1024) {
  const key = `${url}|${edgeLat}|${size}`;
  if (!cache.has(key)) cache.set(key, build(url, edgeLat, size));
  return cache.get(key);
}

async function build(url, edgeLat, size) {
  const img = await loadImage(url);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  // Solo hace falta la franja de latitudes entre edgeLat y −90.
  const rowFrom = Math.floor(((90 - edgeLat) / 180) * sh);
  const rows = sh - rowFrom;
  const src = document.createElement("canvas");
  src.width = sw;
  src.height = rows;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(img, 0, rowFrom, sw, rows, 0, 0, sw, rows);
  const from = sctx.getImageData(0, 0, sw, rows).data;

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d");
  const image = octx.createImageData(size, size);
  const to = image.data;
  const span = 90 + edgeLat;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      if (r > 1) continue; // fuera del disco: transparente
      const lat = -90 + r * span;
      const lon = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const sx = Math.min(sw - 1, Math.floor(((lon + 180) / 360) * sw));
      const sy = Math.min(rows - 1, Math.max(0, Math.floor(((90 - lat) / 180) * sh) - rowFrom));
      const i = (sy * sw + sx) * 4;
      const o = (y * size + x) * 4;
      to[o] = from[i];
      to[o + 1] = from[i + 1];
      to[o + 2] = from[i + 2];
      to[o + 3] = 255;
    }
  }
  octx.putImageData(image, 0, 0);
  const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
  return URL.createObjectURL(blob);
}
