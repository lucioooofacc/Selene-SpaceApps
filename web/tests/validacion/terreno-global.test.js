/**
 * Validación de los datos REALES del terreno fuera del polo sur (TERRAIN-04,
 * DEC-067): integridad del DEM global versionado, coherencia de sus alturas
 * con las del horizonte LOLA de alta resolución (DEC-061) y contenido de la
 * tabla precalculada de los sitios curados.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { decodeGlobalDem } from "../../src/lib/global-dem.js";
import { createLolaHorizon } from "../../src/lib/horizon-lola.js";
import { POLAR_DEM_COVERAGE_LATITUDE } from "../../src/lib/polar-dem.js";
import { SITE_TERRAIN } from "../../src/data/terrain/site-terrain.js";
import { SITES } from "../../src/data/sites.js";

const TERRAIN = resolve(import.meta.dirname, "../../public/data/terrain");
const bin = readFileSync(resolve(TERRAIN, "lola-global-16ppd.bin"));
const meta = JSON.parse(readFileSync(resolve(TERRAIN, "lola-global-16ppd.json"), "utf8"));
const outside = SITES.filter((s) => s.lat > POLAR_DEM_COVERAGE_LATITUDE);

test("DEM global: SHA-256, tamaño y procedencia declarada", () => {
  assert.equal(bin.length, meta.bytes);
  assert.equal(createHash("sha256").update(bin).digest("hex"), meta.sha256);
  assert.equal(meta.source.dem.productId, "LDEM_16");
  assert.equal(meta.source.counts.productId, "LDEC_16");
});

test("DEM global: la altura de cada sitio coincide con la del horizonte de alta resolución", () => {
  const dem = decodeGlobalDem(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), meta);
  for (const site of outside) {
    const fine = createLolaHorizon(site.id).meta.observer.groundHeightM;
    const coarse = dem.sample(site.lat, site.lon).heightKm * 1000;
    // Tolerancia del equipo: 30 m entre píxeles de 1,9 km y de 237 m en terreno llano (medido: ≤ 13 m).
    assert.ok(Math.abs(coarse - fine) < 30, `${site.id}: ${coarse.toFixed(0)} m vs ${fine.toFixed(0)} m`);
  }
});

test("tabla precalculada: los sitios curados fuera del DEM polar, con sus coordenadas y alturas", () => {
  assert.deepEqual(Object.keys(SITE_TERRAIN.sites).sort(), outside.map((s) => s.id).sort());
  assert.equal(SITE_TERRAIN.source.dem.productId, "LDEM_128");
  for (const site of outside) {
    const entry = SITE_TERRAIN.sites[site.id];
    assert.equal(entry.lat, site.lat);
    assert.equal(entry.lon, site.lon);
    const fine = createLolaHorizon(site.id).meta.observer.groundHeightM;
    // Mismo producto que el horizonte de DEC-061. Desde DEC-075 el observador del horizonte
    // usa la mediana de los píxeles medidos a menos de 1 km y la tabla, el píxel del punto:
    // medido 4,9 m (Chang'e 4) y 4,7 m (Apollo 11). Tolerancia del equipo: 10 m.
    assert.ok(Math.abs(entry.terrain.heightKm * 1000 - fine) < 10, `${site.id}: altura`);
    assert.ok(entry.terrain.area.points > 20);
    assert.ok(entry.terrain.slopeDeg >= 0 && entry.terrain.area.maxSlope >= entry.terrain.area.meanSlope);
  }
});
