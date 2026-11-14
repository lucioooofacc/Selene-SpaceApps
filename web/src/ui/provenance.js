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
 * Solo presenta: no calcula nada.
 */
import { t } from "../i18n/index.js";
import { TRAIT_SOURCES, traitsFor } from "../data/site-traits.js";
import { lolaForScenario } from "./lola.js";

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
      <dt>${t("quality.confirmed")}</dt><dd>${provenance.confirmedOn ?? "—"}</dd>
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

/** Resumen del horizonte LOLA del sitio (TERRAIN-02, DEC-030), o por qué no hay. */
export function lolaHtml(scenario) {
  const { horizon, mode } = lolaForScenario(scenario);
  if (!horizon) return `<p class="prov-none">${qualityTag("none")} ${t("quality.lola.none")}</p>`;
  const { observer, summary, product } = horizon.meta;
  const deg = (v) => `${v.toFixed(1)}°`;
  const pct = (v) => `${(v * 100).toFixed(1)} %`;
  return `
    <dl class="prov">
      <dt>${t("quality.lola.status")}</dt><dd>${t(mode === "active" ? "quality.lola.active" : "quality.lola.preview")}</dd>
      <dt>${t("quality.lola.ground")}</dt><dd>${Math.round(observer.groundHeightM)} m</dd>
      <dt>${t("quality.lola.range")}</dt><dd>${deg(summary.minDeg)} / ${deg(summary.meanDeg)} / ${deg(summary.maxDeg)}</dd>
      <dt>${t("quality.lola.low")}</dt><dd>${pct(summary.lowConfidenceFraction)}</dd>
      <dt>${t("quality.lola.truncated")}</dt><dd>${pct(summary.truncatedFraction)}</dd>
      <dt>${t("quality.lola.product")}</dt><dd><a href="https://doi.org/${product.doi}" target="_blank" rel="noopener noreferrer">LOLA ${product.dem.productId} ${product.productVersion}</a></dd>
    </dl>`;
}

/** Filas de calidad de los datos de la página para el escenario dado. */
export function qualityRows(site, scenario) {
  const lola = lolaForScenario(scenario);
  const horizonRow =
    lola.mode === "active"
      ? { key: "horizon", hint: "horizonActive", kind: "real", ref: "DEC-030" }
      : lola.mode === "preview"
        ? { key: "horizon", hint: "horizonPreview", kind: "synthetic", ref: "DEC-005 · DEC-030" }
        : { key: "horizon", kind: "synthetic", ref: "DEC-005" };
  // Origen del Sol y la Tierra según el escenario (CORE-01 parte B, DEC-033).
  const source = scenario?.ephemeris?.source;
  const ephemerisRow =
    source === "horizons"
      ? { key: "ephemeris", hint: "ephemerisReal", kind: "real", ref: "DEC-033" }
      : source === "mixed"
        ? { key: "ephemeris", hint: "ephemerisMixed", kind: "approx", ref: "DEC-033 · DEC-004" }
        : { key: "ephemeris", kind: "approx", ref: "DEC-004" };
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
          ({ key, hint, kind, ref }) => `
        <li>
          ${qualityTag(kind)}
          <span><strong>${t(`quality.row.${key}`)}</strong><small>${t(`quality.rowHint.${hint ?? key}`)} (${ref})</small></span>
        </li>`,
        )
        .join("")}
    </ul>`;
}

/**
 * Botón "Datos y fuentes" de la misión: abre un modal con la procedencia del
 * sitio activo y la calidad de cada dato.
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
        <fieldset>
          <legend>${t("quality.siteTitle", { name: site?.name ?? t("map.observed") })}</legend>
          ${provenanceHtml(site)}
        </fieldset>
        <fieldset>
          <legend>${t("quality.lola.title")}</legend>
          ${lolaHtml(scenario)}
        </fieldset>
        <fieldset>
          <legend>${t("quality.traitsTitle")}</legend>
          ${traitsHtml(site)}
        </fieldset>
        <fieldset>
          <legend>${t("quality.dataTitle")}</legend>
          ${qualityHtml(site, scenario)}
        </fieldset>
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
}
