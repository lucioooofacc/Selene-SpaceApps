/**
 * Modal de configuración (botón del engranaje, UI-10, DEC-023).
 * Compartido por la página de misión y la de comparación.
 *
 * Opciones (se aplican al instante y se recuerdan en este navegador):
 *  - Idioma: español / inglés.
 *  - Colores: estándar o apta para daltonismo (verde/rojo → azul/naranja,
 *    paleta de Okabe e Ito). Se aplica con `data-palette` en <html>.
 *  - Alto contraste: textos secundarios y bordes más claros (`data-contrast`).
 *  - Reducir movimiento: sin transiciones (`data-motion`); por defecto sigue
 *    la preferencia del sistema operativo.
 *  - Vista del mapa en GLOBAL y POLO SUR: 3D o 2D (solo página de misión).
 *
 * El almacenamiento es solo una comodidad: si el navegador lo bloquea, la
 * página funciona con los valores por defecto.
 */
import { getLang, setLang, t } from "../i18n/index.js";

const STORAGE_KEY = "selene.settings";

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function defaultSettings() {
  return { palette: "default", contrast: false, motion: prefersReducedMotion(), mapMode: "3d" };
}

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function write(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* sin persistencia: las opciones duran hasta recargar */
  }
}

let settings = { ...defaultSettings(), ...read() };

export function getSettings() {
  return settings;
}

/** Aplica las opciones visuales al documento. */
function applyToDocument() {
  const root = document.documentElement;
  root.dataset.palette = settings.palette === "cvd" ? "cvd" : "default";
  root.dataset.contrast = settings.contrast ? "high" : "normal";
  root.dataset.motion = settings.motion ? "reduced" : "full";
}

/** Se llama al iniciar cada página, antes del primer dibujo. */
export function applySettings() {
  applyToDocument();
}

const radio = (name, value, current, labelKey) => `
  <label class="settings-choice">
    <input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""} />
    <span>${t(labelKey)}</span>
  </label>`;

const toggle = (name, checked, labelKey, hintKey) => `
  <label class="settings-toggle">
    <input type="checkbox" name="${name}" ${checked ? "checked" : ""} />
    <span>
      <strong>${t(labelKey)}</strong>
      <small>${t(hintKey)}</small>
    </span>
  </label>`;

function render(dialog, { showMapMode }) {
  dialog.setAttribute("aria-labelledby", "settings-title");
  dialog.innerHTML = `
    <form method="dialog" class="settings-form">
      <header class="settings-head">
        <h2 id="settings-title">${t("settings.title")}</h2>
        <button type="submit" class="settings-close" value="close" aria-label="${t("settings.close")}">×</button>
      </header>

      <fieldset>
        <legend>${t("settings.language")}</legend>
        <div class="settings-row">
          ${radio("lang", "es", getLang(), "settings.lang.es")}
          ${radio("lang", "en", getLang(), "settings.lang.en")}
        </div>
      </fieldset>

      <fieldset>
        <legend>${t("settings.palette")}</legend>
        <div class="settings-row">
          ${radio("palette", "default", settings.palette, "settings.paletteDefault")}
          ${radio("palette", "cvd", settings.palette, "settings.paletteCvd")}
        </div>
        <p class="settings-hint">${t("settings.paletteHint")}</p>
        <div class="settings-swatches" aria-hidden="true">
          <span class="sw-good"></span><span class="sw-bad"></span>
          <em>${t("settings.preview")}</em>
        </div>
      </fieldset>

      <fieldset>
        <legend>${t("settings.accessibility")}</legend>
        ${toggle("contrast", settings.contrast, "settings.contrast", "settings.contrastHint")}
        ${toggle("motion", settings.motion, "settings.motion", "settings.motionHint")}
      </fieldset>

      ${
        showMapMode
          ? `<fieldset>
        <legend>${t("settings.mapMode")}</legend>
        <div class="settings-row">
          ${radio("mapMode", "3d", settings.mapMode, "settings.map3d")}
          ${radio("mapMode", "2d", settings.mapMode, "settings.map2d")}
        </div>
      </fieldset>`
          : ""
      }

      <footer class="settings-foot">
        <button type="button" class="settings-reset" data-reset>${t("settings.reset")}</button>
        <button type="submit" class="settings-done" value="close">${t("settings.done")}</button>
      </footer>
    </form>`;
}

/**
 * Conecta el botón del engranaje.
 * @param {{onLanguage:()=>void, onMapMode?:(mode:"3d"|"2d")=>void}} hooks
 *   onLanguage: redibuja la página tras cambiar el idioma.
 *   onMapMode: si existe, la página tiene mapa y se muestra esa opción.
 */
export function initSettings({ onLanguage, onMapMode }) {
  const button = document.getElementById("settings-button");
  const dialog = document.createElement("dialog");
  dialog.className = "settings";
  dialog.id = "settings";
  document.body.append(dialog);
  const showMapMode = typeof onMapMode === "function";

  const update = (patch) => {
    settings = { ...settings, ...patch };
    write(settings);
    applyToDocument();
  };

  dialog.addEventListener("change", (event) => {
    const { name, value, checked } = event.target;
    if (name === "lang") {
      setLang(value);
      onLanguage();
      render(dialog, { showMapMode }); // el propio modal también cambia de idioma
      dialog.querySelector('input[name="lang"]:checked')?.focus();
    } else if (name === "palette") update({ palette: value });
    else if (name === "contrast" || name === "motion") update({ [name]: checked });
    else if (name === "mapMode") {
      update({ mapMode: value });
      onMapMode?.(value);
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-reset]")) {
      settings = defaultSettings();
      write(settings);
      applyToDocument();
      onMapMode?.(settings.mapMode);
      render(dialog, { showMapMode });
      return;
    }
    // Clic en el fondo (fuera del formulario) = cerrar.
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => button.focus());

  button.setAttribute("aria-haspopup", "dialog");
  button.addEventListener("click", () => {
    render(dialog, { showMapMode });
    dialog.showModal();
  });
}
