/**
 * Traducciones ES/EN.
 * Todo texto visible sale de es.js / en.js (responsables: Lucio y Cata).
 *
 * Uso:
 *  - En HTML: <span data-i18n="clave"></span>, o data-i18n-attr="aria-label:clave;title:otra".
 *  - En JS: t("clave", { variable: valor }) → reemplaza {variable}.
 *  - {battery} y {comms} se completan siempre con los supuestos de viabilidad
 *    vigentes (horas de baterías y % mínimo de comunicación, DEC-083), y
 *    {commsRule}, {commsShort} y {commsHint} con la regla de comunicación con
 *    o sin satélite de relevo (`relayRule.*`, DEC-084).
 */
import es from "./es.js";
import en from "./en.js";
import { missionLimits } from "../lib/analysis.js";

const dictionaries = { es, en };
const STORAGE_KEY = "selene.lang";
let current = "en";

function read(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function t(key, vars = {}) {
  let value = read(dictionaries[current], key) ?? read(dictionaries.es, key);
  if (typeof value !== "string") return key;
  const { batteryHours, commsMinPct, relay } = missionLimits();
  const rule = (kind) => read(dictionaries[current], `relayRule.${kind}.${relay ? "relay" : "direct"}`) ?? "";
  // Los fragmentos van primero: pueden traer {comms}, que se completa después.
  const globals = { commsRule: rule("rule"), commsShort: rule("short"), commsHint: rule("hint"), battery: batteryHours, comms: commsMinPct };
  for (const [name, replacement] of Object.entries({ ...globals, ...vars })) {
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
    /* almacenamiento bloqueado: idioma por defecto */
  }
  // Inglés por defecto (DEC-077): el jurado de Space Apps es internacional. El español queda a un clic.
  return "en";
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
