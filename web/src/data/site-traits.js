/**
 * Rasgos de interés científico por sitio (UI-13, DEC-029).
 *
 * ⚠ PENDIENTE DE VALIDAR por astronomía (Teo, Facu, Lucio). Cada rasgo cita
 * su fuente; las fuentes se revisaron el 14/11/2026. No es una métrica
 * científica: el ranking de "Interés científico" solo cuenta cuántos rasgos
 * citados tiene cada sitio. Un sitio sin rasgos cargados no significa que no
 * tenga interés, sino que todavía no se documentó.
 *
 * Archivo separado de `sites.js` (DATA-01) para no modificar ese contrato.
 * El texto visible de cada rasgo está en i18n (`traits.<key>`); acá solo se
 * guardan la clave, la referencia bibliográfica y la URL.
 */
export const TRAIT_SOURCES = Object.freeze({
  colaprete2010: {
    citation: "Colaprete et al. (2010), Detection of water in the LCROSS ejecta plume, Science 330, 463–468",
    url: "https://doi.org/10.1126/science.1186986",
  },
  zuber2012: {
    citation: "Zuber et al. (2012), Constraints on the volatile distribution within Shackleton crater at the lunar south pole, Nature 486, 378–381",
    url: "https://doi.org/10.1038/nature11216",
  },
  nasaArtemis2024: {
    citation: "NASA (28/10/2024), NASA Provides Update on Artemis III Moon Landing Regions",
    url: "https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/",
  },
  isroLibs2023: {
    citation: "ISRO (2023), LIBS confirms the presence of Sulphur on the lunar surface through in-situ measurements",
    url: "https://www.isro.gov.in/LIBSResults.html",
  },
  li2019: {
    citation: "Li et al. (2019), Chang'E-4 initial spectroscopic identification of lunar far-side mantle-derived materials, Nature 569, 378–382",
    url: "https://doi.org/10.1038/s41586-019-1189-0",
  },
  apollo11Samples: {
    citation: "NASA Astromaterials (JSC), Apollo 11 lunar sample collection",
    url: "https://curator.jsc.nasa.gov/lunar/",
  },
});

/** Rasgo: { key, source }. `key` → texto en i18n (`traits.<key>`). */
export const SITE_TRAITS = Object.freeze({
  cabeus: [
    { key: "waterIce", source: "colaprete2010" },
    { key: "permanentShadow", source: "colaprete2010" },
  ],
  shackleton: [{ key: "permanentShadowNearby", source: "zuber2012" }],
  malapert: [{ key: "artemisRegion", source: "nasaArtemis2024" }],
  chandrayaan3: [{ key: "southPoleInSitu", source: "isroLibs2023" }],
  change4: [
    { key: "mantleMaterial", source: "li2019" },
    { key: "farSide", source: "li2019" },
  ],
  apollo11: [{ key: "samplesReturned", source: "apollo11Samples" }],
  im1: [],
});

export function traitsFor(siteId) {
  return SITE_TRAITS[siteId] ?? [];
}
