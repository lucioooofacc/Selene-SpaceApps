/**
 * Sitios curados (DATA-01, DEC-019; reemplaza las coordenadas de DEC-006).
 *
 * Coordenadas: grados decimales en MOON_ME / DE421, latitud planetocéntrica,
 * longitud este positiva en [-180, 180), esfera de referencia de 1737,4 km
 * (ver `SITE_REFERENCE` en lib/coordinates.js).
 *
 * Los valores e identidades de los puntos los confirmó el equipo de astronomía
 * (Facu) el 2026-11-14 y se cotejaron con las fuentes oficiales de `urls`. No
 * se aplicó ninguna transformación de marco.
 *
 * Metadatos por sitio:
 * - `point.type`: "lander" (posición del módulo en superficie), "impact"
 *   (sitio de impacto) o "study-point" (punto de estudio de una región).
 * - `provenance.reference`: de dónde sale el valor, tal como lo publica la
 *   fuente. `urls`: fuentes oficiales verificadas del valor. `featureUrls`:
 *   ficha USGS del accidente con nombre (contexto; su centro NO es el punto).
 * - `provenance.sourceFrameVerified`: `true` solo si una fuente del valor
 *   declara el marco Mean Earth; `frameNote` explica el caso.
 * - `confidence`: "alta" | "media" | "baja" sobre la identidad y el valor.
 * - `precision.accuracyM`: exactitud declarada por la fuente, en metros (el
 *   valor más desfavorable si la da por eje o como rango); `null` = la fuente
 *   no la declara. `accuracyBasis` cita de dónde sale. No se deriva de la
 *   cantidad de decimales: la resolución de la cifra se obtiene aparte con
 *   `quantizationMeters()`.
 *
 * `relief` y `elevationKm` siguen siendo parámetros del horizonte SINTÉTICO
 * (DEC-005, lib/terrain.js); no son medidas de LOLA.
 */
import { assertLatitude, normalizeLongitude } from "../lib/coordinates.js";

const CONFIRMED = { confirmedBy: "Facu (astronomía)", confirmedOn: "2026-11-14" };

/** Fuentes oficiales verificadas el 2026-11-14 (DEC-019). */
export const SOURCE_URLS = Object.freeze({
  nssdca: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html",
  lunarSurfaceDataBook:
    "https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf?attachment=true",
  lcross: "https://ntrs.nasa.gov/api/citations/20140005563/downloads/20140005563.pdf",
  pgdaLra: "https://pgda.gsfc.nasa.gov/products/101",
  cnsaChange4: "https://www.cnsa.gov.cn/n6758823/n6758838/c6807583/content.html",
  usgsShackleton: "https://planetarynames.wr.usgs.gov/Feature/5450",
  usgsCabeus: "https://planetarynames.wr.usgs.gov/Feature/953",
  usgsMalapert: "https://planetarynames.wr.usgs.gov/Feature/3603",
});

const LSDB_ACCURACY = {
  accuracyM: 10,
  accuracyBasis:
    "Lunar Surface Data Book Rev A, A2.1: los centros de los polígonos originales son exactos a 5–10 m (se toma 10 m).",
};

const LSDB_FRAME =
  "La tabla A2-2 no declara el marco; sus coordenadas se generaron de DEM LOLA (PGDA products/81), que usan Mean Earth/DE421. Marco inferido, no declarado.";

const NSSDCA_FRAME = "NSSDCA: coordenadas en el marco DE421 mean Earth/polar rotation axis (Williams et al., 2008).";

const NSSDCA_NO_ACCURACY = {
  accuracyM: null,
  accuracyBasis:
    "NSSDCA no da exactitud por sitio: indica que la precisión del conocimiento se refleja en los decimales publicados (0,001° ≈ 30 m). No se convierte en accuracyM.",
};

/** Normaliza y valida un sitio al cargar el catálogo. */
function defineSite(site) {
  return { ...site, lat: assertLatitude(site.lat), lon: normalizeLongitude(site.lon) };
}

export const SITES = [
  {
    id: "shackleton",
    name: "Shackleton",
    lat: -89.7668,
    lon: -171.87,
    relief: 0.7,
    elevationKm: 1,
    agency: "NASA · Artemis",
    point: { name: "Shackleton Rim R04", type: "study-point" },
    provenance: {
      ...CONFIRMED,
      reference:
        "NASA Lunar Surface Data Book Rev A (ACD-50044, 2023), tabla A2-2: \"R04 or Site04, Shackleton Rim\" -89.7668, -171.87. Terminología según Mazarico et al. (2011).",
      sourceFrameVerified: false,
      frameNote: LSDB_FRAME,
      urls: [SOURCE_URLS.lunarSurfaceDataBook],
      featureUrls: [SOURCE_URLS.usgsShackleton],
    },
    confidence: {
      level: "alta",
      reason: "Valor idéntico al de la tabla oficial de NASA, con exactitud declarada; el marco es inferido.",
    },
    precision: { ...LSDB_ACCURACY },
  },
  {
    id: "malapert",
    name: "Malapert",
    lat: -85.9948,
    lon: -0.23578,
    relief: 1.2,
    elevationKm: 0.6,
    agency: "NASA · Artemis",
    point: { name: "Malapert Massif R23", type: "study-point" },
    provenance: {
      ...CONFIRMED,
      reference:
        "NASA Lunar Surface Data Book Rev A (ACD-50044, 2023), tabla A2-2: \"R23 or Site23, Malapert Massif\" -85.9948, -0.23578. Terminología según Mazarico et al. (2011).",
      sourceFrameVerified: false,
      frameNote: LSDB_FRAME,
      urls: [SOURCE_URLS.lunarSurfaceDataBook],
      featureUrls: [SOURCE_URLS.usgsMalapert],
    },
    confidence: {
      level: "alta",
      reason: "Valor idéntico al de la tabla oficial de NASA, con exactitud declarada; el marco es inferido.",
    },
    precision: { ...LSDB_ACCURACY },
  },
  {
    id: "cabeus",
    name: "Cabeus",
    lat: -84.6796,
    lon: -48.7093,
    relief: 5,
    agency: "NASA · LCROSS",
    point: { name: "LCROSS Centaur impact site", type: "impact" },
    provenance: {
      ...CONFIRMED,
      reference:
        "Marshall et al. (2012), \"Locating the LCROSS Impact Craters\", Space Sci. Rev. 167:71–92: promedio ponderado del impacto del Centaur -84.6796, -48.7093. NSSDCA lista el mismo valor (-84.6796, 311.2907).",
      sourceFrameVerified: true,
      frameNote:
        "Marshall et al.: Mean Earth, selenocéntricas, radio medio 1737,4 km (no nombra la efeméride). NSSDCA publica el mismo valor en DE421 mean Earth.",
      urls: [SOURCE_URLS.lcross, SOURCE_URLS.nssdca],
      featureUrls: [SOURCE_URLS.usgsCabeus],
    },
    confidence: {
      level: "alta",
      reason: "Ubicación publicada con incertidumbre 1σ y coincidente en dos fuentes oficiales; cráter en sombra permanente, no observable directamente.",
    },
    precision: {
      accuracyM: 115,
      accuracyBasis: "Marshall et al. (2012): incertidumbre 1σ de 115 m en latitud y 44 m en longitud (se toma 115 m).",
    },
  },
  {
    id: "im1",
    name: "IM-1 Odysseus",
    lat: -80.1277,
    lon: 1.4357,
    relief: 0.7,
    agency: "Intuitive Machines · CLPS",
    point: { name: "IM-1 Odysseus lander", type: "lander" },
    provenance: {
      ...CONFIRMED,
      reference:
        "NASA PGDA, NASA GSFC Miniature Laser Retroreflector Arrays (Cremons, 2025): LRA de IM-1 en 80.1277°S, 1.4357°E (despliegue fuera de lo nominal; no verificado con LOLA). NSSDCA lista -80.13, 1.44 (imagen LROC).",
      sourceFrameVerified: false,
      frameNote:
        "PGDA no declara el marco. NSSDCA (DE421 mean Earth) da un valor coherente pero con 2 decimales.",
      urls: [SOURCE_URLS.pgdaLra, SOURCE_URLS.nssdca],
      featureUrls: [],
    },
    confidence: {
      level: "alta",
      reason: "Posición del retrorreflector montado en el módulo, coherente con NSSDCA; marco del valor de PGDA no declarado.",
    },
    precision: { accuracyM: null, accuracyBasis: "PGDA no declara la exactitud de la posición." },
  },
  {
    id: "chandrayaan3",
    name: "Chandrayaan-3",
    lat: -69.3735,
    lon: 32.3199,
    relief: 1.2,
    agency: "ISRO · India",
    point: { name: "Chandrayaan-3 Vikram lander", type: "lander" },
    provenance: {
      ...CONFIRMED,
      reference:
        "NASA PGDA, NASA GSFC Miniature Laser Retroreflector Arrays (Cremons, 2025): LRA de Chandrayaan-3/Vikram en 69.3735°S, 32.3199°E (despliegue verificado con LOLA). NSSDCA lista -69.3741, 32.32 (≈ 18 m de diferencia).",
      sourceFrameVerified: false,
      frameNote:
        "PGDA no declara el marco. NSSDCA (DE421 mean Earth) da un valor a ≈ 18 m.",
      urls: [SOURCE_URLS.pgdaLra, SOURCE_URLS.nssdca],
      featureUrls: [],
    },
    confidence: {
      level: "alta",
      reason: "Retrorreflector del módulo verificado con mediciones de LOLA; marco del valor de PGDA no declarado.",
    },
    precision: { accuracyM: null, accuracyBasis: "PGDA no declara la exactitud de la posición." },
  },
  {
    id: "change4",
    name: "Chang'e 4",
    lat: -45.4561,
    lon: 177.5885,
    relief: 1,
    agency: "CNSA · China",
    point: { name: "Chang'e 4 lander", type: "lander" },
    provenance: {
      ...CONFIRMED,
      reference:
        "NSSDCA, tabla de impactos y naves en la Luna: Chang'e 4, -45.4561, 177.5885 (imagen LROC, nota d). CNSA (2019-09-26) informa 177.5991°E, 45.4446°S, de la Nature Communications \"Descent trajectory reconstruction and landing site positioning of Chang'E-4 on the lunar farside\", con datos de Chang'e-2.",
      sourceFrameVerified: true,
      frameNote:
        "El valor usado es el de NSSDCA (DE421 mean Earth). El de CNSA está referido a la cartografía de Chang'e-2, no declara MOON_ME y difiere ≈ 415 m: no se mezclan.",
      urls: [SOURCE_URLS.nssdca, SOURCE_URLS.cnsaChange4],
      featureUrls: [],
    },
    confidence: {
      level: "alta",
      reason: "Módulo observado por LROC y listado por NSSDCA en el marco común; la cifra de CNSA está en otra referencia.",
    },
    precision: { ...NSSDCA_NO_ACCURACY },
  },
  {
    id: "apollo11",
    name: "Apollo 11",
    lat: 0.67416,
    lon: 23.47314,
    relief: 0.5,
    agency: "NASA · Apollo",
    point: { name: "Apollo 11 Lunar Module", type: "lander" },
    provenance: {
      ...CONFIRMED,
      reference:
        "NSSDCA, tabla de impactos y naves en la Luna: \"Apollo 11 LM descent stage\" 0.67416 N, 23.47314 E (imagen LROC, nota d).",
      sourceFrameVerified: true,
      frameNote: NSSDCA_FRAME,
      urls: [SOURCE_URLS.nssdca],
      featureUrls: [],
    },
    confidence: {
      level: "alta",
      reason: "Etapa de descenso del LM observada por LROC y listada por NSSDCA en DE421 mean Earth.",
    },
    precision: { ...NSSDCA_NO_ACCURACY },
  },
].map(defineSite);

/** Tipos de punto admitidos en `point.type`. */
export const POINT_TYPES = Object.freeze(["lander", "impact", "study-point"]);

/** Niveles admitidos en `confidence.level`. */
export const CONFIDENCE_LEVELS = Object.freeze(["alta", "media", "baja"]);

export const CUSTOM_SITE_ID = "custom";

export function findSite(id) {
  return SITES.find((site) => site.id === id) ?? null;
}
