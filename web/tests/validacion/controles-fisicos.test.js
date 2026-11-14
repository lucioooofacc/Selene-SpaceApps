/**
 * Controles físicos con los datos reales (TEST-01, DEC-037).
 *
 * Validan que las series de JPL Horizons (DEC-033) y el horizonte LOLA
 * (DEC-030) respetan propiedades conocidas de la Luna, independientes de
 * nuestro código. No usan valores de referencia inventados: cada tolerancia se
 * justifica en el comentario y en `docs/VALIDACION.md`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { clearEphemerides, decodeEphemeris, registerEphemeris } from "../../src/lib/ephemeris.js";
import { computeScenario } from "../../src/lib/analysis.js";
import { SITES } from "../../src/data/sites.js";

const DIR = resolve(import.meta.dirname, "../../public/data/ephemerides");
const load = (id) => decodeEphemeris(JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8")));
const site = (id) => SITES.find((s) => s.id === id);
const DAY = 86_400_000;

/** Oblicuidad del ecuador lunar respecto de la eclíptica (IAU): 1,543°. */
const LUNAR_OBLIQUITY = 1.543;
/** Mes sinódico medio (días). */
const SYNODIC_MONTH = 29.530589;

function registerAll() {
  clearEphemerides();
  for (const s of SITES) registerEphemeris(load(s.id));
}

/** Escenarios de 30 días que cubren un año desde el 01/11/2026. */
function yearOfWindows(id) {
  return Array.from({ length: 12 }, (_, k) => computeScenario(site(id), Date.UTC(2026, 10, 1) + k * 30 * DAY, 30));
}

test("Sol: su altura máxima es la colatitud del sitio más la oblicuidad lunar", () => {
  // El Sol se aparta del ecuador lunar a lo sumo 1,543°: su elevación máxima
  // en un año es ≈ (90° − |lat|) + 1,543°. Tolerancia: 0,1° (paralaje solar
  // < 0,001°, topografía no incluida en Horizons) y al menos 1,2° de esa
  // oblicuidad alcanzada en 14 meses (cubren un año de eclipses, 346,6 d).
  for (const s of SITES.filter((x) => x.lat < -60)) {
    const e = load(s.id);
    let max = -90;
    for (let i = 0; i < e.rows; i++) max = Math.max(max, e.series.sunEl[i]);
    const colat = 90 - Math.abs(s.lat);
    assert.ok(max <= colat + LUNAR_OBLIQUITY + 0.1, `${s.id}: ${max}° > ${colat + LUNAR_OBLIQUITY}°`);
    assert.ok(max >= colat + 1.2, `${s.id}: ${max}° no alcanza la estación`);
  }
});

test("período sinódico: los amaneceres en Apollo 11 se repiten cada ~29,53 días", () => {
  const e = load("apollo11");
  const rises = [];
  for (let i = 1; i < e.rows; i++) {
    const a = e.series.sunEl[i - 1];
    const b = e.series.sunEl[i];
    if (a <= 0 && b > 0) rises.push(e.startMs + (i - 1 + -a / (b - a)) * e.stepMs);
  }
  const gaps = rises.slice(1).map((t, i) => (t - rises[i]) / DAY);
  const mean = gaps.reduce((x, y) => x + y) / gaps.length;
  // Media de ~14 meses: ± 0,02 d (la excentricidad hace variar cada mes ±0,3 d).
  assert.ok(Math.abs(mean - SYNODIC_MONTH) < 0.02, `media ${mean}`);
  for (const g of gaps) assert.ok(Math.abs(g - SYNODIC_MONTH) < 0.4, `intervalo ${g}`);
});

test("la Tierra siempre en el cielo de la cara visible y nunca en la oculta", () => {
  // Apollo 11 está cerca del centro de la cara visible: la Tierra no baja de
  // ~58° (libración ±~8°). Chang'e 4 está en la cara oculta: siempre bajo el
  // horizonte matemático.
  const a = load("apollo11");
  const c = load("change4");
  for (let i = 0; i < a.rows; i++) {
    assert.ok(a.series.earthEl[i] > 50, `Apollo 11 fila ${i}`);
    assert.ok(c.series.earthEl[i] < -30, `Chang'e 4 fila ${i}`);
  }
  registerAll();
  for (const sc of yearOfWindows("apollo11")) assert.equal(sc.summary.communication, 100);
  for (const sc of yearOfWindows("change4")) assert.equal(sc.summary.communication, 0);
});

test("fase de la Tierra: casi nueva al mediodía lunar y casi llena a medianoche (cara visible)", () => {
  // Con el Sol alto sobre la cara visible, la Luna está entre la Tierra y el
  // Sol: desde la Luna se ve la cara nocturna de la Tierra. Medido: ≤ 0,26 con
  // el Sol > 60° y ≥ 0,75 con el Sol < −60°; se exige ≤ 0,3 y ≥ 0,7.
  const a = load("apollo11");
  for (let i = 0; i < a.rows; i++) {
    const phase = a.series.earthIllum[i] / 100;
    if (a.series.sunEl[i] > 60) assert.ok(phase <= 0.3, `fila ${i}: ${phase}`);
    if (a.series.sunEl[i] < -60) assert.ok(phase >= 0.7, `fila ${i}: ${phase}`);
  }
});

test("Cabeus (impacto de LCROSS, sombra permanente) sin Sol durante todo el año", () => {
  // LCROSS se dirigió a Cabeus por estar en sombra permanente
  // (Colaprete et al. 2010). Con Horizons + LOLA no recibe Sol en ningún mes.
  registerAll();
  for (const sc of yearOfWindows("cabeus")) {
    assert.equal(sc.ephemeris.source, "horizons");
    assert.equal(sc.horizon.source, "lola");
    assert.equal(sc.summary.illumination, 0);
  }
});

test("estaciones del polo sur: verano austral con luz y invierno con poca o ninguna", () => {
  // La declinación del Sol respecto del ecuador lunar cambia de signo con el
  // año de eclipses (346,6 d). Se exige un contraste fuerte entre el mejor y el
  // peor mes (> 50 puntos) y que el mejor caiga en oct–feb y el peor en abr–ago
  // (bandas anchas: las estaciones lunares se corren ~19 días por año respecto
  // del calendario), no un valor exacto: depende del horizonte de cada sitio.
  registerAll();
  for (const id of ["shackleton", "malapert"]) {
    // Mes del medio de cada ventana de 30 días.
    const months = yearOfWindows(id).map((sc) => ({ month: new Date(sc.startMs + 15 * DAY).getUTCMonth(), light: sc.summary.illumination }));
    const best = months.reduce((a, b) => (b.light > a.light ? b : a));
    const worst = months.reduce((a, b) => (b.light < a.light ? b : a));
    assert.ok(best.light - worst.light > 50, `${id}: ${best.light} vs ${worst.light}`);
    assert.ok([9, 10, 11, 0, 1].includes(best.month), `${id}: mejor mes ${best.month}`);
    assert.ok([3, 4, 5, 6, 7].includes(worst.month), `${id}: peor mes ${worst.month}`);
  }
});

test("horizonte LOLA: los sitios en cima ven por debajo del horizonte matemático", () => {
  // Malapert (cima a ~4,8 km) y Connecting Ridge (cresta a ~1,9 km) tienen
  // azimuts con horizonte negativo; Cabeus (fondo de cráter) no.
  registerAll();
  const minHz = (id) => computeScenario(site(id), Date.UTC(2026, 10, 14), 1).horizon.meta.summary.minDeg;
  assert.ok(minHz("malapert") < -1);
  assert.ok(minHz("shackleton") < -1);
  assert.ok(minHz("cabeus") > 0);
});
