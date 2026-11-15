/**
 * Validación del horizonte del punto sobre LDEM_16 (CORE-05, DEC-076) con
 * datos REALES: en Chandrayaan-3 (−69,4°, dentro de la banda |lat| ≥ 60°) se
 * compara contra el horizonte de 240 m de LDEM_60S_240M (DEC-030), que es la
 * mejor referencia disponible en la banda.
 *
 * Medido el 2026-11-15: diferencia media −0,22°, máximo 0,60°; luz en 30 días
 * desde el 15/11/2026: 50,7 % (240 m) contra 51,4 % (LDEM_16); Tierra 100 %
 * en los dos. Antes (horizonte regional, DEC-070) el error en esta banda
 * llegaba a 9 p. p. de luz y 100 p. p. de Tierra. Tolerancias del equipo:
 * media < 0,4°, máximo < 1°, luz y Tierra < 3 p. p.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { clearGlobalDem, decodeGlobalDem, globalHorizonFor, registerGlobalDem } from "../../src/lib/global-dem.js";
import { createLolaHorizon } from "../../src/lib/horizon-lola.js";
import { clearEphemerides, decodeEphemeris, registerEphemeris } from "../../src/lib/ephemeris.js";
import { computeScenario } from "../../src/lib/analysis.js";
import { SITES } from "../../src/data/sites.js";

const PUBLIC = resolve(import.meta.dirname, "../../public/data");

test("Chandrayaan-3: el horizonte del punto sobre LDEM_16 coincide con el de 240 m", () => {
  const meta = JSON.parse(readFileSync(resolve(PUBLIC, "terrain/lola-global-16ppd.json"), "utf8"));
  const bin = readFileSync(resolve(PUBLIC, "terrain/lola-global-16ppd.bin"));
  registerGlobalDem(decodeGlobalDem(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta));
  clearEphemerides();
  for (const s of SITES) registerEphemeris(decodeEphemeris(JSON.parse(readFileSync(resolve(PUBLIC, `ephemerides/${s.id}.json`), "utf8"))));
  try {
    const site = SITES.find((s) => s.id === "chandrayaan3");
    const fine = createLolaHorizon("chandrayaan3");
    const point = globalHorizonFor({ lat: site.lat, lon: site.lon });
    const diffs = [];
    for (let az = 0; az < 360; az++) diffs.push(point(az) - fine(az));
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const max = Math.max(...diffs.map(Math.abs));
    assert.ok(Math.abs(mean) < 0.4, `media ${mean}`);
    assert.ok(max < 1, `máximo ${max}`);

    const start = Date.UTC(2026, 10, 15);
    const curated = computeScenario(site, start, 30).summary;
    const custom = computeScenario({ id: "custom-c3", custom: true, name: "c3", lat: site.lat, lon: site.lon }, start, 30);
    assert.equal(custom.horizon.meta.global, true);
    assert.ok(Math.abs(custom.summary.illumination - curated.illumination) < 3, "luz");
    assert.ok(Math.abs(custom.summary.communication - curated.communication) < 3, "Tierra");
  } finally {
    clearGlobalDem();
    clearEphemerides();
  }
});
