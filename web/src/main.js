/**
 * Punto de entrada: conecta estado → modelo → interfaz.
 *
 * Flujo:
 *  1. Un control cambia el estado (setState).
 *  2. Si cambió el sitio, la fecha o la duración, se recalcula el escenario.
 *  3. Se redibuja solo lo que depende de lo que cambió.
 */
import "./styles/main.css";
import "./styles/report.css";
import "./styles/help.css";
import { computeScenario, realDataVersion, sampleAt } from "./lib/analysis.js";
import { ensurePolarTerrain, loadSiteEphemerides } from "./ui/ephemerides.js";
import { applyStaticTranslations, getLang, initialLang, setLang } from "./i18n/index.js";
import { CUSTOM_ID, allSites, getSite, getState, setState, subscribe } from "./state.js";
import { initMap, placeAccent, renderMap } from "./ui/map.js";
import { initPlaces, rankedSites, renderPlaces } from "./ui/places.js";
import { currentSite, missionQuery, parseMissionQuery, updateCompareLinks } from "./ui/links.js";
import { initReport } from "./ui/report.js";
import { applySettings, getSettings, initSettings } from "./ui/settings.js";
import { initQualityDialog } from "./ui/provenance.js";
import { initParams, renderCriteria, renderParamsFields } from "./ui/params.js";
import { refreshCalendar } from "./ui/calendar.js";
import { initPeriodSummary, renderInsight, renderPeriodSummary, renderStatus } from "./ui/status.js";
import { renderPanorama } from "./ui/panorama.js";
import { initHelp, refreshHelp } from "./ui/help.js";
import { initTimeline, renderCoverage, renderPlayback, renderTicks, renderTime } from "./ui/timeline.js";

const DESIGN_WIDTH = 1992;

let scenario = null;
let scenarioKey = "";
let lastPanelsAt = 0;

/** El escenario solo depende del sitio, la fecha de inicio y la duración. */
function ensureScenario(state) {
  const key = `${state.siteId}|${state.lat}|${state.lon}|${state.startMs}|${state.windowDays}|${realDataVersion()}`;
  if (key === scenarioKey) return;
  const site = { id: state.siteId, lat: state.lat, lon: state.lon };
  scenario = computeScenario(site, state.startMs, state.windowDays);
  scenarioKey = key;
  // Puntos propios al sur de −75°: horizonte LOLA reducido al llegar el DEM (DEC-034).
  ensurePolarTerrain([site, ...allSites()], renderAll);
}

function renderInstant(state, { force = false } = {}) {
  const sample = sampleAt(scenario, state.timeMs);
  renderPanorama(scenario, sample, { full: force });
  renderTime(scenario, sample);
  // Durante la reproducción, los paneles de texto se refrescan ~8 veces por segundo.
  const now = performance.now();
  if (force || !state.playing || now - lastPanelsAt > 120) {
    renderCriteria(scenario, sample);
    renderStatus(sample);
    renderInsight(scenario, sample);
    renderPeriodSummary(scenario);
    renderPlaces(state);
    updateCompareLinks(state, rankedSites(state));
    lastPanelsAt = now;
  }
}

function renderAll() {
  const state = getState();
  ensureScenario(state);
  applyStaticTranslations();
  renderParamsFields(state);
  renderMap(state);
  renderTicks(state.windowDays);
  renderCoverage(scenario);
  renderPlayback(state);
  refreshCalendar();
  renderInstant(state, { force: true });
}

const SCENARIO_KEYS = ["siteId", "lat", "lon", "startMs", "windowDays", "customSites"];

subscribe((state, changed) => {
  const has = (...keys) => keys.some((k) => changed.has(k));
  if (has(...SCENARIO_KEYS, "dateChosen", "siteChosen")) {
    syncUrl(state);
    ensureScenario(state);
    renderParamsFields(state);
    renderMap(state);
    renderTicks(state.windowDays);
    renderCoverage(scenario);
    renderInstant(state, { force: true });
    return;
  }
  if (has("mapView", "mapMode", "heatLayer")) renderMap(state);
  if (has("heatLayer")) syncUrl(state);
  if (has("placesCategory", "placesMode")) {
    renderPlaces(state);
    updateCompareLinks(state, rankedSites(state));
  }
  if (has("playing", "speed")) renderPlayback(state);
  if (has("timeMs", "playing")) renderInstant(state, { force: changed.has("playing") });
});

/** La URL refleja el sitio y las fechas para compartir el enlace o volver desde la comparación (UI-12). */
function syncUrl(state) {
  const site = currentSite(state);
  if (site) history.replaceState(null, "", `${location.pathname}${missionQuery({ site, ...state })}${location.hash}`);
}

/** Selección inicial desde la URL (sitio y fechas); lo inválido se ignora. */
function stateFromUrl() {
  const { site, startMs, windowDays, layer } = parseMissionQuery(location.search);
  const patch = {};
  if (site?.label) {
    // Sitio propio con nombre (DEC-049): vuelve a la lista de sitios con ese nombre.
    const saved = { id: `custom-url`, name: site.label, lat: site.lat, lon: site.lon, custom: true };
    Object.assign(patch, { customSites: [saved], siteId: saved.id, lat: site.lat, lon: site.lon, siteChosen: true });
  } else if (site) Object.assign(patch, { siteId: site.custom ? CUSTOM_ID : site.id, lat: site.lat, lon: site.lon, siteChosen: true });
  if (startMs != null) Object.assign(patch, { startMs, windowDays, timeMs: startMs, dateChosen: true });
  // Capa calculada del mapa (DEC-057): se abre en la pestaña ELEVACIÓN con esa capa.
  if (layer) Object.assign(patch, { heatLayer: layer, mapView: "heat" });
  return patch;
}

/** El diseño mide 1992 px de ancho; se escala para ocupar el ancho de la ventana. */
function fitStage() {
  const zoom = document.documentElement.clientWidth / DESIGN_WIDTH;
  document.getElementById("stage").style.zoom = String(zoom);
}

function init() {
  applySettings();
  setState({ mapMode: getSettings().mapMode, ...stateFromUrl() });
  if (location.search) syncUrl(getState()); // reemplaza parámetros inválidos por la selección real
  setLang(initialLang());
  fitStage();
  initPlaces();
  initMap();
  initParams();
  initTimeline();
  initPeriodSummary();
  // Efemérides JPL Horizons (DEC-033): al llegar, se recalcula con datos reales.
  loadSiteEphemerides().then(renderAll);

  document.getElementById("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "es" ? "en" : "es");
    renderAll();
    refreshHelp();
  });

  window.addEventListener("resize", () => {
    fitStage();
    placeAccent();
  });
  // Cuando cargan las fuentes cambian los anchos de las pestañas del mapa.
  document.fonts?.ready.then(placeAccent);

  renderAll();
  initReport(() => scenario);
  initQualityDialog(() => ({ site: getSite(getState().siteId), scenario }));
  initSettings({
    onLanguage: () => {
      renderAll();
      refreshHelp();
    },
    onMapMode: (mapMode) => setState({ mapMode }),
  });
  // Ayuda por tarjeta y recorrido (UI-16, DEC-066). El recorrido no se abre solo si la
  // página llega con una selección en la URL (enlace compartido) o para imprimir el informe.
  initHelp({ autoStart: !location.search && !location.hash });
}

init();
