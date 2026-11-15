/**
 * Orden de "Mejores lugares para alunizar" por categoría (UI-13, DEC-029).
 *
 * Solo ordena resultados que ya calcula `computeScenario`; no agrega fórmulas.
 *  - overall: viabilidad por requisitos (DEC-071: el peor requisito manda),
 *    después la cantidad de requisitos cumplidos y, a igualdad, % de iluminación.
 *  - science: cantidad de rasgos científicos citados (data/site-traits.js) y,
 *    a igualdad, viabilidad. No es una métrica científica.
 *  - communication: % del tiempo con la Tierra visible y, a igualdad, altura
 *    máxima de la Tierra.
 *  - light: potencia solar relativa promedio ("luz aprovechable") y, a
 *    igualdad, minutos con Sol.
 */
import { viabilityRank } from "./analysis.js";

export const CATEGORIES = ["overall", "science", "communication", "light"];

/** Mejor viabilidad primero: nivel global y, a igualdad, requisitos cumplidos. */
const byViability = (a, b) =>
  viabilityRank(b.scenario.viability) - viabilityRank(a.scenario.viability) || b.scenario.viability.met - a.scenario.viability.met;

const COMPARE = {
  overall: (a, b) => byViability(a, b) || b.scenario.summary.illumination - a.scenario.summary.illumination,
  science: (a, b) => b.traits - a.traits || byViability(a, b),
  communication: (a, b) =>
    b.scenario.summary.communication - a.scenario.summary.communication ||
    b.scenario.summary.peakEarth - a.scenario.summary.peakEarth,
  light: (a, b) => b.scenario.summary.power - a.scenario.summary.power || b.scenario.summary.sunMinutes - a.scenario.summary.sunMinutes,
};

/**
 * @param {Array<{site, scenario, traits:number}>} entries
 * @param {string} category  una de CATEGORIES (si no, "overall")
 * @param {number} limit
 */
export function rankEntries(entries, category, limit = entries.length) {
  const compare = COMPARE[category] ?? COMPARE.overall;
  // Desempate final por nombre para que el orden sea determinista.
  return [...entries].sort((a, b) => compare(a, b) || String(a.site.name).localeCompare(String(b.site.name))).slice(0, limit);
}
