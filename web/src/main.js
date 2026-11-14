/**
 * Punto de entrada: conecta estado → modelo → interfaz.
 *
 * Flujo:
 *  1. Un control cambia el estado (setState).
 *  2. Si cambió el sitio, la fecha o la ventana, se recalcula el escenario.
 *  3. Se redibuja solo lo que depende de lo que cambió.
 */
import "./styles/main.css";
import { computeScenario, sampleAt } from "./lib/analysis.js";
import { findSite } from "./data/sites.js";
import { applyStaticTranslations, initialLang, setLang, getLang } from "./i18n/index.js";
import { getState, subscribe } from "./state.js";
import { initSetup, renderSetup } from "./ui/setup.js";
import { initMap, renderMap } from "./ui/map.js";
import { renderInsight, renderMetrics, renderStatus, renderViability } from "./ui/panels.js";
import { renderPanorama } from "./ui/panorama.js";
import { initTimeline, renderPlayback, renderTime, renderWindows } from "./ui/timeline.js";
import { initCompare, pinScenario, renderCompare } from "./ui/compare.js";

let scenario = null;
let scenarioKey = "";
let lastPanelsAt = 0;

/** El escenario solo depende del sitio, la fecha de inicio y la ventana. */
function ensureScenario(state) {
  const key = `${state.siteId}|${state.lat}|${state.lon}|${state.startMs}|${state.windowDays}`;
  if (key === scenarioKey) return false;
  const curated = findSite(state.siteId);
  const site = {
    id: state.siteId,
    lat: state.lat,
    lon: state.lon,
    // Si el usuario editó las coordenadas de un sitio curado, ya no aplican sus parámetros.
    ...(curated && curated.lat === state.lat && curated.lon === state.lon
      ? { relief: curated.relief, elevationKm: curated.elevationKm }
      : {}),
  };
  scenario = computeScenario(site, state.startMs, state.windowDays);
  scenarioKey = key;
  return true;
}

function renderInstant(state, { force = false } = {}) {
  const sample = sampleAt(scenario, state.timeMs);
  renderPanorama(scenario, sample, { full: force });
  renderTime(scenario, sample);
  // Durante la reproducción, los paneles de texto se refrescan ~8 veces por segundo.
  const now = performance.now();
  if (force || !state.playing || now - lastPanelsAt > 120) {
    renderMetrics(scenario, sample);
    renderStatus(sample);
    renderInsight(scenario, sample);
    lastPanelsAt = now;
  }
}

function renderAll() {
  const state = getState();
  ensureScenario(state);
  applyStaticTranslations();
  document.querySelectorAll("[data-lang]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === getLang())),
  );
  renderSetup(state);
  renderMap(state);
  renderViability(scenario);
  renderWindows(scenario);
  renderPlayback(state);
  renderCompare(state);
  renderInstant(state, { force: true });
}

const SCENARIO_KEYS = ["siteId", "lat", "lon", "startMs", "windowDays"];

subscribe((state, changed) => {
  const has = (...keys) => keys.some((k) => changed.has(k));

  if (has(...SCENARIO_KEYS)) {
    ensureScenario(state);
    renderSetup(state);
    renderMap(state);
    renderViability(scenario);
    renderWindows(scenario);
    renderInstant(state, { force: true });
    return;
  }
  if (has("mapView", "heatMode")) renderMap(state);
  if (has("playing", "speed")) renderPlayback(state);
  if (has("compare")) renderCompare(state);
  if (has("timeMs", "playing")) renderInstant(state, { force: changed.has("playing") });
});

function init() {
  setLang(initialLang());
  initSetup();
  initMap();
  initTimeline();
  initCompare();

  document.querySelectorAll("[data-lang]").forEach((button) =>
    button.addEventListener("click", () => {
      setLang(button.dataset.lang);
      renderAll();
    }),
  );
  document.getElementById("pin-scenario").addEventListener("click", () => {
    ensureScenario(getState());
    pinScenario(scenario);
  });

  // Recalcula la posición del cursor del gráfico de ventanas si cambia el ancho.
  window.addEventListener("resize", () => renderInstant(getState(), { force: true }));

  renderAll();
  // Primer escenario fijado para que el comparador no arranque vacío.
  pinScenario(scenario);
}

init();
