/**
 * Adaptador puro de efemérides JPL Horizons (ASTRO-01, DEC-024).
 *
 * Construye consultas, interpreta la respuesta oficial de la API
 * (envoltura JSON + tabla CSV entre $$SOE y $$EOE), valida y normaliza.
 *
 * Reglas del módulo:
 * - Sin red: no usa fetch ni XMLHttpRequest. La adquisición vive fuera del
 *   navegador, en `web/scripts/fetch-horizons.mjs`.
 * - Sin DOM, sin dependencias de `ui/` ni de módulos de Node.
 * - Los faltantes ("n.a.") se representan como `null` y se cuentan en
 *   `coverage.missing`; nunca como cero ni interpolados.
 * - Los valores fuera de rango o mal formados son errores (`HorizonsError`),
 *   no se recortan.
 * - La altura del observador es obligatoria y declara su base: no se acepta
 *   `elevationKm` (ex parámetro sintético del horizonte, DEC-005; quitado de
 *   los sitios en DEC-063) como altura.
 *
 * Todavía no lo consume `analysis.js` ni la UI: eso pertenece a CORE-01.
 */
import { assertLatitude, normalizeLongitude } from "./coordinates.js";

const DAY_MS = 86_400_000;
/** JD del instante Unix 0 (1970-01-01T00:00:00Z). */
const JD_UNIX_EPOCH = 2440587.5;

/** Fuente oficial y versión de la API contra la que se validó el parser. */
export const HORIZONS_SOURCE = Object.freeze({
  id: "jpl-horizons-api",
  name: "NASA/JPL Horizons API",
  endpoint: "https://ssd.jpl.nasa.gov/api/horizons.api",
  docs: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
  manual: "https://ssd.jpl.nasa.gov/horizons/manual.html",
  apiVersion: "1.2",
});

/**
 * Perfil de consulta acordado (Issue #6). Cambiar cualquier valor obliga a
 * subir `version`, porque la versión forma parte de la clave de caché.
 */
export const HORIZONS_PROFILE = Object.freeze({
  version: "selene-observer-v1",
  params: Object.freeze({
    EPHEM_TYPE: "OBSERVER",
    COORD_TYPE: "GEODETIC",
    TIME_TYPE: "UT",
    CAL_FORMAT: "JD",
    ANG_FORMAT: "DEG",
    APPARENT: "AIRLESS",
    REF_SYSTEM: "ICRF",
    QUANTITIES: "4,10,13",
    CSV_FORMAT: "YES",
    ELEV_CUT: "-90",
  }),
  /** Centro: sitio definido por coordenadas sobre la Luna (301). */
  center: "coord@301",
});

/** Cuerpos objetivo admitidos y su código Horizons. */
export const HORIZONS_TARGETS = Object.freeze({ sun: "10", earth: "399" });

/** Base declarada de la altura del observador. */
export const ALTITUDE_BASIS = Object.freeze({
  /** Altura medida respecto del datum/esfera de referencia, con fuente. */
  measured: "measured-datum",
  /** 0 km sobre la esfera de 1737,4 km: SUPUESTO explícito, no medida. */
  assumedZero: "assumed-zero-reference-sphere",
});

/** Columnas esperadas para QUANTITIES=4,10,13 con CAL_FORMAT=JD y CSV. */
export const EXPECTED_COLUMNS = Object.freeze([
  "Date_________JDUT",
  "",
  "",
  "Azi_(a-app)",
  "Elev_(a-app)",
  "Illu%",
  "Ang-diam",
]);

/** Límite de filas por consulta (margen bajo el máximo de salida de Horizons). */
export const MAX_ROWS = 50_000;

/** Máximo |ms| representable por `Date` (ECMAScript: ±8,64e15 ms desde 1970). */
const MAX_DATE_MS = 8.64e15;

/** Tolerancia para comparar el sitio que Horizons dice haber usado. */
const SITE_TOLERANCE_DEG = 1e-6;
const ALT_TOLERANCE_KM = 1e-6;

export class HorizonsError extends Error {
  /** @param {string} code  @param {string} message  @param {object} [details] */
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HorizonsError";
    this.code = code;
    this.details = details;
  }
}

const fail = (code, message, details) => {
  throw new HorizonsError(code, message, details);
};

// ---------------------------------------------------------------------------
// Petición normalizada
// ---------------------------------------------------------------------------

/**
 * Valida y normaliza una petición.
 *
 * @param {object} input
 * @param {"sun"|"earth"} input.target
 * @param {{lat:number, lon:number, altitudeKm:number, altitudeBasis:string, id?:string}} input.site
 *   Latitud planetocéntrica y longitud este en grados (MOON_ME, DEC-019);
 *   `altitudeKm` sobre la esfera de referencia de Horizons (1737,4 km).
 * @param {number} input.startMs  Unix ms UTC, en minuto exacto.
 * @param {number} input.stopMs   Unix ms UTC, en minuto exacto, > startMs.
 * @param {number} input.stepMinutes  entero ≥ 1 que divide el intervalo.
 */
export function normalizeRequest(input) {
  if (!input || typeof input !== "object") fail("invalid-request", "petición vacía");
  const { target, site, startMs, stopMs, stepMinutes } = input;

  if (!Object.hasOwn(HORIZONS_TARGETS, target)) {
    fail("invalid-target", `objetivo no admitido: ${target} (usar sun | earth)`);
  }
  if (!site || typeof site !== "object") fail("invalid-site", "falta el sitio");

  let lat;
  let lon;
  try {
    lat = assertLatitude(site.lat);
    lon = normalizeLongitude(site.lon);
  } catch (err) {
    fail("invalid-site", err.message);
  }

  if (site.altitudeKm === undefined || site.altitudeKm === null) {
    const hint = "elevationKm" in site ? " (elevationKm es sintético, DEC-005: no se usa como altura)" : "";
    fail("missing-altitude", `falta altitudeKm del observador${hint}`);
  }
  if (!Number.isFinite(site.altitudeKm)) fail("invalid-altitude", `altitudeKm inválida: ${site.altitudeKm}`);
  if (!Object.values(ALTITUDE_BASIS).includes(site.altitudeBasis)) {
    fail("invalid-altitude", `altitudeBasis debe ser ${Object.values(ALTITUDE_BASIS).join(" | ")}`);
  }
  if (site.altitudeBasis === ALTITUDE_BASIS.assumedZero && site.altitudeKm !== 0) {
    fail("invalid-altitude", "altitudeBasis assumed-zero exige altitudeKm = 0");
  }

  for (const [name, ms] of [["startMs", startMs], ["stopMs", stopMs]]) {
    if (!Number.isSafeInteger(ms)) fail("invalid-interval", `${name} debe ser Unix ms entero`);
    if (Math.abs(ms) > MAX_DATE_MS) {
      fail("invalid-interval", `${name} fuera del rango válido de Date (±${MAX_DATE_MS} ms)`);
    }
    if (ms % 60_000 !== 0) fail("invalid-interval", `${name} debe caer en minuto exacto`);
  }
  if (stopMs <= startMs) fail("invalid-interval", "stopMs debe ser posterior a startMs");
  if (!Number.isInteger(stepMinutes) || stepMinutes < 1) {
    fail("invalid-step", `stepMinutes debe ser un entero ≥ 1: ${stepMinutes}`);
  }
  const span = stopMs - startMs;
  if (span % (stepMinutes * 60_000) !== 0) {
    fail("invalid-step", "el paso debe dividir exactamente el intervalo");
  }
  const expectedRows = span / (stepMinutes * 60_000) + 1;
  if (expectedRows > MAX_ROWS) fail("too-many-rows", `${expectedRows} filas > ${MAX_ROWS}`);

  return Object.freeze({
    target,
    command: HORIZONS_TARGETS[target],
    site: Object.freeze({
      ...(site.id ? { id: String(site.id) } : {}),
      lat,
      lon,
      altitudeKm: Object.is(site.altitudeKm, -0) ? 0 : site.altitudeKm,
      altitudeBasis: site.altitudeBasis,
    }),
    startMs,
    stopMs,
    stepMinutes,
    expectedRows,
  });
}

// ---------------------------------------------------------------------------
// Constructor de la consulta
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD HH:MM" en UTC (formato de calendario aceptado por Horizons). */
export function formatHorizonsTime(ms) {
  return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

/** Número sin notación exponencial ni ceros espurios. */
function formatNumber(value) {
  const text = String(value);
  if (/e/i.test(text)) return value.toFixed(12).replace(/\.?0+$/, "");
  return text;
}

/**
 * Parámetros de la API en orden fijo. Los valores van entre comillas
 * simples, como en los ejemplos oficiales de la API.
 * @returns {Array<[string, string]>}
 */
export function buildQueryParams(request) {
  const r = normalizeRequest(request);
  const p = HORIZONS_PROFILE.params;
  const q = (value) => `'${value}'`;
  const siteCoord = [r.site.lon, r.site.lat, r.site.altitudeKm].map(formatNumber).join(",");
  return [
    ["format", "json"],
    ["COMMAND", q(r.command)],
    ["OBJ_DATA", q("NO")],
    ["MAKE_EPHEM", q("YES")],
    ["EPHEM_TYPE", q(p.EPHEM_TYPE)],
    ["CENTER", q(HORIZONS_PROFILE.center)],
    ["COORD_TYPE", q(p.COORD_TYPE)],
    ["SITE_COORD", q(siteCoord)],
    ["START_TIME", q(formatHorizonsTime(r.startMs))],
    ["STOP_TIME", q(formatHorizonsTime(r.stopMs))],
    ["STEP_SIZE", q(`${r.stepMinutes} m`)],
    ["TIME_TYPE", q(p.TIME_TYPE)],
    ["CAL_FORMAT", q(p.CAL_FORMAT)],
    ["ANG_FORMAT", q(p.ANG_FORMAT)],
    ["APPARENT", q(p.APPARENT)],
    ["REF_SYSTEM", q(p.REF_SYSTEM)],
    ["QUANTITIES", q(p.QUANTITIES)],
    ["CSV_FORMAT", q(p.CSV_FORMAT)],
    ["ELEV_CUT", q(p.ELEV_CUT)],
  ];
}

/** URL completa de la consulta (no la ejecuta). */
export function buildQueryUrl(request) {
  const search = buildQueryParams(request)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${HORIZONS_SOURCE.endpoint}?${search}`;
}

/**
 * Clave de caché canónica: incluye fuente, versión de API, versión de perfil,
 * objetivo, coordenadas, altura y su base, intervalo y paso. Se puede pasar
 * `meta` para versionar otra fuente o perfil.
 */
export function cacheKey(request, meta = {}) {
  const r = normalizeRequest(request);
  const source = meta.source ?? HORIZONS_SOURCE.id;
  const apiVersion = meta.apiVersion ?? HORIZONS_SOURCE.apiVersion;
  const profile = meta.profileVersion ?? HORIZONS_PROFILE.version;
  return [
    `src=${source}`,
    `api=${apiVersion}`,
    `profile=${profile}`,
    `target=${r.command}`,
    `lon=${formatNumber(r.site.lon)}`,
    `lat=${formatNumber(r.site.lat)}`,
    `altKm=${formatNumber(r.site.altitudeKm)}`,
    `altBasis=${r.site.altitudeBasis}`,
    `start=${new Date(r.startMs).toISOString()}`,
    `stop=${new Date(r.stopMs).toISOString()}`,
    `stepMin=${r.stepMinutes}`,
  ].join("|");
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Valida la envoltura JSON de la API y devuelve el texto `result`.
 * @param {string|object} body  cuerpo crudo (texto) u objeto ya parseado.
 */
export function unwrapApiResponse(body) {
  let json = body;
  if (typeof body === "string") {
    try {
      json = JSON.parse(body);
    } catch {
      fail("invalid-envelope", "la respuesta no es JSON");
    }
  }
  if (!json || typeof json !== "object") fail("invalid-envelope", "respuesta vacía");
  const signature = json.signature ?? {};
  if (signature.source !== HORIZONS_SOURCE.name) {
    fail("invalid-envelope", `firma inesperada: ${signature.source}`);
  }
  if (typeof json.error === "string" && json.error.trim()) {
    fail("api-error", json.error.trim(), { apiVersion: signature.version });
  }
  if (typeof json.result !== "string") fail("invalid-envelope", "falta result");
  return { result: json.result, apiVersion: String(signature.version ?? "") };
}

/** Valor del encabezado "Etiqueta : valor" (primera aparición). */
function headerField(text, label) {
  const re = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\s*:\\s*(.*)$`, "m");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/** Separa "Sun (10)   {source: DE441}" en nombre, id y fuente. */
function parseBody(value) {
  if (!value) return null;
  const m = value.match(/^(.*?)\s*\((-?\d+)\)\s*(?:\{source:\s*([^}]+)\})?/);
  if (!m) return { name: value, id: null, ephemeris: null };
  return { name: m[1].trim(), id: m[2], ephemeris: m[3] ? m[3].trim() : null };
}

/** Separa "188.13, -89.7668, 1.9E-13  {E-lon(deg),Lat(deg),Alt(km)}". */
function parseCenterGeodetic(value) {
  if (!value) return null;
  const nums = value.split("{")[0].split(",").map((s) => Number(s.trim()));
  if (nums.length !== 3 || nums.some((n) => !Number.isFinite(n))) return null;
  return { lonEDeg: nums[0], latDeg: nums[1], altKm: nums[2] };
}

function parseRadii(value) {
  if (!value) return null;
  const nums = value.split("km")[0].split(",").map((s) => Number(s.trim()));
  return nums.length === 3 && nums.every(Number.isFinite) ? nums : null;
}

/** JD (texto) → Unix ms, separando parte entera y fraccionaria para no perder precisión. */
export function jdToUnixMs(jdText) {
  const text = String(jdText).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) fail("invalid-value", `JD inválido: ${jdText}`);
  const [intPart, frac = "0"] = text.split(".");
  const dayMs = (Number(intPart) - JD_UNIX_EPOCH) * DAY_MS;
  return Math.round(dayMs + Number(`0.${frac}`) * DAY_MS);
}

const NOT_AVAILABLE = "n.a.";

/** Convierte una celda numérica; "n.a." → null. */
function numericCell(raw, field, row) {
  const text = raw.trim();
  if (text === NOT_AVAILABLE) return null;
  if (text === "" || !/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(text)) {
    fail("invalid-value", `valor no numérico en ${field}, fila ${row}: "${raw}"`, { field, row });
  }
  return Number(text);
}

const RANGES = {
  azimuthDeg: (v) => v >= 0 && v < 360,
  elevationDeg: (v) => v >= -90 && v <= 90,
  illuminatedPct: (v) => v >= 0 && v <= 100,
  angularDiameterArcsec: (v) => v > 0,
};

/**
 * Interpreta el texto `result` de una tabla OBSERVER con el perfil acordado.
 * No compara contra la petición; eso lo hace `normalizeHorizons()`.
 */
export function parseObserverTable(resultText) {
  if (typeof resultText !== "string") fail("invalid-envelope", "result debe ser texto");
  const soe = resultText.indexOf("$$SOE");
  const eoe = resultText.indexOf("$$EOE");
  if (soe === -1 || eoe === -1 || eoe < soe) {
    const excerpt = resultText.trim().split("\n").slice(0, 8).join("\n");
    fail("no-ephemeris", "la respuesta no contiene una tabla $$SOE/$$EOE", { excerpt });
  }

  const header = resultText.slice(0, soe);
  const headerLines = header.trimEnd().split("\n");
  // La línea de columnas es la anterior a la última fila de asteriscos.
  const columnLine = headerLines[headerLines.length - 2] ?? "";
  const columns = columnLine.split(",").map((s) => s.trim());
  if (columns.at(-1) === "") columns.pop();
  if (columns.length !== EXPECTED_COLUMNS.length || columns.some((c, i) => c !== EXPECTED_COLUMNS[i])) {
    fail("unexpected-columns", `columnas inesperadas: ${columnLine.trim()}`, { columns });
  }

  const meta = {
    target: parseBody(headerField(header, "Target body name")),
    center: parseBody(headerField(header, "Center body name")),
    centerSiteName: headerField(header, "Center-site name"),
    centerGeodetic: parseCenterGeodetic(headerField(header, "Center geodetic")),
    centerPole: headerField(header, "Center pole/equ")?.split("{")[0].trim() ?? null,
    centerRadiiKm: parseRadii(headerField(header, "Center radii")),
    startTime: headerField(header, "Start time"),
    stopTime: headerField(header, "Stop  time"),
    stepSize: headerField(header, "Step-size"),
    atmosRefraction: headerField(header, "Atmos refraction"),
    angleFormat: headerField(header, "RA format"),
    timeFormat: headerField(header, "Time format"),
    tableFormat: headerField(header, "Table format"),
    eopFile: headerField(header, "EOP file"),
    eopCoverage: headerField(header, "EOP coverage"),
    generatedAt: (header.match(/^Ephemeris \/ \S+\s+(\w{3} \w{3}\s+\d{1,2} \d{2}:\d{2}:\d{2} \d{4})/m) ?? [])[1] ?? null,
  };

  const rows = resultText
    .slice(soe + 5, eoe)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "");
  if (rows.length === 0) fail("empty-table", "la tabla no tiene filas");

  const samples = {
    timeMs: [],
    jdUt: [],
    solarPresence: [],
    interfererPresence: [],
    azimuthDeg: [],
    elevationDeg: [],
    illuminatedPct: [],
    angularDiameterArcsec: [],
  };
  const missing = { azimuthDeg: 0, elevationDeg: 0, illuminatedPct: 0, angularDiameterArcsec: 0 };
  const fields = ["azimuthDeg", "elevationDeg", "illuminatedPct", "angularDiameterArcsec"];

  rows.forEach((line, i) => {
    const cells = line.split(",");
    if (cells.at(-1).trim() === "") cells.pop();
    if (cells.length !== EXPECTED_COLUMNS.length) {
      fail("invalid-row", `fila ${i} con ${cells.length} columnas`, { row: i, line });
    }
    const jdText = cells[0].trim();
    samples.jdUt.push(Number(jdText));
    samples.timeMs.push(jdToUnixMs(jdText));
    samples.solarPresence.push(cells[1].trim());
    samples.interfererPresence.push(cells[2].trim());
    fields.forEach((field, k) => {
      const value = numericCell(cells[3 + k], field, i);
      if (value === null) missing[field] += 1;
      else if (!RANGES[field](value)) {
        fail("out-of-range", `${field} fuera de rango en fila ${i}: ${value}`, { field, row: i, value });
      }
      samples[field].push(value);
    });
  });

  for (let i = 1; i < samples.timeMs.length; i++) {
    if (samples.timeMs[i] <= samples.timeMs[i - 1]) {
      fail("non-monotonic", `instantes no crecientes en fila ${i}`, { row: i });
    }
  }

  return { meta, columns, samples, missing };
}

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

const angularDiff = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * Valida la tabla contra la petición y produce la serie normalizada.
 *
 * @param {string|object} body  cuerpo crudo de la API (texto JSON) u objeto.
 * @param {object} request  petición (se normaliza si hace falta).
 * @param {object} [retrieval]  metadatos de adquisición: `queryUrl`,
 *   `retrievedAt` (ISO), `httpStatus`, `rawFile`, `rawSha256`.
 */
export function normalizeHorizons(body, request, retrieval = {}) {
  const req = normalizeRequest(request);
  const { result, apiVersion } = unwrapApiResponse(body);
  const { meta, samples, missing } = parseObserverTable(result);
  const warnings = [];

  if (apiVersion !== HORIZONS_SOURCE.apiVersion) {
    warnings.push(`versión de API ${apiVersion} distinta de la validada (${HORIZONS_SOURCE.apiVersion})`);
  }
  if (meta.target?.id !== req.command) {
    fail("target-mismatch", `objetivo ${meta.target?.id} ≠ ${req.command}`);
  }
  if (meta.center?.id !== "301") fail("center-mismatch", `centro ${meta.center?.id} ≠ 301`);
  const g = meta.centerGeodetic;
  if (
    !g ||
    angularDiff(g.lonEDeg, req.site.lon) > SITE_TOLERANCE_DEG ||
    Math.abs(g.latDeg - req.site.lat) > SITE_TOLERANCE_DEG ||
    Math.abs(g.altKm - req.site.altitudeKm) > ALT_TOLERANCE_KM
  ) {
    fail("site-mismatch", "el sitio informado por Horizons no coincide con la petición", { centerGeodetic: g });
  }
  if (!/AIRLESS/.test(meta.atmosRefraction ?? "")) fail("profile-mismatch", "se esperaba APPARENT=AIRLESS");
  if (!/^JD\b/.test(meta.timeFormat ?? "")) fail("profile-mismatch", "se esperaba CAL_FORMAT=JD");
  if (!/^DEG\b/.test(meta.angleFormat ?? "")) fail("profile-mismatch", "se esperaba ANG_FORMAT=DEG");
  if (!/Comma Separated/.test(meta.tableFormat ?? "")) fail("profile-mismatch", "se esperaba CSV_FORMAT=YES");

  const stepMs = req.stepMinutes * 60_000;
  const n = samples.timeMs.length;
  if (n !== req.expectedRows) {
    fail("coverage-mismatch", `${n} filas, se esperaban ${req.expectedRows}`);
  }
  if (samples.timeMs[0] !== req.startMs || samples.timeMs[n - 1] !== req.stopMs) {
    fail("coverage-mismatch", "la tabla no cubre exactamente el intervalo pedido");
  }
  for (let i = 1; i < n; i++) {
    if (samples.timeMs[i] - samples.timeMs[i - 1] !== stepMs) {
      fail("step-mismatch", `paso irregular en fila ${i}`, { row: i });
    }
  }

  const missingTotal = Object.values(missing).reduce((a, b) => a + b, 0);
  if (missingTotal > 0) warnings.push(`${missingTotal} valores "n.a." representados como null`);

  const assumptions = [];
  if (req.site.altitudeBasis === ALTITUDE_BASIS.assumedZero) {
    assumptions.push(
      "Altura del observador = 0 km sobre la esfera de referencia de 1737,4 km: SUPUESTO, no medida (falta altura datum del sitio).",
    );
  }
  assumptions.push(
    "Sitio en MOON_ME/DE421 (DEC-019) pasado sin transformación al marco MEAN_ME que usa Horizons (DE441); diferencia entre realizaciones no evaluada.",
    "Elevación respecto del plano tangente local (horizonte matemático); no incluye topografía.",
    "Instantes: JD UT de Horizons (UTC desde 1962) convertidos a Unix ms sin segundos intercalares.",
  );

  return {
    schema: "selene.horizons.observer/1",
    cacheKey: cacheKey(req),
    source: {
      ...HORIZONS_SOURCE,
      apiVersionReturned: apiVersion,
      ephemeris: meta.target?.ephemeris ?? null,
      generatedAt: meta.generatedAt,
      queryUrl: retrieval.queryUrl ?? buildQueryUrl(req),
      retrievedAt: retrieval.retrievedAt ?? null,
      httpStatus: retrieval.httpStatus ?? null,
      rawFile: retrieval.rawFile ?? null,
      rawSha256: retrieval.rawSha256 ?? null,
    },
    profile: { version: HORIZONS_PROFILE.version, center: HORIZONS_PROFILE.center, ...HORIZONS_PROFILE.params },
    request: {
      target: req.target,
      command: req.command,
      site: { ...req.site },
      startMs: req.startMs,
      stopMs: req.stopMs,
      stepMinutes: req.stepMinutes,
    },
    target: meta.target,
    frame: {
      center: meta.center,
      centerSiteName: meta.centerSiteName,
      centerGeodetic: meta.centerGeodetic,
      centerPole: meta.centerPole,
      centerRadiiKm: meta.centerRadiiKm,
      coordType: HORIZONS_PROFILE.params.COORD_TYPE,
      // Horizons no repite REF_SYSTEM en el encabezado: se registra el valor pedido.
      refSystemRequested: HORIZONS_PROFILE.params.REF_SYSTEM,
      apparent: meta.atmosRefraction,
      timeScale: "UT (UTC)",
      eopFile: meta.eopFile,
      eopCoverage: meta.eopCoverage,
    },
    units: {
      timeMs: "Unix ms UTC (desde JD UT)",
      jdUt: "día juliano UT",
      azimuthDeg: "grados desde el norte, sentido horario, aparente sin aire",
      elevationDeg: "grados sobre el plano tangente local, aparente sin aire",
      illuminatedPct: "porcentaje del disco iluminado",
      angularDiameterArcsec: "segundos de arco (diámetro ecuatorial)",
      solarPresence: "código Horizons: '*' borde superior del Sol sobre el horizonte aparente (sin topografía); '' noche",
      interfererPresence: "código Horizons: 'i' borde superior del cuerpo interferente sobre el horizonte aparente; '' no",
    },
    coverage: {
      startMs: samples.timeMs[0],
      stopMs: samples.timeMs[n - 1],
      stepMinutes: req.stepMinutes,
      rows: n,
      missing,
      complete: missingTotal === 0,
    },
    samples,
    assumptions,
    warnings,
  };
}
