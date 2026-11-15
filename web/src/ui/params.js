/**
 * "Parámetros de la misión": sitio, coordenadas, duración y las tarjetas de
 * "Ventana de análisis" (DEC-042, reemplaza la parte "AHORA" de UI-15):
 *  - Luz acumulada y Comunicación, juntas: evalúan TODA la misión →
 *    VIABLE/INVIABLE con 3 segmentos.
 *  - Sol y Tierra, juntas y bajo el título "Posición promedio en el período":
 *    elevación media, mínima y máxima y % del tiempo visible en las fechas
 *    elegidas. No dependen del instante de la línea de tiempo (eso queda en
 *    "Comportamiento de los cuerpos celestes").
 */
import { t } from "../i18n/index.js";
import { CUSTOM_ID, allSites, chooseCoordinates, chooseSite, getState, setState } from "../state.js";
import { dateButtonLabel, initCalendar } from "./calendar.js";
import { minutesLabel } from "./places.js";
import { dateUTC, deg, pct } from "../lib/format.js";
import { DAY_MS } from "../lib/astro.js";
import { STEP_MINUTES, cleanLimit } from "../lib/analysis.js";
import { windowStats } from "../lib/stats.js";

const $ = (id) => document.getElementById(id);

/** Chips del Figma (los demás sitios están en el desplegable). */
const CHIP_SITES = ["shackleton", "malapert", "cabeus", "apollo11"];

/** Tamaño de cada ícono en su proporción original (ver places.js). */
const PARAM_ICON_SIZE = { bulb: [14, 14], sun: [16, 16], antenna: [18, 12], earth: [18, 18] };

/** Número con el formato del idioma y sin decimales (horas de noche). */
const num = (v) => Math.round(v).toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-UY");

const SEGMENTS_BY_LEVEL = { high: 3, mid: 2, low: 1 };
const PERCENT_BY_SEGMENTS = { 1: 33, 2: 66, 3: 100 };

/**
 * Tarjeta de misión (VIABLE/INVIABLE).
 * @param {string} periodTitle  explicación completa del período (tooltip y lector de pantalla).
 */
function criterionCard({ icon, name, value, segments, period, periodTitle, requirement }) {
  const ok = segments >= 2;
  const cls = ok ? "ok" : "ko";
  const label = ok ? "params.viable" : "params.notViable";
  return `
    <article class="criterion">
      <span class="icon-box"><img src="./figma/param-${icon}.svg" alt="" width="${PARAM_ICON_SIZE[icon][0]}" height="${PARAM_ICON_SIZE[icon][1]}" /></span>
      <p class="criterion-name">${name}</p>
      <span class="criterion-period criterion-period-${period}" title="${periodTitle}">${t(`params.period.${period}`)}<span class="sr-only"> · ${periodTitle}</span></span>
      <p class="criterion-value">${value}</p>
      <span class="verdict ${cls}" title="${requirement}">
        <img src="./figma/dot-${ok ? "green" : "red"}.svg" alt="" width="10" height="10" />${t(label)}
      </span>
      <div class="segments ${cls}" aria-hidden="true">
        ${[1, 2, 3].map((n) => `<i class="${n <= segments ? "on" : ""}"></i>`).join("")}
        <span>${pct(PERCENT_BY_SEGMENTS[segments])}</span>
      </div>
      <span class="criterion-line" aria-hidden="true"></span>
    </article>`;
}

export function initParams() {
  $("site-select").addEventListener("change", (event) => {
    const id = event.target.value;
    if (id === CUSTOM_ID) setState({ siteId: CUSTOM_ID, siteChosen: true });
    else chooseSite(id);
  });

  $("site-chips").innerHTML = CHIP_SITES.map(
    (id) => `<button type="button" data-site="${id}" aria-pressed="false"></button>`,
  ).join("");
  $("site-chips").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-site]");
    if (chip) chooseSite(chip.dataset.site);
  });

  const onCoord = () => {
    const lat = Number($("lat-input").value);
    const lon = Number($("lon-input").value);
    if (Number.isFinite(lat) && Number.isFinite(lon)) chooseCoordinates(lat, lon);
  };
  $("lat-input").addEventListener("change", onCoord);
  $("lon-input").addEventListener("change", onCoord);

  // Supuestos de viabilidad (DEC-083): el motor valida y acota; un valor vacío vuelve al vigente.
  const onLimit = (input, key) => {
    const value = cleanLimit(key, input.value);
    if (value == null) input.value = String(getState()[key]);
    else {
      input.value = String(value);
      setState({ [key]: value });
    }
  };
  $("battery-input").addEventListener("change", (e) => onLimit(e.target, "batteryHours"));
  $("comms-input").addEventListener("change", (e) => onLimit(e.target, "commsMinPct"));

  initCalendar();
}

/** Campos del panel (cuando cambia el sitio, la fecha o el idioma). */
export function renderParamsFields(state) {
  const sites = allSites();
  $("site-select").innerHTML =
    `<option value="${CUSTOM_ID}">${t("params.custom")}</option>` +
    sites.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  $("site-select").value = state.siteId;

  $("site-chips")
    .querySelectorAll("[data-site]")
    .forEach((chip) => {
      const site = sites.find((s) => s.id === chip.dataset.site);
      chip.textContent = site?.name ?? chip.dataset.site;
      chip.setAttribute("aria-pressed", String(chip.dataset.site === state.siteId));
    });

  if (document.activeElement !== $("lat-input")) $("lat-input").value = state.lat.toFixed(2);
  if (document.activeElement !== $("lon-input")) $("lon-input").value = state.lon.toFixed(2);
  if (document.activeElement !== $("battery-input")) $("battery-input").value = String(state.batteryHours);
  if (document.activeElement !== $("comms-input")) $("comms-input").value = String(state.commsMinPct);
  $("date-button").textContent = dateButtonLabel(state);
}

/** Tarjeta de posición promedio del Sol o la Tierra en el período (DEC-042). */
function averageCard({ icon, name, body, periodTitle }) {
  const { mean, min, max } = body.elevation;
  return `
    <article class="criterion criterion-avg">
      <span class="icon-box"><img src="./figma/param-${icon}.svg" alt="" width="${PARAM_ICON_SIZE[icon][0]}" height="${PARAM_ICON_SIZE[icon][1]}" /></span>
      <p class="criterion-name">${name}</p>
      <span class="criterion-period criterion-period-avg" title="${periodTitle}">${t("params.period.avg")}<span class="sr-only"> · ${periodTitle}</span></span>
      <p class="criterion-value">${deg(mean)} <small>${t("params.avgElevation")}</small></p>
      <span class="verdict neutral" title="${t("params.avgVisibleTitle")}">${t("params.avgVisible", { pct: Math.round(body.visibleFraction * 100) })}</span>
      <p class="criterion-range">${t("params.avgRange", { min: deg(min), max: deg(max), hz: deg(body.relief) })}</p>
      <span class="criterion-line" aria-hidden="true"></span>
    </article>`;
}

const statsCache = new WeakMap();
const statsFor = (scenario) => {
  if (!statsCache.has(scenario)) statsCache.set(scenario, windowStats(scenario, STEP_MINUTES));
  return statsCache.get(scenario);
};

let lastKey = "";
let lastScenario = null;

/**
 * Tarjetas de "Ventana de análisis": dependen solo del escenario (no del
 * instante). Hasta que se elijan un sitio (o punto) y las fechas, se muestra
 * qué falta elegir en lugar de valores de un ejemplo (DEC-049).
 */
export function renderCriteria(scenario) {
  const { siteChosen, dateChosen } = getState();
  const key = `${document.documentElement.lang}|${siteChosen}|${dateChosen}`;
  if (scenario === lastScenario && key === lastKey) return;
  lastScenario = scenario;
  lastKey = key;
  if (!siteChosen || !dateChosen) {
    const missing = !siteChosen && !dateChosen ? "both" : !siteChosen ? "site" : "date";
    $("criteria").innerHTML = `<p class="criteria-empty" role="status">${t(`params.emptyWindow.${missing}`)}</p>`;
    return;
  }
  const { criteria } = scenario.viability;
  const stats = statsFor(scenario);
  const mission = { period: "mission", periodTitle: t("params.periodTitle.mission") };
  const range = { from: dateUTC(scenario.startMs), to: dateUTC(scenario.endMs - DAY_MS) };
  const avgTitle = t("params.periodTitle.avg", range);
  $("criteria").innerHTML = [
    criterionCard({
      ...mission,
      icon: "bulb",
      name: t("params.light"),
      value: minutesLabel(scenario.summary.sunMinutes),
      segments: SEGMENTS_BY_LEVEL[criteria.light.level],
      // El veredicto sigue el requisito de luz continua (DEC-071), no las horas de luz.
      requirement: `${t("compare.requirement.light")}: ${t("compare.value.light", { h: num(criteria.light.value) })} · ${t(`compare.req.${criteria.light.level}`)}`,
    }),
    criterionCard({
      ...mission,
      icon: "antenna",
      name: t("params.comm"),
      value: t("params.coverage", { pct: Math.round(scenario.summary.communication) }),
      segments: SEGMENTS_BY_LEVEL[criteria.communication.level],
      requirement: `${t("compare.requirement.communication")}: ${t(`compare.req.${criteria.communication.level}`)}`,
    }),
    `<h3 class="criteria-subtitle" title="${avgTitle}">${t("params.avgTitle")}<small>${t("params.avgSubtitle", range)}</small></h3>`,
    averageCard({ icon: "sun", name: t("params.sun"), body: stats.sun, periodTitle: avgTitle }),
    averageCard({ icon: "earth", name: t("params.earth"), body: stats.earth, periodTitle: avgTitle }),
  ].join("");
}
