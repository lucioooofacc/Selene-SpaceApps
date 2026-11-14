/**
 * Estadísticas del período elegido a partir de un escenario ya calculado
 * (DEC-042). Módulo puro: solo resume `scenario.series` dentro de la ventana
 * (sin los días extra que el escenario calcula para el próximo amanecer).
 *
 * - Posición promedio del Sol y la Tierra: elevación media, mínima y máxima
 *   sobre el horizonte matemático, y elevación media del relieve en su
 *   dirección. El azimut medio no se da: cerca del polo el Sol recorre todo
 *   el horizonte y un promedio de azimuts no significa nada.
 * - Rachas: noche más larga (sin Sol), luz continua más larga y corte de
 *   comunicación más largo, en minutos.
 */

/** Promedio, mínimo y máximo de los primeros n valores. */
function summarize(arr, n) {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { mean: sum / n, min, max };
}

/** Racha más larga (en muestras) con flags[i] === value dentro de los primeros n. */
function longestRun(flags, n, value) {
  let best = 0;
  let run = 0;
  for (let i = 0; i < n; i++) {
    run = flags[i] === value ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/**
 * @param {object} scenario  resultado de computeScenario
 * @param {number} stepMinutes  minutos entre muestras (STEP_MINUTES de analysis.js)
 */
export function windowStats(scenario, stepMinutes) {
  const s = scenario.series;
  const n = scenario.windowSteps;
  const body = (el, hz, vis) => ({
    elevation: summarize(el, n),
    relief: summarize(hz, n).mean,
    visibleFraction: summarize(vis, n).mean,
  });
  return {
    sun: body(s.sunEl, s.sunHz, s.sunVis),
    earth: body(s.earthEl, s.earthHz, s.earthVis),
    longestNightMin: longestRun(s.sunVis, n, 0) * stepMinutes,
    longestLightMin: longestRun(s.sunVis, n, 1) * stepMinutes,
    longestBlackoutMin: longestRun(s.earthVis, n, 0) * stepMinutes,
  };
}
