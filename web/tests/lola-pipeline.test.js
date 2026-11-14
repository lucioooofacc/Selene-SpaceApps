import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { LOLA_PRODUCT } from "../src/data/terrain/lola-ldem-60s-240m.js";
import { SITES } from "../src/data/sites.js";
import { downloadFile, md5File, verifyFile } from "../scripts/download-lola.mjs";
import { assertSizes, extractTile, prepareSites, windowAround } from "../scripts/prepare-lola.mjs";
import { LOLA_GRID, nearestPixel } from "../src/lib/terrain-data.js";
import { SYNTHETIC_GRID, syntheticCount, syntheticHeightKm, writeSyntheticRasters } from "./fixtures/lola/synthetic-grid.mjs";

const md5 = (buf) => createHash("md5").update(buf).digest("hex");

function fakeFetch(body, { status = 200 } = {}) {
  return async () => new Response(status === 200 ? body : null, { status });
}

test("download: MD5 en streaming, renombra solo si verifica", async (t) => {
  const { dir } = writeSyntheticRasters();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const body = Buffer.from("contenido sintético de prueba");
  const entry = { url: "https://example.invalid/x.img", md5: md5(body), bytes: body.length };
  const out = join(dir, "x.img");

  const first = await downloadFile(entry, out, { fetchImpl: fakeFetch(body) });
  assert.equal(first.skipped, false);
  assert.equal(first.md5, entry.md5);
  assert.deepEqual(readFileSync(out), body);
  assert.equal(await md5File(out), entry.md5);

  // Ya verificado: no vuelve a pedir el archivo.
  const second = await downloadFile(entry, out, {
    fetchImpl: () => assert.fail("no debería descargar de nuevo"),
  });
  assert.equal(second.skipped, true);
});

test("download: rechaza MD5, tamaño o HTTP incorrectos sin dejar archivos", async (t) => {
  const { dir } = writeSyntheticRasters();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const body = Buffer.from("abc");
  const out = join(dir, "bad.img");

  await assert.rejects(
    downloadFile({ url: "https://example.invalid/a", md5: "0".repeat(32), bytes: 3 }, out, { fetchImpl: fakeFetch(body) }),
    /MD5/,
  );
  await assert.rejects(
    downloadFile({ url: "https://example.invalid/b", md5: md5(body), bytes: 2 }, out, { fetchImpl: fakeFetch(body) }),
    /más de 2 bytes/,
  );
  await assert.rejects(
    downloadFile({ url: "https://example.invalid/c", md5: md5(body), bytes: 4 }, out, { fetchImpl: fakeFetch(body) }),
    /se esperaban 4/,
  );
  await assert.rejects(
    downloadFile({ url: "https://example.invalid/d", md5: md5(body), bytes: 3 }, out, { fetchImpl: fakeFetch(body, { status: 404 }) }),
    /HTTP 404/,
  );
  assert.equal(existsSync(out), false);
  assert.equal(existsSync(`${out}.part`), false);

  writeFileSync(out, "otro");
  assert.equal((await verifyFile(out, { md5: md5(body) })).ok, false);
});

test("prepare: rechaza rasters con tamaño distinto a la grilla", (t) => {
  const { dir, demPath, countsPath } = writeSyntheticRasters();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.doesNotThrow(() => assertSizes(demPath, countsPath, SYNTHETIC_GRID));
  assert.throws(() => assertSizes(demPath, countsPath, LOLA_GRID), /se esperaban/);
  assert.throws(() => assertSizes(countsPath, demPath, SYNTHETIC_GRID), /se esperaban/);
});

test("prepare: lee float32 LE (km → m) e int16 LE en la ventana correcta", (t) => {
  const fx = writeSyntheticRasters();
  t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
  const site = SITES.find((s) => s.id === "im1");
  const tile = extractTile(site, { ...fx, radiusPx: 2 });
  const c = nearestPixel(site.lat, site.lon, SYNTHETIC_GRID);

  assert.deepEqual(tile.window, { line0: c.line - 2, sample0: c.sample - 2, lines: 5, samples: 5 });
  assert.equal(tile.heightM.length, 25);
  assert.equal(tile.counts.length, 25);
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 5; col++) {
      const l = tile.window.line0 + r;
      const s = tile.window.sample0 + col;
      const expectedM = Math.round(Math.fround(syntheticHeightKm(l, s)) * 1e6) / 1e3;
      assert.equal(tile.heightM[r * 5 + col], expectedM);
      assert.equal(tile.counts[r * 5 + col], syntheticCount(l, s));
    }
  }
  assert.equal(tile.center.line, c.line);
  assert.equal(tile.center.direct, syntheticCount(c.line, c.sample) > 0);
  assert.equal(tile.source.dem.md5, LOLA_PRODUCT.dem.image.md5);
  assert.equal(tile.stats.zeroCountPixels, tile.counts.filter((n) => n === 0).length);
});

test("prepare: count = 0 marca el centro como interpolado aunque el DEM tenga valor", (t) => {
  const fx = writeSyntheticRasters({ count: () => 0 });
  t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
  const tile = extractTile(SITES[0], { ...fx, radiusPx: 1 });
  assert.ok(Number.isFinite(tile.center.heightM));
  assert.equal(tile.center.count, 0);
  assert.equal(tile.center.direct, false);
  assert.equal(tile.center.confidence, "baja");
  assert.equal(tile.stats.zeroCountFraction, 1);
});

test("prepare: cubre los 5 sitios australes y excluye Chang'e 4 y Apollo 11", (t) => {
  const fx = writeSyntheticRasters();
  t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
  const { tiles, excluded } = prepareSites({ ...fx, radiusPx: 1 });
  assert.deepEqual(tiles.map((x) => x.site.id).sort(), ["cabeus", "chandrayaan3", "im1", "malapert", "shackleton"]);
  assert.deepEqual(excluded.map((x) => x.id).sort(), ["apollo11", "change4"]);
});

test("prepare: rechaza alturas no finitas y conteos negativos", (t) => {
  const bad = writeSyntheticRasters({ heightKm: () => Number.NaN });
  const neg = writeSyntheticRasters({ count: () => -1 });
  t.after(() => {
    rmSync(bad.dir, { recursive: true, force: true });
    rmSync(neg.dir, { recursive: true, force: true });
  });
  assert.throws(() => extractTile(SITES[0], { ...bad, radiusPx: 1 }), /no finita/);
  assert.throws(() => extractTile(SITES[0], { ...neg, radiusPx: 1 }), /negativo/);
});

test("prepare: la ventana se recorta en los bordes de la grilla", () => {
  assert.deepEqual(windowAround({ line: 0, sample: 31 }, 3, SYNTHETIC_GRID), { line0: 0, sample0: 28, lines: 4, samples: 4 });
});

// Prueba opcional con el producto real: solo corre si los rasters verificados
// están en LOLA_RAW_DIR (por defecto web/data/raw). No descarga nada.
const rawDir = process.env.LOLA_RAW_DIR ?? resolve(import.meta.dirname, "../data/raw");
const demPath = join(rawDir, LOLA_PRODUCT.dem.image.name);
const countsPath = join(rawDir, LOLA_PRODUCT.counts.image.name);
const hasReal = existsSync(demPath) && existsSync(countsPath);

test("producto real: orientación verificada con el fondo del cráter Shackleton", { skip: !hasReal && "sin rasters reales" }, () => {
  assertSizes(demPath, countsPath);
  const at = (lat, lon) => extractTile({ id: "check", lat, lon }, { demPath, countsPath, radiusPx: 0 }).center;
  // Centro USGS de Shackleton (−89,67°, 129,78° E). Con la orientación de
  // dsmap_polar.cat el centro cae en el fondo (km bajo el borde); las
  // posiciones espejadas caen fuera del cráter.
  const floor = at(-89.67, 129.78);
  assert.ok(floor.heightM < -2000, `fondo ${floor.heightM} m`);
  assert.ok(at(-89.67, -129.78).heightM > floor.heightM + 2000);
  assert.ok(at(-89.67, 50.22).heightM > floor.heightM + 2000);
});
