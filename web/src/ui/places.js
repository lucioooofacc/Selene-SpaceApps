/**
 * "Mejores lugares para alunizar": ranking de los sitios para la ventana
 * elegida, por categoría (UI-13): viabilidad global, interés científico
 * (rasgos citados, pendientes de validar), comunicación terrestre y luz
 * solar aprovechable. El orden lo define lib/ranking.js.
 * Cada tarjeta muestra, como en el Figma: cobertura de enlace, altura del Sol,
 * altura de la Tierra y luz acumulada.
 */
import { computeScenario, needsPolarDem, realDataVersion, sampleAt } from "../lib/analysis.js";
import { loadedData, persist, persisted, runInWorker } from "./compute.js";
import { rankEntries } from "../lib/ranking.js";
import { traitsFor } from "../data/site-traits.js";
import { getLang, t } from "../i18n/index.js";
import { allSites, chooseSite, getState, setState } from "../state.js";
import { dateScenarios, pickDistinct } from "../lib/dates.js";
import { dateUTC } from "../lib/format.js";
import { DAY_MS } from "../lib/astro.js";

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

// ---------------------------------------------------------------------------
// Mejores fechas (DEC-046)
// ---------------------------------------------------------------------------

let datesKey = "";
let datesResult = undefined; // undefined: sin calcular; null: sin serie de Horizons
let datesPending = "";
const DATE_CATEGORIES = ["overall", "communication", "light"];

/** Sitio vigente como lo arma main.js. */
function currentSiteFor(state) {
  return { id: state.siteId, lat: state.lat, lon: state.lon };
}

/** Categoría efectiva en modo fechas: "Ciencia" no aplica (depende del sitio, no de la fecha). */
const dateCategory = (category) => (category === "science" ? "overall" : category);

/** Ordena las candidatas y se queda con 5 períodos distintos por categoría. */
function picksFrom(items, windowDays) {
  // El "nombre" es la fecha ISO: a igualdad, gana la más temprana.
  const entries = items.map((it) => ({ site: { name: new Date(it.startMs).toISOString() }, startMs: it.startMs, scenario: it.scenario, traits: 0 }));
  const picks = {};
  for (const c of DATE_CATEGORIES) {
    picks[c] = pickDistinct(rankEntries(entries, c), windowDays, MAX_PLACES).map(({ startMs, scenario }) => ({ startMs, scenario }));
  }
  return picks;
}

/** Cálculo de las candidatas: en el worker (PERF-01, DEC-047) o, si no hay, en la página. */
async function computeDates(site, windowDays) {
  const job = runInWorker("dates", { site, windowDays });
  if (job) {
    try {
      return await job;
    } catch (error) {
      console.warn(`Worker de fechas no disponible (cálculo en la página): ${error.message}`);
    }
  }
  return dateScenarios(site, windowDays);
}

/**
 * Las 5 mejores fechas por categoría para el sitio y la duración vigentes.
 * Se calculan una vez por sitio, duración y versión de datos, sin bloquear la
 * página; con todos los datos reales cargados quedan en la caché persistente.
 */
function dateEntries(state) {
  const key = `${state.siteId}|${state.lat}|${state.lon}|${state.windowDays}|${realDataVersion()}`;
  if (key === datesKey) return datesResult;
  const data = loadedData();
  const site = currentSiteFor(state);
  const pk = data.ephemerides && (!needsPolarDem(site) || data.polarDem) ? `dates|${state.siteId}|${state.lat}|${state.lon}|${state.windowDays}` : null;
  const stored = pk && persisted(pk);
  if (stored) {
    datesKey = key;
    return (datesResult = stored);
  }
  if (datesPending !== key) {
    datesPending = key;
    computeDates(site, state.windowDays).then((res) => {
      if (datesPending !== key) return; // se pidió otro sitio o duración
      datesResult = res && { coverage: res.coverage, picks: picksFrom(res.items, state.windowDays) };
      datesKey = key;
      datesPending = "";
      if (pk && datesResult) persist(pk, datesResult);
      renderPlaces(getState());
    });
  }
  return undefined;
}

function renderDates(state) {
  const result = dateEntries(state);
  const category = dateCategory(state.placesCategory);
  if (result === undefined) {
    $("places-list").innerHTML = `<li class="places-empty" role="status">${t("places.dates.computing")}</li>`;
    $("places-hint").textContent = "";
    return;
  }
  if (result === null || !result.picks[category].length) {
    $("places-list").innerHTML = `<li class="places-empty">${t("places.dates.none")}</li>`;
    $("places-hint").textContent = "";
    return;
  }
  $("places-hint").textContent = t(`places.dates.hint.${category}`, {
    days: state.windowDays,
    from: dateUTC(result.coverage.startMs),
    to: dateUTC(result.coverage.stopMs),
  });
  $("places-list").innerHTML = result.picks[category]
    .map(({ startMs, scenario }) => {
      const s = scenario.summary;
      const v = scenario.viability;
      const range = rangeLabel(startMs, startMs + (state.windowDays - 1) * DAY_MS);
      const current = startMs === state.startMs && state.dateChosen;
      return `
      <li class="place" data-start="${startMs}" tabindex="0" ${current ? 'aria-current="true"' : ""} aria-label="${t("places.dates.aria", { range })}">
        <p class="place-name place-name-date">${range}</p>
        <p class="place-verdict place-verdict-${v.overall}">${t("places.dates.sub", { level: t(`compare.level.${v.overall}`), points: v.points, max: v.maxPoints })}</p>
        <div class="place-stats">
          <span class="icon-box" title="${t("places.comm")}">${icon("antenna")}</span>
          <span class="value">${Math.round(s.communication)}%</span>
          <span class="icon-box" title="${t("places.dates.sunPct")}">${icon("sun")}</span>
          <span class="value">${Math.round(s.illumination)}%</span>
          <span class="icon-box" title="${t("places.dates.earthPeak")}">${icon("earth")}</span>
          <span class="value">${elev(s.peakEarth)}</span>
          <span class="icon-box" title="${t("places.light")}">${icon("bulb")}</span>
          <span class="value">${minutesLabel(s.sunMinutes)}</span>
        </div>
        <span class="place-line" aria-hidden="true"></span>
      </li>`;
    })
    .join("");
}

/** Rango corto y localizado: "10–19 nov 2027" / "Nov 10 – 19, 2027" (UTC). */
function rangeLabel(a, b) {
  const f = new Intl.DateTimeFormat(getLang() === "en" ? "en-US" : "es-UY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  // Igual que dateUTC(): sin puntos y, en español, sin los "de".
  return f.formatRange(a, b).replace(/\./g, "").replace(/ de /g, " ");
}

/** Elegir una fecha del ranking: misma duración, nuevo inicio. */
function chooseStart(startMs) {
  setState({ startMs, timeMs: startMs, dateChosen: true });
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
    const buttons = [...$("places-categories").querySelectorAll("[data-category]:not(:disabled)")];
    const i = buttons.indexOf(event.target);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (i < 0 || !step) return;
    event.preventDefault();
    const next = buttons[(i + step + buttons.length) % buttons.length];
    next.focus();
    setState({ placesCategory: next.dataset.category });
  });
  document.querySelectorAll("[data-places-mode]").forEach((button) =>
    button.addEventListener("click", () => setState({ placesMode: button.dataset.placesMode })),
  );
  const pick = (item) => (item.dataset.start ? chooseStart(Number(item.dataset.start)) : chooseSite(item.dataset.site));
  $("places-list").addEventListener("click", (event) => {
    const item = event.target.closest("[data-site], [data-start]");
    if (item) pick(item);
  });
  $("places-list").addEventListener("keydown", (event) => {
    const item = event.target.closest("[data-site], [data-start]");
    if (item && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      pick(item);
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
  const dates = state.placesMode === "dates";
  document.querySelectorAll("[data-places-mode]").forEach((button) =>
    button.setAttribute("aria-selected", String(button.dataset.placesMode === state.placesMode)),
  );
  const category = dates ? dateCategory(state.placesCategory) : state.placesCategory;
  document.querySelectorAll("#places-categories [data-category]").forEach((button) => {
    const on = button.dataset.category === category;
    button.setAttribute("aria-checked", String(on));
    button.tabIndex = on ? 0 : -1;
    // "Ciencia" no aplica a fechas (DEC-046).
    const off = dates && button.dataset.category === "science";
    button.disabled = off;
    button.title = off ? t("places.dates.noScience") : "";
  });
  if (dates) return renderDates(state);
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
