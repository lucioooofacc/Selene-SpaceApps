/**
 * Informe web de un sitio (DEC-059): como la comparación, pero de un solo
 * punto y con más información (terreno, mejores fechas, trayectoria
 * Tierra–Luna). Solo presenta: los cálculos están en lib/ (analysis, stats,
 * site-terrain, trajectory, dates, ranking).
 */
import { DAY_MS } from "../lib/astro.js";
import { STEP_MINUTES } from "../lib/analysis.js";
import { scenarioMetrics } from "../lib/compare.js";
import { coord, dateUTC, deg, duration, pct, rangeUTC, timeUTC } from "../lib/format.js";
import { windowStats } from "../lib/stats.js";
import { siteTerrain } from "../lib/site-terrain.js";
import { polarDemResolutionM, polarDemSample } from "../lib/polar-dem.js";
import { hohmannTransfer, missionTimeline, moonDistanceAt, R_EARTH, R_MOON } from "../lib/trajectory.js";
import { getLang, t } from "../i18n/index.js";
import { dataNote, lolaHtml, provenanceHtml, qualityHtml, traitsHtml } from "./provenance.js";

const $ = (id) => document.getElementById(id);
const num = (v, d = 0) => v.toLocaleString(getLang() === "en" ? "en-US" : "es-UY", { minimumFractionDigits: d, maximumFractionDigits: d });
const TONE = { high: "good", mid: "warn", low: "bad" };

function formatValue(kind, value) {
  if (kind === "percent") return pct(value);
  if (kind === "minutes") return duration(value);
  if (kind === "ratio") return value.toFixed(2);
  return deg(value);
}

/** Cifras clave del sitio en el período. */
function kpisHtml(scenario, st) {
  const v = scenario.viability;
  const s = scenario.summary;
  const kpi = (label, value, hint) => `<div class="rw-kpi" title="${hint ?? ""}"><dt>${label}</dt><dd>${value}</dd></div>`;
  return `
    <dl class="rw-kpi-grid">
      <div class="rw-kpi rw-kpi-main"><dt>${t("compare.viability")}</dt><dd><span class="status-tag ${TONE[v.overall]}">${t(`compare.level.${v.overall}`)} · ${v.points}/${v.maxPoints}</span></dd></div>
      ${kpi(t("compare.metric.illumination"), pct(s.illumination))}
      ${kpi(t("compare.metric.communication"), pct(s.communication))}
      ${kpi(t("periodCard.both"), pct(st.bothFraction * 100), t("periodCard.hint.both"))}
      ${kpi(t("periodCard.night"), duration(st.longestNightMin), t("periodCard.hint.night"))}
      ${kpi(t("periodCard.blackout"), duration(st.longestBlackoutMin), t("periodCard.hint.blackout"))}
    </dl>`;
}

/** Ventanas de luz y de enlace como franjas sobre el período. */
function windowsSvg(scenario) {
  const W = 1180;
  const rowH = 34;
  const left = 150;
  const span = scenario.endMs - scenario.startMs;
  const x = (ms) => left + ((ms - scenario.startMs) / span) * (W - left - 10);
  const row = (y, windows, color, label) =>
    `<text class="cmp-axis" x="0" y="${y + 22}">${label}</text>
     <rect x="${left}" y="${y}" width="${W - left - 10}" height="${rowH - 6}" rx="4" fill="rgba(255,255,255,0.04)"/>
     ${windows.map((w) => `<rect x="${x(w.start).toFixed(1)}" y="${y}" width="${Math.max(1.5, x(w.end) - x(w.start)).toFixed(1)}" height="${rowH - 6}" rx="3" fill="${color}"><title>${dateUTC(w.start)} ${timeUTC(w.start)} → ${dateUTC(w.end)} ${timeUTC(w.end)} (${duration((w.end - w.start) / 60000)})</title></rect>`).join("")}`;
  const days = scenario.windowDays;
  const every = days <= 7 ? 1 : days <= 15 ? 2 : 5;
  let ticks = "";
  for (let d = 0; d <= days; d += every) {
    const xx = x(scenario.startMs + d * DAY_MS).toFixed(1);
    ticks += `<line x1="${xx}" y1="0" x2="${xx}" y2="${2 * rowH + 4}" class="cmp-grid"/><text class="cmp-axis" x="${xx}" y="${2 * rowH + 20}" text-anchor="middle">${dateUTC(scenario.startMs + d * DAY_MS).split(" ").slice(0, 2).join(" ")}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${2 * rowH + 28}" role="img" aria-label="${t("reportWeb.lightHint")}">
    ${ticks}
    ${row(0, scenario.summary.lightWindows, "var(--sun)", t("sim.sunBody"))}
    ${row(rowH, scenario.summary.linkWindows, "var(--earth)", t("sim.earthBody"))}
  </svg>`;
}

function metricsHtml(scenario) {
  return `<table class="cmp-table rw-metrics"><tbody>${scenarioMetrics(scenario)
    .map((m) => `<tr><th>${t(`compare.metric.${m.key}`)}<small>${t(`compare.metricHint.${m.key}`)}</small></th><td>${formatValue(m.kind, m.value)}</td></tr>`)
    .join("")}</tbody></table>`;
}

function positionHtml(st) {
  const body = (key, b) => `
    <div class="rw-pos">
      <h3>${t(`params.${key}`)}</h3>
      <p class="rw-big">${deg(b.elevation.mean)} <small>${t("params.avgElevation")}</small></p>
      <p>${t("params.avgRange", { min: deg(b.elevation.min), max: deg(b.elevation.max), hz: deg(b.relief) })}</p>
      <p>${t("params.avgVisible", { pct: Math.round(b.visibleFraction * 100) })}</p>
    </div>`;
  return `<div class="rw-pos-grid">${body("sun", st.sun)}${body("earth", st.earth)}</div>
    <p class="cmp-hint">${t("report.runs", { night: duration(st.longestNightMin), light: duration(st.longestLightMin), blackout: duration(st.longestBlackoutMin) })}</p>`;
}

/** Terreno: LOLA reducido alrededor del sitio y horizonte del escenario. */
function terrainHtml(site, scenario, demState) {
  const terrain = siteTerrain(polarDemSample, site, { stepKm: (polarDemResolutionM() ?? 480) * 2 / 1000 });
  const horizon = `<h3>${t("quality.lola.title")}</h3>${lolaHtml(scenario)}`;
  if (!terrain) {
    const key = demState === "loading" ? "loading" : site.lat <= -75 ? "error" : "outside";
    return `<p class="prov-none">${t(`reportWeb.terrain.${key}`)}</p>${horizon}`;
  }
  const a = terrain.area;
  const cls = (v) => (v < 5 ? "good" : v < 10 ? "warn" : "bad");
  return `
    <dl class="rw-terrain">
      <div><dt>${t("reportWeb.terrain.height")}</dt><dd>${num(terrain.heightKm * 1000)} m</dd></div>
      <div><dt>${t("reportWeb.terrain.slope")}</dt><dd>${terrain.slopeDeg === null ? "—" : `<span class="status-tag ${cls(terrain.slopeDeg)}">${num(terrain.slopeDeg, 1)}°</span>`}</dd></div>
      <div><dt>${t("reportWeb.terrain.meanSlope", { r: a.radiusKm })}</dt><dd>${num(a.meanSlope, 1)}° · ${t("reportWeb.terrain.max")} ${num(a.maxSlope, 1)}°</dd></div>
      <div><dt>${t("reportWeb.terrain.below", { r: a.radiusKm })}</dt><dd>&lt; 5°: ${num(a.below[5])} % · &lt; 10°: ${num(a.below[10])} % · &lt; 15°: ${num(a.below[15])} %</dd></div>
      <div><dt>${t("reportWeb.terrain.roughness")}</dt><dd>${num(a.roughnessM)} m · ${t("reportWeb.terrain.relief")} ${num(a.reliefM)} m</dd></div>
    </dl>
    <p class="cmp-hint">${t("reportWeb.terrain.note", { res: polarDemResolutionM(), low: num(a.lowConfidencePct) })}</p>
    ${horizon}`;
}

/** Trayectoria Tierra–Luna: diagrama de la transferencia y cronograma. */
function trajectoryHtml(site, scenario) {
  const dist = moonDistanceAt(site, scenario.startMs);
  const h = hohmannTransfer({ moonDistanceKm: dist.km });
  const tl = missionTimeline(scenario.startMs, h.tofDays, 1);
  // Diagrama a escala: la Tierra en el foco de la elipse de transferencia.
  const W = 640;
  const H = 300;
  const scale = (W - 120) / (h.r2 + h.r1);
  const ex = 60 + h.r1 * scale; // Tierra
  const ey = H / 2 + 20;
  const aPx = h.a * scale;
  const bPx = h.a * Math.sqrt(1 - h.e ** 2) * scale;
  const cx = ex + (h.r2 - h.r1) / 2 * scale; // centro de la elipse
  const moonX = ex + h.r2 * scale;
  const earthR = Math.max(6, R_EARTH * scale);
  const moonR = Math.max(4, R_MOON * scale);
  const svg = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("reportWeb.traj.aria")}">
      <circle cx="${ex}" cy="${ey}" r="${(h.r2 * scale).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4 6"/>
      <path d="M${(ex - h.r1 * scale).toFixed(1)} ${ey} A ${aPx.toFixed(1)} ${bPx.toFixed(1)} 0 0 1 ${moonX.toFixed(1)} ${ey}" fill="none" stroke="var(--gold)" stroke-width="2"/>
      <path d="M${(ex - h.r1 * scale).toFixed(1)} ${ey} A ${aPx.toFixed(1)} ${bPx.toFixed(1)} 0 0 0 ${moonX.toFixed(1)} ${ey}" fill="none" stroke="rgba(191,167,128,0.25)" stroke-dasharray="3 5"/>
      <circle cx="${ex}" cy="${ey}" r="${earthR}" fill="#2f6fc0"/>
      <circle cx="${moonX}" cy="${ey}" r="${moonR}" fill="#c9ccd2"/>
      <text class="cmp-axis" x="${ex}" y="${ey + earthR + 16}" text-anchor="middle">${t("sim.earthBody")}</text>
      <text class="cmp-axis" x="${moonX}" y="${ey + moonR + 16}" text-anchor="middle">${t("reportWeb.traj.moon")}</text>
      <text class="cmp-axis" x="${(ex - h.r1 * scale - 4).toFixed(1)}" y="${ey - 10}" text-anchor="end">TLI</text>
      <text class="cmp-axis" x="${cx.toFixed(1)}" y="${(ey - bPx - 8).toFixed(1)}" text-anchor="middle">${t("reportWeb.traj.arc", { days: num(h.tofDays, 1) })}</text>
    </svg>`;
  const row = (k, v) => `<div><dt>${t(`reportWeb.traj.${k}`)}</dt><dd>${v}</dd></div>`;
  const stamp = (ms) => `${dateUTC(ms)} ${timeUTC(ms)} UTC`;
  return `
    <div class="rw-traj-diagram">${svg}</div>
    <dl class="rw-traj-facts">
      ${row("tli", stamp(tl.tliMs))}
      ${row("arrival", stamp(tl.arrivalMs))}
      ${row("landing", stamp(tl.landingMs))}
      ${row("tof", t("reportWeb.traj.days", { d: num(h.tofDays, 2) }))}
      ${row("distance", `${num(dist.km)} km ${dist.source === "horizons" ? t("reportWeb.traj.fromHorizons") : t("reportWeb.traj.mean")}`)}
      ${row("dvTLI", `${num(h.dvTLI, 2)} km/s`)}
      ${row("dvLOI", `${num(h.dvLOI, 2)} km/s`)}
      ${row("dvDescent", `${num(h.dvDescent, 2)} km/s`)}
      ${row("dvTotal", `<strong>${num(h.dvTotal, 2)} km/s</strong>`)}
    </dl>
    <p class="cmp-hint rw-traj-note">${t("reportWeb.traj.assumptions")}</p>`;
}

function datesHtml(result, windowDays, startMs) {
  if (result === undefined) return `<p class="prov-none">${t("places.dates.computing")}</p>`;
  if (!result || !result.picks.overall.length) return `<p class="prov-none">${t("places.dates.none")}</p>`;
  return `<ol class="rw-dates">${result.picks.overall
    .map(({ startMs: s, scenario }) => {
      const v = scenario.viability;
      const current = s === startMs;
      return `<li ${current ? 'aria-current="true"' : ""}><button type="button" data-start="${s}">
        <span class="rw-date-range">${rangeUTC(s, s + (windowDays - 1) * DAY_MS)}</span>
        <span class="place-verdict place-verdict-${v.overall}">${t(`compare.level.${v.overall}`)} · ${v.points}/${v.maxPoints}</span>
        <span class="rw-date-stats">☀ ${pct(scenario.summary.illumination)} · ⟟ ${pct(scenario.summary.communication)}</span>
      </button></li>`;
    })
    .join("")}</ol>
    <p class="cmp-hint">${t("reportWeb.datesHint", { days: windowDays })}</p>`;
}

/**
 * Dibuja todo el informe web.
 * @param {{site, scenario, dates, demState}} ctx
 */
export function renderSiteReport({ site, scenario, dates, demState }) {
  const st = windowStats(scenario, STEP_MINUTES);
  $("rw-title").textContent = t("reportWeb.title", { name: site.name });
  $("rw-period").textContent = `${coord(site.lat, "lat")} · ${coord(site.lon, "lon")} · ${t("compare.period", {
    start: dateUTC(scenario.startMs),
    end: dateUTC(scenario.endMs - DAY_MS),
    days: scenario.windowDays,
  })}`;
  $("rw-note").textContent = dataNote(scenario);
  $("rw-kpis").innerHTML = kpisHtml(scenario, st);
  $("rw-terrain").innerHTML = terrainHtml(site, scenario, demState);
  $("rw-windows").innerHTML = windowsSvg(scenario);
  $("rw-metrics").innerHTML = metricsHtml(scenario);
  $("rw-position").innerHTML = positionHtml(st);
  $("rw-dates").innerHTML = datesHtml(dates, scenario.windowDays, scenario.startMs);
  $("rw-traj").innerHTML = trajectoryHtml(site, scenario);
  $("rw-quality").innerHTML = `
    <div><h3>${t("quality.provenance")}</h3>${provenanceHtml(site.provenance ? site : null)}<h3>${t("quality.traitsTitle")}</h3>${traitsHtml(site)}</div>
    <div><h3>${t("quality.dataTitle")}</h3>${qualityHtml(site, scenario)}</div>`;
}
