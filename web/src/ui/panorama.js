/**
 * Panorama del sitio, replicando la ilustración del Figma (frame "image 22"):
 * cielo azul noche sin atmósfera, dunas en capas, matriz solar, módulo y antena.
 * El Sol y la Tierra se ubican con el modelo: X = azimut (360° en todo el
 * ancho, la Tierra queda a la derecha como en el diseño), Y = elevación
 * (20 px por grado, horizonte en y = 360).
 * La primera capa de dunas es el horizonte del relieve: tapa al Sol o a la
 * Tierra cuando están detrás de una cresta.
 */
import { coord, dateUTC, deg, missionTime, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { getSite } from "../state.js";

const $ = (id) => document.getElementById(id);
const W = 1240;
const H = 544;
const HORIZON_Y = 360;
const PX_PER_DEG = 20;
const EARTH_X = 0.83; // posición horizontal de la Tierra (fracción del ancho), como en el Figma

let earthAz0 = 0;
const azX = (az) => {
  const f = (((az - earthAz0) / 360 + EARTH_X) % 1 + 1) % 1;
  return f * W;
};
const elY = (el) => HORIZON_Y - Math.min(el, 17) * PX_PER_DEG;

function stars() {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let out = "";
  for (let i = 0; i < 180; i++) {
    const x = rand() * W;
    const y = rand() * (HORIZON_Y - 20);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rand() < 0.85 ? 0.8 : 1.3}" fill="#dfe6f2" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function scenery() {
  const panel = (x) => `
    <g transform="translate(${x} 0)">
      <line x1="24" y1="408" x2="24" y2="458" stroke="#4a5260" stroke-width="2"/>
      <path class="pano-panel" d="M0 388 L52 380 L52 414 L0 420 Z"/>
      <path d="M0 399 L52 391 M0 409 L52 402 M17 386 L17 418 M35 383 L35 416" stroke="rgba(255,255,255,0.1)"/>
    </g>`;
  const rock = (x, y, s) =>
    `<path d="M${x} ${y} l${6 * s} ${-10 * s} l${8 * s} ${2 * s} l${4 * s} ${8 * s} Z" fill="#3a3e45"/>`;
  return `
    <!-- Dunas cercanas (decorativas) -->
    <path d="M0 404 C 180 384, 330 410, 520 396 S 860 380, 1040 398 S 1180 392, ${W} 386 L ${W} ${H} L 0 ${H} Z" fill="url(#dune-near)" stroke="rgba(160,175,200,0.18)"/>
    <!-- Suelo -->
    <path d="M0 424 C 300 418, 900 420, ${W} 416 L ${W} ${H} L 0 ${H} Z" fill="url(#ground)"/>
    <ellipse cx="120" cy="468" rx="66" ry="7" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="520" cy="494" rx="96" ry="10" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="780" cy="458" rx="44" ry="5" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="1090" cy="486" rx="74" ry="8" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="370" cy="522" rx="120" ry="12" fill="#141619" stroke="rgba(255,255,255,0.04)"/>
    ${rock(56, 456, 1)}${rock(418, 448, 0.8)}${rock(712, 516, 1.1)}${rock(930, 446, 0.9)}${rock(1150, 520, 1.2)}
    <!-- Matriz solar -->
    <g id="pano-panels">${panel(234)}${panel(286)}${panel(338)}</g>
    <text class="pano-label" x="308" y="490" text-anchor="middle" data-i18n="sim.panels"></text>
    <!-- Módulo -->
    <g>
      <line x1="610" y1="452" x2="610" y2="434" stroke="#8b96a3" stroke-width="1.5"/>
      <path d="M602 468 l-10 14 M634 468 l10 14" stroke="#8b96a3" stroke-width="1.5"/>
      <rect x="598" y="452" width="40" height="18" rx="2" fill="#8a6a35"/>
      <rect x="598" y="452" width="40" height="5" rx="1" fill="#b48d4a"/>
      <circle cx="618" cy="462" r="2" fill="#5cc6d8"/>
    </g>
    <text class="pano-label" x="618" y="500" text-anchor="middle" data-i18n="sim.lander"></text>
    <!-- Antena -->
    <g>
      <line x1="858" y1="470" x2="858" y2="350" stroke="#9aa4b1" stroke-width="2"/>
      <ellipse cx="860" cy="346" rx="14" ry="6" transform="rotate(-28 860 346)" fill="#c9d3df" stroke="#7d8896"/>
    </g>
    <text class="pano-label" x="858" y="490" text-anchor="middle" data-i18n="sim.antenna"></text>`;
}

let built = false;
let lastHorizon = null;

function build() {
  $("panorama-svg").innerHTML = `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#05080f"/>
        <stop offset="0.65" stop-color="#0d1422"/>
        <stop offset="1" stop-color="#151d2c"/>
      </linearGradient>
      <radialGradient id="sun-glow">
        <stop offset="0" stop-color="#f3a660" stop-opacity="0.5"/>
        <stop offset="0.4" stop-color="#b9703e" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#7a4a2a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sun-core" cx="0.4" cy="0.4">
        <stop offset="0" stop-color="#fff7e2"/>
        <stop offset="0.6" stop-color="#ffd48f"/>
        <stop offset="1" stop-color="#f0a043"/>
      </radialGradient>
      <radialGradient id="earth-glow">
        <stop offset="0" stop-color="#4d8de0" stop-opacity="0.45"/>
        <stop offset="1" stop-color="#4d8de0" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="earth-core" cx="0.4" cy="0.4">
        <stop offset="0" stop-color="#9fd8ff"/>
        <stop offset="0.55" stop-color="#2f6fc0"/>
        <stop offset="1" stop-color="#173f72"/>
      </radialGradient>
      <linearGradient id="dune-far" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" id="dune-far-top" stop-color="#2a3446"/>
        <stop offset="1" stop-color="#121822"/>
      </linearGradient>
      <linearGradient id="dune-near" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" id="dune-near-top" stop-color="#232b39"/>
        <stop offset="1" stop-color="#11161e"/>
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" id="ground-top" stop-color="#2b2e34"/>
        <stop offset="1" stop-color="#121418"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <g>${stars()}</g>
    <circle id="pano-glow" r="200" fill="url(#sun-glow)"/>
    <g id="pano-sun">
      <circle r="14" fill="url(#sun-core)"/>
      <text class="pano-body-label" y="-24" text-anchor="middle" data-i18n="sim.sun"></text>
    </g>
    <g id="pano-earth">
      <circle r="28" fill="url(#earth-glow)"/>
      <circle r="10" fill="url(#earth-core)"/>
      <path id="earth-shadow" fill="rgba(4,6,10,0.8)"/>
      <text class="pano-body-label" y="-20" text-anchor="middle" data-i18n="sim.earth"></text>
    </g>
    <path id="pano-ridge" fill="url(#dune-far)" stroke="rgba(170,185,210,0.28)" stroke-width="1"/>
    ${scenery()}`;
  built = true;
}

function ridgePath(horizon) {
  let d = `M0 ${H}`;
  for (let x = 0; x <= W; x += 4) {
    const az = earthAz0 + ((x / W - EARTH_X) * 360);
    d += ` L${x} ${(HORIZON_Y - horizon(az) * PX_PER_DEG).toFixed(1)}`;
  }
  return `${d} L${W} ${H} Z`;
}

function earthShadowPath(phase, r = 10) {
  const k = 1 - 2 * phase;
  const rx = Math.abs(k) * r;
  return `M0 ${-r} A ${r} ${r} 0 0 0 0 ${r} A ${rx} ${r} 0 0 ${k > 0 ? 0 : 1} 0 ${-r} Z`;
}

function translateStatic() {
  $("panorama-svg")
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
}

export function renderPanorama(scenario, sample, { full = false } = {}) {
  if (!built) build();
  if (full) translateStatic();

  if (scenario.horizon !== lastHorizon) {
    earthAz0 = scenario.series.earthAz[0];
    $("pano-ridge").setAttribute("d", ridgePath(scenario.horizon));
    lastHorizon = scenario.horizon;
  }

  const { sun, earth } = sample;
  const sx = azX(sun.azimuth).toFixed(1);
  const sy = elY(sun.elevation).toFixed(1);
  $("pano-sun").setAttribute("transform", `translate(${sx} ${sy})`);
  $("pano-glow").setAttribute("cx", sx);
  $("pano-glow").setAttribute("cy", sy);
  $("pano-glow").style.opacity = sun.visible ? 1 : 0.15;
  $("pano-earth").setAttribute("transform", `translate(${azX(earth.azimuth).toFixed(1)} ${elY(earth.elevation).toFixed(1)})`);
  $("earth-shadow").setAttribute("d", earthShadowPath(earth.phase));

  // Luz rasante sobre el relieve cuando hay Sol; más oscuro de noche.
  $("dune-far-top").setAttribute("stop-color", sun.visible ? "#33405a" : "#1c2433");
  $("dune-near-top").setAttribute("stop-color", sun.visible ? "#2a3344" : "#171d28");
  $("ground-top").setAttribute("stop-color", sun.visible ? "#33363c" : "#1b1d22");
  $("pano-panels")
    .querySelectorAll(".pano-panel")
    .forEach((p) => p.setAttribute("fill", sun.visible ? "#2d5a92" : "#1b2a40"));

  const site = getSite(scenario.site.id);
  const name = site ? site.name : t("map.observed");
  $("pano-site").innerHTML = `<i style="background:#5cc6d8"></i>${name} · ${coord(scenario.site.lat, "lat")}`;
  $("pano-date").textContent = dateUTC(sample.ms);
  $("pano-time").textContent = timeUTC(sample.ms);
  $("pano-mission").textContent = `UTC · ${missionTime(sample.ms - scenario.startMs)}`;
  $("pano-status").innerHTML = `<i style="background:${sun.visible ? "#e8ad5b" : "#6f7885"}"></i>${t(
    sun.visible ? "sim.sunVisible" : "sim.sunHidden",
    { el: deg(sun.elevation) },
  )}`;
  $("panorama-svg").setAttribute("aria-label", t("sim.aria", { sun: deg(sun.elevation), earth: deg(earth.elevation) }));
}
