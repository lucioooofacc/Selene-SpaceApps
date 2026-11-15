/**
 * Validación del horizonte calculado con el DEM global LDEM_128 (TERRAIN-03,
 * DEC-061).
 *
 * Siempre: las entradas de Chang'e 4 y Apollo 11 están completas y su suelo
 * cae en el rango del producto (MINIMUM/MAXIMUM de la etiqueta: −9127,5 a
 * 10 778,5 m).
 *
 * Opcional (necesita las ventanas de `scripts/extract-lola-global.mjs` en
 * LOLA_GLOBAL_DIR, por defecto web/data/derived/lola-128; no descarga nada):
 * - las entradas versionadas se reproducen exactamente desde las ventanas;
 * - control cruzado en Chandrayaan-3 (−69,4°), cubierto por los dos
 *   productos: con el mismo algoritmo, el horizonte de LDEM_128 coincide con
 *   el de LDEM_60S_240M. Medido el 2026-11-14: suelo idéntico (529,7 m) y
 *   diferencia en los 631 azimuts no truncados de media +0,028°, RMS 0,069°,
 *   máximo 0,309°. Las tolerancias de abajo son del equipo, no de la NASA.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { LOLA_HORIZONS } from "../../src/data/terrain/lola-horizons.js";
import { SITES } from "../../src/data/sites.js";
import { HORIZON_PARAMS, computeHorizonProfile } from "../../src/lib/horizon-lola.js";
import { decodeGlobalDem } from "../../src/lib/global-dem.js";

const T = LOLA_HORIZONS;
const GLOBAL_IDS = ["change4", "apollo11"];

test("LDEM_128: Chang'e 4 y Apollo 11 con perfil completo, sin truncar y suelo dentro del producto", () => {
  for (const id of GLOBAL_IDS) {
    const e = T.sites[id];
    assert.ok(e, id);
    assert.equal(e.source.dem.productId, "LDEM_128", id);
    assert.equal(e.summary.truncatedFraction, 0, id);
    assert.ok(e.observer.groundHeightM > -9127.5 && e.observer.groundHeightM < 10778.5, id);
    assert.ok(e.coverageKm.every((c) => c === HORIZON_PARAMS.maxDistanceKm), id);
  }
});

const globalDir = process.env.LOLA_GLOBAL_DIR ?? resolve(import.meta.dirname, "../../data/derived/lola-128");
const hasWindows = existsSync(join(globalDir, "index.json"));
const skip = !hasWindows && "sin ventanas de LDEM_128";

test("ventanas reales: las entradas de LDEM_128 de la tabla se reproducen exactamente", { skip }, async () => {
  const { buildGlobalOnly, loadGlobalWindows } = await import("../../scripts/build-lola-horizons.mjs");
  const table = buildGlobalOnly(loadGlobalWindows(globalDir));
  for (const id of GLOBAL_IDS) assert.deepEqual(table.sites[id], T.sites[id], id);
});

test("ventanas reales: en Chandrayaan-3, LDEM_128 y LDEM_60S_240M dan el mismo horizonte", { skip }, async () => {
  const { globalProfile, loadGlobalWindows, toTableEntry } = await import("../../scripts/build-lola-horizons.mjs");
  const global = loadGlobalWindows(globalDir);
  const site = SITES.find((s) => s.id === "chandrayaan3");
  const g = toTableEntry(site, globalProfile(site, global.sites.chandrayaan3));
  const p = T.sites.chandrayaan3;
  assert.ok(Math.abs(g.observer.groundHeightM - p.observer.groundHeightM) < 5, "suelo");
  const diffs = [];
  for (let i = 0; i < p.elevationDeg.length; i++) {
    if (p.coverageKm[i] >= HORIZON_PARAMS.maxDistanceKm) diffs.push(g.elevationDeg[i] - p.elevationDeg[i]);
  }
  assert.ok(diffs.length > 600);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const rms = Math.sqrt(diffs.reduce((a, b) => a + b * b, 0) / diffs.length);
  const max = Math.max(...diffs.map(Math.abs));
  assert.ok(Math.abs(mean) < 0.1, `media ${mean}`);
  assert.ok(rms < 0.15, `RMS ${rms}`);
  assert.ok(max < 0.5, `máximo ${max}`);
});

test("Apollo 11: el horizonte de LDEM_128 coincide con el de LDEM_16 (TERRAIN-05, DEC-075)", () => {
  // Antes de DEC-075 el píxel interpolado del punto dejaba el suelo 13 m bajo y el
  // horizonte ~0,8° alto. Con la mediana de los píxeles medidos a 1 km, medido el
  // 2026-11-15: media +0,28°, máximo 0,74°. LDEM_16 (1,9 km) no resuelve el relieve
  // cercano, así que no se espera cero. Tolerancias del equipo: media < 0,4°, máximo < 1°.
  const dir = resolve(import.meta.dirname, "../../public/data/terrain");
  const bin = readFileSync(join(dir, "lola-global-16ppd.bin"));
  const meta = JSON.parse(readFileSync(join(dir, "lola-global-16ppd.json"), "utf8"));
  const dem = decodeGlobalDem(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta);
  const e = T.sites.apollo11;
  const step = 360 / e.elevationDeg.length;
  const ref = computeHorizonProfile(dem.sample, e, { maxDistanceKm: 300, stepKm: 0.95, azimuthStepDeg: step, observerHeightM: 2, radiusKm: 1737.4 });
  const diffs = e.elevationDeg.map((v, k) => v - ref.elevationDeg[k]);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const max = Math.max(...diffs.map(Math.abs));
  assert.ok(Math.abs(mean) < 0.4, `media ${mean}`);
  assert.ok(max < 1, `máximo ${max}`);
  assert.equal(e.observer.ground?.method, "median-measured");
});
