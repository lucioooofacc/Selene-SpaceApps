/**
 * Entrada del informe web de un sitio (informe.html, DEC-059). Lee el sitio y
 * las fechas de la URL (mismo formato que la misión, UI-12), calcula el
 * escenario con el motor y delega el dibujo en ui/site-report.js. El botón
 * "Imprimir" arma el informe de texto (DEC-044) y abre la impresión.
 */
import "./styles/main.css";
import "./styles/compare.css";
import "./styles/report.css";
import "./styles/help.css";
import { computeScenario, realDataVersion } from "./lib/analysis.js";
import { dateScenarios, pickDistinct } from "./lib/dates.js";
import { rankEntries } from "./lib/ranking.js";
import { SITES } from "./data/sites.js";
import { applyStaticTranslations, getLang, initialLang, setLang } from "./i18n/index.js";
import { DEFAULT_START, getState, setState, subscribe } from "./state.js";
import { dateButtonLabel, initCalendar, refreshCalendar } from "./ui/calendar.js";
import { ensureGlobalDem, ensurePolarTerrain, loadPolarTerrain, loadSiteEphemerides } from "./ui/ephemerides.js";
import { dataStatus, onDataStatus } from "./ui/data-status.js";
import { compareUrl, missionUrl, parseMissionQuery, parseSiteParam, siteParam } from "./ui/links.js";
import { initReport } from "./ui/report.js";
import { applySettings, initSettings } from "./ui/settings.js";
import { initHelp, refreshHelp } from "./ui/help.js";
import { renderSiteReport } from "./ui/site-report.js";
import { runInWorker } from "./ui/compute.js";

const DESIGN_WIDTH = 1992;
const DAYS_DEFAULT = 7;
const $ = (id) => document.getElementById(id);

let site = SITES[0];
let extra = null; // punto o sitio propio que llegó por la URL
let scenario = null;
let scenarioKey = "";
let dates; // undefined: calculando; null: sin serie; { picks }
let datesKey = "";
let globe = null;
let globeLoading = null;

const options = () => (extra ? [...SITES, extra] : SITES);

function ensureScenario() {
  const { startMs, windowDays } = getState();
  const key = `${siteParam(site)}|${startMs}|${windowDays}|${realDataVersion()}`;
  if (key !== scenarioKey) {
    scenario = computeScenario(site, startMs, windowDays);
    scenarioKey = key;
  }
  ensurePolarTerrain([site], render);
  // Terreno fuera del polo sur sin tabla precalculada: DEM global a demanda (DEC-067).
  ensureGlobalDem(site, render);
}

/** Mejores fechas del sitio (en el worker si se puede, DEC-047). */
function ensureDates() {
  const { windowDays } = getState();
  const key = `${siteParam(site)}|${windowDays}|${realDataVersion()}`;
  if (key === datesKey) return;
  datesKey = key;
  dates = undefined;
  const job = runInWorker("dates", { site, windowDays }) ?? Promise.resolve(dateScenarios(site, windowDays));
  Promise.resolve(job)
    .catch(() => dateScenarios(site, windowDays))
    .then((res) => {
      if (key !== datesKey) return;
      const entries = res?.items.map((it) => ({ site: { name: new Date(it.startMs).toISOString() }, startMs: it.startMs, scenario: it.scenario, traits: 0 }));
      dates = res && { picks: { overall: pickDistinct(rankEntries(entries, "overall"), windowDays, 5) } };
      render();
    });
}

function renderSelect() {
  $("rw-site").innerHTML = options()
    .map((s) => `<option value="${siteParam(s)}">${s.name}</option>`)
    .join("");
  $("rw-site").value = siteParam(site);
}

/** Luna 3D con el sitio marcado, centrada en él (moon3d.js de la misión). */
function renderGlobe() {
  $("rw-globe-pins").innerHTML = `
    <div class="pin cmp-globe-pin cmp-globe-pin-a" data-lat="${site.lat}" data-lon="${site.lon}">
      <span class="pin-label">${site.name}</span>
      <img src="./figma/pin-site.svg" alt="" width="32" height="32" />
    </div>`;
  const center = () => {
    globe.setView("compare");
    globe.centerOn(site.lat, site.lon);
    globe.refreshPins();
  };
  if (globe) return center();
  if (globeLoading) return;
  const box = $("rw-globe");
  box.dataset.loading = "true";
  globeLoading = import("./ui/moon3d.js")
    .then(({ createMoon3D }) => createMoon3D(box, { onPick() {}, onReady: () => delete box.dataset.loading }))
    .then((g) => {
      globe = g;
      center();
    })
    .catch(() => {
      delete box.dataset.loading;
      box.dataset.error = "true";
    });
}

function render() {
  const state = getState();
  applyStaticTranslations();
  renderSelect();
  $("date-button").textContent = dateButtonLabel(state);
  refreshCalendar();
  ensureScenario();
  ensureDates();
  renderSiteReport({ site, scenario, dates, demState: dataStatus().polarDem.state, globalDemState: dataStatus().globalDem.state });
  renderGlobe();
  const selection = { site, startMs: state.startMs, windowDays: state.windowDays, dateChosen: true };
  history.replaceState(null, "", `./informe.html${missionUrl(selection).replace("./index.html", "")}`);
  document.querySelectorAll("[data-mission-link]").forEach((a) => (a.href = missionUrl(selection)));
  const b = SITES.find((s) => s.id !== site.id) ?? SITES[1];
  document.querySelectorAll("[data-compare-link]").forEach((a) => (a.href = compareUrl({ a: site, b, startMs: state.startMs, windowDays: state.windowDays })));
}

function fitStage() {
  $("stage").style.zoom = String(document.documentElement.clientWidth / DESIGN_WIDTH);
}

function init() {
  applySettings();
  setLang(initialLang());
  fitStage();
  const q = parseMissionQuery(location.search);
  if (q.site) {
    site = q.site;
    if (q.site.custom) extra = q.site;
  }
  const startMs = q.startMs ?? DEFAULT_START;
  const windowDays = q.windowDays ?? DAYS_DEFAULT;
  setState({ startMs, windowDays, timeMs: startMs, dateChosen: true });

  $("rw-site").addEventListener("change", (event) => {
    site = options().find((s) => siteParam(s) === event.target.value) ?? site;
    render();
  });
  $("rw-dates").addEventListener("click", (event) => {
    const button = event.target.closest("[data-start]");
    if (button) setState({ startMs: Number(button.dataset.start), timeMs: Number(button.dataset.start) });
  });
  $("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "es" ? "en" : "es");
    if (extra) extra = parseSiteParam(extra.id) ?? extra;
    if (site.custom) site = extra;
    render();
    refreshHelp();
  });
  initCalendar();
  subscribe((_, changed) => {
    if (changed.has("startMs") || changed.has("windowDays")) render();
  });
  onDataStatus(() => requestAnimationFrame(render));
  window.addEventListener("resize", fitStage);
  initSettings({ onLanguage: render });
  initReport(() => scenario);
  // Guía de la página (DEC-073): «?» en cada sección y recorrido desde «Guía» (no se abre solo).
  initHelp({
    tourKey: "selene-tour-report-seen",
    welcome: "help.tourReport",
    topics: [
      { id: "rwControls", target: ".rw-controls" },
      { id: "rwSummary", target: 'section[aria-labelledby="rw-summary-title"]' },
      { id: "viability", target: "#rw-kpis" },
      { id: "rwTerrain", target: 'section[aria-labelledby="rw-terrain-title"]' },
      { id: "rwLight", target: 'section[aria-labelledby="rw-light-title"]' },
      { id: "rwDates", target: 'section[aria-labelledby="rw-dates-title"]' },
      { id: "rwTraj", target: 'section[aria-labelledby="rw-traj-title"]' },
    ],
  });

  render();
  loadSiteEphemerides().then(render);
  // Terreno (DEC-059): el DEM polar reducido cubre al sur de −75°.
  if (site.lat <= -75) loadPolarTerrain(render);
  $("rw-site").addEventListener("change", () => {
    if (site.lat <= -75) loadPolarTerrain(render);
  });
}

init();
