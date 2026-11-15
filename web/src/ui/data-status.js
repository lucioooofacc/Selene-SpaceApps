/**
 * Estado de carga de los datos reales que la página baja en segundo plano
 * (UI-01, DEC-039): efemérides JPL Horizons de los sitios curados (DEC-033) y
 * DEM LOLA polar reducido de los puntos propios (DEC-034) y atlas de
 * horizontes del mapa de calor (DEC-038).
 *
 * Solo guarda y avisa: no baja ni calcula nada. Lo escribe `ephemerides.js`
 * y lo leen los paneles de "Datos y fuentes".
 *
 * Estados: "idle" (no se pidió), "loading", "ready", "partial" (algunos
 * archivos fallaron) y "error" (no llegó nada).
 */

const status = {
  ephemerides: { state: "idle", loaded: [], failed: [] },
  polarDem: { state: "idle", error: null },
  heatAtlas: { state: "idle", error: null },
  globalHeatAtlas: { state: "idle", error: null }, // MAP-02, DEC-065
  globalDem: { state: "idle", error: null }, // TERRAIN-04, DEC-067
};
const listeners = new Set();

/** Copia del estado actual. */
export function dataStatus() {
  return {
    ephemerides: { ...status.ephemerides },
    polarDem: { ...status.polarDem },
    heatAtlas: { ...status.heatAtlas },
    globalHeatAtlas: { ...status.globalHeatAtlas },
    globalDem: { ...status.globalDem },
  };
}

/** Actualiza una parte del estado y avisa a los suscriptores. */
export function setDataStatus(part, patch) {
  Object.assign(status[part], patch);
  for (const fn of listeners) fn(dataStatus());
}

/** Se suscribe a los cambios. Devuelve la función para desuscribirse. */
export function onDataStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
