/**
 * Manifiesto del DEM LOLA global de baja resolución para el mapa de calor de
 * toda la Luna (MAP-02, DEC-065).
 *
 * NASA PDS, LRO LOLA Gridded Data Record (data set LRO-L-LOLA-4-GDR-V1.0,
 * DOI 10.17189/1520642): `LDEM_16` y su mapa de conteos `LDEC_16`, cilíndrica
 * simple a 16 píxeles/grado (~1,895 km/píxel en el ecuador). Valores tomados
 * de las etiquetas PDS3 (`.lbl`) leídas el 2026-11-15. Ojo: la etiqueta de
 * LDEM_16 declara PRODUCT_VERSION_ID "V3.1" y la de LDEC_16, "V3.0".
 *
 * PDS no publica el MD5 de las imágenes: el de abajo lo calculó el equipo
 * sobre la descarga del 2026-11-15 (mismo criterio que DEC-025 y DEC-061).
 * Las imágenes (~32 MiB cada una) no se versionan: se bajan a
 * `web/data/raw/ldem16/` (ignorado por git) y
 * `web/scripts/build-global-heat-atlas.mjs` genera el atlas a partir de ellas.
 */

const BASE_URL =
  "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img";

const file = (name, md5, bytes) => Object.freeze({ name, url: `${BASE_URL}/${name}`, md5, bytes });

export const LOLA_LDEM16_PRODUCT = Object.freeze({
  dataSetId: "LRO-L-LOLA-4-GDR-V1.0",
  doi: "10.17189/1520642",
  archive: "NASA PDS Geosciences Node",
  citation:
    "Neumann, G. A. (2011). LRO Moon Laser Altimeter 4 GDR V1.0 [Dataset]. NASA Planetary Data System. https://doi.org/10.17189/1520642",
  dem: Object.freeze({
    productId: "LDEM_16",
    productVersion: "V3.1",
    // int16 LE; altura en metros = DN × 0,5 sobre la esfera de 1737,4 km.
    sampleType: "int16-le",
    scalingFactor: 0.5,
    referenceRadiusKm: 1737.4,
    image: file("ldem_16.img", "87d937cf968462a61043e1e5b3166d65", 33177600),
    label: file("ldem_16.lbl", "550f6cd73ec11543709faf1226e0a7d2", null),
  }),
  counts: Object.freeze({
    productId: "LDEC_16",
    productVersion: "V3.0",
    sampleType: "int16-le",
    image: file("ldec_16.img", "5d9572b75662d1242aa91f5f6ac917b6", 33177600),
    label: file("ldec_16.lbl", "e419ccdf192276096f7c4d7ba98fa0ea", null),
  }),
  grid: Object.freeze({
    lines: 2880,
    samples: 5760,
    pixelsPerDegree: 16,
    order: "row-major; line 0 arriba (norte), sample 0 en longitud 0° E; pixel registered",
    lineProjectionOffset: 1439.5,
    sampleProjectionOffset: 2879.5,
    centerLatitude: 0,
    centerLongitude: 180,
    mapScaleKm: 1.895,
  }),
});
