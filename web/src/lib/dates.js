/**
 * Candidatas para "Mejores fechas" (DEC-046): un escenario por cada fecha de
 * inicio posible (a las 00:00 UTC, cada `strideDays`) con la misma duración,
 * solo dentro de la cobertura de la serie de JPL Horizons del sitio (propia o
 * trasladada, DEC-033/034), para que el orden salga de datos reales.
 * El orden lo hace `rankEntries` (lib/ranking.js), igual que los lugares.
 */
import { computeScenario } from "./analysis.js";
import { derivedEphemerisFor, ephemerisFor } from "./ephemeris.js";

const DAY_MS = 86_400_000;

/**
 * @returns {{coverage: {startMs: number, stopMs: number}, items: {startMs: number, scenario: object}[]} | null}
 *   null si no hay serie de Horizons para el sitio (todavía cargando o sin datos).
 */
export function dateScenarios(site, windowDays, { strideDays = 1 } = {}) {
  const meta = (ephemerisFor(site) ?? derivedEphemerisFor(site))?.meta;
  const cov = meta?.coverage;
  if (!cov) return null;
  const first = Math.ceil(cov.startMs / DAY_MS) * DAY_MS;
  const last = cov.stopMs - windowDays * DAY_MS;
  const items = [];
  for (let t = first; t <= last; t += strideDays * DAY_MS) {
    items.push({ startMs: t, scenario: computeScenario(site, t, windowDays) });
  }
  return { coverage: { startMs: first, stopMs: cov.stopMs }, items };
}

/**
 * De una lista ya ordenada (mejor primero), toma hasta `n` fechas cuyos
 * períodos no se superpongan, para que las opciones sean distintas y no
 * variantes de un día de la misma ventana.
 * @param {{startMs: number}[]} ranked
 */
export function pickDistinct(ranked, windowDays, n) {
  const span = windowDays * DAY_MS;
  const picked = [];
  for (const item of ranked) {
    if (picked.every((p) => Math.abs(p.startMs - item.startMs) >= span)) picked.push(item);
    if (picked.length === n) break;
  }
  return picked;
}
