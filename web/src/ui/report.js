/**
 * Informe imprimible de la misión planificada (UI-06, DEC-020; solo texto,
 * DEC-044).
 * "Informe" en el menú arma el informe con el escenario actual y abre el
 * diálogo de impresión del navegador (desde ahí también se guarda en PDF).
 * En pantalla el informe está oculto; los estilos de report.css lo muestran
 * solo al imprimir. La UI no calcula: todo sale del escenario y de
 * lib/compare.js.
 */
import { siteViability } from "../lib/site-terrain.js";
import { DAY_MS } from "../lib/astro.js";
import { scenarioMetrics } from "../lib/compare.js";
import { coord, dateUTC, deg, duration, pct, timeUTC } from "../lib/format.js";
import { getLang, t } from "../i18n/index.js";
import { getSite } from "../state.js";
import { dataNote, provenanceHtml, qualityHtml } from "./provenance.js";
import { STEP_MINUTES } from "../lib/analysis.js";
import { windowStats } from "../lib/stats.js";

const $ = (id) => document.getElementById(id);
const MAX_WINDOWS = 12; // renglones por lista de ventanas para no pasar de dos hojas

function formatValue(kind, value) {
  if (kind === "percent") return pct(value);
  if (kind === "minutes") return duration(value);
  if (kind === "ratio") return value.toFixed(2);
  return deg(value);
}

const stamp = (ms) => `${dateUTC(ms)} ${timeUTC(ms)}`;

/**
 * Referencias de los datos (citas oficiales, ver docs/DATA_SOURCES.md). Van
 * tal cual en los dos idiomas: son citas bibliográficas.
 */
const REFERENCES = [
  "NASA/JPL Solar System Dynamics. Data retrieved on 2026 Nov 14. Horizons System. https://ssd.jpl.nasa.gov",
  "Giorgini, J. D. and JPL Solar System Dynamics Group. NASA/JPL Horizons On-Line Ephemeris System. https://ssd.jpl.nasa.gov/horizons/ (data retrieved 2026-Nov-14).",
  "Neumann, G. A. (2011). LRO Moon Laser Altimeter 4 GDR V1.0 [Dataset]. NASA Planetary Data System. https://doi.org/10.17189/1520642",
  "NASA's Scientific Visualization Studio. CGI Moon Kit (E. Wright), LRO LROC WAC and LOLA data. https://svs.gsfc.nasa.gov/4720/",
];

/** Ventanas como lista de renglones: "1 dic 2026 00:00 → 3 dic 2026 14:20 (2 d 14 h)". */
function windowsList(windows, titleKey) {
  const items = windows
    .slice(0, MAX_WINDOWS)
    .map((w) => `<li>${stamp(w.start)} → ${stamp(w.end)} (${duration((w.end - w.start) / 60_000)})</li>`)
    .join("");
  const more = windows.length > MAX_WINDOWS ? `<p>${t("report.more", { n: windows.length - MAX_WINDOWS })}</p>` : "";
  return `
    <h3>${t(titleKey)}</h3>
    ${windows.length ? `<ol>${items}</ol>${more}` : `<p>${t("report.none")}</p>`}`;
}

/**
 * Arma el informe con el escenario actual (DEC-044): documento de texto
 * corrido, sin cajas ni bordes, pensado para imprimir.
 */
export function renderReport(scenario) {
  const site = getSite(scenario.site.id);
  const name = site ? site.name : t("map.observed");
  // Con la pendiente sumada si el sitio tiene datos de terreno (DEC-071).
  const v = siteViability(scenario.site, scenario);
  const st = windowStats(scenario, STEP_MINUTES);
  const generated = new Intl.DateTimeFormat(getLang() === "es" ? "es-UY" : "en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(Date.now());

  const metrics = scenarioMetrics(scenario)
    .map((m) => `<li><strong>${t(`compare.metric.${m.key}`)}:</strong> ${formatValue(m.kind, m.value)}. <span class="rep-note">${t(`compare.metricHint.${m.key}`)}</span></li>`)
    .join("");
  const criteria = Object.entries(v.criteria)
    .map(([key, c]) => `${t(`compare.requirement.${key}`)}: ${t(`compare.req.${c.level}`).toLowerCase()}`)
    .join("; ");
  const avg = (key, body) =>
    `<li><strong>${t(`params.${key}`)}:</strong> ${t("report.avgLine", {
      mean: deg(body.elevation.mean),
      min: deg(body.elevation.min),
      max: deg(body.elevation.max),
      pct: Math.round(body.visibleFraction * 100),
    })}</li>`;

  $("report").innerHTML = `
    <header class="rep-head">
      <p class="rep-brand">SELENE</p>
      <h1>${t("report.title")}</h1>
      <p class="rep-note">${t("report.generated", { date: generated })}</p>
    </header>

    <p class="rep-data"><em>${dataNote(scenario)}</em></p>

    <section>
      <h2>1. ${t("report.siteTitle")} · ${t("report.periodTitle")}</h2>
      <p>
        <strong>${name}</strong>${site?.agency ? ` (${site.agency})` : ""}, ${t("params.lat").toLowerCase()} ${coord(scenario.site.lat, "lat")},
        ${t("params.lon").toLowerCase()} ${coord(scenario.site.lon, "lon")}.
        ${t("report.periodLine", { start: dateUTC(scenario.startMs), end: dateUTC(scenario.endMs - DAY_MS), days: scenario.windowDays })}
      </p>
    </section>

    <section>
      <h2>2. ${t("compare.viability")}</h2>
      <p><strong>${t(`compare.level.${v.overall}`)}</strong> (${t("compare.points", { met: v.met, total: v.total })}). ${criteria}.</p>
    </section>

    <section>
      <h2>3. ${t("compare.metricsTitle")}</h2>
      <ul>${metrics}</ul>
    </section>

    <section>
      <h2>4. ${t("params.avgTitle")}</h2>
      <ul>
        ${avg("sun", st.sun)}
        ${avg("earth", st.earth)}
        <li>${t("report.runs", { night: duration(st.longestNightMin), light: duration(st.longestLightMin), blackout: duration(st.longestBlackoutMin) })}</li>
      </ul>
    </section>

    <section>
      <h2>5. ${t("report.windowsTitle")}</h2>
      ${windowsList(scenario.summary.lightWindows, "report.lightWindows")}
      ${windowsList(scenario.summary.linkWindows, "report.linkWindows")}
    </section>

    <section>
      <h2>6. ${t("quality.provenance")} · ${t("quality.dataTitle")}</h2>
      ${provenanceHtml(site)}
      ${qualityHtml(site, scenario)}
    </section>

    <footer class="rep-foot">
      <p>${t("report.sources")}</p>
      <p>${t("compare.criteriaNote")}</p>
      <h3>${t("report.refsTitle")}</h3>
      <ol class="rep-refs">${REFERENCES.map((r) => `<li>${r}</li>`).join("")}</ol>
    </footer>`;
}

/**
 * Conecta el enlace "Informe". `getScenario` devuelve el escenario vigente.
 * Si la página se abre con #informe (desde la comparación), imprime al cargar.
 */
export function initReport(getScenario) {
  const print = () => {
    renderReport(getScenario());
    window.print();
  };
  document.querySelectorAll("[data-report-link]").forEach((link) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      print();
    }),
  );
  if (location.hash === "#informe") {
    history.replaceState(null, "", location.pathname + location.search);
    // Esperar a las fuentes para que el informe salga con la tipografía correcta.
    (document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(print, 300));
  }
  // Si se imprime con Ctrl+P, el informe también tiene que estar al día.
  window.addEventListener("beforeprint", () => renderReport(getScenario()));
}
