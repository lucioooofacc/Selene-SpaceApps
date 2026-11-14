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
import { needsPolarDem } from "../lib/analysis.js";
import { decodePolarDem, registerPolarDem } from "../lib/polar-dem.js";
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
 * Si alguno de los sitios usaría el DEM polar reducido, lo baja (una sola vez
 * por página, ~4,4 MB comprimido) y llama a `onLoaded` al registrarlo. Si falla,
 * esos puntos siguen con el horizonte sintético.
 */
export function ensurePolarTerrain(sites, onLoaded) {
  if (polarLoading || !sites.some(needsPolarDem)) return;
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
