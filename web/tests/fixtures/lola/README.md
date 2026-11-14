# Fixture LOLA sintético (solo pruebas)

- **Qué es:** `synthetic-grid.mjs` genera, en un directorio temporal, dos rasters crudos con el **formato** del producto real (DEM float32 little-endian en km y conteos int16 little-endian) sobre una grilla de 32 × 32 píxeles de 60 km.
- **Qué NO es:** no es un producto NASA, no son datos LOLA, no se copia a `src/` ni a `public/` y no se muestra en la web. No sustituye a `LDEM_60S_240M_FLOAT` / `LDEC_60S_240M` (DEC-021).
- **Para qué sirve:** probar `web/scripts/prepare-lola.mjs` y `web/src/lib/terrain-data.js` (lectura por ventanas, conversión km → m, `count = 0` como valor interpolado, cobertura y exclusión de sitios) sin descargar ~345 MiB.
- **Valores:** altura `-2 + 0,1·línea + 0,001·columna` km; conteo `(línea + columna) mod 3`. Son fórmulas para verificar qué píxel se leyó, no relieve.

La prueba con datos reales (`web/tests/lola-pipeline.test.js`) solo corre si los archivos verificados están en `web/data/raw/`.
