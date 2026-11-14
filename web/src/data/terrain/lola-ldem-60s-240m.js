/**
 * Manifiesto del producto topográfico seleccionado para TERRAIN-01 (DEC-024).
 *
 * NASA PDS, LRO LOLA Gridded Data Record (data set LRO-L-LOLA-4-GDR-V1.0,
 * DOI 10.17189/1520642): DEM polar sur `LDEM_60S_240M_FLOAT` V2.1 y su mapa de
 * conteos `LDEC_60S_240M`. Valores tomados de las etiquetas PDS3 oficiales y de
 * `catalog/dsmap_polar.cat` (verificados el 2026-11-14; MD5 de las etiquetas
 * comprobados contra los archivos servidos por PDS Geosciences).
 *
 * Este archivo solo describe el producto: no contiene muestras. Los rasters
 * (~230 MiB + ~115 MiB) no se versionan; se descargan con
 * `web/scripts/download-lola.mjs` a `web/data/raw/` (ignorado por git).
 */

const BASE_URL =
  "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar";

const file = (path, md5, bytes) =>
  Object.freeze({ name: path.split("/").pop(), url: `${BASE_URL}/${path}`, md5, bytes });

export const LOLA_PRODUCT = Object.freeze({
  dataSetId: "LRO-L-LOLA-4-GDR-V1.0",
  doi: "10.17189/1520642",
  doiUrl: "https://doi.org/10.17189/1520642",
  archive: "NASA PDS Geosciences Node",
  productVersion: "V2.1",
  // Cita completa (autores/año) pendiente de copiar de la página DOI (PENDIENTES.md).
  citation: "LRO-L-LOLA-4-GDR-V1.0, NASA Planetary Data System. https://doi.org/10.17189/1520642",

  dem: Object.freeze({
    productId: "LDEM_60S_240M",
    // Float: altura sobre la esfera de referencia, en km.
    sampleType: "float32-le",
    unit: "km",
    scalingFactor: 1,
    referenceRadiusKm: 1737.4,
    image: file("float_img/ldem_60s_240m_float.img", "45d376f634f0c4ad2bf628fd5f66b3c0", 240870400),
    label: file("float_img/ldem_60s_240m_float.lbl", "113c40f0f2a9af1f5311365e3836d754", 4877),
    xml: file("float_img/ldem_60s_240m_float.xml", "eff8f4de7ee6de290ee1e992a30f164b", 11633),
  }),

  counts: Object.freeze({
    productId: "LDEC_60S_240M",
    // Cantidad de mediciones LOLA usadas en cada píxel del DEM.
    sampleType: "int16-le",
    unit: "count",
    image: file("img/ldec_60s_240m.img", "4b7340bc337009aa02b80a1bf9eeadd4", 120435200),
    label: file("img/ldec_60s_240m.lbl", "d7952c6d113fb0aa66e2e29d6c5c0b35", 3822),
    xml: file("img/ldec_60s_240m.xml", "31f38d6a20db7b2a35eccb016d092411", 10639),
  }),

  grid: Object.freeze({
    lines: 7760,
    samples: 7760,
    order: "row-major; line 0 arriba, sample 0 a la izquierda",
    lineProjectionOffset: 3879.5,
    sampleProjectionOffset: 3879.5,
    mapScaleM: 240,
  }),

  projection: Object.freeze({
    type: "polar-stereographic",
    pole: "south",
    centerLatitude: -90,
    centerLongitude: 0,
    sphereRadiusM: 1737400,
    frame: "MOON_ME",
    frameName: "MEAN EARTH/POLAR AXIS OF DE421",
    latitude: "planetocentric",
    longitude: "east-positive",
    minimumLatitude: -90,
    maximumLatitude: -60,
    definition: `${BASE_URL.replace(/\/data\/lola_gdr\/polar$/, "")}/catalog/dsmap_polar.cat`,
  }),
});

/** Todos los archivos del producto, en el orden en que se descargan. */
export const LOLA_FILES = Object.freeze([
  LOLA_PRODUCT.dem.label,
  LOLA_PRODUCT.dem.xml,
  LOLA_PRODUCT.counts.label,
  LOLA_PRODUCT.counts.xml,
  LOLA_PRODUCT.dem.image,
  LOLA_PRODUCT.counts.image,
]);
