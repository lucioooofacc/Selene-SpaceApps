/**
 * Trayectoria Tierra–Luna aproximada para el informe (DEC-059).
 *
 * Modelo de cónicas enlazadas con una transferencia de Hohmann (la de menor
 * energía en el problema de dos cuerpos): órbita baja circular alrededor de
 * la Tierra → apogeo a la distancia de la Luna → captura en una órbita lunar
 * baja circular → descenso. Es una estimación ideal: no incluye pérdidas por
 * gravedad, el plano de la órbita lunar ni las correcciones de rumbo, y las
 * misiones reales usan trayectorias más rápidas (Apollo: ~3 días) o de baja
 * energía (más largas). Sirve para dimensionar fechas y Δv, no para volar.
 */

export const MU_EARTH = 398600.4418; // km³/s², IERS
export const MU_MOON = 4902.8001; // km³/s², DE430
export const R_EARTH = 6378.137; // km, radio ecuatorial (WGS-84)
export const R_MOON = 1737.4; // km, esfera de referencia de la Luna
export const MEAN_EARTH_MOON_KM = 384400;

/**
 * @param {{parkingAltKm?: number, moonDistanceKm?: number, lunarOrbitAltKm?: number}} [o]
 * @returns {{tofDays:number, dvTLI:number, dvLOI:number, dvDescent:number, dvTotal:number, a:number, e:number, r1:number, r2:number, vPerigee:number, vApogee:number, vInf:number}}
 *   Δv en km/s. `dvDescent` es el mínimo ideal (anular la velocidad de la
 *   órbita lunar baja), sin pérdidas por gravedad.
 */
export function hohmannTransfer({ parkingAltKm = 185, moonDistanceKm = MEAN_EARTH_MOON_KM, lunarOrbitAltKm = 100 } = {}) {
  const r1 = R_EARTH + parkingAltKm;
  const r2 = moonDistanceKm;
  const a = (r1 + r2) / 2;
  const e = (r2 - r1) / (r2 + r1);
  const tofSec = Math.PI * Math.sqrt(a ** 3 / MU_EARTH);
  const vCircular = Math.sqrt(MU_EARTH / r1);
  const vPerigee = Math.sqrt(MU_EARTH * (2 / r1 - 1 / a));
  const vApogee = Math.sqrt(MU_EARTH * (2 / r2 - 1 / a));
  const vMoon = Math.sqrt((MU_EARTH + MU_MOON) / r2); // velocidad orbital media de la Luna
  const vInf = Math.abs(vMoon - vApogee); // exceso hiperbólico al llegar a la Luna
  const rL = R_MOON + lunarOrbitAltKm;
  const vLLO = Math.sqrt(MU_MOON / rL);
  const dvLOI = Math.sqrt(vInf ** 2 + (2 * MU_MOON) / rL) - vLLO;
  const dvTLI = vPerigee - vCircular;
  return {
    tofDays: tofSec / 86400,
    dvTLI,
    dvLOI,
    dvDescent: vLLO,
    dvTotal: dvTLI + dvLOI + vLLO,
    a,
    e,
    r1,
    r2,
    vPerigee,
    vApogee,
    vInf,
  };
}

/**
 * Distancia Tierra–Luna (km, centro de la Tierra al sitio) a partir del radio
 * angular de la Tierra visto desde el sitio (Horizons, en grados). null si no
 * hay dato.
 */
export function earthDistanceFromRadius(radiusDeg) {
  if (!(radiusDeg > 0)) return null;
  return R_EARTH / Math.sin((radiusDeg * Math.PI) / 180);
}

/**
 * Cronograma hacia atrás desde el alunizaje: inyección translunar (TLI),
 * llegada a la órbita lunar y alunizaje. `lunarOrbitDays` es el tiempo en
 * órbita lunar antes de descender (supuesto).
 */
export function missionTimeline(landingMs, tofDays, lunarOrbitDays = 1) {
  const arrivalMs = landingMs - lunarOrbitDays * 86400000;
  const tliMs = arrivalMs - tofDays * 86400000;
  return { tliMs, arrivalMs, landingMs };
}

import { derivedEphemerisFor, ephemerisFor, positionsAt } from "./ephemeris.js";

/**
 * Distancia Tierra–Luna en `ms` para un sitio, desde el radio angular de la
 * Tierra de la serie Horizons (propia o trasladada). `{km, source}` con
 * source "horizons" o, sin serie o fuera de cobertura, la distancia media.
 */
export function moonDistanceAt(site, ms) {
  const own = ephemerisFor(site);
  const p = own ? positionsAt(own, ms) : derivedEphemerisFor(site)?.at(ms);
  const km = earthDistanceFromRadius(p?.earth?.radius);
  return km ? { km, source: "horizons" } : { km: MEAN_EARTH_MOON_KM, source: "mean" };
}
