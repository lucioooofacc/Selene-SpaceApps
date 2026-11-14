/**
 * Mapa con las tres pestañas del Figma: GLOBAL / MAPA DE CALOR / POLO SUR.
 *  - GLOBAL y POLO SUR: Luna en 3D (moon3d.js) o, con el selector 3D/2D,
 *    imágenes 2D del mosaico LROC de NASA SVS (DEC-021):
 *      · Global 2D: mapa equirectangular (longitud -180..180, latitud 90..-90).
 *      · Polo sur 2D: reproyección azimutal equidistante hasta POLAR_EDGE_LAT
 *        (polar2d.js), 0° arriba.
 *  - MAPA DE CALOR: elevación real de LOLA (elevation.js, DEC-026): en 2D, el
 *    polo sur con la misma proyección polar; en 3D, la Luna como mapa físico
 *    (tinte hipsométrico × sombreado). Leyenda en km; la paleta sigue la
 *    configuración (estándar o apta para daltonismo).
 *    Con el selector de capa (MAP-01, DEC-040) muestra, en 2D y hasta −80°,
 *    luz, Tierra, Sol + Tierra o viabilidad calculados por el motor (DEC-038)
 *    para el período de la misión (heat-layer.js).
 * Clic en el mapa = elegir coordenadas ("Punto observado").
 * Botón "+" = agregar el punto observado como sitio.
 */
import { t } from "../i18n/index.js";
import { CUSTOM_ID, allSites, chooseCoordinates, chooseSite, getState, setState } from "../state.js";
import { polarImage } from "./polar2d.js";
import { LOLA_MAPS, elevationCanvas, elevationUrl, paletteGradient } from "./elevation.js";
import { HEAT_MIN_LAT, cachedHeatLayer, computeHeatLayer } from "./heat-layer.js";
import { ensureHeatAtlas } from "./ephemerides.js";
import { dataStatus, onDataStatus } from "./data-status.js";
import { toast } from "./toast.js";

const $ = (id) => document.getElementById(id);

/**
 * ⚠ Supuesto pendiente de validar por astronomía (DEC-016): las imágenes
 * polares del Figma cubren desde el polo hasta -60° de latitud.
 */
const POLAR_EDGE_LAT = -60;

const NASA_COLOR = "./nasa/lroc_color_4k.jpg";

let moon3d = null; // vista 3D (se crea la primera vez que se usa)
let moon3dLoading = null;
let moon3dView = null;
let polarUrl = null; // imagen polar 2D reproyectada

const uses3d = (state) => state.mapMode === "3d";
const palette = () => (document.documentElement.dataset.palette === "cvd" ? "cvd" : "default");
const heatUrls = {}; // paleta → URL de la imagen polar coloreada

/** true si la pestaña ELEVACIÓN muestra una capa calculada (MAP-01): siempre 2D y hasta −80°. */
const calcLayer = (state) => state.mapView === "heat" && state.heatLayer !== "elevation";
/** Latitud del borde de la imagen polar: −80° en las capas calculadas, −60° en el resto. */
const edgeFor = (state) => (calcLayer(state) ? HEAT_MIN_LAT : POLAR_EDGE_LAT);

/** lat/lon → posición relativa (0..1) dentro de la imagen, o null si queda afuera. */
function project(view, lat, lon, edge = POLAR_EDGE_LAT) {
  if (view === "global") return { x: (lon + 180) / 360, y: (90 - lat) / 180 };
  const r = (90 + lat) / (90 + edge);
  if (r > 1) return null;
  const a = (lon * Math.PI) / 180;
  return { x: 0.5 + 0.5 * r * Math.sin(a), y: 0.5 - 0.5 * r * Math.cos(a) };
}

function unproject(view, x, y, edge = POLAR_EDGE_LAT) {
  if (view === "global") return { lat: 90 - y * 180, lon: x * 360 - 180 };
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy) * 2;
  if (r > 1) return null;
  return { lat: -90 + r * (90 + edge), lon: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

function pinMarkup({ x, y, lat, lon, label, sub, id, current }) {
  const tag = id ? "button" : "div";
  const attrs = id ? `type="button" data-site="${id}" aria-label="${label}"` : "";
  // data-lat/lon: en 3D, moon3d.js reubica el marcador proyectando estas coordenadas.
  return `
    <${tag} class="pin" ${attrs} data-lat="${lat}" data-lon="${lon}" ${current ? 'aria-current="true"' : ""} style="left:${(x * 100).toFixed(3)}%;top:${(y * 100).toFixed(3)}%">
      <span class="pin-label">${label}${sub ? `<span>${sub}</span>` : ""}</span>
      <img src="./figma/${id ? "pin-site" : "pin-observed"}.svg" alt="" width="32" height="32" />
    </${tag}>`;
}

/**
 * Evita que las etiquetas se pisen cerca del polo: se muestra primero la del
 * sitio elegido y se ocultan las que chocan con una ya visible (el nombre
 * sigue disponible como tooltip del marcador).
 */
function declutterLabels() {
  const pins = [...document.querySelectorAll("#map-pins .pin:not([hidden])")];
  pins.sort((a, b) => (b.getAttribute("aria-current") === "true") - (a.getAttribute("aria-current") === "true"));
  const overlaps = (r, k) => r.left < k.right && r.right > k.left && r.top < k.bottom && r.bottom > k.top;
  // Los círculos de los marcadores también son obstáculos para las etiquetas.
  const circles = pins.map((pin) => ({ pin, rect: pin.querySelector("img").getBoundingClientRect() }));
  const kept = [];
  for (const pin of pins) {
    const label = pin.querySelector(".pin-label");
    label.classList.remove("is-hidden");
    const r = label.getBoundingClientRect();
    const current = pin.getAttribute("aria-current") === "true"; // la del sitio elegido siempre se ve
    const hits =
      !current && (kept.some((k) => overlaps(r, k)) || circles.some((c) => c.pin !== pin && overlaps(r, c.rect)));
    if (hits) label.classList.add("is-hidden");
    else kept.push(r);
    pin.title = label.textContent.trim();
  }
}

/** Mueve la línea dorada debajo de la pestaña activa. */
export function placeAccent() {
  const active = document.querySelector('.map-tabs [aria-selected="true"]');
  const line = document.querySelector(".map-tabs-line");
  const accent = $("map-tabs-accent");
  if (!active || !line) return;
  // offsetLeft/offsetWidth no dependen del zoom aplicado al escenario.
  const tabs = active.parentElement;
  // La línea completa ocupa exactamente el ancho del texto de las pestañas (centrado).
  const first = tabs.firstElementChild;
  const last = tabs.lastElementChild;
  const textLeft = tabs.offsetLeft + first.offsetLeft;
  line.style.left = `${textLeft}px`;
  line.style.width = `${last.offsetLeft + last.offsetWidth - first.offsetLeft}px`;
  const left = tabs.offsetLeft + active.offsetLeft - textLeft;
  accent.style.width = `${active.offsetWidth}px`;
  accent.style.transform = `translateX(${left}px)`;
}

export function initMap() {
  const area = $("map-area");

  area.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-site]");
    if (pin) return chooseSite(pin.dataset.site);
    const box = $("map-image").getBoundingClientRect();
    const state = getState();
    const p = unproject(state.mapView, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height, edgeFor(state));
    if (p) chooseCoordinates(p.lat, p.lon);
  });

  document.querySelectorAll("[data-map-view]").forEach((tab) =>
    tab.addEventListener("click", () => setState({ mapView: tab.dataset.mapView })),
  );
  document.querySelectorAll("[data-map-mode]").forEach((button) =>
    button.addEventListener("click", () => setState({ mapMode: button.dataset.mapMode })),
  );
  document.querySelectorAll("[data-heat-layer]").forEach((button) =>
    button.addEventListener("click", () => setState({ heatLayer: button.dataset.heatLayer })),
  );
  // Si cambia la carga del atlas con una capa calculada a la vista, se actualiza el crédito.
  onDataStatus(() =>
    requestAnimationFrame(() => {
      if (calcLayer(getState())) renderMap(getState());
    }),
  );
  // La configuración avisa cuando cambia la paleta: se recolorea el mapa de calor.
  document.addEventListener("selene:palette", () => renderMap(getState()));

  initAddMenu();
}

/**
 * Menú del botón "+" (DEC-043): agrega el punto observado como sitio con el
 * nombre que elija el usuario (por defecto "Sitio propio N"). Enter confirma,
 * Escape o "Cancelar" cierran y devuelven el foco al botón.
 */
function initAddMenu() {
  const button = $("add-site");
  const menu = $("add-menu");
  const input = $("add-menu-name");

  const close = ({ focus = true } = {}) => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (focus) button.focus();
  };
  const open = () => {
    const { lat, lon, customSites, siteId } = getState();
    if (siteId !== CUSTOM_ID) return; // ya es un sitio guardado
    $("add-menu-coords").textContent = `${lat.toFixed(2)}° · ${lon.toFixed(2)}°`;
    input.value = t("map.customName", { n: customSites.length + 1 });
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    input.focus();
    input.select();
  };

  button.addEventListener("click", () => (menu.hidden ? open() : close()));
  $("add-menu-cancel").addEventListener("click", () => close());
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  });
  // Clic fuera del menú: se cierra sin mover el foco.
  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) close({ focus: false });
  });
  menu.addEventListener("submit", (event) => {
    event.preventDefault();
    const { lat, lon, customSites, siteId } = getState();
    if (siteId !== CUSTOM_ID) return close();
    const n = customSites.length + 1;
    // Los nombres se muestran con innerHTML en varias vistas: se quitan los caracteres de HTML.
    const name = input.value.replace(/[<>&"'`]/g, "").trim() || t("map.customName", { n });
    // id único aunque se repitan nombres.
    const site = { id: `custom-${Date.now().toString(36)}`, name, lat, lon, custom: true };
    setState({ customSites: [...customSites, site], siteId: site.id });
    close();
    toast(t("map.addDone", { name }));
  });
}

/** Al girar la Luna, las etiquetas se reordenan cuando el movimiento se detiene. */
let declutterTimer = 0;
function declutterSoon() {
  clearTimeout(declutterTimer);
  declutterTimer = setTimeout(declutterLabels, 120);
}

/** Crea la vista 3D la primera vez (three.js se carga recién ahí). */
function ensureMoon3d() {
  if (moon3d || moon3dLoading) return moon3dLoading;
  const area = $("map-area");
  area.dataset.loading = "true";
  moon3dLoading = import("./moon3d.js")
    .then(({ createMoon3D }) =>
      createMoon3D(area, {
        onPick: (lat, lon) => chooseCoordinates(lat, lon),
        onMove: declutterSoon,
        onReady: () => delete area.dataset.loading,
      }),
    )
    .then((instance) => {
      moon3d = instance;
      renderMap(getState());
    })
    .catch(() => {
      // Sin WebGL: se vuelve a la vista 2D y se avisa.
      delete area.dataset.loading;
      area.dataset.error = "true";
      setState({ mapMode: "2d" });
    });
  return moon3dLoading;
}

/** Leyenda de una capa calculada: % del tiempo (0–100) o puntos de viabilidad (0–6). */
function renderCalcLegend(layer) {
  const legend = $("map-legend");
  const [min, max] = layer === "viability" ? [t("map.layerUnit.points", { n: 0 }), t("map.layerUnit.points", { n: 6 })] : ["0 %", "100 %"];
  legend.innerHTML = `
    <span class="map-legend-title">${t(`map.layerLegend.${layer}`)}</span>
    <span class="map-legend-bar" style="background:${paletteGradient(palette())}"></span>
    <span class="map-legend-max">${max}</span>
    <span class="map-legend-min">${min}</span>`;
  legend.setAttribute("aria-label", t("map.layerLegendAria", { name: t(`map.layerLegend.${layer}`), min, max }));
}

/** Leyenda de elevación (solo en MAPA DE CALOR): 2D usa el rango polar y 3D, el global. */
function renderLegend(view, is3d, state) {
  const legend = $("map-legend");
  legend.hidden = view !== "heat";
  if (legend.hidden) return;
  if (calcLayer(state)) return renderCalcLegend(state.heatLayer);
  const { minKm, maxKm } = is3d ? LOLA_MAPS.global : LOLA_MAPS.polar;
  const km = (v) => `${v > 0 ? "+" : ""}${v.toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-UY")}`;
  legend.innerHTML = `
    <span class="map-legend-title">${t("map.legendTitle")}</span>
    <span class="map-legend-bar" style="background:${paletteGradient(palette())}"></span>
    <span class="map-legend-max">${km(maxKm)}</span>
    <span class="map-legend-min">${km(minKm)}</span>`;
  legend.setAttribute("aria-label", t("map.legendAria", { min: km(minKm), max: km(maxKm) }));
}

let heatPending = null; // clave del cálculo programado

/**
 * Imagen de la capa calculada. Si no está en caché, muestra "Calculando…" y la
 * calcula en el próximo turno (bloquea 0,2–1 s el hilo principal; PERF-01).
 */
function calcImage(state) {
  const p = palette();
  const { heatLayer, startMs, windowDays } = state;
  const hit = cachedHeatLayer(heatLayer, startMs, windowDays, p);
  if (hit) return hit;
  const key = `${heatLayer}|${startMs}|${windowDays}|${p}`;
  if (heatPending !== key) {
    heatPending = key;
    $("map-area").dataset.loading = "true";
    setTimeout(() => {
      heatPending = null;
      const now = getState();
      delete $("map-area").dataset.loading;
      if (!calcLayer(now)) return;
      computeHeatLayer(now.heatLayer, now.startMs, now.windowDays, palette());
      renderMap(now);
    }, 30);
  }
  return null;
}

/** Crédito de la capa calculada: procedencia, resolución y estado de carga del atlas. */
function calcCredit(result) {
  if (!result) return t("map.layerCredit.computing");
  if (result.source?.kind === "real") {
    const num = (v) => v.toLocaleString(document.documentElement.lang === "en" ? "en-US" : "es-UY");
    return t("map.layerCredit.real", { km: num(result.source.cellKm), step: num(result.source.stepMinutes / 60) });
  }
  const atlas = dataStatus().heatAtlas.state;
  return t(atlas === "loading" ? "map.layerCredit.loading" : atlas === "error" ? "map.layerCredit.error" : "map.layerCredit.approximate");
}

/** Imagen 2D de cada pestaña. La polar se genera una vez desde el mosaico LROC. */
function image2d(view, state) {
  if (calcLayer(state)) return calcImage(state)?.url ?? null;
  if (view === "heat") {
    const p = palette();
    if (heatUrls[p]) return heatUrls[p];
    $("map-area").dataset.loading = "true";
    elevationUrl("polar", p).then((url) => {
      heatUrls[p] = url;
      delete $("map-area").dataset.loading;
      renderMap(getState());
    });
    return null;
  }
  if (view === "global") return NASA_COLOR;
  if (polarUrl) return polarUrl;
  $("map-area").dataset.loading = "true";
  polarImage(NASA_COLOR, POLAR_EDGE_LAT).then((url) => {
    polarUrl = url;
    delete $("map-area").dataset.loading;
    renderMap(getState());
  });
  return null;
}

export function renderMap(state) {
  const view = state.mapView;
  const area = $("map-area");
  const calc = calcLayer(state);
  const is3d = uses3d(state) && !calc;
  const edge = edgeFor(state);
  if (calc) ensureHeatAtlas(); // ~0,8 MB, una vez; al llegar cambia realDataVersion() y se recalcula
  area.dataset.view = view;
  area.dataset.mode = is3d ? "3d" : "2d";
  area.dataset.layer = calc ? "calc" : "base";
  // En 3D el contenedor recibe el foco para girar con las flechas.
  if (is3d) {
    area.tabIndex = 0;
    area.setAttribute("role", "application");
    area.setAttribute("aria-label", t("map.aria3d"));
  } else {
    area.removeAttribute("tabindex");
    area.removeAttribute("role");
    area.removeAttribute("aria-label");
  }
  document.querySelectorAll("[data-map-mode]").forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.mapMode === state.mapMode)),
  );
  // Las capas calculadas son solo 2D: el selector 3D/2D se oculta mientras se ven.
  $("map-mode").hidden = calc;
  $("heat-layers").hidden = view !== "heat";
  document.querySelectorAll("[data-heat-layer]").forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.heatLayer === state.heatLayer)),
  );
  renderLegend(view, is3d, state);

  const img = $("map-image");
  if (!is3d) {
    const src = image2d(view, state);
    if (src && img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.alt = t(calc ? `map.layerAlt.${state.heatLayer}` : `map.alt.${view}`);
  } else if (moon3d) {
    if (moon3dView !== view) moon3d.setView(view);
    moon3dView = view;
    if (view === "heat") {
      const p = palette();
      elevationCanvas("global", p).then((canvas) => {
        // Solo si el usuario sigue en MAPA DE CALOR 3D con la misma paleta.
        const now = getState();
        if (now.mapView === "heat" && uses3d(now) && palette() === p) moon3d.setSurface("physical", canvas);
      });
    } else moon3d.setSurface("color");
  } else {
    ensureMoon3d();
  }

  document.querySelectorAll("[data-map-view]").forEach((tab) =>
    tab.setAttribute("aria-selected", String(tab.dataset.mapView === view)),
  );
  placeAccent();
  // El crédito va después de pedir la imagen: así refleja la capa ya calculada.
  $("map-credit").hidden = false;
  $("map-credit").textContent = calc
    ? calcCredit(cachedHeatLayer(state.heatLayer, state.startMs, state.windowDays, palette()))
    : t(view === "heat" ? "map.creditHeat" : "map.credit");

  const pins = allSites()
    .map((site) => {
      const p = project(view, site.lat, site.lon, edge);
      // En 3D se marcan todos los sitios (los de atrás quedan ocultos al girar).
      const at = p ?? (is3d ? { x: 0, y: 0 } : null);
      return at
        ? pinMarkup({ ...at, lat: site.lat, lon: site.lon, label: site.name, id: site.id, current: site.id === state.siteId })
        : "";
    })
    .join("");

  const observedAt = state.siteId === CUSTOM_ID ? project(view, state.lat, state.lon, edge) ?? (is3d ? { x: 0, y: 0 } : null) : null;
  const observed = observedAt && { ...observedAt, lat: state.lat, lon: state.lon };
  $("map-pins").innerHTML =
    pins +
    (observed
      ? pinMarkup({
          ...observed,
          label: t("map.observed"),
          sub: `(${state.lat.toFixed(2)} · ${state.lon.toFixed(2)})`,
          current: true,
        })
      : "");

  if (is3d && moon3d) moon3d.refreshPins();
  // En 3D los marcadores se ubican en el próximo cuadro; recién ahí se ordenan las etiquetas.
  if (is3d) requestAnimationFrame(() => requestAnimationFrame(declutterLabels));
  else declutterLabels();

  $("map-lat").textContent = state.lat.toFixed(2);
  $("map-lon").textContent = state.lon.toFixed(2);
  $("add-site").disabled = state.siteId !== CUSTOM_ID;
}
