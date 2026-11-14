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
import { CUSTOM_ID, allSites, chooseCoordinates, chooseSite, setState } from "../state.js";
import { dateButtonLabel, initCalendar } from "./calendar.js";
import { minutesLabel } from "./places.js";
import { dateUTC, deg } from "../lib/format.js";
import { DAY_MS } from "../lib/astro.js";
import { STEP_MINUTES } from "../lib/analysis.js";
import { windowStats } from "../lib/stats.js";

const $ = (id) => document.getElementById(id);

/** Chips del Figma (los demás sitios están en el desplegable). */
const CHIP_SITES = ["shackleton", "malapert", "cabeus", "apollo11"];

/** Tamaño de cada ícono en su proporción original (ver places.js). */
const PARAM_ICON_SIZE = { bulb: [14, 14], sun: [16, 16], antenna: [18, 12], earth: [18, 18] };

const SEGMENTS_BY_LEVEL = { high: 3, mid: 2, low: 1 };
const PERCENT_BY_SEGMENTS = { 1: "33%", 2: "66%", 3: "100%" };

/**
 * Tarjeta de misión (VIABLE/INVIABLE).
 * @param {string} periodTitle  explicación completa del período (tooltip y lector de pantalla).
 */
function criterionCard({ icon, name, value, segments, period, periodTitle }) {
  const ok = segments >= 2;
  const cls = ok ? "ok" : "ko";
  const label = ok ? "params.viable" : "params.notViable";
  return `
    <article class="criterion">
      <span class="icon-box"><img src="./figma/param-${icon}.svg" alt="" width="${PARAM_ICON_SIZE[icon][0]}" height="${PARAM_ICON_SIZE[icon][1]}" /></span>
      <p class="criterion-name">${name}</p>
      <span class="criterion-period criterion-period-${period}" title="${periodTitle}">${t(`params.period.${period}`)}<span class="sr-only"> · ${periodTitle}</span></span>
      <p class="criterion-value">${value}</p>
      <span class="verdict ${cls}">
        <img src="./figma/dot-${ok ? "green" : "red"}.svg" alt="" width="10" height="10" />${t(label)}
      </span>
      <div class="segments ${cls}" aria-hidden="true">
        ${[1, 2, 3].map((n) => `<i class="${n <= segments ? "on" : ""}"></i>`).join("")}
        <span>${PERCENT_BY_SEGMENTS[segments]}</span>
      </div>
      <span class="criterion-line" aria-hidden="true"></span>
    </article>`;
}

export function initParams() {
  $("site-select").addEventListener("change", (event) => {
    const id = event.target.value;
    if (id === CUSTOM_ID) setState({ siteId: CUSTOM_ID });
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

let lastScenario = null;
let lastLang = "";

/** Tarjetas de "Ventana de análisis": dependen solo del escenario (no del instante). */
export function renderCriteria(scenario) {
  const lang = document.documentElement.lang;
  if (scenario === lastScenario && lang === lastLang) return;
  lastScenario = scenario;
  lastLang = lang;
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
      segments: SEGMENTS_BY_LEVEL[criteria.illumination.level],
    }),
    criterionCard({
      ...mission,
      icon: "antenna",
      name: t("params.comm"),
      value: t("params.coverage", { pct: Math.round(scenario.summary.communication) }),
      segments: SEGMENTS_BY_LEVEL[criteria.communication.level],
    }),
    `<h3 class="criteria-subtitle" title="${avgTitle}">${t("params.avgTitle")}<small>${t("params.avgSubtitle", range)}</small></h3>`,
    averageCard({ icon: "sun", name: t("params.sun"), body: stats.sun, periodTitle: avgTitle }),
    averageCard({ icon: "earth", name: t("params.earth"), body: stats.earth, periodTitle: avgTitle }),
  ].join("");
}
