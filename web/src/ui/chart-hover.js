/**
 * Cartel al pasar el mouse por los gráficos de ventanas de luz y enlace
 * (comparar e informe, DEC-078): una línea vertical sigue al cursor y un
 * cartel muestra la fecha y la hora UTC de ese punto y, si el cursor está
 * sobre un carril, si en ese instante hay luz o enlace.
 *
 * No calcula nada astronómico: convierte la posición del mouse en un instante
 * con la misma escala lineal del gráfico y busca ese instante en las ventanas
 * que ya calculó lib/.
 *
 * Todo se ubica en fracciones del gráfico (porcentajes), así que no depende
 * del `zoom` con el que se escala el stage.
 */
import { dateUTC, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";

const configs = new WeakMap();

/**
 * @param {HTMLElement} container  contenedor del SVG (se le agrega el cartel)
 * @param {object} cfg  geometría en unidades del viewBox
 * @param {number} cfg.width   ancho del viewBox
 * @param {number} cfg.height  alto del viewBox
 * @param {number} cfg.left    x del inicio del período
 * @param {number} cfg.right   x del fin del período
 * @param {number} cfg.startMs
 * @param {number} cfg.endMs
 * @param {Array<{top:number, height:number, label:string, windows:Array<{start:number,end:number}>, on:string, off:string}>} cfg.lanes
 */
export function attachTimeHover(container, cfg) {
  const svg = container.querySelector("svg");
  if (!svg) return;
  const guide = document.createElementNS("http://www.w3.org/2000/svg", "line");
  guide.setAttribute("class", "chart-guide");
  guide.setAttribute("y1", "0");
  guide.setAttribute("y2", String(cfg.lanes.reduce((m, l) => Math.max(m, l.top + l.height), 0)));
  guide.style.display = "none";
  svg.append(guide);
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.setAttribute("aria-hidden", "true"); // el gráfico ya tiene su descripción accesible
  tip.hidden = true;
  container.append(tip);
  configs.set(container, { ...cfg, svg, guide, tip });

  if (container.dataset.timeHover) return; // los eventos se conectan una sola vez
  container.dataset.timeHover = "1";
  container.addEventListener("mousemove", (event) => move(container, event));
  container.addEventListener("mouseleave", () => hide(configs.get(container)));
}

function hide(c) {
  if (!c) return;
  c.tip.hidden = true;
  c.guide.style.display = "none";
}

function move(container, event) {
  const c = configs.get(container);
  if (!c || !c.svg.isConnected) return;
  const rect = c.svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const fx = (event.clientX - rect.left) / rect.width;
  const fy = (event.clientY - rect.top) / rect.height;
  const vx = fx * c.width;
  const vy = fy * c.height;
  if (vx < c.left || vx > c.right || fy < 0 || fy > 1) return hide(c);

  const ms = c.startMs + ((vx - c.left) / (c.right - c.left)) * (c.endMs - c.startMs);
  const lane = c.lanes.find((l) => vy >= l.top && vy <= l.top + l.height);
  const lines = [`<strong>${dateUTC(ms)} · ${timeUTC(ms)} UTC</strong>`];
  if (lane) {
    const inside = lane.windows.some((w) => ms >= w.start && ms < w.end);
    lines.push(`<span class="chart-tip-${inside ? "on" : "off"}">${lane.label}: ${inside ? lane.on : lane.off}</span>`);
  }
  c.tip.innerHTML = lines.join("");
  c.tip.hidden = false;
  // Encima del carril (o del cursor si no hay carril), sin salirse por los costados.
  const anchorY = lane ? lane.top : vy;
  c.tip.style.left = `${fx * 100}%`;
  c.tip.style.top = `${(anchorY / c.height) * 100}%`;
  c.tip.dataset.align = fx > 0.8 ? "end" : fx < 0.2 ? "start" : "center";
  c.guide.setAttribute("x1", vx.toFixed(1));
  c.guide.setAttribute("x2", vx.toFixed(1));
  c.guide.style.display = "";
}

/** Textos de estado de los carriles de luz y de enlace. */
export const laneStates = {
  light: () => ({ on: t("chartTip.lightOn"), off: t("chartTip.lightOff") }),
  link: () => ({ on: t("chartTip.linkOn"), off: t("chartTip.linkOff") }),
};
