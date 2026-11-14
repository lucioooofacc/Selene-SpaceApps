/**
 * Comparador de escenarios: fija hasta 4 combinaciones sitio + fecha y las
 * muestra lado a lado, resaltando la mejor en cada criterio.
 */
import { findSite } from "../data/sites.js";
import { coord, dateUTC, deg, duration, pct, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { getState, setState } from "../state.js";
import { icons } from "./icons.js";

const $ = (id) => document.getElementById(id);
export const MAX_COMPARE = 4;

/** Noche continua más larga dentro de la ventana (define el tamaño de las baterías). */
function longestDark(scenario) {
  const { startMs, endMs, summary } = scenario;
  let cursor = startMs;
  let longest = 0;
  for (const w of summary.lightWindows) {
    longest = Math.max(longest, w.start - cursor);
    cursor = w.end;
  }
  longest = Math.max(longest, endMs - cursor);
  return longest / 60_000;
}

export function snapshot(scenario) {
  const { site, summary, viability } = scenario;
  return {
    key: `${site.id}|${site.lat}|${site.lon}|${scenario.startMs}|${scenario.windowDays}`,
    siteId: site.id,
    lat: site.lat,
    lon: site.lon,
    startMs: scenario.startMs,
    windowDays: scenario.windowDays,
    illumination: summary.illumination,
    power: summary.power,
    communication: summary.communication,
    peakSun: summary.peakSun,
    darkMinutes: longestDark(scenario),
    overall: viability.overall,
    points: viability.points,
  };
}

export function pinScenario(scenario) {
  const { compare } = getState();
  const snap = snapshot(scenario);
  if (compare.some((c) => c.key === snap.key)) return;
  setState({ compare: [...compare, snap].slice(-MAX_COMPARE) });
}

export function initCompare() {
  $("compare-body").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { compare } = getState();
    const item = compare[Number(button.dataset.index)];
    if (!item) return;
    if (button.dataset.action === "remove") {
      setState({ compare: compare.filter((c) => c !== item) });
    } else if (button.dataset.action === "load") {
      setState({
        siteId: item.siteId,
        lat: item.lat,
        lon: item.lon,
        startMs: item.startMs,
        windowDays: item.windowDays,
        timeMs: item.startMs,
      });
      document.getElementById("main").scrollIntoView({ behavior: "smooth" });
    }
  });
}

export function renderCompare(state) {
  const items = state.compare;
  const pinButton = $("pin-scenario");
  pinButton.textContent = t("compare.pin");

  if (!items.length) {
    $("compare-body").innerHTML = `<p class="compare-empty">${t("compare.empty")}</p>`;
    return;
  }

  const best = (field, dir = 1) => Math.max(...items.map((c) => dir * c[field])) * dir;
  const bestIllum = best("illumination");
  const bestPower = best("power");
  const bestComm = best("communication");
  const bestDark = best("darkMinutes", -1);
  const mark = (value, target) => (items.length > 1 && Math.abs(value - target) < 1e-6 ? " best" : "");

  $("compare-body").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${t("compare.col.scenario")}</th>
            <th>${t("compare.col.start")}</th>
            <th>${t("compare.col.illumination")}</th>
            <th>${t("compare.col.power")}</th>
            <th>${t("compare.col.communication")}</th>
            <th>${t("compare.col.dark")}</th>
            <th>${t("compare.col.viability")}</th>
            <th><span class="sr-only">${t("compare.col.actions")}</span></th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((c, i) => {
              const site = findSite(c.siteId);
              return `
            <tr>
              <td>${site ? site.name : t("setup.customShort")}<span class="sub">${coord(c.lat, "lat")} · ${coord(c.lon, "lon")}</span></td>
              <td class="num">${dateUTC(c.startMs)}<span class="sub">${timeUTC(c.startMs)} UTC · ${t("setup.days", { n: c.windowDays })}</span></td>
              <td class="num${mark(c.illumination, bestIllum)}">${pct(c.illumination)}<span class="sub">${t("compare.peak", { el: deg(c.peakSun) })}</span></td>
              <td class="num${mark(c.power, bestPower)}">${c.power.toFixed(2)}</td>
              <td class="num${mark(c.communication, bestComm)}">${pct(c.communication)}</td>
              <td class="num${mark(c.darkMinutes, bestDark)}">${duration(c.darkMinutes)}</td>
              <td><span class="tag level-${c.overall}">${t(`levels.${c.overall}`)} · ${c.points}/6</span></td>
              <td>
                <button type="button" class="btn ghost small" data-action="load" data-index="${i}">${t("compare.load")}</button>
                <button type="button" class="btn ghost small icon" data-action="remove" data-index="${i}" aria-label="${t("compare.remove")}">${icons.close}</button>
              </td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="hint" style="margin-top:var(--space-3)">${t("compare.legend", { max: MAX_COMPARE })}</p>`;
}
