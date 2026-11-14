/**
 * Metadatos de los mapas de elevación de MAPA DE CALOR (UI-11, DEC-026).
 * ARCHIVO GENERADO por web/scripts/build-lola-maps.mjs: no editar a mano.
 * R de cada PNG = elevación cuantizada entre minKm y maxKm (8 bits);
 * G = sombreado (relieve exagerado ×zFactor solo para el sombreado);
 * B = 255 si hay dato.
 */
export const LOLA_MAPS = {
  "source": {
    "name": "NASA SVS CGI Moon Kit — ldem_16.tif (LOLA)",
    "url": "https://svs.gsfc.nasa.gov/4720/",
    "sha256": "1ea42bf44f7e9d694f79c3afa7145f97fbf06cc67372067d9fe73dce43bad796",
    "units": "km respecto de un radio de 1737,4 km"
  },
  "zFactor": 4,
  "polar": {
    "file": "./nasa/lola_polar_1024.png",
    "size": 1024,
    "edgeLat": -60,
    "cellKm": 1.777,
    "minKm": -7,
    "maxKm": 4.5
  },
  "global": {
    "file": "./nasa/lola_global_2048.png",
    "width": 2048,
    "height": 1024,
    "minKm": -5.5,
    "maxKm": 6
  }
};
