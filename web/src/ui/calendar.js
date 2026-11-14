/**
 * Selector de rango de fechas para "Duración de misión (UTC)".
 * Replica el calendario del Figma ("image 30"): fondo blanco, extremos del
 * rango en círculos oscuros y días intermedios en gris claro.
 * Primer clic = inicio, segundo clic = fin (máximo MAX_DAYS días).
 * Teclado: flechas = ±1 día / ±1 semana, Inicio/Fin = inicio/fin de semana,
 * RePág/AvPág = ±1 mes, Enter/Espacio = elegir, Escape = cerrar.
 */
import { DAY_MS } from "../lib/astro.js";
import { getLang, t } from "../i18n/index.js";
import { getState, setState } from "../state.js";

const $ = (id) => document.getElementById(id);
export const MAX_DAYS = 30;

let viewYear = 2026;
let viewMonth = 10; // noviembre (0 = enero)
let pickStart = null; // ms UTC del día de inicio mientras se elige
let focusMs = null; // día con el foco del teclado (roving tabindex)

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
    const label = dayLabel(ms);
    cells += `<button type="button" class="${cls}" data-day="${ms}" tabindex="${ms === focusMs ? 0 : -1}" aria-label="${label}" ${
      isStart || isEnd ? 'aria-pressed="true"' : ""
    } ${tooFar ? "disabled" : ""}><span>${day}</span></button>`;
  }

  $("calendar").innerHTML = `
    <div class="cal-head">
      <button type="button" class="cal-nav" data-nav="-1" aria-label="${t("calendar.prev")}">‹</button>
      <strong>${monthName(viewYear, viewMonth)}</strong>
      <button type="button" class="cal-nav" data-nav="1" aria-label="${t("calendar.next")}">›</button>
    </div>
    <div class="cal-grid" role="group" aria-label="${monthName(viewYear, viewMonth)}">${cells}</div>
    <p class="cal-hint">${t(pickStart ? "calendar.pickEnd" : "calendar.pickStart", { max: MAX_DAYS })}</p>`;
}

function dayLabel(ms) {
  return new Intl.DateTimeFormat(getLang() === "es" ? "es-UY" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(ms);
}

/** Mantiene el día enfocado dentro del rango permitido mientras se elige el fin. */
function clampFocus(ms) {
  if (pickStart == null) return ms;
  return Math.max(pickStart, Math.min(pickStart + (MAX_DAYS - 1) * DAY_MS, ms));
}

/** Mueve el foco a un día, cambiando de mes si hace falta. */
function moveFocus(ms) {
  focusMs = clampFocus(dayStart(ms));
  const d = new Date(focusMs);
  viewYear = d.getUTCFullYear();
  viewMonth = d.getUTCMonth();
  render();
  $("calendar").querySelector(`[data-day="${focusMs}"]`)?.focus();
}

/** Un mes antes o después conservando el día (o el último día del mes). */
function shiftMonth(ms, delta) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + delta;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d.getUTCDate(), last));
}

const KEY_MOVES = {
  ArrowLeft: (ms) => ms - DAY_MS,
  ArrowRight: (ms) => ms + DAY_MS,
  ArrowUp: (ms) => ms - 7 * DAY_MS,
  ArrowDown: (ms) => ms + 7 * DAY_MS,
  Home: (ms) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS,
  End: (ms) => ms + (6 - ((new Date(ms).getUTCDay() + 6) % 7)) * DAY_MS,
  PageUp: (ms) => shiftMonth(ms, -1),
  PageDown: (ms) => shiftMonth(ms, 1),
};

function open() {
  const d = new Date(getState().startMs);
  viewYear = d.getUTCFullYear();
  viewMonth = d.getUTCMonth();
  pickStart = null;
  focusMs = dayStart(getState().startMs);
  $("calendar").hidden = false;
  $("date-button").setAttribute("aria-expanded", "true");
  render();
  $("calendar").querySelector(`[data-day="${focusMs}"]`)?.focus();
}

function close({ returnFocus = false } = {}) {
  $("calendar").hidden = true;
  $("date-button").setAttribute("aria-expanded", "false");
  pickStart = null;
  if (returnFocus) $("date-button").focus();
}

export function initCalendar() {
  $("date-button").addEventListener("click", () => ($("calendar").hidden ? open() : close()));

  $("calendar").addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      viewMonth += Number(nav.dataset.nav);
      if (viewMonth < 0) [viewMonth, viewYear] = [11, viewYear - 1];
      if (viewMonth > 11) [viewMonth, viewYear] = [0, viewYear + 1];
      focusMs = clampFocus(shiftMonth(focusMs ?? Date.UTC(viewYear, viewMonth, 1), Number(nav.dataset.nav)));
      return render();
    }
    const day = event.target.closest("[data-day]");
    if (!day || day.disabled) return;
    const ms = Number(day.dataset.day);
    if (pickStart == null) {
      pickStart = ms;
      focusMs = ms;
      render();
      $("calendar").querySelector(`[data-day="${ms}"]`)?.focus();
    } else {
      const windowDays = Math.round((ms - pickStart) / DAY_MS) + 1;
      setState({ startMs: pickStart, windowDays, timeMs: pickStart, dateChosen: true });
      // event.detail = 0 cuando se eligió con Enter/Espacio: el foco vuelve al botón.
      close({ returnFocus: event.detail === 0 });
    }
  });

  $("calendar").addEventListener("keydown", (event) => {
    const move = KEY_MOVES[event.key];
    const day = event.target.closest?.("[data-day]");
    if (!move || !day) return;
    event.preventDefault();
    moveFocus(move(Number(day.dataset.day)));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("calendar").hidden) close({ returnFocus: true });
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
