/**
 * Comparación de dos escenarios (UI-05, DEC-019).
 *
 * Solo reordena y resume lo que ya calcula `computeScenario`: no agrega
 * fórmulas científicas nuevas. Para cada métrica indica qué sitio tiene el
 * valor más favorable. En todas las métricas de esta tabla, más es mejor
 * (más luz, más potencia relativa, más cobertura, ventanas más largas).
 */
import { STEP_MINUTES } from "./analysis.js";

/** Duración de la ventana más larga, en minutos (0 si no hay ventanas). */
export function longestWindowMinutes(windows) {
  return windows.reduce((max, w) => Math.max(max, (w.end - w.start) / 60_000), 0);
}

/**
 * Métricas comparables de un escenario, todas con "más es mejor".
 * `kind` le dice a la interfaz cómo formatear el valor.
 */
export function scenarioMetrics(scenario) {
  const s = scenario.summary;
  return [
    { key: "illumination", kind: "percent", value: s.illumination },
    { key: "sunMinutes", kind: "minutes", value: s.sunMinutes },
    { key: "longestLight", kind: "minutes", value: longestWindowMinutes(s.lightWindows) },
    { key: "power", kind: "ratio", value: s.power },
    { key: "peakSun", kind: "degrees", value: s.peakSun },
    { key: "communication", kind: "percent", value: s.communication },
    { key: "linkMinutes", kind: "minutes", value: s.linkMinutes },
    { key: "longestLink", kind: "minutes", value: longestWindowMinutes(s.linkWindows) },
    { key: "peakEarth", kind: "degrees", value: s.peakEarth },
  ];
}

/**
 * Tolerancia para declarar empate: diferencias menores que un paso de
 * muestreo (minutos), 0,5 puntos porcentuales, 0,01 de potencia relativa
 * o 0,1° no se consideran una ventaja.
 */
const TIE = { percent: 0.5, minutes: STEP_MINUTES, ratio: 0.01, degrees: 0.1 };

/**
 * Compara dos escenarios métrica por métrica.
 * @returns {{rows: Array<{key, kind, a, b, better: "a"|"b"|null}>, wins: {a:number, b:number}}}
 */
export function compareScenarios(a, b) {
  const ma = scenarioMetrics(a);
  const mb = scenarioMetrics(b);
  const wins = { a: 0, b: 0 };
  const rows = ma.map((row, i) => {
    const va = row.value;
    const vb = mb[i].value;
    let better = null;
    if (Math.abs(va - vb) > TIE[row.kind]) better = va > vb ? "a" : "b";
    if (better) wins[better] += 1;
    return { key: row.key, kind: row.kind, a: va, b: vb, better };
  });
  return { rows, wins };
}
