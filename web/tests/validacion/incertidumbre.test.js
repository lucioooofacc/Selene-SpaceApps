/**
 * Incertidumbre de la interpolación de las efemérides (TEST-01, DEC-037).
 *
 * Las series de JPL Horizons se guardan cada 1 h y se interpolan linealmente
 * (DEC-033). Para acotar el error sin datos más finos se predice cada hora
 * impar desde sus vecinas a ±1 h (interpolación con paso de 2 h): el error de
 * la interpolación lineal crece con el cuadrado del paso, así que con paso de
 * 1 h es ~4 veces menor que el medido acá.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { decodeEphemeris } from "../../src/lib/ephemeris.js";
import { SITES } from "../../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../../public/data/ephemerides");
const load = (id) => decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8")));

/** Máximo error de predecir las horas impares desde las pares, con |elevación| < `nearDeg`. */
function twoHourError(series, key, nearDeg) {
  let max = 0;
  for (let i = 1; i < series[key].length - 1; i += 2) {
    if (Math.abs(series[key][i]) >= nearDeg) continue;
    max = Math.max(max, Math.abs((series[key][i - 1] + series[key][i + 1]) / 2 - series[key][i]));
  }
  return max;
}

test("cerca del horizonte la interpolación horaria no agrega error apreciable", () => {
  // Medido con paso de 2 h y |elevación| < 10°: ≤ 0,001° en los 7 sitios (el
  // mismo orden que la cuantización de 0,001° de los archivos). Con paso de
  // 1 h, < 0,0003°: despreciable frente al radio del Sol (≈ 0,27°).
  for (const s of SITES) {
    const e = load(s.id);
    assert.ok(twoHourError(e.series, "sunEl", 10) <= 0.002, `${s.id} Sol`);
    assert.ok(twoHourError(e.series, "earthEl", 10) <= 0.002, `${s.id} Tierra`);
  }
});

test("lejos del horizonte el error es mayor pero no afecta la visibilidad", () => {
  // Cerca del cenit (Apollo 11, Sol a ~89,8°) la curva de elevación se dobla y
  // la interpolación con paso de 2 h erra hasta ~0,31° (con 1 h, ~0,08°). Se
  // documenta la cota: no cambia ninguna decisión de visibilidad.
  const e = load("apollo11");
  const max = twoHourError(e.series, "sunEl", 90.1);
  assert.ok(max < 0.4, `${max}`);
  assert.ok(twoHourError(e.series, "sunEl", 10) < 0.002);
});
