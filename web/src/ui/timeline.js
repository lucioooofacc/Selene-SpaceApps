/**
 * Línea de tiempo de la misión (reproducción, velocidad, deslizador) y
 * gráfico de "ventanas del ciclo" con las franjas de luz y de enlace.
 */
import { DAY_MS } from "../lib/astro.js";
import { dateUTC, duration, missionTime, timeUTC } from "../lib/format.js";
import { t } from "../i18n/index.js";
import { getState, setState } from "../state.js";
import { icons } from "./icons.js";

const $ = (id) => document.getElementById(id);
const HOUR = 3_600_000;
const RANGE_STEPS = 1000;

function clampTime(ms) {
  const { startMs, windowDays } = getState();
  return Math.max(startMs, Math.min(startMs + windowDays * DAY_MS, ms));
}

export function moveTime(deltaMs) {
  setState({ timeMs: clampTime(getState().timeMs + deltaMs) });
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

/* ---------- Gráfico de ventanas: arrastrar para mover el tiempo ---------- */
function timeFromPointer(event) {
  const track = $("windows-chart").querySelector(".wc-track");
  if (!track) return null;
  const box = track.getBoundingClientRect();
  const f = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
  const { startMs, windowDays } = getState();
  return startMs + f * windowDays * DAY_MS;
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

  const chart = $("windows-chart");
  let dragging = false;
  chart.addEventListener("pointerdown", (e) => {
    const ms = timeFromPointer(e);
    if (ms == null) return;
    dragging = true;
    chart.setPointerCapture(e.pointerId);
    setState({ timeMs: ms });
  });
  chart.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const ms = timeFromPointer(e);
    if (ms != null) setState({ timeMs: ms });
  });
  const stop = () => (dragging = false);
  chart.addEventListener("pointerup", stop);
  chart.addEventListener("pointercancel", stop);

  chart.addEventListener("keydown", (e) => {
    const { startMs, windowDays } = getState();
    const actions = {
      ArrowLeft: () => moveTime(-HOUR / 2),
      ArrowRight: () => moveTime(HOUR / 2),
      Home: () => setState({ timeMs: startMs }),
      End: () => setState({ timeMs: startMs + windowDays * DAY_MS }),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && getState().playing) setPlaying(false);
  });
}

function scaleLabels(windowDays) {
  const totalH = windowDays * 24;
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const h = (totalH / steps) * i;
    const label = windowDays <= 2 ? `${String(Math.round(h)).padStart(2, "0")} h` : `${t("units.dayShort")} ${(h / 24).toFixed(h % 24 ? 1 : 0)}`;
    return { pct: (i / steps) * 100, label };
  });
}

/** Redibuja las barras (solo cuando cambia el escenario o el idioma). */
export function renderWindows(scenario) {
  const { startMs, windowDays, summary } = scenario;
  const span = windowDays * DAY_MS;
  const bars = (windows, cls) =>
    windows
      .map((w) => {
        const left = ((w.start - startMs) / span) * 100;
        const width = ((w.end - w.start) / span) * 100;
        return `<span class="wc-bar ${cls}" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%" title="${dateUTC(w.start)} ${timeUTC(w.start)} → ${dateUTC(w.end)} ${timeUTC(w.end)} · ${duration((w.end - w.start) / 60000)}"></span>`;
      })
      .join("");

  $("windows-chart").innerHTML = `
    <div class="wc-scale">${scaleLabels(windowDays)
      .map((s) => `<span style="left:${s.pct}%">${s.label}</span>`)
      .join("")}</div>
    <span class="wc-label"><i class="swatch sun"></i>${t("windows.sunRow")}</span>
    <div class="wc-track">${bars(summary.lightWindows, "sun")}</div>
    <span class="wc-label"><i class="swatch earth"></i>${t("windows.linkRow")}</span>
    <div class="wc-track">${bars(summary.linkWindows, "earth")}</div>
    <span class="wc-cursor" id="wc-cursor"></span>`;

  $("windows-sub").textContent = t("windows.subtitle", {
    days: windowDays,
    light: duration(summary.sunMinutes),
    link: duration(summary.linkMinutes),
  });

  $("scrub-ticks").innerHTML = scaleLabels(windowDays)
    .map((s) => `<span>${s.label}</span>`)
    .join("");
}

/** Actualiza lo que depende del instante actual (barato, corre en cada cuadro). */
export function renderTime(scenario, sample) {
  const f = (sample.ms - scenario.startMs) / (scenario.windowDays * DAY_MS);
  $("mission-clock").textContent = missionTime(sample.ms - scenario.startMs);
  $("scrub-date").textContent = `${dateUTC(sample.ms)} · ${timeUTC(sample.ms)} UTC`;
  if (document.activeElement !== $("time-range")) $("time-range").value = Math.round(f * RANGE_STEPS);

  const chart = $("windows-chart");
  const track = chart.querySelector(".wc-track");
  const cursor = $("wc-cursor");
  if (track && cursor) {
    const offset = track.offsetLeft + f * track.offsetWidth;
    cursor.style.transform = `translateX(${offset.toFixed(1)}px)`;
  }
  chart.setAttribute("aria-valuetext", `${dateUTC(sample.ms)} ${timeUTC(sample.ms)} UTC`);
  chart.setAttribute("aria-valuenow", String(Math.round(f * 100)));
  chart.setAttribute("aria-valuemin", "0");
  chart.setAttribute("aria-valuemax", "100");
}

/** Botón de reproducción y velocidad (solo cuando cambian o cambia el idioma). */
export function renderPlayback(state) {
  const play = $("play-toggle");
  play.innerHTML = `<span class="btn-icon">${state.playing ? icons.pause : icons.play}</span>${t(
    state.playing ? "sim.pause" : "sim.play",
  )}`;
  play.setAttribute("aria-pressed", String(state.playing));
  $("speed-select").value = String(state.speed);
}
