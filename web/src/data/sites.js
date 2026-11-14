/**
 * Sitios curados.
 *
 * ⚠ Coordenadas APROXIMADAS, pendientes de verificación por el equipo de
 * astronomía (Teo, Facu, Lucio) con LROC Quickmap / Moon Trek. Ver DEC-006.
 *
 * `relief`: relieve característico del horizonte en grados (modelo sintético,
 * ver lib/terrain.js). Valores bajos = horizonte abierto (crestas, bordes);
 * valores altos = dentro o al lado de cráteres profundos.
 *
 * `elevationKm`: altura aproximada del punto sobre su entorno; baja el horizonte
 * (ver horizonDip en lib/terrain.js).

 */
export const SITES = [
  {
    id: "shackleton",
    name: "Shackleton",
    lat: -89.9,
    lon: 0,
    relief: 0.7,
    elevationKm: 1,
    agency: "NASA · Artemis",
  },
  {
    id: "malapert",
    name: "Malapert",
    lat: -85.99,
    lon: 0,
    relief: 1.2,
    elevationKm: 0.6,
    agency: "NASA · Artemis",
  },
  {
    id: "cabeus",
    name: "Cabeus",
    lat: -85.33,
    lon: -41.8,
    relief: 5,
    agency: "NASA · LCROSS",
  },
  {
    id: "im1",
    name: "IM-1 Odysseus",
    lat: -80.13,
    lon: 1.44,
    relief: 0.7,
    agency: "Intuitive Machines · CLPS",
  },
  {
    id: "chandrayaan3",
    name: "Chandrayaan-3",
    lat: -69.37,
    lon: 32.32,
    relief: 1.2,
    agency: "ISRO · India",
  },
  {
    id: "change4",
    name: "Chang'e 4",
    lat: -45.44,
    lon: 177.6,
    relief: 1,
    agency: "CNSA · China",
  },
  {
    id: "apollo11",
    name: "Apollo 11",
    lat: 0.67,
    lon: 23.47,
    relief: 0.5,
    agency: "NASA · Apollo",
  },
];

export const CUSTOM_SITE_ID = "custom";

export function findSite(id) {
  return SITES.find((site) => site.id === id) ?? null;
}
