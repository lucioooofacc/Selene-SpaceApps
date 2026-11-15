/**
 * Validación del atlas global REAL del mapa de calor (MAP-02, DEC-065):
 * integridad del archivo versionado y coherencia con el escenario puntual de
 * los sitios de latitud media (horizonte LOLA de alta resolución, DEC-061).
 * La tolerancia (2 p. p. de luz) es un criterio del equipo: con las celdas de
 * 2° y LDEM_16 la diferencia medida fue ≤ 0,3 p. p.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { decodeGlobalHeatAtlas, registerGlobalHeatAtlas } from "../../src/lib/heat-map.js";
import { decodeEphemeris, registerEphemeris } from "../../src/lib/ephemeris.js";
import { computeGlobalHeatmap, computeScenario } from "../../src/lib/analysis.js";
import { SITES } from "../../src/data/sites.js";

const TERRAIN = resolve(import.meta.dirname, "../../public/data/terrain");
const EPH = resolve(import.meta.dirname, "../../public/data/ephemerides");
const bin = readFileSync(resolve(TERRAIN, "heat-atlas-global-2deg.bin"));
const meta = JSON.parse(readFileSync(resolve(TERRAIN, "heat-atlas-global-2deg.json"), "utf8"));

test("atlas global: SHA-256, tamaño y procedencia declarada", () => {
  assert.equal(createHash("sha256").update(bin).digest("hex"), meta.sha256);
  const atlas = decodeGlobalHeatAtlas(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta);
  assert.equal(atlas.cols * atlas.rows, 16200);
  assert.ok(atlas.horizon.every(Number.isFinite), "todas las celdas tienen horizonte");
  assert.equal(meta.source.dem.productId, "LDEM_16");
  assert.equal(meta.source.counts.productId, "LDEC_16");
});

test("latitudes medias: la celda global da la misma luz que el escenario del sitio", () => {
  for (const s of SITES) registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(EPH, `${s.id}.json`), "utf8"))));
  const atlas = decodeGlobalHeatAtlas(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta);
  registerGlobalHeatAtlas(atlas);
  const startMs = Date.UTC(2026, 11, 1);
  const map = computeGlobalHeatmap({ startMs, windowDays: 30, mode: "sun" });
  for (const id of ["chandrayaan3", "change4", "apollo11"]) {
    const site = SITES.find((s) => s.id === id);
    const c = Math.floor((90 - site.lat) / 2) * atlas.cols + Math.floor((site.lon + 180) / 2);
    const cell = 100 * map.values[c];
    const point = computeScenario(site, startMs, 30).summary.illumination;
    assert.ok(Math.abs(cell - point) < 2, `${id}: celda ${cell.toFixed(1)} % vs sitio ${point.toFixed(1)} %`);
  }
});
