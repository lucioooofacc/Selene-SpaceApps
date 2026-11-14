/**
 * "Parámetros de la misión": sitio, coordenadas, duración y las cuatro
 * tarjetas de "Ventana de análisis" (Luz acumulada, Sol, Disponibilidad de
 * comunicación y Tierra), cada una con VIABLE/INVIABLE y 3 segmentos.
 */
import { t } from "../i18n/index.js";
import { CUSTOM_ID, allSites, chooseCoordinates, chooseSite, setState } from "../state.js";
import { dateButtonLabel, initCalendar } from "./calendar.js";
import { elev, minutesLabel } from "./places.js";

const $ = (id) => document.getElementById(id);

/** Chips del Figma (los demás sitios están en el desplegable). */
const CHIP_SITES = ["shackleton", "malapert", "cabeus", "apollo11"];

/** Tamaño de cada ícono en su proporción original (ver places.js). */
const PARAM_ICON_SIZE = { bulb: [14, 14], sun: [16, 16], antenna: [18, 12], earth: [18, 18] };

const SEGMENTS_BY_LEVEL = { high: 3, mid: 2, low: 1 };
const PERCENT_BY_SEGMENTS = { 1: "33%", 2: "66%", 3: "100%" };

/** Segmentos según el margen sobre el horizonte del relieve. */
function segmentsForBody(body) {
  if (!body.visible) return 1;
  return body.margin >= 3 ? 3 : 2;
}

function criterionCard({ icon, name, value, segments }) {
  const ok = segments >= 2;
  const cls = ok ? "ok" : "ko";
  return `
    <article class="criterion">
      <span class="icon-box"><img src="./figma/param-${icon}.svg" alt="" width="${PARAM_ICON_SIZE[icon][0]}" height="${PARAM_ICON_SIZE[icon][1]}" /></span>
      <p class="criterion-name">${name}</p>
      <p class="criterion-value">${value}</p>
      <span class="verdict ${cls}">
        <img src="./figma/dot-${ok ? "green" : "red"}.svg" alt="" width="10" height="10" />${t(ok ? "params.viable" : "params.notViable")}
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

/** Tarjetas de "Ventana de análisis" (dependen también del instante actual). */
export function renderCriteria(scenario, sample) {
  const { criteria } = scenario.viability;
  $("criteria").innerHTML = [
    criterionCard({
      icon: "bulb",
      name: t("params.light"),
      value: minutesLabel(scenario.summary.sunMinutes),
      segments: SEGMENTS_BY_LEVEL[criteria.illumination.level],
    }),
    criterionCard({
      icon: "sun",
      name: t("params.sun"),
      value: elev(sample.sun.elevation),
      segments: segmentsForBody(sample.sun),
    }),
    criterionCard({
      icon: "antenna",
      name: t("params.comm"),
      value: t("params.coverage", { pct: Math.round(scenario.summary.communication) }),
      segments: SEGMENTS_BY_LEVEL[criteria.communication.level],
    }),
    criterionCard({
      icon: "earth",
      name: t("params.earth"),
      value: elev(sample.earth.elevation),
      segments: segmentsForBody(sample.earth),
    }),
  ].join("");
}
