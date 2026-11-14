/**
 * Enlaces entre páginas (UI-05). La página de comparación recibe los sitios y
 * la ventana por la URL, para que se pueda compartir o recargar sin perder la
 * selección:
 *   compare.html?a=<sitio>&b=<sitio>&start=AAAA-MM-DD&days=N
 * Un sitio es el id de un sitio curado o "pt:lat,lon" para un punto del mapa.
 */
import { SITES } from "../data/sites.js";
import { t } from "../i18n/index.js";
import { CUSTOM_ID, getSite } from "../state.js";

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Sitio → parámetro de URL. Los sitios propios ("+") viajan como punto. */
export function siteParam(site) {
  if (SITES.some((s) => s.id === site.id)) return site.id;
  return `pt:${site.lat.toFixed(2)},${site.lon.toFixed(2)}`;
}

/** Parámetro de URL → sitio (curado o punto), o null si no es válido. */
export function parseSiteParam(value) {
  if (!value) return null;
  const curated = SITES.find((s) => s.id === value);
  if (curated) return curated;
  const m = /^pt:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(value);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { id: value, lat, lon, custom: true, name: t("compare.point", { lat: lat.toFixed(2), lon: lon.toFixed(2) }) };
}

export function compareUrl({ a, b, startMs, windowDays }) {
  const q = new URLSearchParams({ a: siteParam(a), b: siteParam(b), start: isoDay(startMs), days: String(windowDays) });
  return `./compare.html?${q}`;
}

/** Lee la selección de la URL de la página de comparación (con valores por defecto). */
export function parseCompareQuery(search, defaults) {
  const q = new URLSearchParams(search);
  const start = Date.parse(`${q.get("start")}T00:00:00Z`);
  const days = Math.round(Number(q.get("days")));
  return {
    a: parseSiteParam(q.get("a")) ?? defaults.a,
    b: parseSiteParam(q.get("b")) ?? defaults.b,
    startMs: Number.isFinite(start) ? start : defaults.startMs,
    windowDays: days >= 1 && days <= 30 ? days : defaults.windowDays,
  };
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
