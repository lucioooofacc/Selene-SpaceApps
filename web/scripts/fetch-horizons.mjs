#!/usr/bin/env node
/**
 * Adquisición reproducible de efemérides JPL Horizons (ASTRO-01, DEC-020).
 *
 * Corre en Node, FUERA del navegador. Consulta la API oficial con el perfil
 * de `src/lib/horizons.js`, guarda la respuesta cruda tal cual y la serie
 * normalizada, y reutiliza la caché si ya existe la misma clave.
 *
 * Uso:
 *   node scripts/fetch-horizons.mjs --site shackleton --assume-zero-altitude \
 *     --start 2026-11-14T00:00Z --stop 2026-11-16T00:00Z --step-min 60 \
 *     [--targets sun,earth] [--out .cache/horizons] [--force] [--offline]
 *
 *   --site <id>               sitio curado de src/data/sites.js, o bien
 *   --lat <deg> --lon <deg>   coordenadas MOON_ME (lon este positiva)
 *   --alt-km <km>             altura medida sobre la esfera de 1737,4 km
 *   --assume-zero-altitude    usa 0 km como SUPUESTO explícito (sin altura datum)
 *   --force                   ignora la caché y vuelve a consultar
 *   --offline                 solo lee la caché; falla si no existe
 *
 * Salida por objetivo en --out (por defecto .cache/horizons, ignorado por git):
 *   <target>-<hash>.raw.json         cuerpo de la API sin modificar
 *   <target>-<hash>.normalized.json  serie validada con metadatos
 *   manifest.json                    índice clave → archivos
 *
 * `elevationKm` de sites.js es sintético (DEC-005) y NO se usa como altura.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  ALTITUDE_BASIS,
  HORIZONS_TARGETS,
  buildQueryUrl,
  cacheKey,
  normalizeHorizons,
  normalizeRequest,
} from "../src/lib/horizons.js";
import { SITES } from "../src/data/sites.js";

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function usage(message) {
  console.error(`error: ${message}\nVer el encabezado de scripts/fetch-horizons.mjs para el uso.`);
  process.exit(2);
}

function parseUtc(text, name) {
  if (!text) usage(`falta --${name}`);
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || !/(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    usage(`--${name} debe ser ISO 8601 con zona explícita (p. ej. 2026-11-14T00:00Z)`);
  }
  return ms;
}

function resolveSite(values) {
  let base;
  if (values.site) {
    const found = SITES.find((s) => s.id === values.site);
    if (!found) usage(`sitio desconocido: ${values.site} (${SITES.map((s) => s.id).join(", ")})`);
    base = { id: found.id, lat: found.lat, lon: found.lon };
  } else {
    if (values.lat === undefined || values.lon === undefined) usage("usar --site o --lat y --lon");
    base = { lat: Number(values.lat), lon: Number(values.lon) };
  }
  if (values["alt-km"] !== undefined && values["assume-zero-altitude"]) {
    usage("--alt-km y --assume-zero-altitude son excluyentes");
  }
  if (values["alt-km"] !== undefined) {
    return { ...base, altitudeKm: Number(values["alt-km"]), altitudeBasis: ALTITUDE_BASIS.measured };
  }
  if (values["assume-zero-altitude"]) {
    return { ...base, altitudeKm: 0, altitudeBasis: ALTITUDE_BASIS.assumedZero };
  }
  return usage("falta la altura: --alt-km <km> (medida) o --assume-zero-altitude (supuesto)");
}

async function fetchRaw(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  // La API responde errores de consulta con HTTP 200 y campo "error";
  // otros códigos (400, 405, 500, 503) se informan sin cachear.
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return { text, status: res.status };
}

async function readManifest(path) {
  if (!existsSync(path)) return { schema: "selene.horizons.manifest/1", entries: [] };
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const { values } = parseArgs({
    options: {
      site: { type: "string" },
      lat: { type: "string" },
      lon: { type: "string" },
      "alt-km": { type: "string" },
      "assume-zero-altitude": { type: "boolean", default: false },
      start: { type: "string" },
      stop: { type: "string" },
      "step-min": { type: "string" },
      targets: { type: "string", default: "sun,earth" },
      out: { type: "string", default: ".cache/horizons" },
      force: { type: "boolean", default: false },
      offline: { type: "boolean", default: false },
    },
  });

  const site = resolveSite(values);
  const startMs = parseUtc(values.start, "start");
  const stopMs = parseUtc(values.stop, "stop");
  const stepMinutes = Number(values["step-min"]);
  const targets = values.targets.split(",").map((t) => t.trim());
  for (const t of targets) if (!Object.hasOwn(HORIZONS_TARGETS, t)) usage(`objetivo desconocido: ${t}`);

  const outDir = resolve(values.out);
  await mkdir(outDir, { recursive: true });
  const manifestPath = join(outDir, "manifest.json");
  const manifest = await readManifest(manifestPath);

  for (const target of targets) {
    const request = normalizeRequest({ target, site, startMs, stopMs, stepMinutes });
    const key = cacheKey(request);
    const hash = sha256(key).slice(0, 16);
    const rawFile = `${target}-${hash}.raw.json`;
    const normFile = `${target}-${hash}.normalized.json`;
    const rawPath = join(outDir, rawFile);
    const normPath = join(outDir, normFile);
    const queryUrl = buildQueryUrl(request);

    let retrieval;
    let raw;
    if (existsSync(rawPath) && existsSync(normPath) && !values.force) {
      const cached = JSON.parse(await readFile(normPath, "utf8"));
      if (cached.cacheKey !== key) throw new Error(`clave en caché distinta en ${normFile}`);
      raw = await readFile(rawPath, "utf8");
      if (sha256(raw) !== cached.source.rawSha256) throw new Error(`hash crudo distinto en ${rawFile}`);
      retrieval = {
        queryUrl: cached.source.queryUrl,
        retrievedAt: cached.source.retrievedAt,
        httpStatus: cached.source.httpStatus,
        rawFile,
        rawSha256: cached.source.rawSha256,
      };
      console.log(`caché  ${target}: ${normFile}`);
    } else {
      if (values.offline) throw new Error(`sin caché para ${target} (${key}) y --offline activo`);
      const retrievedAt = new Date().toISOString();
      const { text, status } = await fetchRaw(queryUrl);
      raw = text;
      retrieval = { queryUrl, retrievedAt, httpStatus: status, rawFile, rawSha256: sha256(raw) };
      console.log(`consulta ${target}: HTTP ${status}`);
    }

    // Valida antes de escribir: una respuesta con error no entra en la caché.
    const normalized = normalizeHorizons(raw, request, retrieval);
    await writeFile(rawPath, raw);
    await writeFile(normPath, `${JSON.stringify(normalized, null, 2)}\n`);

    manifest.entries = manifest.entries.filter((e) => e.cacheKey !== key);
    manifest.entries.push({ cacheKey: key, hash, target, raw: rawFile, normalized: normFile });
    manifest.entries.sort((a, b) => a.cacheKey.localeCompare(b.cacheKey));
    const { rows, missing } = normalized.coverage;
    console.log(`  ${rows} filas, faltantes ${JSON.stringify(missing)}${normalized.warnings.length ? `, avisos: ${normalized.warnings.join("; ")}` : ""}`);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((err) => {
  console.error(`error${err.code ? ` [${err.code}]` : ""}: ${err.message}`);
  process.exit(1);
});
