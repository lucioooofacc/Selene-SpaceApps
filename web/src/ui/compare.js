/**
 * Página de comparación detallada entre dos sitios (UI-05, DEC-020).
 * Solo muestra: las métricas salen de computeScenario y de lib/compare.js.
 *
 *  - Encabezado de cada sitio: coordenadas, agencia y viabilidad (DEC-007).
 *  - Tabla de métricas con barras y quién tiene ventaja.
 *  - Ventanas de luz y de enlace en la línea de tiempo de la misión.
 *  - Perfil del horizonte de cada sitio (sintético hasta TERRAIN-02).
 *  - Niveles por criterio con sus umbrales.
 */
import { THRESHOLDS } from "../lib/analysis.js";
import { DAY_MS } from "../lib/astro.js";
import { compareScenarios } from "../lib/compare.js";
import { coord, dateUTC, deg, duration, pct, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { provenanceHtml, qualityHtml } from "./provenance.js";
import { lolaForScenario } from "./lola.js";

const $ = (id) => document.getElementById(id);
const COLORS = { a: "var(--gold)", b: "var(--earth)" };

function formatValue(kind, value) {
  if (kind === "percent") return pct(value);
  if (kind === "minutes") return duration(value);
  if (kind === "ratio") return value.toFixed(2);
  return deg(value);
}

function siteHeader(slot, site, scenario) {
  const v = scenario.viability;
  return `
    <article class="cmp-site cmp-site-${slot}">
      <p class="cmp-slot"><i style="background:${COLORS[slot]}"></i>${t(`compare.slot.${slot}`)}</p>
      <h2 class="cmp-site-name">${site.name}</h2>
      <p class="cmp-site-sub">${coord(site.lat, "lat")} · ${coord(site.lon, "lon")}${site.agency ? ` · ${site.agency}` : ""}</p>
      <div class="cmp-verdict cmp-level-${v.overall}">
        <span>${t("compare.viability")}</span>
        <strong>${t(`compare.level.${v.overall}`)}</strong>
        <em>${t("compare.points", { points: v.points, max: v.maxPoints })}</em>
      </div>
      <details class="cmp-prov">
        <summary>${t("quality.provenance")}</summary>
        ${provenanceHtml(site)}
      </details>
    </article>`;
}

function metricsTable(cmp, names) {
  const rows = cmp.rows
    .map((row) => {
      // Las barras comparan solo los dos valores entre sí (no son una escala absoluta).
      const lo = Math.min(0, row.a, row.b);
      const hi = Math.max(row.a, row.b);
      const w = (v) => (hi === lo ? 0 : ((v - lo) / (hi - lo)) * 100).toFixed(1);
      const cell = (slot) => `
        <td class="${row.better === slot ? "is-better" : ""}">
          <span class="cmp-value">${formatValue(row.kind, row[slot])}</span>
          <span class="cmp-bar" aria-hidden="true"><i style="width:${w(row[slot])}%;background:${COLORS[slot]}"></i></span>
        </td>`;
      const better = row.better ? names[row.better] : t("compare.tie");
      return `
        <tr>
          <th scope="row">${t(`compare.metric.${row.key}`)}<small>${t(`compare.metricHint.${row.key}`)}</small></th>
          ${cell("a")}${cell("b")}
          <td class="cmp-adv">${better}</td>
        </tr>`;
    })
    .join("");
  return `
    <table class="cmp-table">
      <caption class="sr-only">${t("compare.metricsTitle")}</caption>
      <thead><tr>
        <th scope="col">${t("compare.metricCol")}</th>
        <th scope="col">${names.a}</th>
        <th scope="col">${names.b}</th>
        <th scope="col">${t("compare.advantage")}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** Ventanas de luz y enlace de los dos sitios sobre la duración de la misión. */
function windowsChart(scA, scB, names) {
  const W = 1760;
  const LEFT = 180;
  const LANE = 34;
  const lanes = [
    { sc: scA, key: "lightWindows", slot: "a", what: "light", color: "var(--sun)" },
    { sc: scA, key: "linkWindows", slot: "a", what: "link", color: "var(--earth)" },
    { sc: scB, key: "lightWindows", slot: "b", what: "light", color: "var(--sun)" },
    { sc: scB, key: "linkWindows", slot: "b", what: "link", color: "var(--earth)" },
  ];
  const { startMs, endMs } = scA;
  const x = (ms) => LEFT + ((ms - startMs) / (endMs - startMs)) * (W - LEFT);
  const H = lanes.length * LANE + 40;

  let ticks = "";
  const days = Math.round((endMs - startMs) / DAY_MS);
  const every = days > 12 ? 3 : 1;
  for (let d = 0; d <= days; d += every) {
    const ms = startMs + d * DAY_MS;
    ticks += `<line x1="${x(ms)}" y1="0" x2="${x(ms)}" y2="${H - 30}" class="cmp-grid"/>
      <text x="${x(ms)}" y="${H - 10}" text-anchor="${d === days ? "end" : "middle"}" class="cmp-axis">${dateUTC(ms).replace(/ \d{4}$/, "")}</text>`;
  }

  const body = lanes
    .map((lane, i) => {
      const y = i * LANE + 6;
      const rects = lane.sc.summary[lane.key]
        .map(
          (w) =>
            `<rect x="${x(w.start).toFixed(1)}" y="${y}" width="${Math.max(1, x(w.end) - x(w.start)).toFixed(1)}" height="${LANE - 12}" rx="3" fill="${lane.color}"><title>${dateUTC(w.start)} ${timeUTC(w.start)} – ${dateUTC(w.end)} ${timeUTC(w.end)} UTC</title></rect>`,
        )
        .join("");
      // Nombre corto en el carril ("Sitio A · Luz"); el nombre completo queda como tooltip.
      return `<text x="0" y="${y + LANE / 2}" class="cmp-lane"><title>${names[lane.slot]}</title>${t(`compare.slot.${lane.slot}`)} · ${t(`compare.${lane.what}`)}</text>
        <rect x="${LEFT}" y="${y}" width="${W - LEFT}" height="${LANE - 12}" rx="3" class="cmp-lane-bg"/>${rects}`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("compare.windowsAria")}">${ticks}${body}</svg>`;
}

/** Perfil del horizonte de los dos sitios (elevación del relieve según el azimut). */
function horizonChart(scA, scB) {
  const W = 860;
  const H = 300;
  const PAD = { l: 56, r: 16, t: 16, b: 40 };
  const sample = (h) => Array.from({ length: 361 }, (_, az) => h(az));
  const ha = sample(scA.horizon);
  const hb = sample(scB.horizon);
  // Horizonte LOLA real como vista previa (punteado) mientras el cálculo usa el sintético (UI-14).
  const preview = (sc) => {
    const lola = lolaForScenario(sc);
    return lola.mode === "preview" ? sample(lola.horizon) : null;
  };
  const la = preview(scA);
  const lb = preview(scB);
  const all = [...ha, ...hb, ...(la ?? []), ...(lb ?? [])];
  const lo = Math.floor(Math.min(0, ...all));
  const hi = Math.ceil(Math.max(1, ...all));
  const x = (az) => PAD.l + (az / 360) * (W - PAD.l - PAD.r);
  const y = (el) => PAD.t + ((hi - el) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (arr) => arr.map((el, az) => `${az ? "L" : "M"}${x(az).toFixed(1)} ${y(el).toFixed(1)}`).join(" ");

  let grid = "";
  for (const az of [0, 90, 180, 270, 360]) {
    grid += `<line x1="${x(az)}" y1="${PAD.t}" x2="${x(az)}" y2="${H - PAD.b}" class="cmp-grid"/>
      <text x="${x(az)}" y="${H - 14}" text-anchor="${az === 360 ? "end" : az === 0 ? "start" : "middle"}" class="cmp-axis">${t(`compare.az.${az % 360}`)} ${az}°</text>`;
  }
  const stepEl = Math.max(1, Math.ceil((hi - lo) / 5));
  for (let el = lo; el <= hi; el += stepEl) {
    grid += `<line x1="${PAD.l}" y1="${y(el)}" x2="${W - PAD.r}" y2="${y(el)}" class="cmp-grid"/>
      <text x="${PAD.l - 8}" y="${y(el) + 4}" text-anchor="end" class="cmp-axis">${el}°</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("compare.horizonAria")}">
    ${grid}
    <line x1="${PAD.l}" y1="${y(0)}" x2="${W - PAD.r}" y2="${y(0)}" class="cmp-zero"/>
    <path d="${line(ha)}" fill="none" stroke="${COLORS.a}" stroke-width="2.5"/>
    <path d="${line(hb)}" fill="none" stroke="${COLORS.b}" stroke-width="2.5"/>
    ${la ? `<path d="${line(la)}" fill="none" stroke="${COLORS.a}" stroke-width="2" stroke-dasharray="6 5"/>` : ""}
    ${lb ? `<path d="${line(lb)}" fill="none" stroke="${COLORS.b}" stroke-width="2" stroke-dasharray="6 5"/>` : ""}
  </svg>`;
}

function criteriaTable(scA, scB, names) {
  const fmt = { illumination: (v) => `${v} %`, power: (v) => v.toFixed(2), communication: (v) => `${v} %` };
  const rows = Object.keys(THRESHOLDS)
    .map((key) => {
      const th = THRESHOLDS[key];
      const cell = (sc) => {
        const c = sc.viability.criteria[key];
        return `<td><span class="cmp-chip cmp-level-${c.level}">${t(`compare.level.${c.level}`)}</span></td>`;
      };
      return `<tr>
        <th scope="row">${t(`compare.criterion.${key}`)}</th>
        <td class="cmp-th">${t("compare.thresholds", { high: fmt[key](th.high), mid: fmt[key](th.mid) })}</td>
        ${cell(scA)}${cell(scB)}
      </tr>`;
    })
    .join("");
  return `<table class="cmp-table cmp-criteria">
    <caption class="sr-only">${t("compare.criteriaTitle")}</caption>
    <thead><tr>
      <th scope="col">${t("compare.criterionCol")}</th>
      <th scope="col">${t("compare.thresholdCol")}</th>
      <th scope="col">${names.a}</th>
      <th scope="col">${names.b}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/** Dibuja toda la comparación. */
export function renderComparison({ a, b, scA, scB }) {
  const cmp = compareScenarios(scA, scB);
  const names = { a: a.name, b: b.name };
  const winner = cmp.wins.a === cmp.wins.b ? null : cmp.wins.a > cmp.wins.b ? "a" : "b";

  $("cmp-period").textContent = t("compare.period", {
    start: dateUTC(scA.startMs),
    end: dateUTC(scA.endMs - DAY_MS),
    days: scA.windowDays,
  });
  $("cmp-sites").innerHTML = siteHeader("a", a, scA) + siteHeader("b", b, scB);
  $("cmp-summary").textContent = winner
    ? t("compare.summary", { name: names[winner], wins: cmp.wins[winner], total: cmp.rows.length })
    : t("compare.summaryTie");
  $("cmp-metrics").innerHTML = metricsTable(cmp, names);
  $("cmp-windows").innerHTML = windowsChart(scA, scB, names);
  $("cmp-horizon").innerHTML = horizonChart(scA, scB);
  $("cmp-horizon-legend").innerHTML =
    ["a", "b"].map((slot) => `<span><i style="background:${COLORS[slot]}"></i>${names[slot]}</span>`).join("") +
    ([scA, scB].some((sc) => lolaForScenario(sc).mode === "preview") ? `<span class="cmp-legend-dash">${t("compare.lolaPreview")}</span>` : "");
  $("cmp-criteria").innerHTML = criteriaTable(scA, scB, names);
  $("cmp-quality").innerHTML = qualityHtml(a, scA);
}
