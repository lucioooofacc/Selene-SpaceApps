/**
 * Informe imprimible de la misión planificada (UI-06, DEC-020).
 * "Informe" en el menú arma el informe con el escenario actual y abre el
 * diálogo de impresión del navegador (desde ahí también se guarda en PDF).
 * En pantalla el informe está oculto; los estilos de report.css lo muestran
 * solo al imprimir. La UI no calcula: todo sale del escenario y de
 * lib/compare.js.
 */
import { DAY_MS } from "../lib/astro.js";
import { scenarioMetrics } from "../lib/compare.js";
import { coord, dateUTC, deg, duration, pct, timeUTC } from "../lib/format.js";
import { getLang, t } from "../i18n/index.js";
import { getSite } from "../state.js";
import { dataNote, provenanceHtml, qualityHtml } from "./provenance.js";

const $ = (id) => document.getElementById(id);
const MAX_WINDOWS = 12; // filas por tabla de ventanas para no pasar de dos hojas

function formatValue(kind, value) {
  if (kind === "percent") return pct(value);
  if (kind === "minutes") return duration(value);
  if (kind === "ratio") return value.toFixed(2);
  return deg(value);
}

const stamp = (ms) => `${dateUTC(ms)} ${timeUTC(ms)}`;

function windowsTable(windows, titleKey) {
  const rows = windows
    .slice(0, MAX_WINDOWS)
    .map(
      (w, i) =>
        `<tr><td>${i + 1}</td><td>${stamp(w.start)}</td><td>${stamp(w.end)}</td><td>${duration((w.end - w.start) / 60_000)}</td></tr>`,
    )
    .join("");
  const more = windows.length > MAX_WINDOWS ? `<p class="rep-small">${t("report.more", { n: windows.length - MAX_WINDOWS })}</p>` : "";
  return `
    <h3>${t(titleKey)}</h3>
    ${
      windows.length
        ? `<table><thead><tr><th>#</th><th>${t("report.start")}</th><th>${t("report.end")}</th><th>${t("report.length")}</th></tr></thead><tbody>${rows}</tbody></table>${more}`
        : `<p class="rep-small">${t("report.none")}</p>`
    }`;
}

/** Arma el informe con el escenario actual. */
export function renderReport(scenario) {
  const site = getSite(scenario.site.id);
  const name = site ? site.name : t("map.observed");
  const v = scenario.viability;
  const generated = new Intl.DateTimeFormat(getLang() === "es" ? "es-UY" : "en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(Date.now());

  const metrics = scenarioMetrics(scenario)
    .map((m) => `<tr><th>${t(`compare.metric.${m.key}`)}<small>${t(`compare.metricHint.${m.key}`)}</small></th><td>${formatValue(m.kind, m.value)}</td></tr>`)
    .join("");
  const criteria = Object.entries(v.criteria)
    .map(([key, c]) => `<tr><th>${t(`compare.criterion.${key}`)}</th><td>${t(`compare.level.${c.level}`)}</td></tr>`)
    .join("");

  $("report").innerHTML = `
    <header class="rep-head">
      <div>
        <p class="rep-brand">SELENE</p>
        <h1>${t("report.title")}</h1>
      </div>
      <p class="rep-small">${t("report.generated", { date: generated })}</p>
    </header>

    <p class="rep-warning">${dataNote(scenario)}</p>

    <section class="rep-grid">
      <div>
        <h2>${t("report.siteTitle")}</h2>
        <dl>
          <dt>${t("params.site")}</dt><dd>${name}</dd>
          <dt>${t("params.lat")}</dt><dd>${coord(scenario.site.lat, "lat")}</dd>
          <dt>${t("params.lon")}</dt><dd>${coord(scenario.site.lon, "lon")}</dd>
          ${site?.agency ? `<dt>${t("report.agency")}</dt><dd>${site.agency}</dd>` : ""}
        </dl>
      </div>
      <div>
        <h2>${t("report.periodTitle")}</h2>
        <dl>
          <dt>${t("report.start")}</dt><dd>${dateUTC(scenario.startMs)} 00:00 UTC</dd>
          <dt>${t("report.end")}</dt><dd>${dateUTC(scenario.endMs - DAY_MS)} 24:00 UTC</dd>
          <dt>${t("report.days")}</dt><dd>${scenario.windowDays}</dd>
        </dl>
      </div>
      <div class="rep-verdict rep-${v.overall}">
        <h2>${t("compare.viability")}</h2>
        <p><strong>${t(`compare.level.${v.overall}`)}</strong> · ${t("compare.points", { points: v.points, max: v.maxPoints })}</p>
        <table>${criteria}</table>
      </div>
    </section>

    <section>
      <h2>${t("compare.metricsTitle")}</h2>
      <table class="rep-metrics">${metrics}</table>
    </section>

    <section class="rep-grid rep-grid-2 rep-quality">
      <div>
        <h2>${t("quality.provenance")}</h2>
        ${provenanceHtml(site)}
      </div>
      <div>
        <h2>${t("quality.dataTitle")}</h2>
        ${qualityHtml(site, scenario)}
      </div>
    </section>

    <section class="rep-grid rep-grid-2">
      <div>${windowsTable(scenario.summary.lightWindows, "report.lightWindows")}</div>
      <div>${windowsTable(scenario.summary.linkWindows, "report.linkWindows")}</div>
    </section>

    <footer class="rep-foot">
      <p>${t("report.sources")}</p>
      <p>${t("compare.criteriaNote")}</p>
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
