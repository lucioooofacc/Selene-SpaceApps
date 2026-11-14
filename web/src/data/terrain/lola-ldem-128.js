/**
 * Manifiesto del producto topográfico global para TERRAIN-03 (DEC-061).
 *
 * NASA PDS, LRO LOLA Gridded Data Record (data set LRO-L-LOLA-4-GDR-V1.0,
 * DOI 10.17189/1520642): DEM global `LDEM_128` V3.0 y su mapa de conteos
 * `LDEC_128`, cilíndrica simple a 128 píxeles/grado (236,901 m/píxel en el
 * ecuador). Valores tomados de las etiquetas PDS3 oficiales (`.lbl`),
 * leídas el 2026-11-14.
 *
 * PDS no publica el MD5 de las imágenes: el MD5 de abajo se calculó sobre el
 * archivo completo durante la descarga verificada (mismo criterio que
 * DEC-025). Las etiquetas se comprobaron contra los archivos servidos.
 *
 * Este archivo solo describe el producto: no contiene muestras. Las imágenes
 * (~2 GiB cada una) no se guardan enteras ni se versionan:
 * `web/scripts/extract-lola-global.mjs` las recorre en streaming, verifica
 * tamaño y MD5 del archivo completo y guarda solo una ventana alrededor de
 * cada sitio fuera de `LDEM_60S_240M` en `web/data/derived/lola-128/`
 * (ignorado por git).
 */

const BASE_URL =
  "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img";

const file = (name, md5, bytes) => Object.freeze({ name, url: `${BASE_URL}/${name}`, md5, bytes });

export const LOLA_GLOBAL_PRODUCT = Object.freeze({
  dataSetId: "LRO-L-LOLA-4-GDR-V1.0",
  doi: "10.17189/1520642",
  doiUrl: "https://doi.org/10.17189/1520642",
  archive: "NASA PDS Geosciences Node",
  productVersion: "V3.0",
  citation:
    "Neumann, G. A. (2011). LRO Moon Laser Altimeter 4 GDR V1.0 [Dataset]. NASA Planetary Data System. https://doi.org/10.17189/1520642",

  dem: Object.freeze({
    productId: "LDEM_128",
    // int16 LE; altura en metros = DN × 0,5 sobre la esfera de 1737,4 km.
    sampleType: "int16-le",
    unit: "m",
    scalingFactor: 0.5,
    referenceRadiusKm: 1737.4,
    image: file("ldem_128.img", "397c24a9a5eb71cba641373fe9adb3a4", 2123366400),
    label: file("ldem_128.lbl", "f6d5cef735e6b236a7821cb278a11efe", null),
    xml: file("ldem_128.xml", "ccc90d3c00d1be4443430a1b2ff05ea1", null),
  }),

  counts: Object.freeze({
    productId: "LDEC_128",
    // Cantidad de mediciones LOLA usadas en cada píxel del DEM.
    sampleType: "int16-le",
    unit: "count",
    image: file("ldec_128.img", "118203c4632ac4940713f7d54070e803", 2123366400),
    label: file("ldec_128.lbl", "d4221ab1e14aabbcc095a2b6389712f2", null),
    xml: file("ldec_128.xml", "01db219b4917fe0bd904eefedd323c9c", null),
  }),

  grid: Object.freeze({
    lines: 23040,
    samples: 46080,
    recordBytes: 92160,
    pixelsPerDegree: 128,
    order: "row-major; line 0 arriba (norte), sample 0 en longitud 0° E; pixel registered",
    lineProjectionOffset: 11519.5,
    sampleProjectionOffset: 23039.5,
    centerLatitude: 0,
    centerLongitude: 180,
    mapScaleM: 236.901,
  }),

  projection: Object.freeze({
    type: "simple-cylindrical",
    sphereRadiusM: 1737400,
    frame: "MOON_ME",
    frameName: "MEAN EARTH/POLAR AXIS OF DE421",
    latitude: "planetocentric",
    longitude: "east-positive, 0..360",
    minimumLatitude: -90,
    maximumLatitude: 90,
  }),
});
