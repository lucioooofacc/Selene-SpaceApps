/**
 * Panorama del sitio, replicando la ilustración del Figma (frame "image 22"):
 * cielo azul noche sin atmósfera, dunas en capas, matriz solar, módulo y antena.
 * El Sol y la Tierra se ubican con el modelo: X = azimut (360° en todo el
 * ancho, la Tierra queda a la derecha como en el diseño), Y = elevación
 * (12 px por grado, horizonte en y = 400: con +6.4° el Sol queda a la altura
 * de la ilustración del Figma).
 * La cresta es el horizonte del relieve, `scenario.horizon(az)`, dibujado sin
 * recortes ni capas decorativas (UI-08): un sitio plano se ve plano y uno
 * montañoso o dentro de un cráter se ve con crestas altas. Tapa al Sol o a
 * la Tierra cuando están detrás. Delante solo hay suelo plano (la zona de
 * alunizaje). La escala vertical está exagerada (VERTICAL_EXAGGERATION) y se
 * indica en la leyenda, junto con la fuente del horizonte: sintético (v1) o
 * LOLA cuando TERRAIN-02 lo provea (`horizon.source === "lola"`).
 */
import { coord, dateUTC, deg, missionTime, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { getSite } from "../state.js";

const $ = (id) => document.getElementById(id);
const W = 1240;
const H = 544;
const HORIZON_Y = 400;
const PX_PER_DEG = 12;
const EARTH_X = 0.83; // posición horizontal de la Tierra (fracción del ancho), como en el Figma
const GROUND_Y = 474; // borde del suelo plano delantero
/** Grados de cielo visibles sobre el horizonte matemático antes del borde superior. */
const SKY_MAX_EL = Math.floor((HORIZON_Y - 24) / PX_PER_DEG);
/** Exageración vertical: px por grado en vertical / px por grado en horizontal. */
export const VERTICAL_EXAGGERATION = PX_PER_DEG / (W / 360);

let earthAz0 = 0;
const azX = (az) => {
  const f = (((az - earthAz0) / 360 + EARTH_X) % 1 + 1) % 1;
  return f * W;
};
const elY = (el) => HORIZON_Y - Math.min(el, SKY_MAX_EL) * PX_PER_DEG;

function stars() {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let out = "";
  for (let i = 0; i < 180; i++) {
    const x = rand() * W;
    const y = rand() * (HORIZON_Y - 60);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rand() < 0.85 ? 0.8 : 1.3}" fill="#dfe6f2" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function scenery() {
  // Posiciones tomadas de la ilustración del Figma (1242 × 546 → 1240 × 544).
  const panel = (x) => `
    <g transform="translate(${x} 0)">
      <line x1="24" y1="472" x2="24" y2="506" stroke="#4a5260" stroke-width="2"/>
      <path class="pano-panel" d="M0 446 L48 440 L48 470 L0 474 Z"/>
      <path d="M0 455 L48 449 M0 465 L48 459 M16 444 L16 473 M32 442 L32 471" stroke="rgba(255,255,255,0.12)"/>
    </g>`;
  const rock = (x, y, s) =>
    `<path d="M${x} ${y} l${5 * s} ${-9 * s} l${7 * s} ${2 * s} l${4 * s} ${7 * s} Z" fill="#3a3e45"/>`;
  return `
    <!-- Suelo plano delantero (zona de alunizaje; no representa el relieve lejano) -->
    <rect x="0" y="${GROUND_Y}" width="${W}" height="${H - GROUND_Y}" fill="url(#ground)"/>
    <line x1="0" y1="${GROUND_Y}" x2="${W}" y2="${GROUND_Y}" stroke="rgba(170,180,200,0.12)"/>
    <ellipse cx="170" cy="514" rx="56" ry="6" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="520" cy="536" rx="90" ry="9" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="744" cy="506" rx="38" ry="5" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    <ellipse cx="1012" cy="530" rx="70" ry="8" fill="#17191d" stroke="rgba(255,255,255,0.05)"/>
    ${rock(118, 504, 1)}${rock(432, 500, 0.8)}${rock(686, 540, 1.1)}${rock(928, 498, 0.9)}${rock(1150, 540, 1.2)}
    <!-- Matriz solar -->
    <g id="pano-panels">${panel(234)}${panel(286)}${panel(338)}</g>
    <text class="pano-label" x="308" y="530" text-anchor="middle" data-i18n="sim.panels"></text>
    <!-- Módulo -->
    <g>
      <line x1="596" y1="504" x2="596" y2="488" stroke="#8b96a3" stroke-width="1.5"/>
      <path d="M592 520 l-8 12 M620 520 l8 12" stroke="#8b96a3" stroke-width="1.5"/>
      <rect x="588" y="504" width="36" height="18" rx="2" fill="#7c5e2e"/>
      <rect x="588" y="504" width="36" height="5" rx="1" fill="#a9843f"/>
      <circle cx="606" cy="514" r="2" fill="#5cc6d8"/>
    </g>
    <text class="pano-label" x="606" y="542" text-anchor="middle" data-i18n="sim.lander"></text>
    <!-- Antena -->
    <g>
      <line x1="842" y1="512" x2="842" y2="448" stroke="#9aa4b1" stroke-width="2"/>
      <ellipse cx="844" cy="444" rx="13" ry="5" transform="rotate(-28 844 444)" fill="#c9d3df" stroke="#7d8896"/>
    </g>
    <text class="pano-label" x="842" y="534" text-anchor="middle" data-i18n="sim.antenna"></text>`;
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
      <!-- Resplandor del Figma: cálido, amplio y más alto que ancho -->
      <radialGradient id="sun-glow">
        <stop offset="0" stop-color="#f0a865" stop-opacity="0.5"/>
        <stop offset="0.35" stop-color="#b8743f" stop-opacity="0.24"/>
        <stop offset="0.7" stop-color="#6e4428" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#3a2618" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="horizon-glow">
        <stop offset="0" stop-color="#c88a58" stop-opacity="0.45"/>
        <stop offset="1" stop-color="#c88a58" stop-opacity="0"/>
      </radialGradient>
      <!-- Luz rasante sobre la cresta, centrada en el azimut del Sol -->
      <radialGradient id="ridge-light" gradientUnits="userSpaceOnUse" r="420">
        <stop offset="0" stop-color="#d9a77a" stop-opacity="0.38"/>
        <stop offset="0.5" stop-color="#8b7a78" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#5a6478" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="ridge-clip"><path id="ridge-clip-path"/></clipPath>
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
        <stop offset="0" id="dune-far-top" stop-color="#3a4558"/>
        <stop offset="0.35" stop-color="#232b3a"/>
        <stop offset="1" stop-color="#11161f"/>
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" id="ground-top" stop-color="#2b2e34"/>
        <stop offset="1" stop-color="#121418"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <g>${stars()}</g>
    <ellipse id="pano-glow" rx="300" ry="340" fill="url(#sun-glow)"/>
    <!-- Horizonte matemático (0°) y puntos cardinales para leer el relieve -->
    <line x1="0" y1="${HORIZON_Y}" x2="${W}" y2="${HORIZON_Y}" class="pano-zero"/>
    <text class="pano-scale" x="10" y="${HORIZON_Y - 6}">0°</text>
    <g id="pano-sun">
      <circle r="14" fill="url(#sun-core)"/>
      <text class="pano-body-label" id="pano-sun-label" y="-24" text-anchor="middle"></text>
    </g>
    <g id="pano-earth">
      <circle r="28" fill="url(#earth-glow)"/>
      <circle r="10" fill="url(#earth-core)"/>
      <path id="earth-shadow" fill="rgba(4,6,10,0.8)"/>
      <text class="pano-body-label" id="pano-earth-label" y="-20" text-anchor="middle"></text>
    </g>
    <ellipse id="pano-horizon-glow" rx="320" ry="70" fill="url(#horizon-glow)"/>
    <path id="pano-ridge" fill="url(#dune-far)"/>
    <rect id="ridge-light-rect" width="${W}" height="${H}" fill="url(#ridge-light)" clip-path="url(#ridge-clip)"/>
    <path id="pano-crest" fill="none" stroke="rgba(190,202,224,0.42)" stroke-width="1.2"/>
    <g id="pano-ticks"></g>
    ${scenery()}`;
  built = true;
}

/** Perfil del horizonte cada 2 px (≈0,6° de azimut), sin recortar. */
function crestPoints(horizon) {
  const pts = [];
  for (let x = 0; x <= W; x += 2) {
    const az = earthAz0 + (x / W - EARTH_X) * 360;
    pts.push(`${x} ${(HORIZON_Y - horizon(az) * PX_PER_DEG).toFixed(1)}`);
  }
  return pts;
}

/** Puntos cardinales sobre el panorama (el eje X es el azimut). */
function compassTicks() {
  return [0, 90, 180, 270]
    .map((az) => {
      const x = azX(az).toFixed(1);
      return `<line x1="${x}" y1="${GROUND_Y - 4}" x2="${x}" y2="${GROUND_Y + 4}" class="pano-tick"/>
        <text class="pano-scale" x="${x}" y="${GROUND_Y - 8}" text-anchor="middle">${t(`compare.az.${az}`)}</text>`;
    })
    .join("");
}

/** Etiqueta del cuerpo; si está más alto que el cielo dibujado, indica la altura real. */
function bodyLabel(key, elevation) {
  return elevation > SKY_MAX_EL ? `${t(key)} ↑ ${deg(elevation)}` : t(key);
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

  if (scenario.horizon !== lastHorizon || full) {
    earthAz0 = scenario.series.earthAz[0];
    const pts = crestPoints(scenario.horizon);
    const ridge = `M0 ${H} L${pts.join(" L")} L${W} ${H} Z`;
    $("pano-ridge").setAttribute("d", ridge);
    $("ridge-clip-path").setAttribute("d", ridge);
    $("pano-crest").setAttribute("d", `M${pts.join(" L")}`);
    $("pano-ticks").innerHTML = compassTicks();
    lastHorizon = scenario.horizon;
    const source = scenario.horizon.source === "lola" ? "sim.horizonLola" : "sim.horizonSynthetic";
    $("pano-relief").textContent = t("sim.relief", {
      source: t(source),
      exag: VERTICAL_EXAGGERATION.toFixed(1).replace(".", t("units.decimal")),
    });
  }

  const { sun, earth } = sample;
  const sx = azX(sun.azimuth).toFixed(1);
  const sy = elY(sun.elevation).toFixed(1);
  $("pano-sun").setAttribute("transform", `translate(${sx} ${sy})`);
  $("pano-glow").setAttribute("cx", sx);
  $("pano-glow").setAttribute("cy", (Number(sy) + 40).toFixed(1)); // como en el Figma, el halo baja hacia el horizonte
  $("pano-glow").style.opacity = sun.visible ? 1 : 0.15;
  $("pano-sun-label").textContent = bodyLabel("sim.sun", sun.elevation);
  $("pano-earth-label").textContent = bodyLabel("sim.earth", earth.elevation);
  // Brillo cálido en el horizonte y luz rasante en la cresta: más fuertes con el Sol bajo y visible.
  const low = sun.visible ? Math.max(0.25, 1 - Math.max(0, sun.elevation) / 20) : 0.08;
  $("pano-horizon-glow").setAttribute("cx", sx);
  $("pano-horizon-glow").setAttribute("cy", HORIZON_Y);
  $("pano-horizon-glow").style.opacity = low.toFixed(2);
  const light = document.getElementById("ridge-light");
  light.setAttribute("cx", sx);
  light.setAttribute("cy", Math.max(Number(sy), HORIZON_Y - 60).toFixed(1));
  $("ridge-light-rect").style.opacity = (sun.visible ? 1 : 0.1).toFixed(2);
  $("pano-earth").setAttribute("transform", `translate(${azX(earth.azimuth).toFixed(1)} ${elY(earth.elevation).toFixed(1)})`);
  $("earth-shadow").setAttribute("d", earthShadowPath(earth.phase));

  // Luz rasante sobre el relieve cuando hay Sol; más oscuro de noche.
  $("dune-far-top").setAttribute("stop-color", sun.visible ? "#3a4558" : "#1e2634");
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
