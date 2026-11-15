/** Formateo de números, fechas y duraciones según el idioma activo. */
import { getLang, t } from "../i18n/index.js";

const locale = () => (getLang() === "es" ? "es-UY" : "en-US");

export function deg(value, { sign = true, digits = 1 } = {}) {
  const fixed = value.toFixed(digits);
  return `${sign && value >= 0 ? "+" : ""}${fixed}°`;
}

/**
 * Porcentaje con el formato del idioma: "82 %" y coma decimal en español
 * (norma de la RAE), "82%" y punto decimal en inglés (`units.percent`).
 */
export function pct(value, digits = 0) {
  const n = new Intl.NumberFormat(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return t("units.percent", { n });
}

/** Duración en minutos → "3 d 4 h", "5 h 20 min", "45 min". */
export function duration(minutes) {
  const m = Math.max(0, Math.round(minutes));
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  if (days > 0) return `${days} ${t("units.d")} ${hours} ${t("units.h")}`;
  if (hours > 0) return mins ? `${hours} ${t("units.h")} ${mins} ${t("units.min")}` : `${hours} ${t("units.h")}`;
  return `${mins} ${t("units.min")}`;
}

const pad = (n) => String(n).padStart(2, "0");

/** Rango corto y localizado en UTC: "10 – 19 nov 2027" / "Nov 10 – 19, 2027". */
export function rangeUTC(a, b) {
  const f = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  // Igual que dateUTC(): sin puntos y, en español, sin los "de".
  return f.formatRange(a, b).replace(/\./g, "").replace(/ de /g, " ");
}

/** "14 nov 2026" en UTC. */
export function dateUTC(ms) {
  return new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(ms)
    .replace(/\./g, "");
}

export function timeUTC(ms) {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Tiempo de misión desde el inicio: "T+15:30" o "T+2 d 03:30". */
export function missionTime(elapsedMs) {
  const totalMin = Math.max(0, Math.round(elapsedMs / 60_000));
  const days = Math.floor(totalMin / 1440);
  const hh = pad(Math.floor((totalMin % 1440) / 60));
  const mm = pad(totalMin % 60);
  return days > 0 ? `T+${days} ${t("units.d")} ${hh}:${mm}` : `T+${hh}:${mm}`;
}

/** Valor para <input type="datetime-local"> en UTC. */
export function toInputValue(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function fromInputValue(value) {
  const ms = Date.parse(`${value}:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function coord(value, axis) {
  const hemi = axis === "lat" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  return `${Math.abs(value).toFixed(2)}° ${t(`units.${hemi}`)}`;
}
