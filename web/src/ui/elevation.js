/**
 * Mapas de elevación de MAPA DE CALOR (UI-11, DEC-026).
 *
 * Los PNG de web/public/nasa/ los genera web/scripts/build-lola-maps.mjs desde
 * el DEM LOLA del CGI Moon Kit: R = elevación cuantizada (8 bits entre minKm
 * y maxKm), G = sombreado del relieve, B = dato válido. Acá solo se colorean
 * (presentación): tinte hipsométrico × sombreado, con una paleta estándar o
 * una apta para daltonismo (cividis).
 */
import { LOLA_MAPS } from "../data/lola-maps.js";

/**
 * Paletas como paradas [posición 0..1, r, g, b].
 * - default: similar al mapa topográfico del Figma (violeta bajo → rojo alto).
 * - cvd: cividis (azul → gris → amarillo), legible con cualquier daltonismo.
 */
export const PALETTES = {
  default: [
    [0, 72, 18, 112],
    [0.18, 64, 72, 214],
    [0.36, 54, 170, 224],
    [0.52, 70, 190, 110],
    [0.68, 214, 214, 74],
    [0.84, 228, 128, 48],
    [1, 196, 52, 48],
  ],
  cvd: [
    [0, 0, 34, 78],
    [0.25, 64, 77, 108],
    [0.5, 124, 123, 120],
    [0.75, 188, 175, 111],
    [1, 254, 232, 56],
  ],
};

/** Tabla de 256 colores RGB de la paleta (también la usa el mapa de calor calculado, MAP-01). */
export function lut(palette) {
  const stops = PALETTES[palette] ?? PALETTES.default;
  const table = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 1;
    while (k < stops.length - 1 && stops[k][0] < t) k++;
    const [p0, r0, g0, b0] = stops[k - 1];
    const [p1, r1, g1, b1] = stops[k];
    const f = (t - p0) / (p1 - p0 || 1);
    table[i * 3] = r0 + (r1 - r0) * f;
    table[i * 3 + 1] = g0 + (g1 - g0) * f;
    table[i * 3 + 2] = b0 + (b1 - b0) * f;
  }
  return table;
}

/** Degradado CSS de la paleta (para la leyenda), de abajo (bajo) hacia arriba (alto). */
export function paletteGradient(palette) {
  const stops = PALETTES[palette] ?? PALETTES.default;
  return `linear-gradient(to top, ${stops.map(([p, r, g, b]) => `rgb(${r} ${g} ${b}) ${p * 100}%`).join(", ")})`;
}

const sources = new Map(); // kind → Promise<ImageData>
const results = new Map(); // `${kind}|${palette}` → Promise<HTMLCanvasElement>

function loadSource(kind) {
  if (!sources.has(kind)) {
    sources.set(
      kind,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
        };
        img.onerror = () => reject(new Error(`No se pudo cargar ${LOLA_MAPS[kind].file}`));
        img.src = LOLA_MAPS[kind].file;
      }),
    );
  }
  return sources.get(kind);
}

/**
 * Mapa coloreado ("polar" o "global") como canvas. Fuera de cobertura queda
 * transparente. Se cachea por tipo y paleta.
 */
export function elevationCanvas(kind, palette) {
  const key = `${kind}|${palette}`;
  if (!results.has(key)) {
    results.set(
      key,
      loadSource(kind).then((src) => {
        const table = lut(palette);
        const canvas = document.createElement("canvas");
        canvas.width = src.width;
        canvas.height = src.height;
        const ctx = canvas.getContext("2d");
        const out = ctx.createImageData(src.width, src.height);
        const a = src.data;
        const b = out.data;
        for (let i = 0; i < a.length; i += 4) {
          if (a[i + 2] < 128) continue; // sin dato
          const e = a[i] * 3;
          const light = 0.35 + 0.85 * (a[i + 1] / 255); // sombreado con algo de luz ambiente
          b[i] = Math.min(255, table[e] * light);
          b[i + 1] = Math.min(255, table[e + 1] * light);
          b[i + 2] = Math.min(255, table[e + 2] * light);
          b[i + 3] = 255;
        }
        ctx.putImageData(out, 0, 0);
        return canvas;
      }),
    );
  }
  return results.get(key);
}

const urls = new Map();

/** Igual que elevationCanvas, pero como URL (blob) para un <img>. */
export function elevationUrl(kind, palette) {
  const key = `${kind}|${palette}`;
  if (!urls.has(key)) {
    urls.set(
      key,
      elevationCanvas(kind, palette).then(
        (canvas) => new Promise((resolve) => canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), "image/png")),
      ),
    );
  }
  return urls.get(key);
}

export { LOLA_MAPS };
