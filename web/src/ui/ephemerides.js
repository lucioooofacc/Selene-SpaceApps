/**
 * Carga en segundo plano las efemérides JPL Horizons de los sitios curados
 * (CORE-01 parte B, DEC-033). Los archivos los genera
 * `scripts/build-ephemerides.mjs` en `public/data/ephemerides/`. Mientras no
 * llegan, el cálculo usa el modelo aproximado; cuando llegan, se registran en
 * `lib/ephemeris.js` (sube `ephemerisVersion()`) y quien llamó vuelve a dibujar.
 * Si un archivo falla, ese sitio sigue con el modelo aproximado.
 */
import { loadEphemerides } from "../lib/ephemeris.js";
import { SITES } from "../data/sites.js";

let loading = null;

async function fetchJson(id) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/ephemerides/${id}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Carga (una sola vez por página) las series de todos los sitios curados. */
export function loadSiteEphemerides() {
  loading ??= loadEphemerides(
    SITES.map((s) => s.id),
    fetchJson,
  ).then((result) => {
    for (const f of result.failed) console.warn(`Efemérides de ${f.id} no disponibles (modelo aproximado): ${f.error}`);
    return result;
  });
  return loading;
}
