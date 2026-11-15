/**
 * Horizonte local SINTÉTICO (v1).
 *
 * En la Luna no hay atmósfera, así que el horizonte lo define solo el relieve:
 * crestas, bordes de cráteres y la curvatura. Este módulo genera un perfil de
 * horizonte creíble (elevación del horizonte según el azimut) a partir de un
 * "relieve" característico del sitio y de un ruido determinista.
 *
 * NO es topografía real. El reemplazo previsto es calcular el horizonte con
 * mapas de elevación LOLA (Lunar Orbiter Laser Altimeter). Ver DEC-005.
 */

/** Hash determinista: el mismo sitio siempre produce el mismo horizonte. */
function hash(a, b) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Ruido suave en 2D (value noise) usado para variar el relieve de sitios personalizados. */
function smoothNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Relieve característico (grados) para un punto sin datos curados.
 * Cerca del polo sur hay más cráteres profundos, así que el relieve crece.
 */
export function estimateRelief(lat, lon) {
  const polar = Math.max(0, (-lat - 60) / 30); // 0 lejos del polo, 1 en el polo
  const x = (90 + lat) * 0.6 * Math.cos((lon * Math.PI) / 180);
  const y = (90 + lat) * 0.6 * Math.sin((lon * Math.PI) / 180);
  const n = smoothNoise(x + 10, y + 10);
  return 0.6 + polar * 1.5 + n * (1.5 + polar * 4.5);
}

const MOON_RADIUS_KM = 1737.4;

/**
 * Depresión del horizonte (grados) por estar elevado sobre el terreno vecino.
 * Un punto alto, como el borde de Shackleton, "ve" por debajo de 0° y por eso
 * recibe luz casi todo el tiempo aunque el Sol esté apenas sobre el horizonte.
 * Desde DEC-063 `createHorizon()` no la aplica (ningún sitio trae altura
 * sintética); queda como utilidad geométrica para las pruebas del horizonte LOLA.
 */
export function horizonDip(elevationKm = 0) {
  if (elevationKm <= 0) return 0;
  return (Math.acos(MOON_RADIUS_KM / (MOON_RADIUS_KM + elevationKm)) * 180) / Math.PI;
}

/**
 * Crea una función horizon(azimut) → elevación del horizonte en grados.
 * Respaldo para puntos sin horizonte LOLA (DEC-005): el relieve sale siempre
 * de `estimateRelief()`; los sitios no aportan parámetros propios (DEC-063).
 * @param {{lat:number, lon:number}} site
 */
export function createHorizon(site, { precompute = true } = {}) {
  const relief = estimateRelief(site.lat, site.lon);
  // Posición en un plano centrado en el polo: puntos vecinos reciben formas de
  // horizonte parecidas, así el mapa de calor queda continuo y no "ruidoso".
  const r = (90 + site.lat) * 0.8;
  const px = r * Math.cos((site.lon * Math.PI) / 180);
  const py = r * Math.sin((site.lon * Math.PI) / 180);

  const waves = [1, 2, 3, 5, 8, 13].map((k, i) => ({
    k,
    amp: (0.2 + smoothNoise(px + 13 * i, py + 3)) / k ** 0.6,
    phase: smoothNoise(px + 31 * i + 5, py + 17) * Math.PI * 4,
  }));
  const ampTotal = waves.reduce((sum, w) => sum + w.amp, 0);

  const evaluate = (azimuth) => {
    const rad = (azimuth * Math.PI) / 180;
    let s = 0;
    for (const w of waves) s += w.amp * Math.sin(w.k * rad + w.phase);
    const normalized = 0.5 + 0.5 * (s / ampTotal); // 0..1
    return Math.max(0, relief * normalized * 1.6 - 0.2);
  };

  // Para el mapa de calor (miles de puntos, pocas consultas) no conviene la tabla.
  if (!precompute) return evaluate;

  // Tabla precalculada cada 1° para que sea rápido durante la animación.
  const table = new Float32Array(360);
  for (let az = 0; az < 360; az++) table[az] = evaluate(az);

  return function horizon(azimuth) {
    const a = ((azimuth % 360) + 360) % 360;
    const i = Math.floor(a);
    const f = a - i;
    return table[i] * (1 - f) + table[(i + 1) % 360] * f;
  };
}
