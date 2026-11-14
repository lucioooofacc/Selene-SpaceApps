# Fixtures de JPL Horizons (ASTRO-01, DEC-020)

Respuestas **oficiales y sin modificar** de la API de NASA/JPL Horizons, usadas para validar el adaptador `web/src/lib/horizons.js`. No son datos de producción de la interfaz.

## Procedencia

| Campo | Valor |
| --- | --- |
| Fuente | NASA/JPL Horizons API, versión 1.2 — https://ssd.jpl.nasa.gov/api/horizons.api (doc: https://ssd-api.jpl.nasa.gov/doc/horizons.html) |
| Efeméride | DE441 (informada por Horizons en el encabezado) |
| Obtenido | 2026-11-14T13:28:48Z (`source.retrievedAt` de cada `*.normalized.json`), HTTP 200 |
| Perfil | `selene-observer-v1` (`HORIZONS_PROFILE` en `horizons.js`) |
| Objetivos | Sol (`10`) y Tierra (`399`) |
| Centro | `coord@301`, sitio geodésico sobre la Luna, polo `MEAN_ME (high precision)`, esfera de 1737,4 km |
| Sitio | `shackleton` (Shackleton Rim R04, DEC-019): lat −89,7668°, lon E −171,87° (Horizons lo informa como 188,13° E) |
| Altura | **0 km — SUPUESTO** (`assumed-zero-reference-sphere`): no hay altura datum del sitio. No se usa `elevationKm` (sintético, DEC-005). |
| Intervalo | 2026-11-14 00:00 UTC → 2026-11-16 00:00 UTC, paso 60 min, 49 filas |
| Cantidades | `4,10,13`: azimut/elevación aparentes (sin aire), % iluminado, diámetro angular |
| EOP | `eop.261113.p270209`: datos medidos hasta 2026-11-13; el intervalo usa EOP **predichos** |

Las URL completas de consulta están en `source.queryUrl` y el hash SHA-256 del cuerpo crudo en `source.rawSha256`.

## Archivos

- `<objetivo>-<hash>.raw.json`: cuerpo de la API tal cual (no editar: la prueba verifica el SHA-256).
- `<objetivo>-<hash>.normalized.json`: serie validada por `normalizeHorizons()`.
- `manifest.json`: índice clave de caché → archivos. `<hash>` = primeros 16 hex del SHA-256 de la clave.

## Cómo regenerarlos

Desde `web/` (requiere red; Node ≥ 18):

```sh
node scripts/fetch-horizons.mjs --site shackleton --assume-zero-altitude \
  --start 2026-11-14T00:00Z --stop 2026-11-16T00:00Z --step-min 60 \
  --out tests/fixtures/horizons --force
```

Con `--offline` en lugar de `--force` solo se revalida la caché existente, sin red. Una nueva descarga cambia `retrievedAt`, el hash crudo y posiblemente los valores (nuevos EOP o efemérides): si eso pasa, revisar el diff y actualizar DEC-020.

## Qué validan

`web/tests/horizons.fixture.test.js` compara **exactamente** (tolerancia 0) cada celda de la tabla oficial con la serie normalizada, la integridad del crudo, la reproducibilidad de la clave de caché y de la normalización, los metadatos de marco/unidades/cobertura y que la altura 0 figure como supuesto. No compara contra otro modelo: la diferencia con `astro.js` no forma parte de esta prueba.
