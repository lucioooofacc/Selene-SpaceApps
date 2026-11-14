/**
 * Procedencia de los sitios y calidad de los datos (UI-01 parcial, DEC-028).
 *
 * - Procedencia: muestra los metadatos de `sites.js` (DEC-019) que se pueden
 *   traducir: tipo de punto, confianza, exactitud declarada, si el marco está
 *   verificado y enlaces a las fuentes oficiales. Las notas en prosa de
 *   `sites.js` existen solo en español y no se muestran.
 * - Calidad: dice, para cada dato de la página, si es real, aproximado o
 *   sintético. Hoy el Sol y la Tierra salen del modelo aproximado (DEC-004)
 *   y el horizonte es sintético (DEC-005) salvo que la función del horizonte
 *   declare `source === "lola"` (propuesta para TERRAIN-02).
 *
 * Solo presenta: no calcula nada.
 */
import { t } from "../i18n/index.js";

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

/** Filas de calidad de los datos de la página para el escenario dado. */
export function qualityRows(site, scenario) {
  const horizonReal = scenario?.horizon?.source === "lola";
  return [
    { key: "coords", kind: site?.provenance ? "real" : "none", ref: "DEC-019" },
    { key: "ephemeris", kind: "approx", ref: "DEC-004" },
    { key: "horizon", kind: horizonReal ? "real" : "synthetic", ref: horizonReal ? "TERRAIN-02" : "DEC-005" },
    { key: "imagery", kind: "real", ref: "DEC-021 · DEC-026" },
    { key: "thresholds", kind: "approx", ref: "DEC-007" },
  ];
}

export function qualityHtml(site, scenario) {
  return `
    <ul class="quality">
      ${qualityRows(site, scenario)
        .map(
          ({ key, kind, ref }) => `
        <li>
          ${qualityTag(kind)}
          <span><strong>${t(`quality.row.${key}`)}</strong><small>${t(`quality.rowHint.${key}`)} (${ref})</small></span>
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
