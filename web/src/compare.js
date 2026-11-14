/**
 * Entrada de la página de comparación detallada (compare.html, UI-05).
 * Lee la selección de la URL, calcula los dos escenarios con el motor y
 * delega el dibujo en ui/compare.js. Reutiliza el calendario de la página de
 * misión, que trabaja sobre startMs/windowDays de state.js.
 */
import "./styles/main.css";
import "./styles/compare.css";
import { computeScenario, realDataVersion } from "./lib/analysis.js";
import { ensurePolarTerrain, loadSiteEphemerides } from "./ui/ephemerides.js";
import { SITES } from "./data/sites.js";
import { applyStaticTranslations, getLang, initialLang, setLang } from "./i18n/index.js";
import { DEFAULT_START, getState, setState, subscribe } from "./state.js";
import { dateButtonLabel, initCalendar, refreshCalendar } from "./ui/calendar.js";
import { renderComparison } from "./ui/compare.js";
import { applySettings, initSettings } from "./ui/settings.js";
import { compareUrl, informeUrl, missionUrl, parseCompareQuery, parseSiteParam, siteParam } from "./ui/links.js";

const DESIGN_WIDTH = 1992;
const $ = (id) => document.getElementById(id);

let selection = null; // { a, b } (sitios)
let extraSites = []; // puntos del mapa que llegaron por la URL
const cache = new Map();

function scenarioFor(site, startMs, windowDays) {
  const key = `${siteParam(site)}|${startMs}|${windowDays}|${realDataVersion()}`;
  if (!cache.has(key)) cache.set(key, computeScenario(site, startMs, windowDays));
  ensurePolarTerrain([site], render);
  return cache.get(key);
}

function options() {
  return [...SITES, ...extraSites];
}

/** Los puntos ("pt:…") se re-traducen al cambiar de idioma. */
function relabelPoints() {
  extraSites = extraSites.map((s) => parseSiteParam(s.id));
  selection = {
    a: selection.a.custom ? parseSiteParam(selection.a.id) : selection.a,
    b: selection.b.custom ? parseSiteParam(selection.b.id) : selection.b,
  };
}

function renderSelects() {
  const html = options()
    .map((s) => `<option value="${siteParam(s)}">${s.name}</option>`)
    .join("");
  for (const slot of ["a", "b"]) {
    const select = $(`site-${slot}`);
    select.innerHTML = html;
    select.value = siteParam(selection[slot]);
  }
}

function render() {
  const { startMs, windowDays } = getState();
  applyStaticTranslations();
  renderSelects();
  $("date-button").textContent = dateButtonLabel(getState());
  refreshCalendar();
  renderComparison({
    a: selection.a,
    b: selection.b,
    scA: scenarioFor(selection.a, startMs, windowDays),
    scB: scenarioFor(selection.b, startMs, windowDays),
  });
  // La URL refleja la selección para poder compartirla o recargarla.
  history.replaceState(null, "", compareUrl({ ...selection, startMs, windowDays }));
  // Volver a la misión (o imprimir su informe) con el sitio A y las mismas fechas (UI-12).
  document.querySelectorAll("[data-mission-link]").forEach((link) => {
    link.href = missionUrl({ site: selection.a, startMs, windowDays, dateChosen: true }, link.dataset.missionLink);
  });
  document.querySelectorAll("[data-informe-link]").forEach((link) => {
    link.href = informeUrl({ site: selection.a, startMs, windowDays, dateChosen: true });
  });
}

function fitStage() {
  $("stage").style.zoom = String(document.documentElement.clientWidth / DESIGN_WIDTH);
}

function init() {
  applySettings();
  setLang(initialLang());
  fitStage();

  const query = parseCompareQuery(location.search, {
    a: SITES[0],
    b: SITES[1],
    startMs: DEFAULT_START,
    windowDays: 2,
  });
  selection = { a: query.a, b: query.b };
  extraSites = [query.a, query.b].filter((s) => s.custom);
  setState({ startMs: query.startMs, windowDays: query.windowDays, timeMs: query.startMs, dateChosen: true });

  for (const slot of ["a", "b"]) {
    $(`site-${slot}`).addEventListener("change", (event) => {
      selection = { ...selection, [slot]: options().find((s) => siteParam(s) === event.target.value) };
      render();
    });
  }
  $("swap").addEventListener("click", () => {
    selection = { a: selection.b, b: selection.a };
    render();
  });
  $("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "es" ? "en" : "es");
    relabelPoints();
    render();
  });
  initCalendar();
  subscribe((_, changed) => {
    if (changed.has("startMs") || changed.has("windowDays")) render();
  });
  window.addEventListener("resize", fitStage);
  initSettings({
    onLanguage: () => {
      relabelPoints();
      render();
    },
  });

  render();
  // Efemérides JPL Horizons (DEC-033): al llegar, se recalcula con datos reales.
  loadSiteEphemerides().then(render);
}

init();
