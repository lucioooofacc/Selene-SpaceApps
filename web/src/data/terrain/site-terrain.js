/**
 * GENERADO por web/scripts/build-site-terrain.mjs. No editar a mano.
 *
 * Terreno de los sitios curados fuera del DEM polar reducido (TERRAIN-04,
 * DEC-067), calculado con siteTerrain() (DEC-059) sobre LDEM_128 V3.0 +
 * LDEC_128 (237 m/píxel). heightKm: altura sobre la esfera de 1737,4 km;
 * pendientes en grados; rugosidad y desnivel en metros; lowConfidencePct:
 * % de puntos con píxeles interpolados (count = 0).
 */
export const SITE_TERRAIN = Object.freeze({
  "schema": "selene-site-terrain/v1",
  "resolutionM": 236.901,
  "params": {
    "stepKm": 0.96,
    "radiusKm": 3
  },
  "source": {
    "dataSetId": "LRO-L-LOLA-4-GDR-V1.0",
    "doi": "10.17189/1520642",
    "dem": {
      "productId": "LDEM_128",
      "productVersion": "V3.0",
      "md5": "397c24a9a5eb71cba641373fe9adb3a4"
    },
    "counts": {
      "productId": "LDEC_128",
      "md5": "118203c4632ac4940713f7d54070e803"
    }
  },
  "sites": {
    "chandrayaan3": {
      "lat": -69.3735,
      "lon": 32.3199,
      "terrain": {
        "heightKm": 0.5297,
        "slopeDeg": 0.39,
        "area": {
          "radiusKm": 3,
          "points": 29,
          "meanSlope": 0.69,
          "maxSlope": 1.79,
          "below": {
            "5": 100,
            "10": 100,
            "15": 100
          },
          "roughnessM": 11.5,
          "reliefM": 44.6,
          "lowConfidencePct": 31
        }
      }
    },
    "change4": {
      "lat": -45.4561,
      "lon": 177.5885,
      "terrain": {
        "heightKm": -5.9304,
        "slopeDeg": 0.11,
        "area": {
          "radiusKm": 3,
          "points": 29,
          "meanSlope": 0.3,
          "maxSlope": 0.91,
          "below": {
            "5": 100,
            "10": 100,
            "15": 100
          },
          "roughnessM": 5.6,
          "reliefM": 28.7,
          "lowConfidencePct": 82.8
        }
      }
    },
    "apollo11": {
      "lat": 0.67416,
      "lon": 23.47314,
      "terrain": {
        "heightKm": -1.9349,
        "slopeDeg": 0.85,
        "area": {
          "radiusKm": 3,
          "points": 29,
          "meanSlope": 0.85,
          "maxSlope": 1.32,
          "below": {
            "5": 100,
            "10": 100,
            "15": 100
          },
          "roughnessM": 22,
          "reliefM": 77.3,
          "lowConfidencePct": 75.9
        }
      }
    }
  }
});
