/**
 * Enlaces entre páginas (UI-05). La página de comparación recibe los sitios y
 * la ventana por la URL, para que se pueda compartir o recargar sin perder la
 * selección:
 *   compare.html?a=<sitio>&b=<sitio>&start=AAAA-MM-DD&days=N
 * La página de misión guarda su selección del mismo modo (UI-12):
 *   index.html?site=<sitio>&start=AAAA-MM-DD&days=N
 * (las fechas solo si el usuario las eligió).
 * Un sitio es el id de un sitio curado o "pt:lat,lon" para un punto del mapa;
 * un sitio propio con nombre agrega "~Nombre" (DEC-049): "pt:lat,lon~Nombre".
 */
import { SITES } from "../data/sites.js";
import { t } from "../i18n/index.js";
import { CUSTOM_ID, getSite } from "../state.js";

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Nombre elegido por el usuario: sin caracteres de HTML (se muestra con innerHTML) y hasta 40 caracteres. */
export const cleanLabel = (value) => String(value ?? "").replace(/[<>&"'`]/g, "").trim().slice(0, 40);

/** Nombre propio del sitio, si lo tiene: los creados con "+" (DEC-043) o los que llegaron con nombre por la URL. */
const labelOf = (site) => site.label ?? (String(site.id).startsWith("custom-") ? site.name : null);

/** Sitio → parámetro de URL. Los sitios propios ("+") viajan como punto, con su nombre si lo tienen. */
export function siteParam(site) {
  if (SITES.some((s) => s.id === site.id)) return site.id;
  const label = cleanLabel(labelOf(site));
  return `pt:${site.lat.toFixed(2)},${site.lon.toFixed(2)}${label ? `~${label}` : ""}`;
}

/** Parámetro de URL → sitio (curado o punto), o null si no es válido. */
export function parseSiteParam(value) {
  if (!value) return null;
  const curated = SITES.find((s) => s.id === value);
  if (curated) return curated;
  const m = /^pt:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:~(.+))?$/s.exec(value);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const label = cleanLabel(m[3]) || null;
  return { id: value, lat, lon, custom: true, label, name: label ?? t("compare.point", { lat: lat.toFixed(2), lon: lon.toFixed(2) }) };
}

export function compareUrl({ a, b, startMs, windowDays }) {
  const q = new URLSearchParams({ a: siteParam(a), b: siteParam(b), start: isoDay(startMs), days: String(windowDays) });
  return `./compare.html?${q}`;
}

/** Fechas de la URL: { startMs, windowDays } válidos o null (día UTC exacto, 1 a 30 días). */
function parseWindow(q) {
  const raw = q.get("start");
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw ?? "") ? Date.parse(`${raw}T00:00:00Z`) : NaN;
  const start = Number.isFinite(parsed) && isoDay(parsed) === raw ? parsed : NaN; // descarta 2026-02-31
  const days = Number(q.get("days"));
  const okDays = Number.isInteger(days) && days >= 1 && days <= 30;
  return Number.isFinite(start) && okDays ? { startMs: start, windowDays: days } : null;
}

/** Lee la selección de la URL de la página de comparación (con valores por defecto). */
export function parseCompareQuery(search, defaults) {
  const q = new URLSearchParams(search);
  const window = parseWindow(q);
  return {
    a: parseSiteParam(q.get("a")) ?? defaults.a,
    b: parseSiteParam(q.get("b")) ?? defaults.b,
    startMs: window?.startMs ?? defaults.startMs,
    windowDays: window?.windowDays ?? defaults.windowDays,
  };
}

/** Selección de la misión → query string ("?site=…&start=…&days=…"). */
export function missionQuery({ site, startMs, windowDays, dateChosen }) {
  const q = new URLSearchParams({ site: siteParam(site) });
  if (dateChosen) {
    q.set("start", isoDay(startMs));
    q.set("days", String(windowDays));
  }
  return `?${q}`;
}

export function missionUrl(selection, hash = "") {
  return `./index.html${missionQuery(selection)}${hash}`;
}

/** Lee la selección de la misión: { site|null, startMs|null, windowDays|null }. Lo inválido se ignora. */
export function parseMissionQuery(search) {
  const q = new URLSearchParams(search);
  const window = parseWindow(q);
  return { site: parseSiteParam(q.get("site")), startMs: window?.startMs ?? null, windowDays: window?.windowDays ?? null };
}

/** Sitio activo en la página de misión (curado, propio o punto observado). */
export function currentSite(state) {
  if (state.siteId !== CUSTOM_ID) return getSite(state.siteId);
  return { id: CUSTOM_ID, lat: state.lat, lon: state.lon };
}

/**
 * Actualiza los enlaces "Comparar" y "Ver comparación detallada": A = sitio
 * activo, B = el mejor del ranking que no sea A.
 */
export function updateCompareLinks(state, ranked) {
  const a = currentSite(state);
  const b = ranked.find((s) => s.id !== a.id && (s.lat !== a.lat || s.lon !== a.lon)) ?? SITES[0];
  const href = compareUrl({ a, b, startMs: state.startMs, windowDays: state.windowDays });
  document.querySelectorAll("[data-compare-link]").forEach((el) => el.setAttribute("href", href));
}
