import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { LOLA_MAPS } from "../src/data/lola-maps.js";

const pub = (file) => fileURLToPath(new URL(`../public/${file.replace("./", "")}`, import.meta.url));

/** Ancho, alto y tipo de color de un PNG, leídos de su encabezado IHDR. */
function pngHeader(path) {
  const buf = readFileSync(path);
  assert.equal(buf.toString("latin1", 1, 4), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

test("los metadatos de elevación tienen rangos válidos y fuente citada", () => {
  for (const kind of ["polar", "global"]) {
    const m = LOLA_MAPS[kind];
    assert.ok(m.minKm < 0 && m.maxKm > 0, `${kind}: el rango cruza 0 km`);
    assert.ok(m.maxKm - m.minKm < 25, `${kind}: rango plausible para la Luna`);
  }
  assert.equal(LOLA_MAPS.polar.edgeLat, -60); // misma proyección que map.js
  assert.match(LOLA_MAPS.source.url, /svs\.gsfc\.nasa\.gov\/4720/);
  assert.match(LOLA_MAPS.source.sha256, /^[0-9a-f]{64}$/);
});

test("los PNG generados existen con el tamaño declarado y en RGB", () => {
  const polar = pngHeader(pub(LOLA_MAPS.polar.file));
  assert.deepEqual(polar, { width: LOLA_MAPS.polar.size, height: LOLA_MAPS.polar.size, colorType: 2 });
  const global = pngHeader(pub(LOLA_MAPS.global.file));
  assert.deepEqual(global, { width: LOLA_MAPS.global.width, height: LOLA_MAPS.global.height, colorType: 2 });
});
