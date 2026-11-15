/**
 * Procedencia de los sitios y calidad de los datos (UI-01 parcial, DEC-028).
 *
 * - Procedencia: muestra los metadatos de `sites.js` (DEC-019) que se pueden
 *   traducir: tipo de punto, confianza, exactitud declarada, si el marco está
 *   verificado y enlaces a las fuentes oficiales. Las notas en prosa de
 *   `sites.js` existen solo en español y no se muestran.
 * - Calidad: dice, para cada dato de la página, si es real, aproximado o
 *   sintético. El Sol y la Tierra salen de JPL Horizons o del modelo aproximado según
 *   `scenario.ephemeris` (DEC-033)
 *   y el horizonte es sintético (DEC-005) salvo que la función del horizonte
 *   declare `source === "lola"` (propuesta para TERRAIN-02).
 *
 * - Efemérides (UI-01, DEC-039): estado, fuente, cobertura y fecha de consulta
 *   de las series de JPL Horizons, y los estados de carga, error y faltante de
 *   las efemérides y del DEM LOLA reducido (`data-status.js`).
 *
 * Solo presenta: no calcula nada.
 */
import { t } from "../i18n/index.js";
import { TRAIT_SOURCES, traitsFor } from "../data/site-traits.js";
import { lolaForScenario } from "./lola.js";
import { dataStatus, onDataStatus } from "./data-status.js";
import { dateUTC, pct } from "../lib/format.js";
import { findSite } from "../data/sites.js";
import { needsPolarDem, needsRegionalAtlas } from "../lib/analysis.js";

const HORIZONS_DOCS = "https://ssd.jpl.nasa.gov/horizons/";

const SOURCE_LABELS = [
  ["nssdc.gsfc.nasa.gov", "NASA NSSDCA"],
  ["ntrs.nasa.gov", "NASA NTRS"],
  ["pgda.gsfc.nasa.gov", "NASA PGDA"],
  ["cnsa.gov.cn", "CNSA"],
  ["planetarynames.wr.usgs.gov", "USGS"],
];

function sourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SOURCE_LABELS.find(([h]) => host.endsWith(h))?.[1] ?? host;
  } catch {
    return url;
  }
}

const links = (urls = []) =>
  urls.map((u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${sourceLabel(u)}</a>`).join(" · ");

/** Etiqueta de calidad: "real" | "approx" | "synthetic" | "none". */
export const qualityTag = (kind) => `<span class="q-tag q-${kind}">${t(`quality.tag.${kind}`)}</span>`;

/** Bloque de procedencia de un sitio (curado o punto elegido en el mapa). */
export function provenanceHtml(site) {
  if (!site?.provenance) {
    return `<p class="prov-none">${qualityTag("none")} ${t("quality.noProvenance")}</p>`;
  }
  const { point, provenance, confidence, precision } = site;
  const accuracy = precision?.accuracyM != null ? t("quality.accuracyM", { m: precision.accuracyM }) : t("quality.accuracyUnknown");
  return `
    <dl class="prov">
      <dt>${t("quality.point")}</dt><dd>${point?.name ?? site.name} · ${t(`quality.pointType.${point?.type ?? "study-point"}`)}</dd>
      <dt>${t("quality.confidence")}</dt><dd><span class="q-conf q-conf-${confidence?.level}">${t(`quality.level.${confidence?.level ?? "baja"}`)}</span></dd>
      <dt>${t("quality.accuracy")}</dt><dd>${accuracy}</dd>
      <dt>${t("quality.frame")}</dt><dd>MOON_ME / DE421 · ${t(provenance.sourceFrameVerified ? "quality.frameDeclared" : "quality.frameInferred")}</dd>
      <dt>${t("quality.sources")}</dt><dd>${links(provenance.urls) || "—"}</dd>
    </dl>`;
}

/** Rasgos de interés científico del sitio, con su cita (pendientes de validar, DEC-029). */
export function traitsHtml(site) {
  const traits = site ? traitsFor(site.id) : [];
  if (!traits.length) return `<p class="prov-none">${t("places.noTraits")}</p>`;
  return `
    <ul class="traits">
      ${traits
        .map((tr) => {
          const src = TRAIT_SOURCES[tr.source];
          return `<li><strong>${t(`traits.${tr.key}`)}</strong><small><a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.citation}</a></small></li>`;
        })
        .join("")}
    </ul>
    <p class="settings-hint">${t("places.scienceNote")}</p>`;
}

/**
 * Título del bloque del horizonte: "real" si es el del punto y "de la zona"
 * si es el regional interpolado del atlas global (DEC-068).
 */
export function lolaTitle(scenario) {
  return t(lolaForScenario(scenario).horizon?.meta?.regional ? "quality.lola.titleRegional" : "quality.lola.title");
}

/** Resumen del horizonte LOLA del sitio (TERRAIN-02, DEC-030), o por qué no hay. */
export function lolaHtml(scenario) {
  const { horizon, mode } = lolaForScenario(scenario);
  if (!horizon) {
    const dem = polarDemState(scenario);
    if (dem) return `<p class="prov-none" role="status">${qualityTag(dem === "loading" ? "loading" : "none")} ${t(`quality.lola.dem.${dem}`)}</p>`;
    return `<p class="prov-none">${qualityTag("none")} ${t("quality.lola.none")}</p>`;
  }
  const { observer, summary, product } = horizon.meta;
  const deg = (v) => `${v.toFixed(1)}°`;
  return `
    <dl class="prov">
      <dt>${t("quality.lola.status")}</dt><dd>${t(mode === "active" ? "quality.lola.active" : "quality.lola.preview")}</dd>
      <dt>${t(horizon.meta.regional ? "quality.lola.groundRegional" : "quality.lola.ground")}</dt><dd>${Math.round(observer.groundHeightM)} m</dd>
      <dt>${t("quality.lola.range")}</dt><dd>${deg(summary.minDeg)} / ${deg(summary.meanDeg)} / ${deg(summary.maxDeg)}</dd>
      <dt>${t("quality.lola.low")}</dt><dd>${pct(summary.lowConfidenceFraction * 100, 1)}</dd>
      <dt>${t("quality.lola.truncated")}</dt><dd>${pct(summary.truncatedFraction * 100, 1)}</dd>
      <dt>${t("quality.lola.product")}</dt><dd><a href="https://doi.org/${product.doi}" target="_blank" rel="noopener noreferrer">LOLA ${product.dem.productId} ${product.productVersion}</a>${horizon.meta.reduced ? ` · ${t("quality.lola.reduced", { res: horizon.meta.resolutionsM.join("/") })}` : ""}${horizon.meta.regional ? ` · ${t("quality.lola.regional", { deg: horizon.meta.cellDeg })}` : ""}</dd>
    </dl>`;
}

/**
 * Estado del DEM LOLA reducido si el escenario es un punto propio que lo
 * necesita y todavía no tiene horizonte LOLA: "loading" | "error" | null.
 */
function polarDemState(scenario) {
  if (scenario?.horizon?.source === "lola" || !scenario?.site?.custom) return null;
  // Al sur de −75° manda el DEM polar reducido; en el resto, el atlas global (DEC-068).
  const status = dataStatus();
  const part = needsPolarDem(scenario.site) ? status.polarDem : needsRegionalAtlas(scenario.site) ? status.globalHeatAtlas : null;
  return part?.state === "loading" ? "loading" : part?.state === "error" ? "error" : null;
}

/**
 * Estado de las efemérides del escenario: "real" | "derived" | "mixed" |
 * "loading" | "error" | "siteFailed" | "outside" (fuera de la cobertura o
 * sin series pedidas, como en las pruebas).
 */
function ephemerisState(scenario) {
  const eph = scenario?.ephemeris;
  if (eph?.source === "horizons") return eph.derived ? "derived" : "real";
  if (eph?.source === "mixed") return "mixed";
  const { state, failed } = dataStatus().ephemerides;
  if (state === "loading") return "loading";
  if (state === "error") return "error";
  if (failed.some((f) => f.id === scenario?.site?.id)) return "siteFailed";
  return "outside";
}

const EPHEMERIS_TAG = { real: "real", derived: "real", mixed: "approx", loading: "loading", error: "approx", siteFailed: "approx", outside: "approx" };

/** Altura del observador usada en la consulta a Horizons. */
function observerText(observer) {
  if (observer?.altitudeBasis === "measured-datum") {
    return t("quality.eph.altitudeMeasured", { m: Math.round(observer.altitudeKm * 1000) });
  }
  return t("quality.eph.altitudeAssumed");
}

/** Bloque "Efemérides del Sol y la Tierra" (UI-01, DEC-039). */
export function ephemerisHtml(scenario) {
  const state = ephemerisState(scenario);
  const head = `<dt>${t("quality.eph.status")}</dt><dd>${qualityTag(EPHEMERIS_TAG[state])} ${t(`quality.eph.state.${state}`)}</dd>`;
  const meta = scenario?.ephemeris?.meta;
  if (!meta) return `<dl class="prov" role="status">${head}</dl>`;

  const { windowFraction, lookaheadComplete } = scenario.ephemeris;
  const cov = meta.coverage;
  const from = meta.derivedFrom ? findSite(meta.derivedFrom) : null;
  const retrieved = Date.parse(meta.sun?.retrievedAt);
  return `
    <dl class="prov" role="status">
      ${head}
      <dt>${t("quality.eph.source")}</dt><dd><a href="${HORIZONS_DOCS}" target="_blank" rel="noopener noreferrer">${meta.name ?? "NASA/JPL Horizons"}</a> · ${meta.ephemeris ?? "—"} · ${meta.centerPole ?? "—"}</dd>
      ${from ? `<dt>${t("quality.eph.derivedFrom")}</dt><dd>${t("quality.eph.derivedFromValue", { name: from.name, km: meta.derivedDistanceKm })}</dd>` : ""}
      <dt>${t("quality.eph.coverage")}</dt><dd>${t("quality.eph.coverageValue", { from: dateUTC(cov.startMs), to: dateUTC(cov.stopMs), step: cov.stepMinutes })}</dd>
      <dt>${t("quality.eph.window")}</dt><dd>${pct(windowFraction * 100)}${lookaheadComplete ? "" : ` · ${t("quality.eph.lookahead")}`}</dd>
      <dt>${t("quality.eph.retrieved")}</dt><dd>${Number.isFinite(retrieved) ? dateUTC(retrieved) : "—"}</dd>
      <dt>${t("quality.eph.observer")}</dt><dd>${observerText(meta.observer)}</dd>
    </dl>`;
}

/**
 * Una línea con el origen de los datos del escenario (UI-02, DEC-041):
 * Sol y Tierra (Horizons / trasladadas / mixto / cargando / aproximado) y
 * horizonte (LOLA / LOLA reducido / sintético). Reemplaza el aviso fijo de
 * "modelo aproximado v1" en el informe y la comparación.
 */
export function dataNote(scenario) {
  const state = ephemerisState(scenario);
  const ephKey = { real: "real", derived: "derived", mixed: "mixed", loading: "loading", error: "error", siteFailed: "error", outside: "approx" }[state];
  const pct = Math.round(100 * (scenario?.ephemeris?.windowFraction ?? 0));
  const lola = lolaForScenario(scenario);
  const meta = lola.horizon?.meta;
  const horizonKey = lola.mode === "active" ? (meta?.regional ? "regional" : meta?.reduced ? "reduced" : "lola") : "synthetic";
  return t("dataNote.text", {
    eph: t(`dataNote.eph.${ephKey}`, { pct }),
    horizon: t(`dataNote.horizon.${horizonKey}`),
  });
}

/**
 * Tramos del período (fracciones 0..1 de la ventana) en los que el Sol y la
 * Tierra salen del modelo aproximado, para marcarlos en la línea de tiempo.
 * Solo compara instantes con la cobertura declarada por la serie: no calcula
 * posiciones.
 * @returns {Array<[number, number]>}
 */
export function approxSegments(scenario) {
  const eph = scenario?.ephemeris;
  if (!eph || eph.source === "horizons") return [];
  const cov = eph.meta?.coverage;
  if (eph.source === "approximate" || !cov) return [[0, 1]];
  const span = scenario.endMs - scenario.startMs;
  const a = (cov.startMs - scenario.startMs) / span;
  const b = (cov.stopMs - scenario.startMs) / span;
  const segments = [];
  if (a > 0) segments.push([0, Math.min(1, a)]);
  if (b < 1) segments.push([Math.max(0, b), 1]);
  return segments;
}

/** Filas de calidad de los datos de la página para el escenario dado. */
export function qualityRows(site, scenario) {
  const lola = lolaForScenario(scenario);
  const horizonRow =
    lola.mode === "active" && lola.horizon.meta?.regional
      ? { key: "horizon", hint: "horizonRegional", kind: "approx", ref: "DEC-068" }
      : lola.mode === "active" && lola.horizon.meta?.reduced
      ? { key: "horizon", hint: "horizonReduced", kind: "approx", ref: "DEC-034" }
      : lola.mode === "active"
      ? { key: "horizon", hint: "horizonActive", kind: "real", ref: "DEC-030" }
      : lola.mode === "preview"
        ? { key: "horizon", hint: "horizonPreview", kind: "synthetic", ref: "DEC-005 · DEC-030" }
        : polarDemState(scenario) === "loading"
          ? { key: "horizon", hint: "horizonLoading", kind: "loading", ref: "DEC-034" }
          : polarDemState(scenario) === "error"
            ? { key: "horizon", hint: "horizonError", kind: "synthetic", ref: "DEC-034 · DEC-005" }
            : { key: "horizon", kind: "synthetic", ref: "DEC-005" };
  // Origen del Sol y la Tierra según el escenario (CORE-01 parte B, DEC-033).
  const source = scenario?.ephemeris?.source;
  const ephemerisRow =
    source === "horizons" && scenario.ephemeris.derived
      ? { key: "ephemeris", hint: "ephemerisDerived", kind: "real", ref: "DEC-034" }
      : source === "horizons"
      ? { key: "ephemeris", hint: "ephemerisReal", kind: "real", ref: "DEC-033" }
      : source === "mixed"
        ? { key: "ephemeris", hint: "ephemerisMixed", kind: "approx", ref: "DEC-033 · DEC-004" }
        : ephemerisState(scenario) === "loading"
          ? { key: "ephemeris", hint: "ephemerisLoading", kind: "loading", ref: "DEC-033" }
          : ephemerisState(scenario) === "outside"
            ? { key: "ephemeris", kind: "approx", ref: "DEC-004" }
            : { key: "ephemeris", hint: "ephemerisError", kind: "approx", ref: "DEC-033 · DEC-004" };
  return [
    { key: "coords", kind: site?.provenance ? "real" : "none", ref: "DEC-019" },
    ephemerisRow,
    horizonRow,
    { key: "imagery", kind: "real", ref: "DEC-021 · DEC-026" },
    { key: "thresholds", kind: "approx", ref: "DEC-007" },
  ];
}

export function qualityHtml(site, scenario) {
  return `
    <ul class="quality">
      ${qualityRows(site, scenario)
        .map(
          // Las referencias internas (ref, DEC-xxx) no se muestran: el sitio lo evalúa un jurado externo.
          ({ key, hint, kind }) => `
        <li>
          ${qualityTag(kind)}
          <span><strong>${t(`quality.row.${key}`)}</strong><small>${t(`quality.rowHint.${hint ?? key}`)}</small></span>
        </li>`,
        )
        .join("")}
    </ul>`;
}

/**
 * Botón "Datos y fuentes" de la misión: abre un modal casi a pantalla
 * completa (DEC-052), con los bloques en tres columnas para no tener que
 * desplazarse: procedencia e interés científico; efemérides y horizonte;
 * calidad de cada dato.
 * @param {() => {site: object|null, scenario: object}} getContext
 */
export function initQualityDialog(getContext) {
  const button = document.getElementById("quality-button");
  if (!button) return;
  const dialog = document.createElement("dialog");
  dialog.className = "settings quality-dialog";
  dialog.setAttribute("aria-labelledby", "quality-title");
  document.body.append(dialog);

  const render = () => {
    const { site, scenario } = getContext();
    dialog.innerHTML = `
      <form method="dialog" class="settings-form">
        <header class="settings-head">
          <h2 id="quality-title">${t("quality.title")}</h2>
          <button type="submit" class="settings-close" aria-label="${t("quality.close")}">×</button>
        </header>
        <div class="quality-grid">
          <div class="quality-col">
            <fieldset>
              <legend>${t("quality.siteTitle", { name: site?.name ?? t("map.observed") })}</legend>
              ${provenanceHtml(site)}
            </fieldset>
            <fieldset>
              <legend>${t("quality.traitsTitle")}</legend>
              ${traitsHtml(site)}
            </fieldset>
          </div>
          <div class="quality-col">
            <fieldset>
              <legend>${t("quality.eph.title")}</legend>
              ${ephemerisHtml(scenario)}
            </fieldset>
            <fieldset>
              <legend>${lolaTitle(scenario)}</legend>
              ${lolaHtml(scenario)}
            </fieldset>
          </div>
          <div class="quality-col">
            <fieldset>
              <legend>${t("quality.dataTitle")}</legend>
              ${qualityHtml(site, scenario)}
            </fieldset>
          </div>
        </div>
        <footer class="settings-foot">
          <span class="settings-hint">${t("quality.footer")}</span>
          <button type="submit" class="settings-done">${t("settings.done")}</button>
        </footer>
      </form>`;
  };

  button.addEventListener("click", () => {
    render();
    dialog.showModal();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => button.focus());
  // Si llegan (o fallan) datos con el modal abierto, se actualiza. El nuevo
  // escenario lo calcula quien escucha la carga; se espera un cuadro para leerlo.
  onDataStatus(() =>
    requestAnimationFrame(() => {
      if (!dialog.open) return;
      const hadFocus = dialog.contains(document.activeElement);
      render();
      if (hadFocus) dialog.querySelector(".settings-close")?.focus();
    }),
  );
}
