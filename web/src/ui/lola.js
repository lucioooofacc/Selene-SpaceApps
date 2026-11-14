/**
 * Acceso de la interfaz al horizonte LOLA real (UI-14, DEC-031).
 *
 * TERRAIN-02 (DEC-030) precalcula el horizonte de los sitios curados al sur de
 * −60°. Hasta que CORE-01 lo conecte al cálculo, `scenario.horizon` sigue
 * siendo el sintético: la interfaz muestra el LOLA como vista previa, siempre
 * marcado como tal. Cuando el escenario ya traiga `horizon.source === "lola"`,
 * se usa ese directamente.
 */
import { createLolaHorizon } from "../lib/horizon-lola.js";

const cache = new Map();

/** Horizonte LOLA de un sitio curado, o null (sitio propio o fuera de cobertura). */
export function lolaHorizonFor(siteId) {
  if (!cache.has(siteId)) cache.set(siteId, siteId ? createLolaHorizon(siteId) : null);
  return cache.get(siteId);
}

/**
 * Qué horizonte LOLA corresponde mostrar para un escenario:
 *  - { horizon, mode: "active" } si el cálculo ya usa LOLA,
 *  - { horizon, mode: "preview" } si hay LOLA pero el cálculo usa el sintético,
 *  - { horizon: null, mode: "none" } si no hay LOLA para el sitio.
 */
export function lolaForScenario(scenario) {
  if (scenario?.horizon?.source === "lola") return { horizon: scenario.horizon, mode: "active" };
  const horizon = lolaHorizonFor(scenario?.site?.id);
  return horizon ? { horizon, mode: "preview" } : { horizon: null, mode: "none" };
}
