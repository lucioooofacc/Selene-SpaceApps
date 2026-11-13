/** Panel de configuración: sitio, coordenadas, fecha de inicio y ventana. */
import { CUSTOM_SITE_ID, SITES, findSite } from "../data/sites.js";
import { SYNODIC_MONTH, DAY_MS } from "../lib/astro.js";
import { fromInputValue, toInputValue } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { getState, setState } from "../state.js";

const $ = (id) => document.getElementById(id);

export function chooseSite(id) {
  const site = findSite(id);
  if (!site) return;
  setState({ siteId: id, lat: site.lat, lon: site.lon });
}

export function chooseCoordinates(lat, lon) {
  setState({
    siteId: CUSTOM_SITE_ID,
    lat: Math.max(-90, Math.min(90, Number(lat.toFixed(2)))),
    lon: Math.max(-180, Math.min(180, Number(lon.toFixed(2)))),
  });
}

/** Cambia el inicio manteniendo el mismo tiempo de misión transcurrido. */
function setStart(startMs) {
  const { startMs: oldStart, timeMs } = getState();
  setState({ startMs, timeMs: startMs + (timeMs - oldStart) });
}

export function initSetup() {
  const select = $("site-select");
  const chips = $("site-chips");

  chips.innerHTML = SITES.map(
    (site) => `<button type="button" data-site="${site.id}" aria-pressed="false">${site.name}</button>`,
  ).join("");

  select.addEventListener("change", () => {
    if (select.value !== CUSTOM_SITE_ID) chooseSite(select.value);
    else setState({ siteId: CUSTOM_SITE_ID });
  });

  chips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-site]");
    if (button) chooseSite(button.dataset.site);
  });

  const onCoord = () => {
    const lat = Number($("lat-input").value);
    const lon = Number($("lon-input").value);
    if (Number.isFinite(lat) && Number.isFinite(lon)) chooseCoordinates(lat, lon);
  };
  $("lat-input").addEventListener("change", onCoord);
  $("lon-input").addEventListener("change", onCoord);

  $("start-input").addEventListener("change", (event) => {
    const ms = fromInputValue(event.target.value);
    if (ms != null) setStart(ms);
  });

  document.querySelectorAll("[data-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      const days = Number(button.dataset.shift) * SYNODIC_MONTH;
      setStart(Math.round(getState().startMs + days * DAY_MS));
    });
  });

  $("window-input").addEventListener("input", (event) => {
    const windowDays = Number(event.target.value);
    const { startMs, timeMs } = getState();
    const maxTime = startMs + windowDays * DAY_MS;
    setState({ windowDays, timeMs: Math.min(timeMs, maxTime) });
  });
}

export function renderSetup(state) {
  const select = $("site-select");
  select.innerHTML =
    `<option value="${CUSTOM_SITE_ID}">${t("setup.custom")}</option>` +
    SITES.map((site) => `<option value="${site.id}">${site.name} · ${site.agency}</option>`).join("");
  select.value = state.siteId;

  document.querySelectorAll("#site-chips [data-site]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.site === state.siteId));
  });

  const site = findSite(state.siteId);
  $("site-note").innerHTML = site
    ? `<strong>${site.agency}</strong> · ${t(site.noteKey)}`
    : t("setup.customNote");

  if (document.activeElement !== $("lat-input")) $("lat-input").value = state.lat;
  if (document.activeElement !== $("lon-input")) $("lon-input").value = state.lon;
  if (document.activeElement !== $("start-input")) $("start-input").value = toInputValue(state.startMs);
  $("window-input").value = state.windowDays;
  $("window-output").textContent = t("setup.days", { n: state.windowDays });
}
