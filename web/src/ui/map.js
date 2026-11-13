/**
 * Mapa interactivo.
 *  - Vista "Polo sur": mapa de calor calculado con el modelo (% de tiempo con
 *    Sol o Tierra visible en la ventana elegida), proyección azimutal
 *    equidistante desde -90° hasta -80°. 0° arriba, 90° E a la derecha.
 *  - Vista "Global": mapa equirectangular de la Luna para sitios lejos del polo.
 * Clic en el mapa = elegir coordenadas personalizadas.
 */
import { SITES } from "../data/sites.js";
import { computePolarHeatmap } from "../lib/analysis.js";
import { coord } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { setState } from "../state.js";
import { chooseCoordinates, chooseSite } from "./setup.js";

const $ = (id) => document.getElementById(id);
const POLAR_MIN_LAT = -80;
const POLAR_SIZE = 720; // viewBox del overlay polar
const POLAR_PAD = 40; // margen para que las etiquetas del borde no se corten
const POLAR_R = POLAR_SIZE / 2 - POLAR_PAD;
const GLOBAL_W = 720;
const GLOBAL_H = 360;

const RAMPS = {
  sun: ["#1b1d3a", "#3b2d6b", "#b0456b", "#f0b35b", "#fff3c4"],
  earth: ["#0d1b2a", "#13405a", "#1f7a8c", "#5fcde0", "#e0fbff"],
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function rampColor(stops, value) {
  const x = Math.max(0, Math.min(0.9999, value)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return a.map((c, k) => Math.round(c + (b[k] - c) * f));
}

/* ---------- Proyecciones ---------- */
function polarToXY(lat, lon) {
  const r = ((90 + lat) / (90 + POLAR_MIN_LAT)) * POLAR_R;
  const a = (lon * Math.PI) / 180;
  return { x: POLAR_SIZE / 2 + r * Math.sin(a), y: POLAR_SIZE / 2 - r * Math.cos(a) };
}

function xyToPolar(x, y) {
  const dx = x - POLAR_SIZE / 2;
  const dy = y - POLAR_SIZE / 2;
  const r = Math.hypot(dx, dy) / POLAR_R;
  if (r > 1) return null;
  return { lat: -90 + r * (90 + POLAR_MIN_LAT), lon: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

function globalToXY(lat, lon) {
  return { x: ((lon + 180) / 360) * GLOBAL_W, y: ((90 - lat) / 180) * GLOBAL_H };
}

/* ---------- Mapa de calor ---------- */
let heatKey = "";
let heatTimer = 0;

function drawHeat({ values, size }, mode) {
  const canvas = $("heat-canvas");
  const ctx = canvas.getContext("2d");
  const small = document.createElement("canvas");
  small.width = size;
  small.height = size;
  const sctx = small.getContext("2d");
  const image = sctx.createImageData(size, size);
  const stops = RAMPS[mode];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < 0) continue;
    const [r, g, b] = rampColor(stops, v);
    image.data.set([r, g, b, 255], i * 4);
  }
  sctx.putImageData(image, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.beginPath();
  const pad = (POLAR_PAD / POLAR_SIZE) * canvas.width;
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - pad, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, pad, pad, canvas.width - 2 * pad, canvas.height - 2 * pad);
  ctx.restore();
}

function scheduleHeat(state) {
  const key = `${state.startMs}|${state.windowDays}|${state.heatMode}`;
  if (key === heatKey) return;
  heatKey = key;
  clearTimeout(heatTimer);
  $("map-busy").hidden = false;
  // Se espera un momento para no recalcular mientras el usuario arrastra un control.
  heatTimer = setTimeout(() => {
    const heat = computePolarHeatmap({
      startMs: state.startMs,
      windowDays: state.windowDays,
      mode: state.heatMode,
      minLat: POLAR_MIN_LAT,
      size: 128,
    });
    drawHeat(heat, state.heatMode);
    $("map-busy").hidden = true;
  }, 150);
}

/* ---------- Overlay SVG ---------- */
function pinMarkup({ x, y, label, id, selected, maxX = POLAR_SIZE }) {
  const flip = x > maxX - 140; // cerca del borde derecho, la etiqueta va a la izquierda
  const r = selected ? 12 : 8;
  const fill = selected ? "var(--earth)" : "#ffffff";
  return `
    <g class="map-pin" ${id ? `data-site="${id}" tabindex="0" role="button" aria-label="${label}"` : ""}>
      ${selected ? `<circle cx="${x}" cy="${y}" r="24" fill="var(--earth)" opacity="0.2"/>` : ""}
      <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#06080c" stroke-width="2"/>
      ${label ? `<text class="map-pin-label" x="${flip ? x - 18 : x + 18}" y="${y + 7}" text-anchor="${flip ? "end" : "start"}">${label}</text>` : ""}
    </g>`;
}

function polarOverlay(state) {
  const c = POLAR_SIZE / 2;
  let grid = "";
  for (const lat of [-88, -86, -84, -82, -80]) {
    const r = ((90 + lat) / (90 + POLAR_MIN_LAT)) * POLAR_R;
    grid += `<circle class="map-grid" cx="${c}" cy="${c}" r="${r}"/>`;
    if (lat !== -80) grid += `<text class="map-grid-label" x="${c + 4}" y="${c - r - 4}">${lat}°</text>`;
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const end = polarToXY(POLAR_MIN_LAT, lon);
    grid += `<line class="map-grid" x1="${c}" y1="${c}" x2="${end.x}" y2="${end.y}"/>`;
  }
  const labels = [
    { lon: 0, text: "0°", dx: 0, dy: -12, anchor: "middle" },
    { lon: 90, text: "90° E", dx: -10, dy: -10, anchor: "end" },
    { lon: 180, text: "180°", dx: 0, dy: 26, anchor: "middle" },
    { lon: -90, text: "90° W", dx: 10, dy: -10, anchor: "start" },
  ];
  for (const l of labels) {
    const p = polarToXY(POLAR_MIN_LAT, l.lon);
    grid += `<text class="map-grid-label" x="${p.x + l.dx}" y="${p.y + l.dy}" text-anchor="${l.anchor}">${l.text}</text>`;
  }

  const pins = SITES.filter((s) => s.lat <= POLAR_MIN_LAT)
    .map((s) => pinMarkup({ ...polarToXY(s.lat, s.lon), label: s.name, id: s.id, selected: s.id === state.siteId }))
    .join("");
  const custom =
    state.siteId === "custom" && state.lat <= POLAR_MIN_LAT
      ? pinMarkup({ ...polarToXY(state.lat, state.lon), label: t("map.customPin"), selected: true })
      : "";
  return `<g>${grid}</g>${pins}${custom}`;
}

function globalOverlay(state) {
  let grid = "";
  for (let lat = -60; lat <= 60; lat += 30) {
    const { y } = globalToXY(lat, 0);
    grid += `<line class="map-grid" x1="0" y1="${y}" x2="${GLOBAL_W}" y2="${y}"/>`;
  }
  for (let lon = -150; lon <= 150; lon += 30) {
    const { x } = globalToXY(0, lon);
    grid += `<line class="map-grid" x1="${x}" y1="0" x2="${x}" y2="${GLOBAL_H}"/>`;
  }
  // Los sitios polares quedan amontonados en esta vista: solo se rotula el elegido.
  const pins = SITES.map((s) =>
    pinMarkup({
      ...globalToXY(s.lat, s.lon),
      label: s.lat > -75 || s.id === state.siteId ? s.name : "",
      id: s.id,
      selected: s.id === state.siteId,
      maxX: GLOBAL_W,
    }),
  ).join("");
  const custom =
    state.siteId === "custom"
      ? pinMarkup({ ...globalToXY(state.lat, state.lon), label: t("map.customPin"), selected: true, maxX: GLOBAL_W })
      : "";
  return `<g>${grid}</g>${pins}${custom}`;
}

/* ---------- API ---------- */
export function initMap() {
  const overlay = $("map-overlay");

  overlay.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-site]");
    if (pin) return chooseSite(pin.dataset.site);
    const box = overlay.getBoundingClientRect();
    const isGlobal = overlay.dataset.view === "global";
    const vbW = isGlobal ? GLOBAL_W : POLAR_SIZE;
    const vbH = isGlobal ? GLOBAL_H : POLAR_SIZE;
    const x = ((event.clientX - box.left) / box.width) * vbW;
    const y = ((event.clientY - box.top) / box.height) * vbH;
    if (isGlobal) {
      chooseCoordinates(90 - (y / GLOBAL_H) * 180, (x / GLOBAL_W) * 360 - 180);
    } else {
      const p = xyToPolar(x, y);
      if (p) chooseCoordinates(p.lat, p.lon);
    }
  });

  overlay.addEventListener("keydown", (event) => {
    const pin = event.target.closest("[data-site]");
    if (pin && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      chooseSite(pin.dataset.site);
    }
  });

  document.querySelectorAll("[data-map-view]").forEach((button) =>
    button.addEventListener("click", () => setState({ mapView: button.dataset.mapView })),
  );
  document.querySelectorAll("[data-heat]").forEach((button) =>
    button.addEventListener("click", () => setState({ heatMode: button.dataset.heat })),
  );
}

export function renderMap(state) {
  const isGlobal = state.mapView === "global";
  const overlay = $("map-overlay");
  overlay.dataset.view = state.mapView;
  overlay.setAttribute("viewBox", isGlobal ? `0 0 ${GLOBAL_W} ${GLOBAL_H}` : `0 0 ${POLAR_SIZE} ${POLAR_SIZE}`);
  overlay.setAttribute("aria-label", t(isGlobal ? "map.ariaGlobal" : "map.ariaPolar"));
  overlay.innerHTML = isGlobal ? globalOverlay(state) : polarOverlay(state);

  $("map-stage").classList.toggle("is-global", isGlobal);
  $("map-title").textContent = t(isGlobal ? "map.titleGlobal" : "map.title");
  $("map-eyebrow").textContent = t(isGlobal ? "map.eyebrowGlobal" : "map.eyebrow");
  $("heat-canvas").hidden = isGlobal;
  $("global-map").hidden = !isGlobal;
  document.querySelector(".map-foot").hidden = isGlobal;
  if (isGlobal) $("map-busy").hidden = true;

  document.querySelectorAll("[data-map-view]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.mapView === state.mapView)),
  );
  document.querySelectorAll("[data-heat]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.heat === state.heatMode)),
  );
  $("heat-legend").classList.toggle("earth", state.heatMode === "earth");

  const outside = !isGlobal && state.lat > POLAR_MIN_LAT;
  $("map-hint").textContent = outside
    ? t("map.outside", { lat: coord(state.lat, "lat") })
    : t(isGlobal ? "map.hintGlobal" : `map.hintPolar.${state.heatMode}`, { days: state.windowDays });

  // En vista global no se recalcula; al volver a la polar se reutiliza el último cálculo si no cambió nada.
  if (!isGlobal) scheduleHeat(state);
}
