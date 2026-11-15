/**
 * Mapa de calor con el atlas LOLA real y efemérides de Horizons (MAP-01,
 * DEC-038): procedencia del atlas, controles físicos (estaciones, cara
 * visible/oculta), paso adaptativo y, con los rasters LOLA, reproducción
 * exacta de celdas.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { cellCenter, computeRealHeatmap, decodeHeatAtlas, registerHeatAtlas } from "../../src/lib/heat-map.js";
import { decodeEphemeris, registerEphemeris } from "../../src/lib/ephemeris.js";
import { computePolarHeatmap, earthVisible, sunVisible } from "../../src/lib/analysis.js";
import { LOLA_PRODUCT } from "../../src/data/terrain/lola-ldem-60s-240m.js";
import { SITES } from "../../src/data/sites.js";

const PUB = resolve(import.meta.dirname, "../../public/data");
const meta = JSON.parse(readFileSync(resolve(PUB, "terrain/heat-atlas-96.json"), "utf8"));
const bin = readFileSync(resolve(PUB, "terrain/heat-atlas-96.bin"));
const atlas = decodeHeatAtlas(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length), meta);
const mean = (map, pick = () => true) => {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < map.size; y++) {
    for (let x = 0; x < map.size; x++) {
      const v = map.values[y * map.size + x];
      if (v < 0 || !pick(cellCenter(x, y, map.size, map.minLat))) continue;
      sum += v;
      n++;
    }
  }
  return sum / n;
};

before(() => {
  for (const s of SITES) registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(PUB, `ephemerides/${s.id}.json`), "utf8"))));
  registerHeatAtlas(atlas);
});

test("atlas: procedencia LOLA, grilla 96 × 96 hasta −80° y horizontes finitos en el disco", () => {
  assert.equal(meta.source.dem.md5, LOLA_PRODUCT.dem.image.md5);
  assert.equal(meta.grid.size, 96);
  assert.equal(meta.grid.minLat, -80);
  assert.equal(meta.grid.azimuths, 72);
  let inside = 0;
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const c = y * 96 + x;
      const isIn = cellCenter(x, y, 96, -80) !== null;
      assert.equal(Number.isNaN(atlas.horizon[c * 72]), !isIn);
      if (!isIn) continue;
      inside++;
      for (let k = 0; k < 72; k++) assert.ok(Math.abs(atlas.horizon[c * 72 + k]) < 60, `celda ${c}`);
    }
  }
  assert.equal(inside, meta.grid.cells);
});

test("estaciones: el polo tiene más luz en el verano austral que en el invierno", () => {
  // Con Horizons: dic 2026 ≈ 33 % de media, jun 2027 ≈ 22 % (medido).
  const dec = computePolarHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 30, mode: "sun" });
  const jun = computePolarHeatmap({ startMs: Date.UTC(2027, 5, 1), windowDays: 30, mode: "sun" });
  assert.equal(dec.source.kind, "real");
  assert.ok(mean(dec) - mean(jun) > 0.05, `${mean(dec)} vs ${mean(jun)}`);
});

test("Tierra: más visible del lado de la cara visible (longitudes cercanas a 0°)", () => {
  const map = computePolarHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: 30, mode: "earth" });
  const near = mean(map, (c) => Math.abs(c.lon) < 60);
  const far = mean(map, (c) => Math.abs(c.lon) > 120);
  assert.ok(near > far + 0.2, `${near} vs ${far}`);
});

test("paso adaptativo: muestrear cada 2 h en vez de 1 h cambia ≤ 1 punto por celda", () => {
  // Medido: 0,42 puntos como máximo en 30 días.
  const o = { startMs: Date.UTC(2026, 11, 1), windowDays: 30, mode: "sun", size: 96, minLat: -80, sunVisible, earthVisible };
  const a = computeRealHeatmap({ ...o, stepMinutes: 60 });
  const b = computeRealHeatmap({ ...o, stepMinutes: 120 });
  for (let i = 0; i < a.values.length; i++) if (a.values[i] >= 0) assert.ok(Math.abs(a.values[i] - b.values[i]) <= 0.01);
});

// Opcional: con los rasters LOLA, el atlas se reproduce celda por celda.
const rawDir = process.env.LOLA_RAW_DIR ?? resolve(import.meta.dirname, "../../data/raw");
const hasReal = existsSync(join(rawDir, LOLA_PRODUCT.dem.image.name)) && existsSync(join(rawDir, LOLA_PRODUCT.counts.image.name));

test("producto real: celdas del atlas reproducidas exactamente", { skip: !hasReal && "sin rasters reales" }, async () => {
  const { readRaster } = await import("../../scripts/build-lola-horizons.mjs");
  const { ATLAS_PARAMS } = await import("../../scripts/build-heat-atlas.mjs");
  const { computeHorizonProfile, createRasterSampler } = await import("../../src/lib/horizon-lola.js");
  const sampler = createRasterSampler({
    dem: readRaster(join(rawDir, LOLA_PRODUCT.dem.image.name), "float32"),
    counts: readRaster(join(rawDir, LOLA_PRODUCT.counts.image.name), "int16"),
  });
  for (const [x, y] of [[48, 48], [10, 50], [70, 20]]) {
    const center = cellCenter(x, y, 96, -80);
    const p = computeHorizonProfile(sampler, center, { ...ATLAS_PARAMS, azimuthStepDeg: 5 });
    // Cuantización del archivo: centésimas de grado (± 0,005°), leídas como float32.
    for (let k = 0; k < 72; k++) assert.ok(Math.abs(atlas.horizon[(y * 96 + x) * 72 + k] - p.elevationDeg[k]) <= 0.0051);
  }
});

test("modos combinados: más tiempo con Sol y Tierra a la vez y más viabilidad en el verano austral", () => {
  // Medido: 'both' (30 días) 10,1 % en dic 2026 frente a 7,6 % en jun 2027.
  // Viabilidad por requisitos (DEC-071, 7 días): 1588 celdas al límite en dic
  // frente a 796 en jun. En 30 días ninguna celda cumple la luz continua (la
  // noche más corta es de 112 h), así que se compara una semana.
  for (const [mode, days] of [["both", 30], ["viability", 7]]) {
    const dec = computePolarHeatmap({ startMs: Date.UTC(2026, 11, 1), windowDays: days, mode });
    const jun = computePolarHeatmap({ startMs: Date.UTC(2027, 5, 1), windowDays: days, mode });
    assert.equal(dec.source.kind, "real");
    assert.ok(mean(dec) > mean(jun), `${mode}: ${mean(dec)} vs ${mean(jun)}`);
  }
});
