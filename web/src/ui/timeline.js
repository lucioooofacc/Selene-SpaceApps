/**
 * Línea de tiempo de la misión (frame "image 23" del Figma): tiempo de
 * misión, retroceder/avanzar, reproducir, velocidad y deslizador.
 */
import { DAY_MS } from "../lib/astro.js";
import { dateUTC, fromInputValue, missionTime, timeUTC, toInputValue } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { getState, setState } from "../state.js";

const $ = (id) => document.getElementById(id);
const HOUR = 3_600_000;
const RANGE_STEPS = 1000;

function moveTime(deltaMs) {
  const { startMs, windowDays, timeMs } = getState();
  setState({ timeMs: Math.max(startMs, Math.min(startMs + windowDays * DAY_MS, timeMs + deltaMs)) });
}

/* ---------- Reproducción ---------- */
let rafId = 0;
let lastFrame = 0;

function tick(now) {
  const state = getState();
  if (!state.playing) return;
  const dt = lastFrame ? Math.min(100, now - lastFrame) : 16;
  lastFrame = now;
  const end = state.startMs + state.windowDays * DAY_MS;
  let next = state.timeMs + (dt / 1000) * state.speed * HOUR;
  if (next >= end) next = state.startMs; // vuelve a empezar
  setState({ timeMs: next });
  rafId = requestAnimationFrame(tick);
}

function setPlaying(playing) {
  setState({ playing });
  cancelAnimationFrame(rafId);
  if (playing) {
    lastFrame = 0;
    rafId = requestAnimationFrame(tick);
  }
}

export function initTimeline() {
  $("play-toggle").addEventListener("click", () => setPlaying(!getState().playing));
  $("step-back").addEventListener("click", () => moveTime(-HOUR));
  $("step-forward").addEventListener("click", () => moveTime(HOUR));
  $("speed-select").addEventListener("change", (e) => setState({ speed: Number(e.target.value) }));
  $("time-range").addEventListener("input", (e) => {
    const { startMs, windowDays } = getState();
    setState({ timeMs: startMs + (Number(e.target.value) / RANGE_STEPS) * windowDays * DAY_MS });
  });
  // Ir a una fecha y hora exactas (UTC) dentro de la misión; se pausa la reproducción.
  $("time-input").addEventListener("change", (e) => {
    const ms = fromInputValue(e.target.value);
    if (ms == null) return;
    const { startMs, windowDays } = getState();
    setPlaying(false);
    setState({ timeMs: Math.max(startMs, Math.min(startMs + windowDays * DAY_MS, ms)) });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && getState().playing) setPlaying(false);
  });
}

/** Marcas bajo el deslizador: horas (00:00 … 48:00) o días si la misión es larga. */
export function renderTicks(windowDays) {
  const totalH = windowDays * 24;
  $("scrub-ticks").innerHTML = Array.from({ length: 5 }, (_, i) => {
    const h = (totalH / 4) * i;
    const label =
      windowDays <= 3
        ? `${String(Math.round(h)).padStart(2, "0")}:00`
        : `${t("units.dayShort")} ${Number.isInteger(h / 24) ? h / 24 : (h / 24).toFixed(1)}`;
    return `<span>${label}</span>`;
  }).join("");
}

/** Lo que depende del instante actual (corre en cada cuadro). */
export function renderTime(scenario, sample) {
  const f = (sample.ms - scenario.startMs) / (scenario.windowDays * DAY_MS);
  $("mission-clock").textContent = missionTime(sample.ms - scenario.startMs);
  $("scrub-date").textContent = `${dateUTC(sample.ms)} · ${timeUTC(sample.ms)} UTC`;
  if (document.activeElement !== $("time-range")) $("time-range").value = Math.round(f * RANGE_STEPS);
  const input = $("time-input");
  input.min = toInputValue(scenario.startMs);
  input.max = toInputValue(scenario.startMs + scenario.windowDays * DAY_MS);
  if (document.activeElement !== input) input.value = toInputValue(sample.ms);
  // Respuesta directa: ¿se ven el Sol y la Tierra en ese instante?
  const body = (key, b) => `<span class="${b.visible ? "is-on" : "is-off"}">${t(`sim.${key}Body`)}: ${t(b.visible ? "params.visible" : "params.hidden").toLowerCase()} (${t("sim.bodyVsRelief", { el: b.elevation.toFixed(1), hz: b.horizon.toFixed(1) })})</span>`;
  $("time-visibility").innerHTML = `${body("sun", sample.sun)} · ${body("earth", sample.earth)}`;
}

const PLAY_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';

export function renderPlayback(state) {
  const play = $("play-toggle");
  play.innerHTML = `${state.playing ? PAUSE_ICON : PLAY_ICON}${t(state.playing ? "sim.pause" : "sim.play")}`;
  play.setAttribute("aria-pressed", String(state.playing));
  $("speed-select").value = String(state.speed);
}
