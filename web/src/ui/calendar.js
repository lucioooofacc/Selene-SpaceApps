/**
 * Selector de rango de fechas para "Duración de misión (UTC)".
 * Replica el calendario del Figma ("image 30"): fondo blanco, extremos del
 * rango en círculos oscuros y días intermedios en gris claro.
 * Primer clic = inicio, segundo clic = fin (máximo MAX_DAYS días).
 */
import { DAY_MS } from "../lib/astro.js";
import { getLang, t } from "../i18n/index.js";
import { getState, setState } from "../state.js";

const $ = (id) => document.getElementById(id);
export const MAX_DAYS = 30;

let viewYear = 2026;
let viewMonth = 10; // noviembre (0 = enero)
let pickStart = null; // ms UTC del día de inicio mientras se elige

const dayStart = (ms) => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

function monthName(year, month) {
  const name = new Intl.DateTimeFormat(getLang() === "es" ? "es-UY" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, month, 1));
  return name.charAt(0).toUpperCase() + name.slice(1).replace(" de ", " ");
}

function render() {
  const state = getState();
  const rangeStart = pickStart ?? dayStart(state.startMs);
  const rangeEnd = pickStart ? null : rangeStart + (state.windowDays - 1) * DAY_MS;

  const first = Date.UTC(viewYear, viewMonth, 1);
  const days = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const offset = (new Date(first).getUTCDay() + 6) % 7; // semana empieza el lunes

  let cells = t("calendar.dow")
    .split(",")
    .map((d) => `<span class="cal-dow">${d}</span>`)
    .join("");
  for (let i = 0; i < offset; i++) cells += "<span></span>";
  for (let day = 1; day <= days; day++) {
    const ms = Date.UTC(viewYear, viewMonth, day);
    const inRange = rangeEnd != null && ms >= rangeStart && ms <= rangeEnd;
    const isStart = ms === rangeStart;
    const isEnd = rangeEnd != null && ms === rangeEnd;
    const tooFar = pickStart != null && (ms < pickStart || ms >= pickStart + MAX_DAYS * DAY_MS);
    const cls = [
      "cal-day",
      inRange ? "in-range" : "",
      inRange && isStart ? "range-start" : "",
      inRange && isEnd ? "range-end" : "",
      isStart || isEnd ? "edge" : "",
    ].join(" ");
    cells += `<button type="button" class="${cls}" data-day="${ms}" ${tooFar ? "disabled" : ""}><span>${day}</span></button>`;
  }

  $("calendar").innerHTML = `
    <div class="cal-head">
      <button type="button" class="cal-nav" data-nav="-1" aria-label="${t("calendar.prev")}">‹</button>
      <strong>${monthName(viewYear, viewMonth)}</strong>
      <button type="button" class="cal-nav" data-nav="1" aria-label="${t("calendar.next")}">›</button>
    </div>
    <div class="cal-grid">${cells}</div>
    <p class="cal-hint">${t(pickStart ? "calendar.pickEnd" : "calendar.pickStart", { max: MAX_DAYS })}</p>`;
}

function open() {
  const d = new Date(getState().startMs);
  viewYear = d.getUTCFullYear();
  viewMonth = d.getUTCMonth();
  pickStart = null;
  $("calendar").hidden = false;
  $("date-button").setAttribute("aria-expanded", "true");
  render();
}

function close() {
  $("calendar").hidden = true;
  $("date-button").setAttribute("aria-expanded", "false");
  pickStart = null;
}

export function initCalendar() {
  $("date-button").addEventListener("click", () => ($("calendar").hidden ? open() : close()));

  $("calendar").addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      viewMonth += Number(nav.dataset.nav);
      if (viewMonth < 0) [viewMonth, viewYear] = [11, viewYear - 1];
      if (viewMonth > 11) [viewMonth, viewYear] = [0, viewYear + 1];
      return render();
    }
    const day = event.target.closest("[data-day]");
    if (!day || day.disabled) return;
    const ms = Number(day.dataset.day);
    if (pickStart == null) {
      pickStart = ms;
      render();
    } else {
      const windowDays = Math.round((ms - pickStart) / DAY_MS) + 1;
      setState({ startMs: pickStart, windowDays, timeMs: pickStart, dateChosen: true });
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("calendar").hidden) close();
  });
  document.addEventListener("click", (event) => {
    // composedPath conserva los ancestros aunque el calendario se haya redibujado en el clic.
    const inside = event.composedPath().some((el) => el.classList?.contains("params-date"));
    if (!$("calendar").hidden && !inside) close();
  });
}

/** Texto del botón: "Elegir" o el rango elegido. */
export function dateButtonLabel(state) {
  if (!state.dateChosen) return t("params.choose");
  const fmt = new Intl.DateTimeFormat(getLang() === "es" ? "es-UY" : "en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const end = state.startMs + (state.windowDays - 1) * DAY_MS;
  return `${fmt.format(state.startMs)} – ${fmt.format(end)} ${new Date(end).getUTCFullYear()}`.replace(/\./g, "");
}

export function refreshCalendar() {
  if (!$("calendar").hidden) render();
}
