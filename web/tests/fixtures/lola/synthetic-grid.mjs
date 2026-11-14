/**
 * Fixture SINTÉTICO para pruebas del pipeline LOLA. NO es un producto NASA,
 * no se usa en la web ni sustituye a LDEM_60S_240M_FLOAT / LDEC_60S_240M.
 *
 * Escribe en un directorio temporal dos rasters crudos con el mismo formato que
 * el producto real (float32 LE en km e int16 LE de conteos) pero con una grilla
 * de 32 × 32 píxeles de 60 km, para que todos los sitios al sur de −60° caigan
 * dentro con archivos de pocos KB. Los valores son fórmulas que permiten
 * comprobar exactamente qué píxel se leyó.
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SYNTHETIC_GRID = Object.freeze({
  lines: 32,
  samples: 32,
  lineOffset: 15.5,
  sampleOffset: 15.5,
  scaleM: 60000,
  radiusM: 1737400,
  maxLatitude: -60,
});

/** Altura sintética en km del píxel (line, sample). */
export const syntheticHeightKm = (line, sample) => -2 + line * 0.1 + sample * 0.001;
/** Conteo sintético: hay píxeles con 0 (sin medición directa). */
export const syntheticCount = (line, sample) => (line + sample) % 3;

export function writeSyntheticRasters({ grid = SYNTHETIC_GRID, heightKm = syntheticHeightKm, count = syntheticCount } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "selene-lola-synthetic-"));
  const n = grid.lines * grid.samples;
  const dem = Buffer.alloc(n * 4);
  const counts = Buffer.alloc(n * 2);
  for (let l = 0; l < grid.lines; l++) {
    for (let s = 0; s < grid.samples; s++) {
      const i = l * grid.samples + s;
      dem.writeFloatLE(heightKm(l, s), i * 4);
      counts.writeInt16LE(count(l, s), i * 2);
    }
  }
  const demPath = join(dir, "synthetic_dem_float32le.img");
  const countsPath = join(dir, "synthetic_counts_int16le.img");
  writeFileSync(demPath, dem);
  writeFileSync(countsPath, counts);
  return { dir, demPath, countsPath, grid };
}
