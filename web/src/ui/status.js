/**
 * Tarjetas "Energía solar" y "Comunicación" y la "Lectura del momento"
 * de la sección "Comportamiento de los cuerpos celestes".
 */
import { deg, duration } from "../lib/format.js";
import { t } from "../i18n/index.js";

const $ = (id) => document.getElementById(id);

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" stroke="#e8ad5b"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  antenna: '<svg viewBox="0 0 24 24" stroke="#5cc6d8"><path d="M6 20L12 4l6 16M8.5 14h7"/></svg>',
};

function level(value) {
  if (value <= 0.001) return { key: "none", tone: "bad" };
  if (value >= 0.6) return { key: "high", tone: "good" };
  if (value >= 0.25) return { key: "mid", tone: "warn" };
  return { key: "low", tone: "bad" };
}

function card({ icon, name, tag, tone, value, label, bar, barClass, text, foot }) {
  return `
    <div class="status-head">
      <span class="status-name"><span class="status-icon">${ICONS[icon]}</span>${name}</span>
      <span class="status-tag ${tone}">${tag}</span>
    </div>
    <div class="status-value">
      <strong>${value}<small>%</small></strong>
      <span>${label}</span>
    </div>
    <div class="status-bar ${barClass}"><i style="transform:scaleX(${bar.toFixed(3)})"></i></div>
    <p class="status-text">${text}</p>
    <p class="status-foot">• ${foot}</p>`;
}

export function renderStatus(sample) {
  const { sun, earth } = sample;
  const p = level(sun.power);
  const l = level(earth.link);

  $("energy-card").innerHTML = card({
    icon: "sun",
    name: t("status.energy"),
    tag: t(`status.power.${p.key}`),
    tone: p.tone,
    value: Math.round(sun.power * 100),
    label: t("status.production"),
    bar: sun.power,
    barClass: "sun",
    text: t(`status.powerText.${p.key}`),
    foot: t("status.energyFoot", { el: deg(sun.elevation), state: t(sun.visible ? "status.visible" : "status.hidden") }),
  });

  $("comm-card").innerHTML = card({
    icon: "antenna",
    name: t("status.comm"),
    tag: t(`status.link.${l.key}`),
    tone: l.tone,
    value: Math.round(earth.link * 100),
    label: t("status.linkQuality"),
    bar: earth.link,
    barClass: l.key === "low" ? "low" : "earth",
    text: t(`status.linkText.${l.key}`),
    foot: t("status.commFoot", { el: deg(earth.elevation), state: t(earth.visible ? "status.visible" : "status.hidden") }),
  });
}

export function renderInsight(scenario, sample) {
  const { sun, earth } = sample;
  let key;
  if (sun.visible && earth.visible) key = "both";
  else if (sun.visible) key = "sunOnly";
  else if (earth.visible) key = "earthOnly";
  else key = "none";

  const vars = {
    sunEl: deg(sun.elevation),
    earthEl: deg(earth.elevation),
    sunNext: sun.next.at ? duration((sun.next.at - sample.ms) / 60_000) : t("insight.beyond"),
    earthNext: earth.next.at ? duration((earth.next.at - sample.ms) / 60_000) : t("insight.beyond"),
    peak: deg(scenario.summary.peakSun),
  };
  const nearPeak = sun.visible && sun.elevation >= scenario.summary.peakSun - 0.3;
  let text = nearPeak ? t("insight.peak", vars) : t(`insight.${key}`, vars);
  // La aclaración polar ya está incluida en el texto de máxima luz.
  if (Math.abs(scenario.site.lat) >= 75 && sun.visible && !nearPeak) text += ` ${t("insight.polar", vars)}`;

  $("insight").innerHTML = `
    <span class="insight-orb ${sun.visible ? "" : "night"}" aria-hidden="true"></span>
    <div>
      <p class="mono-label">${t("insight.eyebrow")}</p>
      <p class="insight-text">${text}</p>
    </div>`;
}
