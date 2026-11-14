/**
 * Paneles de lectura: métricas instantáneas, energía, comunicación,
 * viabilidad del escenario y "lectura del momento".
 */
import { THRESHOLDS } from "../lib/analysis.js";
import { dateUTC, deg, duration, pct, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { icons } from "./icons.js";

const $ = (id) => document.getElementById(id);

function metricCard({ icon, tone = "", name, tag, tagTone = "", value, detail }) {
  return `
    <article class="metric">
      <div class="metric-top">
        <span class="metric-name"><span class="icon-box ${tone}">${icons[icon]}</span>${name}</span>
        ${tag ? `<span class="tag ${tagTone}">${tag}</span>` : ""}
      </div>
      <strong class="metric-value">${value}</strong>
      <p class="metric-detail">${detail}</p>
    </article>`;
}

function nextEventCard(kind, body, now) {
  const isSun = kind === "sun";
  const next = body.next;
  const name = isSun
    ? t(body.visible ? "metrics.nextSunset" : "metrics.nextSunrise")
    : t(body.visible ? "metrics.nextEarthset" : "metrics.nextEarthrise");
  if (!next.at) {
    return metricCard({
      icon: isSun ? "clock" : "antenna",
      tone: isSun ? "sun" : "earth",
      name,
      tag: t(body.visible ? "metrics.always" : "metrics.never"),
      tagTone: body.visible ? "good" : "bad",
      value: t("metrics.noEvent"),
      detail: t("metrics.noEventDetail"),
    });
  }
  return metricCard({
    icon: isSun ? "clock" : "antenna",
    tone: isSun ? "sun" : "earth",
    name,
    tag: t(body.visible ? (isSun ? "metrics.lightWindow" : "metrics.linkWindow") : "metrics.waiting"),
    tagTone: body.visible ? "good" : "warn",
    value: duration((next.at - now) / 60_000),
    detail: `${dateUTC(next.at)} · ${timeUTC(next.at)} UTC`,
  });
}

export function renderMetrics(scenario, sample) {
  const { sun, earth, accumulated } = sample;
  const { summary } = scenario;
  const elapsed = Math.max(1, accumulated.elapsedMinutes);

  $("metrics-stamp").textContent = `${dateUTC(sample.ms)} · ${timeUTC(sample.ms)} UTC`;
  $("metric-grid").innerHTML = [
    metricCard({
      icon: "sun",
      tone: "sun",
      name: t("metrics.sun"),
      tag: t(sun.visible ? "metrics.above" : "metrics.below"),
      tagTone: sun.visible ? "good" : "",
      value: deg(sun.elevation),
      detail: t("metrics.sunDetail", { az: deg(sun.azimuth, { sign: false }), hz: deg(sun.horizon) }),
    }),
    metricCard({
      icon: "earth",
      tone: "earth",
      name: t("metrics.earth"),
      tag: t(earth.visible ? "metrics.above" : "metrics.below"),
      tagTone: earth.visible ? "good" : "",
      value: deg(earth.elevation),
      detail: t("metrics.earthDetail", {
        az: deg(earth.azimuth, { sign: false }),
        margin: deg(earth.margin),
        phase: pct(earth.phase * 100),
      }),
    }),
    metricCard({
      icon: "battery",
      tone: "sun",
      name: t("metrics.lightTotal"),
      tag: t("metrics.analyzed", { n: scenario.windowDays }),
      value: duration(accumulated.sunMinutes),
      detail: t("metrics.lightDetail", {
        pct: pct((100 * accumulated.sunMinutes) / elapsed),
        peak: deg(summary.peakSun),
      }),
    }),
    metricCard({
      icon: "signal",
      tone: "earth",
      name: t("metrics.linkTotal"),
      tag: t("metrics.coverage", { pct: pct(summary.communication) }),
      value: duration(accumulated.linkMinutes),
      detail: t("metrics.linkDetail", { n: summary.linkWindows.length }),
    }),
    nextEventCard("sun", sun, sample.ms),
    nextEventCard("earth", earth, sample.ms),
  ].join("");
}

function powerLevel(value) {
  if (value <= 0.001) return { key: "none", tone: "bad" };
  if (value >= 0.6) return { key: "high", tone: "good" };
  if (value >= 0.25) return { key: "mid", tone: "warn" };
  return { key: "low", tone: "bad" };
}

export function renderStatus(sample) {
  const { sun, earth } = sample;
  const power = powerLevel(sun.power);
  const link = powerLevel(earth.link);
  const powerPct = Math.round(sun.power * 100);
  const linkPct = Math.round(earth.link * 100);

  $("energy-card").innerHTML = `
    <div class="status-head">
      <span class="metric-name"><span class="icon-box sun">${icons.sun}</span>${t("status.energy")}</span>
      <span class="tag ${power.tone}">${t(`status.power.${power.key}`)}</span>
    </div>
    <div class="status-value">
      <strong>${powerPct}<small>%</small></strong>
      <span class="hint">${t("status.production")}</span>
    </div>
    <div class="bar sun"><span style="transform:scaleX(${sun.power.toFixed(3)})"></span></div>
    <p>${t(`status.powerText.${power.key}`)}</p>
    <p class="status-foot">${t("status.energyFoot", {
      el: deg(sun.elevation),
      state: t(sun.visible ? "status.visible" : "status.hidden"),
    })}</p>`;

  $("comm-card").innerHTML = `
    <div class="status-head">
      <span class="metric-name"><span class="icon-box earth">${icons.antenna}</span>${t("status.comm")}</span>
      <span class="tag ${link.tone}">${t(`status.link.${link.key}`)}</span>
    </div>
    <div class="status-value">
      <strong>${linkPct}<small>%</small></strong>
      <span class="hint">${t("status.linkQuality")}</span>
    </div>
    <div class="bar ${link.key === "low" ? "low" : "earth"}"><span style="transform:scaleX(${earth.link.toFixed(3)})"></span></div>
    <p>${t(`status.linkText.${link.key}`)}</p>
    <p class="status-foot">${t("status.commFoot", {
      el: deg(earth.elevation),
      state: t(earth.visible ? "status.visible" : "status.hidden"),
      phase: pct(earth.phase * 100),
    })}</p>`;
}

export function renderViability(scenario) {
  const { criteria, points, maxPoints, overall } = scenario.viability;
  const rows = [
    {
      key: "illumination",
      icon: "sun",
      value: pct(criteria.illumination.value),
      threshold: THRESHOLDS.illumination,
      fmt: (v) => `${v} %`,
    },
    {
      key: "power",
      icon: "battery",
      value: criteria.power.value.toFixed(2),
      threshold: THRESHOLDS.power,
      fmt: (v) => v.toFixed(2),
    },
    {
      key: "communication",
      icon: "signal",
      value: pct(criteria.communication.value),
      threshold: THRESHOLDS.communication,
      fmt: (v) => `${v} %`,
    },
  ];

  $("viability").innerHTML = `
    <p class="eyebrow">${t("viability.eyebrow")}</p>
    <div class="viability-head">
      <h2 id="viability-title">${t("viability.title")}</h2>
      <span class="tag level-${overall}">${t(`levels.${overall}`)} · ${points}/${maxPoints}</span>
    </div>
    <p class="viability-summary">${t(`viability.summary.${overall}`)}</p>
    <div class="criteria">
      ${rows
        .map(({ key, icon, value, threshold, fmt }) => {
          const level = criteria[key].level;
          return `
          <div class="criterion">
            <div class="criterion-top">
              <span class="metric-name"><span class="icon-box">${icons[icon]}</span>${t(`viability.${key}`)}</span>
              <span class="mono">${value}</span>
            </div>
            <div class="segments level-${level}"><i></i><i></i><i></i></div>
            <p>${t(`levels.${level}`)} · ${t(`viability.${key}Rule`, {
              high: fmt(threshold.high),
              mid: fmt(threshold.mid),
            })}</p>
          </div>`;
        })
        .join("")}
    </div>
    <p class="disclaimer">${t("viability.disclaimer")}</p>`;
}

export function renderInsight(scenario, sample) {
  const { sun, earth } = sample;
  let key;
  if (sun.visible && earth.visible) key = "both";
  else if (sun.visible) key = "sunOnly";
  else if (earth.visible) key = "earthOnly";
  else key = "none";

  const nearPeak = sun.visible && sun.elevation >= scenario.summary.peakSun - 0.3;
  const vars = {
    sunEl: deg(sun.elevation),
    earthEl: deg(earth.elevation),
    sunNext: sun.next.at ? duration((sun.next.at - sample.ms) / 60_000) : t("insight.beyond"),
    earthNext: earth.next.at ? duration((earth.next.at - sample.ms) / 60_000) : t("insight.beyond"),
    peak: deg(scenario.summary.peakSun),
  };
  let text = t(`insight.${key}`, vars);
  if (Math.abs(scenario.site.lat) >= 75) text += ` ${t("insight.polar", vars)}`;

  const tagKey = nearPeak ? "peak" : key;
  const tone = { peak: "sun", both: "good", sunOnly: "warn", earthOnly: "warn", none: "bad" }[tagKey];

  $("insight").innerHTML = `
    <span class="insight-orb ${sun.visible ? "" : "night"}" aria-hidden="true"></span>
    <div>
      <p class="eyebrow">${t("insight.eyebrow")}</p>
      <p>${text}</p>
    </div>
    <span class="tag ${tone}">${t(`insight.tag.${tagKey}`)}</span>`;
}
