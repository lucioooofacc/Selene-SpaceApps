/**
 * Panorama 360° del sitio: horizonte del relieve, Sol y Tierra en su posición.
 * Eje X = azimut, centrado en la Tierra (que casi no se mueve en el cielo lunar).
 * Eje Y = elevación, exagerada ×3 para que
 * se lean los pocos grados que importan en el polo sur.
 * El cielo es siempre negro: la Luna no tiene atmósfera que disperse la luz.
 */
import { deg, coord, dateUTC, timeUTC, missionTime, pct } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { findSite } from "../data/sites.js";

const $ = (id) => document.getElementById(id);
const W = 1200;
const H = 480;
const HORIZON_Y = 300; // y de la elevación 0°
const PX_PER_DEG = 10; // vertical
const PX_PER_AZ = W / 360; // horizontal (≈3.3) → exageración ×3
const MAX_DRAW_EL = (HORIZON_Y - 40) / PX_PER_DEG; // por encima, se dibuja pegado arriba

let centerAz = 0; // azimut que queda en el centro del panorama
const azX = (az) => (((((az - centerAz + 180) % 360) + 360) % 360) * PX_PER_AZ);
const elY = (el) => HORIZON_Y - Math.min(el, MAX_DRAW_EL) * PX_PER_DEG;

function stars(count) {
  let out = "";
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * (HORIZON_Y - 10);
    const r = rand() < 0.9 ? 0.8 : 1.4;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#fff" opacity="${(0.2 + rand() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function equipment() {
  // Matriz solar (paneles verticales, como se usan en el polo), módulo y antena.
  const panel = (x) => `
    <g transform="translate(${x} 0)">
      <line x1="20" y1="372" x2="20" y2="410" stroke="#6b7684" stroke-width="2"/>
      <rect class="pano-panel" x="0" y="330" width="40" height="44" rx="2"/>
      <path d="M0 345h40M0 359h40M13 330v44M27 330v44" stroke="rgba(255,255,255,0.12)"/>
    </g>`;
  return `
    <g id="pano-panels">${panel(300)}${panel(350)}${panel(400)}</g>
    <text class="pano-label" x="370" y="436" text-anchor="middle" data-i18n="sim.panels"></text>
    <g>
      <path d="M560 420l-14 24M640 420l14 24" stroke="#8b96a3" stroke-width="2"/>
      <rect x="560" y="388" width="80" height="34" rx="4" fill="#b98a3e"/>
      <rect x="560" y="388" width="80" height="8" rx="2" fill="#d8a95a"/>
      <circle cx="600" cy="405" r="4" fill="#5fcde0"/>
      <line x1="600" y1="388" x2="600" y2="364" stroke="#8b96a3" stroke-width="2"/>
    </g>
    <text class="pano-label" x="600" y="466" text-anchor="middle" data-i18n="sim.lander"></text>
    <g>
      <line x1="840" y1="420" x2="840" y2="350" stroke="#8b96a3" stroke-width="3"/>
      <ellipse id="pano-dish" cx="840" cy="346" rx="22" ry="9" fill="#cfd8e3" stroke="#8b96a3" stroke-width="2"/>
    </g>
    <text class="pano-label" x="840" y="444" text-anchor="middle" data-i18n="sim.antenna"></text>`;
}

let built = false;
let lastHorizon = null;

function build() {
  const svg = $("panorama-svg");
  svg.innerHTML = `
    <defs>
      <radialGradient id="sun-glow">
        <stop offset="0" stop-color="#ffcf8a" stop-opacity="0.55"/>
        <stop offset="0.35" stop-color="#f0b35b" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#f0b35b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sun-core" cx="0.4" cy="0.4">
        <stop offset="0" stop-color="#fff8e6"/>
        <stop offset="0.6" stop-color="#ffd38c"/>
        <stop offset="1" stop-color="#f0a043"/>
      </radialGradient>
      <radialGradient id="earth-glow">
        <stop offset="0" stop-color="#5fcde0" stop-opacity="0.4"/>
        <stop offset="1" stop-color="#5fcde0" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="earth-core" cx="0.4" cy="0.4">
        <stop offset="0" stop-color="#bff4ff"/>
        <stop offset="0.5" stop-color="#3a8fd0"/>
        <stop offset="1" stop-color="#174b7a"/>
      </radialGradient>
      <linearGradient id="ridge-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" id="ridge-top" stop-color="#3a4250"/>
        <stop offset="1" stop-color="#11151c"/>
      </linearGradient>
      <linearGradient id="ground-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" id="ground-top" stop-color="#2a2f37"/>
        <stop offset="1" stop-color="#0d1015"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#04060a"/>
    <g>${stars(160)}</g>
    <g id="pano-sun">
      <circle r="120" fill="url(#sun-glow)"/>
      <circle r="14" fill="url(#sun-core)"/>
      <text class="pano-label" y="-26" text-anchor="middle" data-i18n="sim.sun"></text>
    </g>
    <g id="pano-earth">
      <circle r="40" fill="url(#earth-glow)"/>
      <circle r="11" fill="url(#earth-core)"/>
      <path id="earth-shadow" fill="rgba(4,6,10,0.85)"/>
      <text class="pano-label" y="-22" text-anchor="middle" data-i18n="sim.earth"></text>
    </g>
    <line x1="0" y1="${HORIZON_Y}" x2="${W}" y2="${HORIZON_Y}" stroke="rgba(255,255,255,0.16)" stroke-dasharray="4 8"/>
    <text class="pano-axis" x="${W - 8}" y="${HORIZON_Y - 6}" text-anchor="end">0°</text>
    <text class="pano-axis" x="${W - 8}" y="${HORIZON_Y - 10 * PX_PER_DEG - 6}" text-anchor="end">+10°</text>
    <line x1="${W - 48}" y1="${HORIZON_Y - 10 * PX_PER_DEG}" x2="${W}" y2="${HORIZON_Y - 10 * PX_PER_DEG}" stroke="rgba(255,255,255,0.16)"/>
    <path id="pano-ridge" fill="url(#ridge-fill)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
    <path d="M0 ${HORIZON_Y + 50} C 300 ${HORIZON_Y + 30}, 700 ${HORIZON_Y + 70}, ${W} ${HORIZON_Y + 40} L ${W} ${H} L 0 ${H} Z" fill="url(#ground-fill)"/>
    <ellipse cx="380" cy="440" rx="110" ry="14" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="760" cy="410" rx="44" ry="6" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="1080" cy="452" rx="80" ry="10" fill="rgba(0,0,0,0.35)"/>
    ${equipment()}
    <g class="pano-axis" id="pano-dirs">
      ${["N", "E", "S", "W"].map((d) => `<text y="${HORIZON_Y + 28}" text-anchor="middle" data-dir="${d}"></text>`).join("")}
    </g>`;
  built = true;
}

function ridgePath(horizon) {
  let d = `M0 ${H}`;
  for (let step = 0; step <= 360; step += 2) {
    const az = centerAz - 180 + step;
    d += ` L${(step * PX_PER_AZ).toFixed(1)} ${(HORIZON_Y - horizon(az) * PX_PER_DEG).toFixed(1)}`;
  }
  return `${d} L${W} ${H} Z`;
}

/** Marcas N/E/S/W según el centro actual (se ocultan las que quedan en el borde). */
function placeDirections() {
  $("pano-dirs")
    .querySelectorAll("[data-dir]")
    .forEach((el, i) => {
      const x = azX(i * 90);
      el.setAttribute("x", x.toFixed(1));
      el.style.display = x < 24 || x > W - 24 ? "none" : "";
    });
}

/** Sombra de la fase de la Tierra (0 = nueva, 1 = llena). */
function earthShadowPath(phase, r = 11) {
  // Terminador como elipse: ancho = r * |1 - 2*fase|.
  const k = 1 - 2 * phase;
  const rx = Math.abs(k) * r;
  const sweep = k > 0 ? 0 : 1;
  return `M0 ${-r} A ${r} ${r} 0 0 0 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
}

function translateStatic() {
  const svg = $("panorama-svg");
  svg.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  svg.querySelectorAll("[data-dir]").forEach((el) => (el.textContent = t(`units.${el.dataset.dir}`)));
}

export function renderPanorama(scenario, sample, { full = false } = {}) {
  if (!built) build();
  if (full) translateStatic();

  if (scenario.horizon !== lastHorizon) {
    // Centro fijo por escenario: la Tierra al inicio, redondeada a 10°.
    centerAz = Math.round(scenario.series.earthAz[0] / 10) * 10;
    $("pano-ridge").setAttribute("d", ridgePath(scenario.horizon));
    placeDirections();
    lastHorizon = scenario.horizon;
  }

  const { sun, earth } = sample;
  const sunG = $("pano-sun");
  sunG.setAttribute("transform", `translate(${azX(sun.azimuth).toFixed(1)} ${elY(sun.elevation).toFixed(1)})`);
  sunG.style.opacity = sun.elevation < -8 ? 0 : 1;

  const earthG = $("pano-earth");
  earthG.setAttribute("transform", `translate(${azX(earth.azimuth).toFixed(1)} ${elY(earth.elevation).toFixed(1)})`);
  earthG.style.opacity = earth.elevation < -8 ? 0 : 1;
  $("earth-shadow").setAttribute("d", earthShadowPath(earth.phase));

  // Iluminación del terreno: luz solar rasante, o luz de la Tierra en la noche.
  const lit = sun.visible ? 1 : 0;
  $("ridge-top").setAttribute("stop-color", lit ? "#5a5f66" : earth.visible ? "#232c38" : "#1a1e25");
  $("ground-top").setAttribute("stop-color", lit ? "#3b3e44" : "#16191f");
  $("pano-panels")
    .querySelectorAll(".pano-panel")
    .forEach((p) => p.setAttribute("fill", sun.visible ? "#2f5d8f" : "#1c2a3b"));

  const site = findSite(scenario.site.id);
  $("pano-site").innerHTML = `<span class="dot" style="color:var(--earth)"></span>${
    site ? site.name : t("setup.customShort")
  } · ${coord(scenario.site.lat, "lat")}`;
  $("pano-date").textContent = dateUTC(sample.ms);
  $("pano-time").textContent = timeUTC(sample.ms);
  $("pano-mission").textContent = `UTC · ${missionTime(sample.ms - scenario.startMs)}`;
  $("pano-status").innerHTML = `<span class="dot" style="color:${sun.visible ? "var(--sun)" : "var(--text-faint)"}"></span>${t(
    sun.visible ? "sim.sunVisible" : "sim.sunHidden",
    { el: deg(sun.elevation) },
  )} · ${t(earth.visible ? "sim.earthVisible" : "sim.earthHidden", { phase: pct(earth.phase * 100) })}`;

  $("panorama-svg").setAttribute(
    "aria-label",
    t("sim.aria", { sun: deg(sun.elevation), earth: deg(earth.elevation) }),
  );
}
