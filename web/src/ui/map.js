/**
 * Mapa con las tres pestañas del Figma: GLOBAL / MAPA DE CALOR / POLO SUR.
 *  - Global: mapa equirectangular (longitud -180..180, latitud 90..-90).
 *  - Mapa de calor y Polo sur: imágenes polares centradas en el polo sur,
 *    proyección azimutal equidistante hasta POLAR_EDGE_LAT, 0° arriba.
 * Clic en el mapa = elegir coordenadas ("Punto observado").
 * Botón "+" = agregar el punto observado como sitio.
 */
import { t } from "../i18n/index.js";
import { CUSTOM_ID, allSites, chooseCoordinates, chooseSite, getState, setState } from "../state.js";

const $ = (id) => document.getElementById(id);

/**
 * ⚠ Supuesto pendiente de validar por astronomía (DEC-013): las imágenes
 * polares del Figma cubren desde el polo hasta -60° de latitud.
 */
const POLAR_EDGE_LAT = -60;

const IMAGES = {
  global: "./figma/moon-global.png",
  heat: "./figma/moon-heatmap.png",
  polar: "./figma/moon-south-pole-gray.png",
};

/** lat/lon → posición relativa (0..1) dentro de la imagen, o null si queda afuera. */
function project(view, lat, lon) {
  if (view === "global") return { x: (lon + 180) / 360, y: (90 - lat) / 180 };
  const r = (90 + lat) / (90 + POLAR_EDGE_LAT);
  if (r > 1) return null;
  const a = (lon * Math.PI) / 180;
  return { x: 0.5 + 0.5 * r * Math.sin(a), y: 0.5 - 0.5 * r * Math.cos(a) };
}

function unproject(view, x, y) {
  if (view === "global") return { lat: 90 - y * 180, lon: x * 360 - 180 };
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy) * 2;
  if (r > 1) return null;
  return { lat: -90 + r * (90 + POLAR_EDGE_LAT), lon: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

function pinMarkup({ x, y, label, sub, id, current }) {
  const tag = id ? "button" : "div";
  const attrs = id ? `type="button" data-site="${id}" aria-label="${label}"` : "";
  return `
    <${tag} class="pin" ${attrs} ${current ? 'aria-current="true"' : ""} style="left:${(x * 100).toFixed(3)}%;top:${(y * 100).toFixed(3)}%">
      <span class="pin-label">${label}${sub ? `<span>${sub}</span>` : ""}</span>
      <img src="./figma/${id ? "pin-site" : "pin-observed"}.svg" alt="" width="32" height="32" />
    </${tag}>`;
}

/** Mueve la línea dorada debajo de la pestaña activa. */
export function placeAccent() {
  const active = document.querySelector('.map-tabs [aria-selected="true"]');
  const line = document.querySelector(".map-tabs-line");
  const accent = $("map-tabs-accent");
  if (!active || !line) return;
  // offsetLeft/offsetWidth no dependen del zoom aplicado al escenario.
  const tabs = active.parentElement;
  const left = tabs.offsetLeft + active.offsetLeft - line.offsetLeft;
  accent.style.width = `${active.offsetWidth}px`;
  accent.style.transform = `translateX(${left}px)`;
}

export function initMap() {
  const area = $("map-area");

  area.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-site]");
    if (pin) return chooseSite(pin.dataset.site);
    const box = $("map-image").getBoundingClientRect();
    const p = unproject(getState().mapView, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
    if (p) chooseCoordinates(p.lat, p.lon);
  });

  document.querySelectorAll("[data-map-view]").forEach((tab) =>
    tab.addEventListener("click", () => setState({ mapView: tab.dataset.mapView })),
  );

  $("add-site").addEventListener("click", () => {
    const { lat, lon, customSites, siteId } = getState();
    if (siteId !== CUSTOM_ID) return; // ya es un sitio guardado
    const n = customSites.length + 1;
    const site = { id: `custom-${n}`, name: t("map.customName", { n }), lat, lon, custom: true };
    setState({ customSites: [...customSites, site], siteId: site.id });
  });
}

export function renderMap(state) {
  const view = state.mapView;
  $("map-area").dataset.view = view;
  const img = $("map-image");
  if (img.getAttribute("src") !== IMAGES[view]) img.setAttribute("src", IMAGES[view]);
  img.alt = t(`map.alt.${view}`);

  document.querySelectorAll("[data-map-view]").forEach((tab) =>
    tab.setAttribute("aria-selected", String(tab.dataset.mapView === view)),
  );
  placeAccent();

  const pins = allSites()
    .map((site) => {
      const p = project(view, site.lat, site.lon);
      return p ? pinMarkup({ ...p, label: site.name, id: site.id, current: site.id === state.siteId }) : "";
    })
    .join("");

  const observed = state.siteId === CUSTOM_ID ? project(view, state.lat, state.lon) : null;
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

  $("map-lat").textContent = state.lat.toFixed(2);
  $("map-lon").textContent = state.lon.toFixed(2);
  $("add-site").disabled = state.siteId !== CUSTOM_ID;
}
