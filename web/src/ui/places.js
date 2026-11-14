/**
 * "Mejores lugares para alunizar": ranking de los sitios para la ventana
 * elegida, por categoría (UI-13): viabilidad global, interés científico
 * (rasgos citados, pendientes de validar), comunicación terrestre y luz
 * solar aprovechable. El orden lo define lib/ranking.js.
 * Cada tarjeta muestra, como en el Figma: cobertura de enlace, altura del Sol,
 * altura de la Tierra y luz acumulada.
 */
import { computeScenario, realDataVersion, sampleAt } from "../lib/analysis.js";
import { rankEntries } from "../lib/ranking.js";
import { traitsFor } from "../data/site-traits.js";
import { t } from "../i18n/index.js";
import { allSites, chooseSite, setState } from "../state.js";

const $ = (id) => document.getElementById(id);
const MAX_PLACES = 5;

/** "-22.1°" (sin signo + para positivos, como en el Figma). */
export const elev = (v) => `${v.toFixed(1)}°`;

/**
 * "40 Min" como en el Figma; desde 100 minutos pasa a horas ("15 h") para que
 * el valor entre en la tarjeta sin romperla.
 */
export function minutesLabel(min) {
  return min >= 100 ? `${Math.round(min / 60)} h` : `${Math.round(min)} Min`;
}

let cacheKey = "";
let entries = [];

/** Escenarios de todos los sitios (se recalculan solo si cambian fechas o sitios). */
function scenarios(state) {
  const sites = allSites();
  const key = `${state.startMs}|${state.windowDays}|${sites.map((s) => s.id).join(",")}|${realDataVersion()}`;
  if (key !== cacheKey) {
    entries = sites.map((site) => ({
      site,
      scenario: computeScenario(site, state.startMs, state.windowDays),
      traits: traitsFor(site.id).length,
    }));
    cacheKey = key;
  }
  return entries;
}

function rank(state) {
  return rankEntries(scenarios(state), state.placesCategory, MAX_PLACES);
}

/** Íconos con su proporción original (los SVG del Figma se deforman si se fuerzan a cuadrado). */
const ICON_SIZE = { antenna: [24, 16], sun: [24, 24], earth: [26, 26], bulb: [20, 20] };
const icon = (name) => {
  const [w, h] = ICON_SIZE[name];
  return `<img src="./figma/place-${name}.svg" alt="" width="${w}" height="${h}" />`;
};

export function initPlaces() {
  $("places-categories").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) setState({ placesCategory: button.dataset.category });
  });
  // Flechas para moverse entre categorías (patrón radiogroup).
  $("places-categories").addEventListener("keydown", (event) => {
    const buttons = [...$("places-categories").querySelectorAll("[data-category]")];
    const i = buttons.indexOf(event.target);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (i < 0 || !step) return;
    event.preventDefault();
    const next = buttons[(i + step + buttons.length) % buttons.length];
    next.focus();
    setState({ placesCategory: next.dataset.category });
  });
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

/** Sitios del ranking, del mejor al peor (para el enlace a la comparación). */
export function rankedSites(state) {
  return rank(state).map(({ site }) => site);
}

/** Subtítulo de la tarjeta: coordenadas, o los rasgos en la categoría científica. */
function subtitle(site, category) {
  if (category !== "science") return t("places.coords", { lat: site.lat.toFixed(2), lon: site.lon.toFixed(2) });
  const traits = traitsFor(site.id);
  return traits.length ? traits.map((tr) => t(`traits.${tr.key}`)).join(" · ") : t("places.noTraits");
}

export function renderPlaces(state) {
  document.querySelectorAll("#places-categories [data-category]").forEach((button) => {
    const on = button.dataset.category === state.placesCategory;
    button.setAttribute("aria-checked", String(on));
    button.tabIndex = on ? 0 : -1;
  });
  $("places-categories").title = state.placesCategory === "science" ? t("places.scienceNote") : "";
  // Criterio de orden a la vista (DEC-042): antes solo estaba en el código.
  $("places-hint").textContent = t(`places.categoryHint.${state.placesCategory}`);
  $("places-list").innerHTML = rank(state)
    .map(({ site, scenario }) => {
      const now = sampleAt(scenario, state.timeMs);
      const s = scenario.summary;
      return `
      <li class="place" data-site="${site.id}" tabindex="0" ${site.id === state.siteId ? 'aria-current="true"' : ""}>
        <p class="place-name">${site.name}</p>
        <p class="place-sub" title="${subtitle(site, state.placesCategory)}">${subtitle(site, state.placesCategory)}</p>
        <div class="place-stats">
          <span class="icon-box" title="${t("places.comm")}">${icon("antenna")}</span>
          <span class="value">${Math.round(s.communication)}%</span>
          <span class="icon-box" title="${t("places.sun")}">${icon("sun")}</span>
          <span class="value">${elev(now.sun.elevation)}</span>
          <span class="icon-box" title="${t("places.earth")}">${icon("earth")}</span>
          <span class="value">${elev(now.earth.elevation)}</span>
          <span class="icon-box" title="${t("places.light")}">${icon("bulb")}</span>
          <span class="value">${minutesLabel(s.sunMinutes)}</span>
        </div>
        <span class="place-line" aria-hidden="true"></span>
      </li>`;
    })
    .join("");
}
