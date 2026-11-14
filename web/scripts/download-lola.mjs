#!/usr/bin/env node
/**
 * Descarga reproducible del producto LOLA seleccionado (TERRAIN-01, DEC-021):
 * LDEM_60S_240M_FLOAT V2.1 + LDEC_60S_240M (imágenes, etiquetas .lbl y .xml)
 * desde PDS Geosciences. Las URLs, tamaños y MD5 salen del manifiesto
 * `src/data/terrain/lola-ldem-60s-240m.js`; no se aceptan URLs arbitrarias.
 *
 * El MD5 se calcula en streaming mientras se escribe `<archivo>.part`; solo se
 * renombra al nombre final si el tamaño y el MD5 coinciden.
 *
 * Uso (desde web/):
 *   node scripts/download-lola.mjs [--out data/raw] [--only labels] [--dry-run]
 *   node scripts/download-lola.mjs --verify   (solo verifica lo ya descargado)
 */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { LOLA_FILES } from "../src/data/terrain/lola-ldem-60s-240m.js";

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = resolve(WEB_ROOT, "data/raw");

/** MD5 en streaming de un archivo local. */
export async function md5File(path) {
  const hash = createHash("md5");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

/** Verifica un archivo local contra `{ md5 }`. */
export async function verifyFile(path, expected) {
  if (!existsSync(path)) return { ok: false, reason: "no existe" };
  const md5 = await md5File(path);
  return md5 === expected.md5 ? { ok: true, md5 } : { ok: false, reason: `MD5 ${md5} ≠ ${expected.md5}` };
}

/**
 * Descarga `entry` (`{ url, md5, bytes }`) a `out`. Si el destino ya existe y
 * verifica, no se vuelve a descargar.
 */
export async function downloadFile(entry, out, { fetchImpl = globalThis.fetch, onProgress } = {}) {
  if ((await verifyFile(out, entry)).ok) return { out, skipped: true, md5: entry.md5 };

  const response = await fetchImpl(entry.url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status} al descargar ${entry.url}`);
  if (!response.body) throw new Error(`respuesta sin cuerpo: ${entry.url}`);

  mkdirSync(dirname(out), { recursive: true });
  const part = `${out}.part`;
  const hash = createHash("md5");
  let received = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > entry.bytes) {
        callback(new Error(`se recibieron más de ${entry.bytes} bytes: ${entry.url}`));
        return;
      }
      hash.update(chunk);
      onProgress?.(received, entry.bytes);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(part));
    if (received !== entry.bytes) throw new Error(`se recibieron ${received} bytes; se esperaban ${entry.bytes}`);
    const md5 = hash.digest("hex");
    if (md5 !== entry.md5) throw new Error(`MD5 ${md5} ≠ ${entry.md5}: ${entry.url}`);
    renameSync(part, out);
    return { out, skipped: false, md5 };
  } catch (error) {
    rmSync(part, { force: true });
    throw error;
  }
}

function selectFiles(only) {
  if (!only) return LOLA_FILES;
  if (only === "labels") return LOLA_FILES.filter((f) => !f.name.endsWith(".img"));
  throw new Error(`--only admite solo "labels"; recibido: ${only}`);
}

export async function main(argv = process.argv.slice(2)) {
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  const outDir = value("out") ? resolve(WEB_ROOT, value("out")) : DEFAULT_OUT;
  const files = selectFiles(value("only"));

  if (flag("dry-run")) {
    for (const f of files) console.log(`${f.url}\n  → ${join(outDir, f.name)} (${f.bytes} B, md5 ${f.md5})`);
    return 0;
  }

  let failures = 0;
  for (const f of files) {
    const out = join(outDir, f.name);
    if (flag("verify")) {
      const result = await verifyFile(out, f);
      console.log(`${result.ok ? "OK " : "ERR"} ${f.name}${result.ok ? "" : `: ${result.reason}`}`);
      if (!result.ok) failures++;
      continue;
    }
    let lastDecile = -1;
    const result = await downloadFile(f, out, {
      onProgress(received, total) {
        const decile = Math.floor((received / total) * 10);
        if (total > 10e6 && decile !== lastDecile) {
          lastDecile = decile;
          console.log(`  ${f.name}: ${decile * 10}%`);
        }
      },
    });
    console.log(`${result.skipped ? "ya verificado" : "descargado"}: ${f.name} (md5 ${result.md5})`);
  }
  return failures === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().then(
    (code) => (process.exitCode = code),
    (error) => {
      console.error(`ERROR: ${error.message}`);
      process.exitCode = 1;
    },
  );
}
