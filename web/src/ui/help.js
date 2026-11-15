/**
 * Ayuda para quien no conoce el proyecto (UI-16, DEC-066):
 *
 * - Ayuda por tarjeta: cada botón «?» (`data-help="<tema>"`) abre una
 *   explicación corta de esa zona (qué muestra y cómo se lee). Un solo panel
 *   a la vez; se cierra con Escape, con su botón o haciendo clic afuera.
 * - Recorrido guiado: resalta las zonas en el orden de uso y muestra la
 *   misma explicación paso a paso. Se abre solo la primera vez (se recuerda
 *   en localStorage) y se repite desde «Guía» en el menú.
 *
 * Cada página pasa sus temas a `initHelp()` (la principal usa los de
 * abajo; comparar e informe, los suyos). Los textos viven en i18n
 * (`help.*`). Este módulo no calcula nada.
 * Todo se ubica dentro de `#stage`, en píxeles del diseño (el stage se
 * escala con `zoom`), así que no depende del ancho de la ventana.
 */
import { t } from "../i18n/index.js";

/** Temas de la página principal en el orden del recorrido, con la zona que resalta cada uno. */
export const MAIN_TOPICS = Object.freeze([
  { id: "params", target: ".params" },
  { id: "map", target: ".map-card" },
  { id: "places", target: ".places" },
  { id: "panorama", target: ".behavior-left" },
  { id: "status", target: ".behavior-right" },
  { id: "viability", target: "#period-card" },
]);

let TOPICS = MAIN_TOPICS;
let TOUR_KEY = "selene-tour-seen";
let WELCOME = "help.tour"; // claves `<WELCOME>.welcomeTitle` y `<WELCOME>.welcome`
const MAX_ITEMS = 8;

const stage = () => document.getElementById("stage");
const zoom = () => Number(stage().style.zoom) || 1;

/** Rectángulo de un elemento en píxeles del diseño, relativo al stage. */
function rectIn(el) {
  const z = zoom();
  const s = stage().getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { left: (r.left - s.left) / z, top: (r.top - s.top) / z, width: r.width / z, height: r.height / z };
}

/** Puntos de la explicación: `help.<tema>.items.1…n` (los que existan). */
function items(id) {
  const out = [];
  for (let k = 1; k <= MAX_ITEMS; k++) {
    const key = `help.${id}.items.${k}`;
    const text = t(key);
    if (text === key) break;
    out.push(text);
  }
  return out;
}

const body = (id) => `
  <p class="help-intro">${t(`help.${id}.intro`)}</p>
  <ul class="help-items">${items(id).map((text) => `<li>${text}</li>`).join("")}</ul>`;

// ---------------------------------------------------------------------------
// Ayuda por tarjeta
// ---------------------------------------------------------------------------

let pop = null;
let popButton = null;

function closeHelp({ focus = true } = {}) {
  if (!pop) return;
  pop.remove();
  pop = null;
  popButton?.setAttribute("aria-expanded", "false");
  if (focus) popButton?.focus();
  popButton = null;
}

function openHelp(button) {
  const id = button.dataset.help;
  if (popButton === button) return closeHelp();
  closeHelp({ focus: false });
  popButton = button;
  button.setAttribute("aria-expanded", "true");
  pop = document.createElement("div");
  pop.className = "help-pop";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-labelledby", "help-pop-title");
  pop.innerHTML = `
    <div class="help-head">
      <h3 id="help-pop-title">${t(`help.${id}.title`)}</h3>
      <button type="button" class="help-close" aria-label="${t("help.close")}">×</button>
    </div>
    ${body(id)}`;
  stage().append(pop);
  // Debajo del botón, alineado a su borde derecho y sin salirse del stage.
  const b = rectIn(button);
  const width = pop.offsetWidth;
  const stageWidth = stage().offsetWidth;
  const left = Math.min(Math.max(16, b.left + b.width - width), stageWidth - width - 16);
  pop.style.left = `${left}px`;
  pop.style.top = `${b.top + b.height + 8}px`;
  pop.querySelector(".help-close").addEventListener("click", () => closeHelp());
  pop.querySelector(".help-close").focus();
}

// ---------------------------------------------------------------------------
// Recorrido guiado
// ---------------------------------------------------------------------------

let tour = null; // { step, ring, card, returnFocus }

function seen() {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return true; // sin almacenamiento no se puede recordar: no se abre solo
  }
}

function markSeen() {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* sin persistencia */
  }
}

function endTour() {
  if (!tour) return;
  tour.ring.remove();
  tour.card.remove();
  tour.returnFocus?.focus();
  tour = null;
  markSeen();
}

function showStep(step) {
  tour.step = step;
  const total = TOPICS.length + 1; // paso 0: bienvenida
  const topic = step === 0 ? null : TOPICS[step - 1];
  const { ring, card } = tour;
  const last = step === total - 1;
  card.innerHTML = `
    <p class="help-step">${t("help.tour.step", { n: step + 1, total })}</p>
    <h3 id="help-tour-title">${topic ? t(`help.${topic.id}.title`) : t(`${WELCOME}.welcomeTitle`)}</h3>
    ${topic ? body(topic.id) : `<p class="help-intro">${t(`${WELCOME}.welcome`)}</p>`}
    <div class="help-actions">
      <button type="button" class="help-skip" data-tour="skip">${t("help.tour.skip")}</button>
      <span>
        ${step > 0 ? `<button type="button" class="help-prev" data-tour="prev">${t("help.tour.prev")}</button>` : ""}
        <button type="button" class="help-next" data-tour="${last ? "skip" : "next"}">${t(last ? "help.tour.done" : "help.tour.next")}</button>
      </span>
    </div>`;
  const stageWidth = stage().offsetWidth;
  const width = card.offsetWidth;
  if (!topic) {
    ring.hidden = true;
    card.style.left = `${(stageWidth - width) / 2}px`;
    card.style.top = "220px";
  } else {
    // Si la zona está oculta (sección inferior sin sitio ni fechas), se resalta la sección que la contiene.
    const target = document.querySelector(topic.target);
    const r = rectIn(target.offsetWidth ? target : target.closest("section") ?? target);
    ring.hidden = false;
    Object.assign(ring.style, { left: `${r.left - 8}px`, top: `${r.top - 8}px`, width: `${r.width + 16}px`, height: `${r.height + 16}px` });
    // A la derecha de la zona si entra; si no, a la izquierda; si tampoco, encima de su borde derecho.
    const right = r.left + r.width + 24;
    const leftSide = r.left - width - 24;
    const left = right + width <= stageWidth - 16 ? right : leftSide >= 16 ? leftSide : r.left + r.width - width - 24;
    card.style.left = `${left}px`;
    card.style.top = `${r.top + 24}px`;
  }
  const reduced = document.documentElement.dataset.motion === "reduced";
  (topic ? ring : card).scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  card.querySelector(".help-next").focus();
}

/** Abre el recorrido desde el primer paso. */
export function startTour() {
  if (tour) return;
  closeHelp({ focus: false });
  const ring = document.createElement("div");
  ring.className = "help-ring";
  ring.setAttribute("aria-hidden", "true");
  const card = document.createElement("div");
  card.className = "help-pop help-tour";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "help-tour-title");
  stage().append(ring, card);
  tour = { step: 0, ring, card, returnFocus: document.activeElement };
  card.addEventListener("click", (event) => {
    const action = event.target.closest("[data-tour]")?.dataset.tour;
    if (action === "skip") endTour();
    else if (action === "next") showStep(tour.step + 1);
    else if (action === "prev") showStep(tour.step - 1);
  });
  showStep(0);
}

/**
 * Conecta los botones «?», el enlace «Guía» y el teclado. Con `autoStart`,
 * abre el recorrido la primera vez que se entra a la página.
 */
export function initHelp({ autoStart = false, topics = MAIN_TOPICS, tourKey = "selene-tour-seen", welcome = "help.tour" } = {}) {
  TOPICS = topics;
  TOUR_KEY = tourKey;
  WELCOME = welcome;
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-help]");
    if (button) return openHelp(button);
    if (event.target.closest("#tour-button")) return startTour();
    if (pop && !event.target.closest(".help-pop")) closeHelp({ focus: false });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (tour) endTour();
    else closeHelp();
  });
  if (autoStart && !seen()) startTour();
}

/** Tras cambiar de idioma: vuelve a escribir lo que esté abierto. */
export function refreshHelp() {
  if (tour) showStep(tour.step);
  else if (pop) closeHelp({ focus: false });
}
