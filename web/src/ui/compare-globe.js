/**
 * Vista 3D de la comparación (DEC-054): la misma Luna 3D de la misión
 * (moon3d.js) en vista normal, centrada en el punto medio entre los dos
 * sitios, con sus marcadores (A dorado, B celeste) y el arco del camino más
 * corto por la superficie. Al lado, datos para leerla: distancia, diferencias
 * de coordenadas y cuánto ven el Sol y la Tierra.
 * La geometría sale de lib/geo.js; esta vista solo presenta.
 */
import { centralAngle, greatCirclePoints, midpoint, surfaceDistanceKm } from "../lib/geo.js";
import { coord, pct } from "../lib/format.js";
import { getLang, t } from "../i18n/index.js";

const $ = (id) => document.getElementById(id);
const ARC_POINTS = 48;

let globe = null;
let loading = null;
let centeredKey = "";
let current = null;

const num = (v, digits = 0) => v.toLocaleString(getLang() === "en" ? "en-US" : "es-UY", { maximumFractionDigits: digits, minimumFractionDigits: digits });

function pinsHtml(a, b, names) {
  const dots = greatCirclePoints(a, b, ARC_POINTS)
    .slice(1, -1)
    .map((p) => `<span class="pin cmp-arc-dot" data-lat="${p.lat}" data-lon="${p.lon}" aria-hidden="true"></span>`)
    .join("");
  const marker = (slot, site) => `
    <div class="pin cmp-globe-pin cmp-globe-pin-${slot}" data-lat="${site.lat}" data-lon="${site.lon}">
      <span class="pin-label">${slot.toUpperCase()} · ${names[slot]}</span>
      <img src="./figma/pin-site.svg" alt="" width="32" height="32" />
    </div>`;
  return dots + marker("a", a) + marker("b", b);
}

function infoHtml(a, b, scA, scB, names) {
  const km = surfaceDistanceKm(a, b);
  const angle = (centralAngle(a, b) * 180) / Math.PI;
  const both = (fa, fb) =>
    `<span class="cmp-globe-a">${names.a}: ${fa}</span><span class="cmp-globe-b">${names.b}: ${fb}</span>`;
  return `
    <dl class="cmp-globe-facts">
      <div class="cmp-globe-big"><dt>${t("compare.globe.distance")}</dt><dd>${t("compare.globe.distanceValue", { km: num(km), deg: num(angle, 1) })}</dd></div>
      <div><dt>${t("compare.globe.coords")}</dt><dd>${both(`${coord(a.lat, "lat")} · ${coord(a.lon, "lon")}`, `${coord(b.lat, "lat")} · ${coord(b.lon, "lon")}`)}</dd></div>
      <div><dt>${t("compare.globe.deltas")}</dt><dd>${t("compare.globe.deltasValue", { lat: num(Math.abs(a.lat - b.lat), 2), lon: num(Math.abs(((b.lon - a.lon + 540) % 360) - 180), 2) })}</dd></div>
      <div><dt>${t("compare.globe.light")}</dt><dd>${both(pct(scA.summary.illumination), pct(scB.summary.illumination))}</dd></div>
      <div><dt>${t("compare.globe.earth")}</dt><dd>${both(pct(scA.summary.communication), pct(scB.summary.communication))}</dd></div>
    </dl>
    <p class="cmp-hint">${t("compare.globe.hint")}</p>`;
}

/** Centra la vista en el punto medio solo cuando cambian los sitios (respeta lo que el usuario giró). */
function applyView() {
  if (!globe || !current) return;
  const { a, b } = current;
  const key = `${a.lat},${a.lon}|${b.lat},${b.lon}`;
  if (key !== centeredKey) {
    const m = midpoint(a, b);
    globe.setView("compare");
    globe.centerOn(m.lat, m.lon);
    centeredKey = key;
  }
  globe.refreshPins();
}

export function renderCompareGlobe({ a, b, scA, scB, names }) {
  current = { a, b };
  $("cmp-globe-pins").innerHTML = pinsHtml(a, b, names);
  $("cmp-globe-info").innerHTML = infoHtml(a, b, scA, scB, names);
  $("cmp-globe").setAttribute("aria-label", t("compare.globe.aria", { a: names.a, b: names.b }));
  if (!globe && !loading) {
    const box = $("cmp-globe");
    box.dataset.loading = "true";
    loading = import("./moon3d.js")
      .then(({ createMoon3D }) =>
        createMoon3D(box, {
          onPick() {}, // en la comparación el clic no elige coordenadas
          onReady: () => delete box.dataset.loading,
        }),
      )
      .then((instance) => {
        globe = instance;
        applyView();
      })
      .catch(() => {
        delete box.dataset.loading;
        box.dataset.error = "true";
      });
  }
  applyView();
}
