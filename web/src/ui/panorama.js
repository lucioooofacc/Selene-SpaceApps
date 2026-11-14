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
import { lolaForScenario } from "./lola.js";

const $ = (id) => document.getElementById(id);
const W = 1240;
const H = 544;
const HORIZON_Y = 400;
const PX_PER_DEG = 12;
const EARTH_X = 0.83; // posición horizontal de la Tierra (fracción del ancho), como en el Figma
const GROUND_Y = 474; // borde del suelo plano delantero
const EARTH_R = 11; // radio de la Tierra dibujada (como en el Figma)
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
  for (let i = 0; i < 220; i++) {
    const x = rand() * W;
    const y = rand() * (HORIZON_Y - 40);
    const big = rand() < 0.08;
    const r = big ? 1.5 : rand() < 0.8 ? 0.7 : 1.1;
    const o = (0.25 + rand() * 0.65).toFixed(2);
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#e3e9f4" opacity="${o}"/>`;
    // Unas pocas estrellas brillantes con un halo tenue
    if (big) out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="url(#star-glow)" opacity="${o}"/>`;
  }
  return out;
}

/** Textura de regolito: ruido fino generado una sola vez (patrón barato de pintar al animar). */
function noiseDataUrl() {
  const size = 160;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rand() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

function scenery() {
  // Posiciones tomadas de la ilustración del Figma (1242 × 546 → 1240 × 544).
  let seed = 23;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // Cráter: cuenco oscuro, pared interior en sombra y borde iluminado del lado cercano.
  const crater = (cx, cy, rx) => {
    const ry = rx * 0.11;
    return `
      <g>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.08}" ry="${ry * 1.5}" fill="rgba(200,208,222,0.05)"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#101215"/>
        <ellipse cx="${cx}" cy="${cy - ry * 0.25}" rx="${rx * 0.86}" ry="${ry * 0.7}" fill="#0b0c0f"/>
        <path d="M${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" stroke="rgba(214,222,236,0.22)" stroke-width="1.2"/>
      </g>`;
  };
  // Piedra con cara iluminada y cara en sombra, y su sombra en el suelo.
  const rock = (x, y, s) => `
    <g>
      <ellipse cx="${x + 9 * s}" cy="${y + 1}" rx="${11 * s}" ry="${2.2 * s}" fill="rgba(0,0,0,0.45)"/>
      <path d="M${x} ${y} l${4 * s} ${-10 * s} l${7 * s} ${-2 * s} l${3 * s} ${12 * s} Z" fill="#5b6069"/>
      <path d="M${x + 11 * s} ${y - 12 * s} l${6 * s} ${4 * s} l${1 * s} ${8 * s} l${-4 * s} 0 Z" fill="#2f3238"/>
    </g>`;
  // Guijarros con perspectiva: más chicos y juntos cerca del horizonte.
  let pebbles = "";
  for (let i = 0; i < 90; i++) {
    const y = GROUND_Y + 4 + rand() ** 1.6 * (H - GROUND_Y - 6);
    const k = (y - GROUND_Y) / (H - GROUND_Y);
    const rx = 0.6 + k * 2.6 * (0.5 + rand());
    pebbles += `<ellipse cx="${(rand() * W).toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(2)}" ry="${(rx * 0.45).toFixed(2)}" fill="${rand() < 0.5 ? "#4b5059" : "#23262b"}"/>`;
  }
  // Panel solar: marco, celdas, reflejo, patas y sombra.
  const panel = (x) => `
    <g transform="translate(${x} 0)">
      <ellipse cx="26" cy="507" rx="30" ry="3.5" fill="rgba(0,0,0,0.5)"/>
      <line x1="12" y1="470" x2="10" y2="506" stroke="#5a6372" stroke-width="2"/>
      <line x1="38" y1="467" x2="40" y2="506" stroke="#5a6372" stroke-width="2"/>
      <line x1="10" y1="490" x2="40" y2="488" stroke="#3f4652" stroke-width="1"/>
      <path class="pano-panel" d="M0 446 L48 440 L48 470 L0 474 Z"/>
      <path d="M0 446 L48 440 L48 470 L0 474 Z" fill="url(#panel-sheen)"/>
      <path d="M0 453 L48 447 M0 460 L48 454 M0 467 L48 461 M12 444.5 L12 472.5 M24 443 L24 471 M36 441.5 L36 469.5" stroke="rgba(170,200,240,0.18)" stroke-width="0.8"/>
      <path d="M0 446 L48 440 L48 470 L0 474 Z" fill="none" stroke="#8a95a6" stroke-width="1"/>
    </g>`;
  return `
    <!-- Suelo plano delantero (zona de alunizaje; no representa el relieve lejano) -->
    <rect x="0" y="${GROUND_Y}" width="${W}" height="${H - GROUND_Y}" fill="url(#ground)"/>
    <rect x="0" y="${GROUND_Y}" width="${W}" height="${H - GROUND_Y}" fill="url(#regolith)" opacity="0.07"/>
    <rect id="ground-light" x="0" y="${GROUND_Y}" width="${W}" height="${H - GROUND_Y}" fill="url(#ground-sun-grad)"/>
    <line x1="0" y1="${GROUND_Y}" x2="${W}" y2="${GROUND_Y}" stroke="rgba(190,200,220,0.16)"/>
    ${crater(170, 514, 56)}${crater(520, 536, 90)}${crater(744, 506, 38)}${crater(1012, 530, 70)}${crater(388, 492, 22)}${crater(1160, 498, 26)}
    <g>${pebbles}</g>
    ${rock(118, 504, 1)}${rock(432, 500, 0.8)}${rock(686, 540, 1.1)}${rock(928, 498, 0.9)}${rock(1150, 540, 1.2)}
    <!-- Matriz solar -->
    <g id="pano-panels">${panel(234)}${panel(286)}${panel(338)}</g>
    <text class="pano-label" x="308" y="530" text-anchor="middle" data-i18n="sim.panels"></text>
    <!-- Módulo: cuerpo con lámina dorada, cubierta, patas con platos y antena -->
    <g>
      <ellipse cx="606" cy="533" rx="34" ry="3.5" fill="rgba(0,0,0,0.5)"/>
      <path d="M592 520 L581 532 M620 520 L631 532 M598 521 L594 533 M614 521 L618 533" stroke="#9aa4b1" stroke-width="1.6"/>
      <ellipse cx="580" cy="532.5" rx="4" ry="1.2" fill="#b8c1cc"/>
      <ellipse cx="632" cy="532.5" rx="4" ry="1.2" fill="#b8c1cc"/>
      <line x1="596" y1="504" x2="596" y2="486" stroke="#a7b1bd" stroke-width="1.4"/>
      <circle cx="596" cy="485" r="2" fill="#d5dde6"/>
      <rect x="588" y="504" width="36" height="18" rx="2" fill="url(#foil)"/>
      <path d="M592 507 L600 514 L594 520 M608 506 L616 512 L620 506" stroke="rgba(255,236,170,0.35)" stroke-width="0.8" fill="none"/>
      <rect x="586" y="501" width="40" height="5" rx="1.5" fill="#b9c2cd"/>
      <path d="M600 522 L612 522 L610 527 L602 527 Z" fill="#3b4049"/>
      <circle cx="606" cy="514" r="2" fill="#5cc6d8"/>
    </g>
    <text class="pano-label" x="606" y="542" text-anchor="middle" data-i18n="sim.lander"></text>
    <!-- Antena: base, mástil, plato con interior y alimentador -->
    <g>
      <ellipse cx="842" cy="513" rx="16" ry="2.5" fill="rgba(0,0,0,0.5)"/>
      <path d="M842 500 L832 513 M842 500 L852 513" stroke="#7f8a98" stroke-width="1.4"/>
      <line x1="842" y1="512" x2="842" y2="450" stroke="#a8b2be" stroke-width="2"/>
      <g transform="rotate(-28 844 444)">
        <ellipse cx="844" cy="444" rx="14" ry="5.5" fill="url(#dish)" stroke="#8a95a3"/>
        <ellipse cx="844" cy="444.6" rx="9" ry="3.2" fill="rgba(60,70,84,0.35)"/>
        <line x1="844" y1="444" x2="844" y2="434" stroke="#c9d3df" stroke-width="1"/>
        <circle cx="844" cy="433.5" r="1.5" fill="#e3eaf2"/>
      </g>
    </g>
    <text class="pano-label" x="842" y="534" text-anchor="middle" data-i18n="sim.antenna"></text>`;
}

let built = false;
let lastHorizon = null;
let reliefNotes = []; // notas del relieve (cambian con el horizonte)
let lastNotesKey = "";

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
        <stop offset="0.45" stop-color="#1e2025"/>
        <stop offset="1" stop-color="#101114"/>
      </linearGradient>
      <!-- Luz del Sol sobre el suelo delantero, centrada en su azimut -->
      <radialGradient id="ground-sun-grad" gradientUnits="userSpaceOnUse" r="520">
        <stop offset="0" stop-color="#d8b48c" stop-opacity="0.16"/>
        <stop offset="1" stop-color="#d8b48c" stop-opacity="0"/>
      </radialGradient>
      <pattern id="regolith" width="160" height="160" patternUnits="userSpaceOnUse">
        <image href="${noiseDataUrl()}" width="160" height="160"/>
      </pattern>
      <linearGradient id="band-1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a566b" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#1a2130" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient id="band-2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a3344" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#0f141c" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="panel-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0.2"/>
      </linearGradient>
      <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e2b75c"/>
        <stop offset="0.5" stop-color="#9c7230"/>
        <stop offset="1" stop-color="#d7a84c"/>
      </linearGradient>
      <radialGradient id="dish" cx="0.35" cy="0.35">
        <stop offset="0" stop-color="#f1f5fa"/>
        <stop offset="1" stop-color="#9aa6b5"/>
      </radialGradient>
      <radialGradient id="star-glow">
        <stop offset="0" stop-color="#e3e9f4" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#e3e9f4" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sun-halo">
        <stop offset="0" stop-color="#fff3d6" stop-opacity="0.85"/>
        <stop offset="0.45" stop-color="#ffcf8a" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#ffb060" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="earth-ocean" cx="0.38" cy="0.35">
        <stop offset="0" stop-color="#5aa9f0"/>
        <stop offset="0.6" stop-color="#1f5ea8"/>
        <stop offset="1" stop-color="#0e2f5c"/>
      </radialGradient>
      <radialGradient id="earth-atmo">
        <stop offset="0.78" stop-color="#7fc4ff" stop-opacity="0"/>
        <stop offset="0.9" stop-color="#8fd0ff" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#8fd0ff" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="earth-clip"><circle r="${EARTH_R}"/></clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <g>${stars()}</g>
    <ellipse id="pano-glow" rx="300" ry="340" fill="url(#sun-glow)"/>
    <!-- Horizonte matemático (0°) y puntos cardinales para leer el relieve -->
    <line x1="0" y1="${HORIZON_Y}" x2="${W}" y2="${HORIZON_Y}" class="pano-zero"/>
    <text class="pano-scale" x="10" y="${HORIZON_Y - 6}">0°</text>
    <g id="pano-sun">
      <circle r="30" fill="url(#sun-halo)"/>
      <circle r="14" fill="url(#sun-core)"/>
      <text class="pano-body-label" id="pano-sun-label" y="-24" text-anchor="middle"></text>
    </g>
    <g id="pano-earth">
      <circle r="30" fill="url(#earth-glow)"/>
      <!-- Tierra: océanos, continentes y nubes estilizados; la sombra es la fase real -->
      <g clip-path="url(#earth-clip)">
        <circle r="${EARTH_R}" fill="url(#earth-ocean)"/>
        <path d="M-7 -6 C-4 -9 0 -8 1 -5 C2 -2 -1 -1 -2 2 C-3 5 -6 4 -7 1 C-9 -2 -9 -4 -7 -6 Z" fill="#5f9a4e"/>
        <path d="M3 -2 C6 -3 9 -1 9 2 C9 5 6 8 4 7 C2 6 3 3 2 1 C1 0 1 -1 3 -2 Z" fill="#7aa255"/>
        <path d="M-2 6 C0 5 2 7 1 9 C0 10 -2 10 -3 9 Z" fill="#6e9a50"/>
        <path d="M-11 -2 C-6 -4 -2 -2 2 -4 C5 -5 8 -4 11 -5 M-11 4 C-6 3 -3 5 1 3 C4 2 8 4 11 3 M-6 -9 C-3 -10 1 -10 4 -9" stroke="#f2f6fb" stroke-opacity="0.55" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="0" cy="-10.2" rx="5" ry="1.6" fill="#f2f6fb" opacity="0.8"/>
        <path id="earth-shadow" fill="rgba(3,5,9,0.86)"/>
      </g>
      <circle r="${EARTH_R + 2.5}" fill="url(#earth-atmo)"/>
      <text class="pano-body-label" id="pano-earth-label" y="-20" text-anchor="middle"></text>
    </g>
    <ellipse id="pano-horizon-glow" rx="320" ry="70" fill="url(#horizon-glow)"/>
    <path id="pano-ridge" fill="url(#dune-far)"/>
    <!-- Bandas de profundidad dentro de la silueta del relieve (la silueta es el horizonte calculado) -->
    <g clip-path="url(#ridge-clip)">
      <path id="pano-band-1" fill="url(#band-1)"/>
      <path id="pano-band-2" fill="url(#band-2)"/>
      <rect width="${W}" height="${H}" fill="url(#regolith)" opacity="0.06"/>
    </g>
    <rect id="ridge-light-rect" width="${W}" height="${H}" fill="url(#ridge-light)" clip-path="url(#ridge-clip)"/>
    <path id="pano-crest" fill="none" stroke="rgba(190,202,224,0.42)" stroke-width="1.2"/>
    <!-- Horizonte LOLA real como vista previa mientras el cálculo usa el sintético (UI-14) -->
    <path id="pano-lola" class="pano-lola" fill="none"/>
    <g id="pano-quality"></g>
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

/**
 * Banda de profundidad: la cresta bajada `drop` px y suavizada (media móvil de
 * ±`smooth` muestras) hasta el suelo. Es solo sombreado decorativo dentro de
 * la silueta (se recorta con ella): no cambia la forma del relieve.
 */
function bandPath(horizon, drop, smooth) {
  const ys = [];
  for (let x = 0; x <= W; x += 4) {
    const az = earthAz0 + (x / W - EARTH_X) * 360;
    ys.push(HORIZON_Y - horizon(az) * PX_PER_DEG);
  }
  const pts = ys.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -smooth; k <= smooth; k++) {
      const v = ys[i + k];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    return `${i * 4} ${(sum / n + drop).toFixed(1)}`;
  });
  return `M0 ${H} L${pts.join(" L")} L${W} ${H} Z`;
}

/**
 * Tramos del horizonte LOLA con baja confianza (count = 0) o truncados por la
 * cobertura (cota inferior), dibujados sobre la curva que corresponda.
 */
function qualityMarks(horizon) {
  if (!horizon.detail) return "";
  let out = "";
  let run = null;
  const flush = () => {
    if (run && run.pts.length > 1) out += `<path class="pano-q pano-q-${run.kind}" d="M${run.pts.join(" L")}"/>`;
    run = null;
  };
  for (let x = 0; x <= W; x += 2) {
    const az = earthAz0 + (x / W - EARTH_X) * 360;
    const d = horizon.detail(az);
    const kind = d.truncated ? "trunc" : d.lowConfidence ? "low" : null;
    if (kind !== run?.kind) flush();
    if (!kind) continue;
    run ??= { kind, pts: [] };
    run.pts.push(`${x} ${(HORIZON_Y - horizon(az) * PX_PER_DEG).toFixed(1)}`);
  }
  flush();
  return out;
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
    $("pano-band-1").setAttribute("d", bandPath(scenario.horizon, 16, 9));
    $("pano-band-2").setAttribute("d", bandPath(scenario.horizon, 40, 22));
    $("pano-ticks").innerHTML = compassTicks();
    lastHorizon = scenario.horizon;
    const lola = lolaForScenario(scenario);
    $("pano-lola").setAttribute("d", lola.mode === "preview" ? `M${crestPoints(lola.horizon).join(" L")}` : "");
    const marks = lola.horizon ? qualityMarks(lola.horizon) : "";
    $("pano-quality").innerHTML = marks;
    const source = scenario.horizon.source === "lola" ? "sim.horizonLola" : "sim.horizonSynthetic";
    const notes = [
      t("sim.relief", { source: t(source), exag: VERTICAL_EXAGGERATION.toFixed(1).replace(".", t("units.decimal")) }),
      lola.mode === "preview" ? t("sim.lolaPreview") : "",
      marks ? t("sim.lolaMarks") : "",
    ];
    reliefNotes = notes.filter(Boolean);
  }
  // Origen del Sol y la Tierra (UI-02, DEC-041) delante de la línea del relieve.
  const eph = scenario.ephemeris;
  const bodies = eph?.source === "horizons" ? (eph.derived ? "derived" : "real") : eph?.source === "mixed" ? "mixed" : "approx";
  const notesKey = `${bodies}|${reliefNotes.join("|")}`;
  if (full || notesKey !== lastNotesKey) {
    const [first = "", ...rest] = reliefNotes;
    $("pano-relief").innerHTML = [`${t(`sim.bodies.${bodies}`)} · ${first}`, ...rest].join("<br />");
    lastNotesKey = notesKey;
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
  $("earth-shadow").setAttribute("d", earthShadowPath(earth.phase, EARTH_R + 0.5));
  const groundSun = document.getElementById("ground-sun-grad");
  groundSun.setAttribute("cx", sx);
  groundSun.setAttribute("cy", GROUND_Y);
  $("ground-light").style.opacity = sun.visible ? low.toFixed(2) : "0";

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
