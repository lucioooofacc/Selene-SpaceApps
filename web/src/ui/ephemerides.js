/**
 * Carga en segundo plano las efemérides JPL Horizons de los sitios curados
 * (CORE-01 parte B, DEC-033). Los archivos los genera
 * `scripts/build-ephemerides.mjs` en `public/data/ephemerides/`. Mientras no
 * llegan, el cálculo usa el modelo aproximado; cuando llegan, se registran en
 * `lib/ephemeris.js` (sube `ephemerisVersion()`) y quien llamó vuelve a dibujar.
 * Si un archivo falla, ese sitio sigue con el modelo aproximado.
 */
import { setDataStatus } from "./data-status.js";
import { loadEphemerides } from "../lib/ephemeris.js";
import { needsPolarDem, needsRegionalAtlas } from "../lib/analysis.js";
import { decodePolarDem, registerPolarDem } from "../lib/polar-dem.js";
import { decodeGlobalHeatAtlas, decodeHeatAtlas, registerGlobalHeatAtlas, registerHeatAtlas } from "../lib/heat-map.js";
import { SITES } from "../data/sites.js";

let loading = null;

async function fetchJson(id) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/ephemerides/${id}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Carga (una sola vez por página) las series de todos los sitios curados. */
export function loadSiteEphemerides() {
  if (!loading) setDataStatus("ephemerides", { state: "loading" });
  loading ??= loadEphemerides(
    SITES.map((s) => s.id),
    fetchJson,
  ).then((result) => {
    for (const f of result.failed) console.warn(`Efemérides de ${f.id} no disponibles (modelo aproximado): ${f.error}`);
    const state = !result.failed.length ? "ready" : result.loaded.length ? "partial" : "error";
    setDataStatus("ephemerides", { state, loaded: result.loaded, failed: result.failed });
    return result;
  });
  return loading;
}

// ---------------------------------------------------------------------------
// DEM LOLA polar reducido para puntos propios (CORE-03, DEC-034)
// ---------------------------------------------------------------------------

const POLAR_LEVELS = ["lola-polar-480m", "lola-polar-960m"];
let polarLoading = null;

async function fetchPolarLevel(name) {
  const base = `${import.meta.env.BASE_URL}data/terrain/${name}`;
  const [metaRes, binRes] = await Promise.all([fetch(`${base}.json`), fetch(`${base}.bin`)]);
  if (!metaRes.ok || !binRes.ok) throw new Error(`HTTP ${metaRes.status}/${binRes.status}`);
  return decodePolarDem(await binRes.arrayBuffer(), await metaRes.json());
}

/**
 * Baja los datos de relieve que necesiten los sitios para su horizonte (una
 * sola vez por página) y llama a `onLoaded` al registrar cada uno: el atlas
 * global para cualquier punto sin horizonte curado (DEC-068) y el DEM polar
 * reducido (~4,4 MB comprimido) para los que están al sur de −75°. Si fallan,
 * esos puntos siguen con el horizonte sintético.
 */
export function ensurePolarTerrain(sites, onLoaded) {
  // Puntos sin horizonte curado: atlas global de horizontes LOLA (DEC-068), ~2,3 MiB, una vez.
  if (sites.some(needsRegionalAtlas)) ensureGlobalHeatAtlas(onLoaded);
  if (polarLoading || !sites.some(needsPolarDem)) return;
  loadPolarTerrain(onLoaded);
}

/**
 * Baja el DEM polar reducido aunque ningún sitio lo necesite para el
 * horizonte (el informe web lo usa para el terreno, DEC-059). Una sola vez.
 */
export function loadPolarTerrain(onLoaded) {
  if (polarLoading) return;
  setDataStatus("polarDem", { state: "loading" });
  polarLoading = Promise.all(POLAR_LEVELS.map(fetchPolarLevel)).then(
    (levels) => {
      registerPolarDem(levels);
      setDataStatus("polarDem", { state: "ready" });
      onLoaded?.();
    },
    (error) => {
      setDataStatus("polarDem", { state: "error", error: error.message });
      console.warn(`DEM LOLA reducido no disponible (horizonte sintético en puntos propios): ${error.message}`);
    },
  );
}

// ---------------------------------------------------------------------------
// Atlas del mapa de calor (MAP-01, DEC-038)
// ---------------------------------------------------------------------------

let atlasLoading = null;

/**
 * Baja (una vez por página) el atlas de horizontes del mapa de calor
 * (~1,3 MiB) y lo registra; después `computePolarHeatmap({ size: 96,
 * minLat: -80, ... })` devuelve el mapa real (`source.kind === "real"`). Hasta
 * entonces, o si falla, devuelve el aproximado. Devuelve la promesa de carga.
 */
export function ensureHeatAtlas(onLoaded) {
  const first = !atlasLoading;
  ensureGlobalHeatAtlas(onLoaded);
  atlasLoading ??= (async () => {
    const base = `${import.meta.env.BASE_URL}data/terrain/heat-atlas-96`;
    const [metaRes, binRes] = await Promise.all([fetch(`${base}.json`), fetch(`${base}.bin`)]);
    if (!metaRes.ok || !binRes.ok) throw new Error(`HTTP ${metaRes.status}/${binRes.status}`);
    registerHeatAtlas(decodeHeatAtlas(await binRes.arrayBuffer(), await metaRes.json()));
  })().then(
    () => {
      setDataStatus("heatAtlas", { state: "ready" });
      return true;
    },
    (error) => {
      setDataStatus("heatAtlas", { state: "error", error: error.message });
      console.warn(`Atlas del mapa de calor no disponible (mapa aproximado): ${error.message}`);
      return false;
    },
  );
  // Después de guardar la promesa: quien escucha el estado puede volver a llamar acá.
  if (first) setDataStatus("heatAtlas", { state: "loading" });
  return onLoaded ? atlasLoading.then((ok) => ok && onLoaded()) : atlasLoading;
}

let globalAtlasLoading = null;
let globalAtlasDone = false;
const globalAtlasWaiters = new Set();

/**
 * Baja (una vez por página) el atlas de horizontes de toda la Luna (MAP-02,
 * DEC-065, ~2,3 MiB) y lo registra; después `computeGlobalHeatmap()` devuelve
 * el mapa global y los puntos sin horizonte curado usan el horizonte LOLA
 * regional (DEC-068). Si falla, el mapa sigue solo con el casquete polar y
 * esos puntos, con el horizonte sintético.
 */
function ensureGlobalHeatAtlas(onLoaded) {
  // Quien llegue mientras carga también recibe el aviso (una sola vez); después de cargar, nadie.
  if (onLoaded && !globalAtlasDone) globalAtlasWaiters.add(onLoaded);
  if (globalAtlasLoading) return globalAtlasLoading;
  globalAtlasLoading = (async () => {
    const base = `${import.meta.env.BASE_URL}data/terrain/${GLOBAL_HEAT_ATLAS_NAME}`;
    const [metaRes, binRes] = await Promise.all([fetch(`${base}.json`), fetch(`${base}.bin`)]);
    if (!metaRes.ok || !binRes.ok) throw new Error(`HTTP ${metaRes.status}/${binRes.status}`);
    registerGlobalHeatAtlas(decodeGlobalHeatAtlas(await binRes.arrayBuffer(), await metaRes.json()));
  })().then(
    () => {
      globalAtlasDone = true;
      setDataStatus("globalHeatAtlas", { state: "ready" });
      for (const fn of globalAtlasWaiters) fn();
      globalAtlasWaiters.clear();
      return true;
    },
    (error) => {
      globalAtlasDone = true;
      globalAtlasWaiters.clear();
      setDataStatus("globalHeatAtlas", { state: "error", error: error.message });
      console.warn(`Atlas global de horizontes LOLA no disponible (mapa solo polar y horizonte sintético en puntos propios): ${error.message}`);
      return false;
    },
  );
  setDataStatus("globalHeatAtlas", { state: "loading" });
  return globalAtlasLoading;
}

/** Nombre del atlas global en public/data/terrain (MAP-02, DEC-065). */
export const GLOBAL_HEAT_ATLAS_NAME = "heat-atlas-global-2deg";
