/**
 * Traducciones ES/EN.
 * Todo texto visible sale de es.js / en.js (responsables: Lucio y Cata).
 *
 * Uso:
 *  - En HTML: <span data-i18n="clave"></span>, o data-i18n-attr="aria-label:clave;title:otra".
 *  - En JS: t("clave", { variable: valor }) → reemplaza {variable}.
 */
import es from "./es.js";
import en from "./en.js";

const dictionaries = { es, en };
const STORAGE_KEY = "selene.lang";
let current = "es";

function read(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function t(key, vars = {}) {
  let value = read(dictionaries[current], key) ?? read(dictionaries.es, key);
  if (typeof value !== "string") return key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export function getLang() {
  return current;
}

export function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dictionaries[saved]) return saved;
  } catch {
    /* almacenamiento bloqueado: usar idioma del navegador */
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

export function setLang(lang) {
  if (!dictionaries[lang]) return;
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* sin persistencia, no pasa nada */
  }
  applyStaticTranslations();
}

/** Traduce todos los elementos marcados con data-i18n / data-i18n-attr. */
export function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
  document.title = t("app.documentTitle");
}
