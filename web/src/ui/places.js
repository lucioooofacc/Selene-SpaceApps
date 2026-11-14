/**
 * "Mejores lugares para alunizar": ranking de los sitios para la ventana
 * elegida. Orden: puntos de viabilidad y, a igualdad, más luz.
 * Cada tarjeta muestra, como en el Figma: cobertura de enlace, altura del Sol,
 * altura de la Tierra y luz acumulada.
 */
import { computeScenario, sampleAt } from "../lib/analysis.js";
import { t } from "../i18n/index.js";
import { allSites, chooseSite } from "../state.js";

const $ = (id) => document.getElementById(id);
const MAX_PLACES = 5;

/** "-22.1°" (sin signo + para positivos, como en el Figma). */
export const elev = (v) => `${v.toFixed(1)}°`;

/** "400 Min"; desde 1000 minutos pasa a horas: "33 h". */
export function minutesLabel(min) {
  return min >= 1000 ? `${Math.round(min / 60)} h` : `${Math.round(min)} Min`;
}

let cacheKey = "";
let ranked = [];

function rank(state) {
  const sites = allSites();
  const key = `${state.startMs}|${state.windowDays}|${sites.map((s) => s.id).join(",")}`;
  if (key === cacheKey) return ranked;
  ranked = sites
    .map((site) => ({ site, scenario: computeScenario(site, state.startMs, state.windowDays) }))
    .sort(
      (a, b) =>
        b.scenario.viability.points - a.scenario.viability.points ||
        b.scenario.summary.illumination - a.scenario.summary.illumination,
    )
    .slice(0, MAX_PLACES);
  cacheKey = key;
  return ranked;
}

const icon = (name, size) => `<img src="./figma/place-${name}.svg" alt="" width="${size}" height="${size}" />`;

export function initPlaces() {
  $("places-list").addEventListener("click", (event) => {
    const item = event.target.closest("[data-site]");
    if (item) chooseSite(item.dataset.site);
  });
  $("places-list").addEventListener("keydown", (event) => {
    const item = event.target.closest("[data-site]");
    if (item && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      chooseSite(item.dataset.site);
    }
  });
}

export function renderPlaces(state) {
  $("places-list").innerHTML = rank(state)
    .map(({ site, scenario }) => {
      const now = sampleAt(scenario, state.timeMs);
      const s = scenario.summary;
      return `
      <li class="place" data-site="${site.id}" tabindex="0" ${site.id === state.siteId ? 'aria-current="true"' : ""}>
        <p class="place-name">${site.name}</p>
        <p class="place-sub">${t("places.coords", { lat: site.lat.toFixed(2), lon: site.lon.toFixed(2) })}</p>
        <div class="place-stats">
          <span class="icon-box" title="${t("places.comm")}">${icon("antenna", 26)}</span>
          <span class="value">${Math.round(s.communication)}%</span>
          <span class="icon-box" title="${t("places.sun")}">${icon("sun", 23)}</span>
          <span class="value">${elev(now.sun.elevation)}</span>
          <span class="icon-box" title="${t("places.earth")}">${icon("earth", 27)}</span>
          <span class="value">${elev(now.earth.elevation)}</span>
          <span class="icon-box" title="${t("places.light")}">${icon("bulb", 20)}</span>
          <span class="value">${minutesLabel(s.sunMinutes)}</span>
        </div>
        <span class="place-line" aria-hidden="true"></span>
      </li>`;
    })
    .join("");
}
