import test from "node:test";
import assert from "node:assert/strict";

import { LOLA_FILES, LOLA_PRODUCT } from "../src/data/terrain/lola-ldem-60s-240m.js";
import { SITES } from "../src/data/sites.js";
import {
  LOLA_GRID,
  isCovered,
  latLonToPixel,
  measurementFromCount,
  nearestPixel,
  pixelToLatLon,
  tileValueAt,
  validateTile,
} from "../src/lib/terrain-data.js";

test("el manifiesto fija el producto seleccionado (DEC-025)", () => {
  assert.equal(LOLA_PRODUCT.dataSetId, "LRO-L-LOLA-4-GDR-V1.0");
  assert.equal(LOLA_PRODUCT.doi, "10.17189/1520642");
  assert.equal(LOLA_PRODUCT.productVersion, "V2.1");
  assert.equal(LOLA_PRODUCT.dem.productId, "LDEM_60S_240M");
  assert.equal(LOLA_PRODUCT.counts.productId, "LDEC_60S_240M");
  assert.equal(LOLA_PRODUCT.dem.image.md5, "45d376f634f0c4ad2bf628fd5f66b3c0");
  assert.equal(LOLA_PRODUCT.dem.label.md5, "113c40f0f2a9af1f5311365e3836d754");
  assert.equal(LOLA_PRODUCT.dem.xml.md5, "eff8f4de7ee6de290ee1e992a30f164b");
  assert.equal(LOLA_PRODUCT.counts.image.md5, "4b7340bc337009aa02b80a1bf9eeadd4");
  assert.equal(LOLA_PRODUCT.counts.label.md5, "d7952c6d113fb0aa66e2e29d6c5c0b35");
  assert.equal(LOLA_PRODUCT.counts.xml.md5, "31f38d6a20db7b2a35eccb016d092411");
  assert.equal(LOLA_PRODUCT.grid.lines, 7760);
  assert.equal(LOLA_PRODUCT.grid.samples, 7760);
  assert.equal(LOLA_PRODUCT.grid.mapScaleM, 240);
  assert.equal(LOLA_PRODUCT.projection.sphereRadiusM, 1737400);
  // Tamaños de imagen = grilla × bytes por muestra.
  assert.equal(LOLA_PRODUCT.dem.image.bytes, 7760 * 7760 * 4);
  assert.equal(LOLA_PRODUCT.counts.image.bytes, 7760 * 7760 * 2);
  for (const f of LOLA_FILES) {
    assert.match(f.url, /^https:\/\/pds-geosciences\.wustl\.edu\/lro\/lro-l-lola-3-rdr-v1\/lrolol_1xxx\/data\/lola_gdr\/polar\//);
    assert.match(f.md5, /^[0-9a-f]{32}$/);
    assert.ok(Number.isInteger(f.bytes) && f.bytes > 0);
    assert.ok(f.url.endsWith(`/${f.name}`));
  }
  assert.equal(LOLA_FILES.length, 6);
});

test("el polo sur cae en el centro de la grilla", () => {
  const p = latLonToPixel(-90, 123);
  assert.ok(Math.abs(p.line - 3879.5) < 1e-9 && Math.abs(p.sample - 3879.5) < 1e-9);
  assert.equal(pixelToLatLon(3879.5, 3879.5).lat, -90);
});

test("orientación del polo sur: 0° arriba, 90° E a la derecha (dsmap_polar.cat)", () => {
  const c = 3879.5;
  const up = latLonToPixel(-80, 0);
  const right = latLonToPixel(-80, 90);
  const down = latLonToPixel(-80, 180);
  const left = latLonToPixel(-80, -90);
  assert.ok(up.line < c && Math.abs(up.sample - c) < 1e-6);
  assert.ok(right.sample > c && Math.abs(right.line - c) < 1e-6);
  assert.ok(down.line > c && Math.abs(down.sample - c) < 1e-6);
  assert.ok(left.sample < c && Math.abs(left.line - c) < 1e-6);
});

test("los bordes del raster coinciden con los valores publicados en dsmap_polar.cat", () => {
  // Borde exterior del píxel de la esquina: −48,48755°; del borde: −59,996°.
  assert.ok(Math.abs(pixelToLatLon(-0.5, -0.5).lat - -48.48755) < 1e-5);
  assert.ok(Math.abs(pixelToLatLon(-0.5, 3879.5).lat - -59.996) < 1e-3);
});

test("la proyección directa e inversa son consistentes", () => {
  for (let lat = -89.95; lat <= -60; lat += 1.7) {
    for (let lon = -180; lon < 180; lon += 13) {
      const { line, sample } = latLonToPixel(lat, lon);
      const back = pixelToLatLon(line, sample);
      assert.ok(Math.abs(back.lat - lat) < 1e-9, `lat ${lat}`);
      const dLon = ((back.lon - lon + 540) % 360) - 180;
      assert.ok(Math.abs(dLon) < 1e-7, `lon ${lon}`);
    }
  }
  // Continuidad 0°/360° y ±180°.
  assert.deepEqual(nearestPixel(-85, 0), nearestPixel(-85, 360));
  assert.deepEqual(nearestPixel(-85, -180), nearestPixel(-85, 180));
});

test("la escala es 240 m/píxel en el polo", () => {
  const a = pixelToLatLon(3879.5, 3879.5 + 1);
  // Arco desde el polo ≈ 240 m sobre la esfera de 1737,4 km.
  const arcM = ((a.lat + 90) * Math.PI) / 180 * LOLA_GRID.radiusM;
  assert.ok(Math.abs(arcM - 240) < 1e-3);
});

test("cobertura: los 5 sitios al sur de −60° están cubiertos; Chang'e 4 y Apollo 11 no", () => {
  const covered = SITES.filter((s) => isCovered(s.lat, s.lon)).map((s) => s.id);
  assert.deepEqual(covered.sort(), ["cabeus", "chandrayaan3", "im1", "malapert", "shackleton"]);
  const outside = SITES.filter((s) => !isCovered(s.lat, s.lon)).map((s) => s.id);
  assert.deepEqual(outside.sort(), ["apollo11", "change4"]);
  // Las esquinas del raster llegan a −48,5°, pero fuera de −60° no se considera cubierto.
  assert.equal(isCovered(-55, 45), false);
  assert.equal(isCovered(-60, 0), true);
  assert.equal(isCovered(10, 0), false);
});

test("count = 0 se interpreta como valor interpolado de baja confianza", () => {
  assert.deepEqual(measurementFromCount(0), { count: 0, direct: false, confidence: "baja" });
  assert.deepEqual(measurementFromCount(5), { count: 5, direct: true, confidence: "medida" });
  assert.throws(() => measurementFromCount(-1), RangeError);
  assert.throws(() => measurementFromCount(1.5), RangeError);
});

test("validación de recortes y lectura del píxel más cercano", () => {
  const center = nearestPixel(-89.7668, -171.87);
  const tile = {
    window: { line0: center.line - 1, sample0: center.sample - 1, lines: 3, samples: 3 },
    heightM: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    counts: [1, 1, 1, 1, 0, 1, 1, 1, 1],
  };
  assert.deepEqual(validateTile(tile), []);
  const v = tileValueAt(tile, -89.7668, -171.87);
  assert.equal(v.heightM, 5);
  assert.equal(v.direct, false);
  assert.equal(v.confidence, "baja");
  assert.equal(tileValueAt(tile, -80, 0), null);

  assert.ok(validateTile({ ...tile, counts: [1, 2] }).length > 0);
  assert.ok(validateTile({ ...tile, heightM: [...tile.heightM.slice(0, 8), Number.NaN] }).length > 0);
  assert.ok(validateTile({ ...tile, counts: [...tile.counts.slice(0, 8), -1] }).length > 0);
  assert.ok(validateTile({}).length > 0);
});

test("rechaza coordenadas inválidas o del hemisferio norte", () => {
  assert.throws(() => latLonToPixel(-91, 0), RangeError);
  assert.throws(() => latLonToPixel(Number.NaN, 0), RangeError);
  assert.throws(() => latLonToPixel(-80, Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => latLonToPixel(0.67, 23.47), RangeError);
});
