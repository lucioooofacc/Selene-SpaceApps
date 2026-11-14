# Catálogo de fuentes científicas

Las fuentes de esta tabla todavía no están integradas en el motor científico, salvo las coordenadas de sitios curados (DEC-019), las efemérides de JPL Horizons (DEC-024, DEC-033), que el análisis usa para los sitios curados entre nov 2026 y dic 2027, y el CGI Moon Kit, que se usa solo como imagen del mapa (DEC-021). El producto LOLA ya se descarga y se recorta por sitio (DEC-025) y de él se precalcula el horizonte de los sitios curados (DEC-030), que el análisis usa desde DEC-032. Antes de implementar una descarga se debe revisar la documentación vigente del producto concreto, su marco, unidades, cobertura, resolución, atribución y condiciones de uso. Los detalles no confirmados se marcan como pendientes.

## NASA SVS — CGI Moon Kit (imagen del mapa, integrado)

- **URL oficial:** https://svs.gsfc.nasa.gov/4720/ (NASA Scientific Visualization Studio).
- **Finalidad:** textura y relieve de la Luna 3D y de las vistas 2D de GLOBAL y POLO SUR (UI-07, DEC-021). **Solo presentación:** no alimenta ningún cálculo de `src/lib/`.
- **Archivos usados** (descargados el 14/11/2026):
  - `lroc_color_poles_4k.tif` (4096×2048, color LROC WAC, equirectangular centrado en 0° de longitud; SHA-256 `918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f`). Se convirtió a `web/public/nasa/lroc_color_4k.jpg` (JPEG calidad 85) y a `lroc_color_1k.jpg` (vista previa de 1024×512).
  - `ldem_3_8bit.jpg` (1024×512, relieve LOLA en 8 bits; SHA-256 `6d93f887e7d8bedfe35ab89ba785e5e3ca12381bd092a5e6abe2c707dda8bb98`), copiado tal cual a `web/public/nasa/`.
- **Orientación verificada:** el cráter Tycho cae en (−43°, −11°) con lon = x·360 − 180 y lat = 90 − y·180, la misma proyección que `map.js`.
- **Limitaciones:** en 3D el relieve se exagera (`RELIEF_SCALE` en `moon3d.js`) y la luz es ilustrativa, no solar. El mosaico de color tiene poco contraste cerca de los polos. La conversión de unidades del `ldem_3_8bit` (gris → km) no se usa ni se verificó: el relieve 3D es solo visual.
- **Atribución/licencia:** NASA's Scientific Visualization Studio, CGI Moon Kit (Ernie Wright), con datos de LRO/LROC WAC y LOLA. Material de NASA, en general de dominio público; se acredita en la interfaz ("Imagen: NASA SVS…").

### Elevación LOLA para MAPA DE CALOR (UI-11, DEC-026)

- **Archivo:** `ldem_16.tif` del mismo kit (5760×2880, 16 px por grado, float32 en km respecto de un radio de 1737,4 km, equirectangular centrado en 0°; SHA-256 `1ea42bf44f7e9d694f79c3afa7145f97fbf06cc67372067d9fe73dce43bad796`). Descargado el 14/11/2026; **no se sube al repo**.
- **Procesamiento reproducible:** `node web/scripts/build-lola-maps.mjs /ruta/a/ldem_16.tif` genera `web/public/nasa/lola_polar_1024.png` (polo sur hasta −60°, azimutal equidistante, 0° arriba) y `lola_global_2048.png` (equirectangular), más `web/src/data/lola-maps.js` con rangos y procedencia. Canales: R = elevación cuantizada a 8 bits entre los percentiles 1 y 99 redondeados a 0,5 km (polo: −7 a +4,5 km; globo: −5,5 a +6 km), G = sombreado (luz del noroeste a 45°, relieve ×4 solo para el sombreado), B = dato válido.
- **Limitaciones:** la cuantización a 8 bits deja escalones de ~45 m. El DEM del kit es un producto de visualización; para cálculos, usar el producto PDS de TERRAIN-01. El producto polar `LDEM_60S_240M` (TERRAIN-01, DEC-025) ya está integrado: se puede regenerar el mapa desde esa fuente, que tiene más resolución.

## Coordenadas de sitios curados (`web/src/data/sites.js`)

- **Finalidad:** fijar punto, marco y procedencia de los 7 sitios curados (DATA-01, DEC-019).
- **Referencia común:** MOON_ME / DE421; latitud planetocéntrica; longitud este positiva en `[-180°, 180°)`; esfera de 1737,4 km; grados decimales. Definida en `SITE_REFERENCE` (`web/src/lib/coordinates.js`).
- **Origen de los valores:** confirmados por el equipo de astronomía (Facu) el 14/11/2026, junto con la identidad de cada punto, y cotejados con fuentes oficiales (detalle por sitio en DEC-019):
  - NASA NSSDCA, tabla de impactos y naves (DE421 mean Earth): https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html — Apollo 11, Chang'e 4, Cabeus; referencia cruzada de IM-1 y Chandrayaan-3.
  - NASA Lunar Surface Data Book Rev A (ACD-50044), tabla A2-2: https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf?attachment=true — Shackleton Rim R04 y Malapert Massif R23.
  - Marshall et al. (2012), *Locating the LCROSS Impact Craters*: https://ntrs.nasa.gov/api/citations/20140005563/downloads/20140005563.pdf — impacto del Centaur en Cabeus.
  - NASA PGDA, mini-LRA de GSFC: https://pgda.gsfc.nasa.gov/products/101 — IM-1 y Chandrayaan-3.
  - CNSA, Chang'e 4: https://www.cnsa.gov.cn/n6758823/n6758838/c6807583/content.html — valor en otra referencia (≈ 415 m del de NSSDCA); no se usa.
  - LOLA RDR SIS, definición del marco: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/rdrsis.htm
  - USGS Gazetteer (contexto del accidente, no el punto): Shackleton https://planetarynames.wr.usgs.gov/Feature/5450 · Cabeus https://planetarynames.wr.usgs.gov/Feature/953 · Malapert https://planetarynames.wr.usgs.gov/Feature/3603
- **Metadatos por sitio:** `point.type` (`lander` | `impact` | `study-point`), `provenance` (quién confirmó, fecha, referencia, `sourceFrameVerified`, `frameNote`, `urls`, `featureUrls`), `confidence` (`alta` | `media` | `baja` y motivo) y `precision` (`accuracyM`, `accuracyBasis`).
- **Transformaciones:** ninguna. El marco lo declara la fuente en Cabeus, Chang'e 4 y Apollo 11; en R04/R23 se infiere (DEM LOLA) y en IM-1/Chandrayaan-3 PGDA no lo declara.
- **Precisión:** se separa la resolución de representación de la cifra (≤ 3,03 m, `quantizationMeters()`) de la exactitud declarada por la fuente (`accuracyM`): 10 m en R04/R23 (Data Book: 5–10 m), 115 m en Cabeus (1σ), `null` donde la fuente no la declara.
- **Herramientas de verificación:** LROC QuickMap y NASA Moon Trek (ver abajo). Para el marco MOON_ME/DE421, ver NAIF SPICE (kernels lunares PCK/FK).
- **Estado:** integrado con procedencia parcial; pendiente de validar por astronomía (Teo, Facu, Lucio).
- **Módulos responsables:** `web/src/data/sites.js` (datos) y `web/src/lib/coordinates.js` (normalización); pruebas en `web/tests/sites.test.js`.

## NASA JPL Horizons

- **URL oficial:** https://ssd.jpl.nasa.gov/horizons/ · API: https://ssd.jpl.nasa.gov/api/horizons.api · documentación: https://ssd-api.jpl.nasa.gov/doc/horizons.html · manual: https://ssd.jpl.nasa.gov/horizons/manual.html
- **Finalidad:** reemplazar el modelo periódico de `astro.js` con posiciones del Sol y la Tierra respecto de un observador lunar (ASTRO-01, DEC-024).
- **Consulta (perfil `selene-observer-v1`):** `EPHEM_TYPE=OBSERVER`, `COMMAND=10` (Sol) o `399` (Tierra), `CENTER=coord@301`, `COORD_TYPE=GEODETIC`, `SITE_COORD=lon_E,lat,alt_km`, `TIME_TYPE=UT`, `CAL_FORMAT=JD`, `ANG_FORMAT=DEG`, `APPARENT=AIRLESS`, `REF_SYSTEM=ICRF`, `QUANTITIES=4,10,13`, `CSV_FORMAT=YES`, `ELEV_CUT=-90`, `OBJ_DATA=NO`. La URL exacta la arma `buildQueryUrl()` y queda guardada en cada serie.
- **Formato:** envoltura JSON de la API (`signature`, `result`, `error`); `result` contiene una tabla CSV entre `$$SOE` y `$$EOE`. Validado con la versión 1.2.
- **Cobertura:** la de DE441 para Sol y Tierra; cada serie registra inicio, fin, paso, filas, faltantes y período de EOP (medido o predicho). Máximo 50 000 filas por consulta en el adaptador.
- **Referencia:** centro Luna (301), esfera de 1737,4 km, polo `MEAN_ME (high precision)`, efeméride DE441 (informados por Horizons). Los sitios MOON_ME/DE421 se pasan sin transformar.
- **Unidades:** azimut/elevación en grados (aparentes, sin aire), % iluminado, diámetro angular en segundos de arco, tiempo JD UT → Unix ms UTC. Detalle en `docs/SCIENCE.md`.
- **Limitaciones:** requiere red al adquirir (no en la demo); la API responde errores de consulta con HTTP 200 y campo `error`; no aporta horizonte topográfico; la altura del observador debe darse explícitamente (hoy 0 km supuesto).
- **Caché:** `web/scripts/fetch-horizons.mjs` guarda el crudo sin modificar + SHA-256, la serie normalizada y un `manifest.json`, con clave que incluye fuente, versiones de API y perfil, objetivo, sitio, altura y su base, intervalo y paso. Por defecto en `web/.cache/horizons` (ignorado por git); `--offline` solo lee la caché.
- **Datos incluidos en el repo:** fixtures de Sol y Tierra desde Shackleton R04, 14–16/11/2026, paso 60 min, obtenidos el 14/11/2026 (`web/tests/fixtures/horizons/README.md`).
- **Estado:** adaptador, adquisición y caché integrados y probados. Desde DEC-033, series de los 7 sitios (01/11/2026 – 01/01/2028, paso 1 h, DE441) versionadas en `web/public/data/ephemerides/` (~2,1 MB) y usadas por `analysis.js`; se regeneran con `fetch-horizons.mjs` + `npm run data:ephemerides`.
- **Módulos responsables:** `web/src/lib/horizons.js` (puro, sin red), `web/scripts/fetch-horizons.mjs` (adquisición en Node); pruebas en `web/tests/horizons.test.js` y `web/tests/horizons.fixture.test.js`.
- **Atribución/licencia** (verificado el 15/11/2026 en https://ssd.jpl.nasa.gov/horizons/, https://ssd.jpl.nasa.gov/about/ y el manual v4.98e): las páginas oficiales **no fijan licencia ni restricciones de redistribución** y tampoco declaran los datos de dominio público; advierten que el servicio es "best-effort" y que decidir si los resultados sirven para cada uso es responsabilidad del usuario. JPL pide citar los datos descargados del sitio SSD así: *NASA/JPL Solar System Dynamics. Data retrieved on (año, mes, día). (Título de la página). https://ssd.jpl.nasa.gov*. El manual lista como primera referencia del sistema: *Giorgini, J. D. and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/, data retrieved YYYY-MON-DD*. Se usan las dos en el informe imprimible; la fecha de consulta de cada serie queda en `meta.sun.retrievedAt` (14/11/2026). La política de uso del nombre y el logo de JPL (https://www.jpl.nasa.gov/jpl-image-use-policy) no se revisó: la web no usa sus logos.

## LOLA / Lunar Reconnaissance Orbiter

- **URL oficial:** https://pds-geosciences.wustl.edu/missions/lro/lola.htm · directorio del producto: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/
- **Finalidad:** obtener elevaciones lunares y construir un horizonte topográfico real.
- **Producto seleccionado (TERRAIN-01, DEC-025):** data set `LRO-L-LOLA-4-GDR-V1.0`, DOI [10.17189/1520642](https://doi.org/10.17189/1520642). DEM `LDEM_60S_240M_FLOAT` V2.1 (`float_img/`) y conteos `LDEC_60S_240M` (`img/`), con sus etiquetas `.lbl` (PDS3) y `.xml` (PDS4). URLs, bytes y MD5 de los seis archivos en DEC-025 y en `web/src/data/terrain/lola-ldem-60s-240m.js`.
- **Formato:** imágenes crudas sin cabecera, 7760 × 7760, orden por filas. DEM float32 little-endian, altura en km sobre la esfera de 1737,4 km. Conteos int16 little-endian, número de mediciones LOLA por píxel.
- **Cobertura:** nominal −90°..−60° (las esquinas llegan a −48,49°, no se usan). Cubre Shackleton, Malapert, Cabeus, IM-1 y Chandrayaan-3; **no** cubre Chang'e 4 ni Apollo 11.
- **Referencia:** estereográfica polar esférica centrada en −90°, 240 m/píxel exactos, latitud planetocéntrica, longitud este positiva, "Mean Earth/Polar Axis of DE421", esfera de 1737,4 km (etiquetas y `catalog/dsmap_polar.cat`). Coincide con la referencia de los sitios (DEC-019); no se aplica transformación.
- **Ausencias y confianza:** el DEM float no declara valor de ausencia (los huecos ya vienen interpolados). Por eso se usa `LDEC`: `count = 0` ⇒ valor interpolado, sin medición directa, confianza baja.
- **Pipeline:** `web/scripts/download-lola.mjs` (descarga y MD5 en streaming) → `web/data/raw/` · `web/scripts/prepare-lola.mjs` (recortes por sitio) → `web/data/derived/lola-60s-240m/` · lectura en `web/src/lib/terrain-data.js` · `web/scripts/build-lola-horizons.mjs` (horizonte por sitio, DEC-030) → `web/src/data/terrain/lola-horizons.js` (versionado, ~65 KB). `web/data/` está en `.gitignore`.
- **Limitaciones:** ~345 MiB de descarga; 240 m/píxel no resuelve relieve menor a ese tamaño; los recortes se hacen sobre la grilla nativa, sin remuestreo. Hallazgo sobre el signo de la ecuación directa del catálogo, a validar por astronomía (DEC-025).
- **DEM reducido para la web (DEC-034):** `web/scripts/build-lola-polar-reduced.mjs` promedia bloques de 2×2 (480 m, hasta −80°) y 4×4 (960 m, hasta −75°) y escribe `web/public/data/terrain/lola-polar-480m.*` y `lola-polar-960m.*` (~7,4 MiB, ~4,4 MB comprimido; alturas int16 en m y % de `count = 0`). Es un derivado: el producto de referencia sigue siendo `LDEM_60S_240M`.
- **Atlas del mapa de calor (DEC-038):** `web/scripts/build-heat-atlas.mjs` calcula el horizonte del centro de cada celda de 96 × 96 hasta −80° desde `LDEM_60S_240M` y escribe `web/public/data/terrain/heat-atlas-96.*` (1,3 MiB). Es un derivado.
- **Estado:** producto seleccionado, descargado y verificado (2026-11-14). Recortes reales no versionados. El horizonte de los cinco sitios cubiertos está precalculado y versionado (TERRAIN-02, DEC-030) y `analysis.js` lo usa para esos sitios (CORE-01 parte A, DEC-032).
- **Módulos responsables:** `web/scripts/*-lola.mjs`, `web/src/lib/terrain-data.js`, `web/src/data/terrain/`; `web/src/lib/horizon-lola.js` y `web/scripts/build-lola-horizons.mjs` (horizonte, DEC-030).
- **Atribución/licencia:** cita oficial del data set (DataCite, consultada el 15/11/2026): *Neumann, G. A. (2011). LRO Moon Laser Altimeter 4 GDR V1.0 [Dataset]. NASA Planetary Data System. https://doi.org/10.17189/1520642*. Los datos del PDS son de NASA y de uso público; se cita el data set en el informe imprimible y en este documento.

## NASA PDS Geosciences Node

- **URL oficial:** https://pds-geosciences.wustl.edu/missions/lro/ · citas PDS4: https://pds.nasa.gov/datastandards/citing/
- **Finalidad:** archivo autoritativo de productos LRO/LOLA, documentación SIS, etiquetas y metadatos de procedencia.
- **Datos requeridos:** bundles/collections/productos elegidos y sus etiquetas; DOI o información de citación.
- **Formato:** PDS4 para productos migrados/recientes y colecciones históricas PDS3; cada producto define su estructura.
- **Cobertura:** la de cada misión, instrumento y release; no existe una cobertura única del nodo.
- **Referencia:** declarada en etiquetas y documentación de cada producto.
- **Limitaciones:** catálogo amplio, versiones/releases y archivos de gran tamaño; exige seleccionar el producto correcto.
- **Estado:** fuente del producto LOLA seleccionado (`LDEM_60S_240M_FLOAT` V2.1 + `LDEC_60S_240M`, DEC-025); se descarga con `web/scripts/download-lola.mjs`.
- **Módulos responsables:** pipeline de adquisición y catálogo de metadatos.
- **Atribución/licencia:** usar la cita/DOI del producto y acreditar a productores y archivo según la guía PDS. Verificar restricciones excepcionales en cada producto.

## LROC QuickMap

- **URL oficial:** https://quickmap.lroc.asu.edu/
- **Finalidad:** inspección y validación visual de coordenadas, capas, relieve y contexto de sitios.
- **Datos requeridos:** coordenadas/capas seleccionadas y metadatos exportados por la herramienta.
- **Formato:** aplicación web con visualización y herramientas de exportación; formatos concretos y automatización quedan pendientes de verificar en la guía vigente.
- **Cobertura:** depende de las capas LROC y de terceros seleccionadas.
- **Referencia:** depende de cada capa; registrar proyección, datum y metadatos mostrados.
- **Limitaciones:** herramienta interactiva, no contrato estable de API para el motor; la calidad/cobertura cambia por capa.
- **Estado:** no integrado; herramienta de verificación para `sites.js` (pendiente usarla para cerrar DEC-019) y productos derivados.
- **Módulos responsables:** validación de datos y documentación, no cálculo en tiempo de ejecución.
- **Atribución/licencia:** acreditar LROC/ASU y las capas/productos utilizados; requisitos exactos pendientes de verificar por capa.

## NASA Moon Trek

- **URL oficial:** https://trek.nasa.gov/moon/
- **Finalidad:** exploración, perfiles de elevación, ángulos solares y comprobación cruzada de sitios/productos.
- **Datos requeridos:** capas y subconjuntos elegidos junto con sus metadatos.
- **Formato:** aplicación web; formatos de descarga dependen de herramienta y capa. Pendiente de verificar antes de automatizar.
- **Cobertura:** múltiples capas lunares; cobertura espacial y temporal depende de cada producto.
- **Referencia:** definida por la capa; Moon Trek permite varias proyecciones, incluidas vistas global y polares.
- **Limitaciones:** algunas herramientas avanzadas requieren cuenta; no asumir que el resultado tiene el mismo marco o resolución que LOLA seleccionado.
- **Estado:** no integrado; apoyo de validación y posible obtención manual de subconjuntos.
- **Módulos responsables:** validación de datos y pipeline topográfico.
- **Atribución/licencia:** conservar créditos de Moon Trek y de cada capa (NASA/JPL y productores indicados). Condiciones exactas pendientes de verificar por producto.

## NAIF SPICE (alternativa)

- **URL oficial:** https://naif.jpl.nasa.gov/ · datos: https://naif.jpl.nasa.gov/naif/data
- **Finalidad:** alternativa reproducible a consultas Horizons para geometría de observación y efemérides mediante kernels versionados.
- **Datos requeridos:** kernels adecuados, normalmente SPK, PCK/FK y LSK; pueden requerirse otros según el cálculo. Para orientación lunar de alta precisión deben seleccionarse los kernels lunares apropiados.
- **Formato:** kernels de texto y binarios leídos con una implementación SPICE compatible.
- **Cobertura:** cada kernel binario tiene intervalo y puede contener huecos; comprobar comentarios y cobertura con herramientas NAIF.
- **Referencia:** marcos y transformaciones definidos por PCK/FK y llamadas SPICE; debe documentarse la cadena concreta.
- **Limitaciones:** integración y selección de kernels más complejas, tamaño, actualización, compatibilidad de bindings y soporte limitado para usuarios generales.
- **Estado:** alternativa no integrada; evaluar si se necesita ejecución local/offline reproducible.
- **Módulos responsables:** futuro servicio/adaptador de efemérides, fuera de la UI.
- **Atribución/licencia:** NAIF declara datos/software disponibles públicamente bajo sus reglas; revisar `Support and Rules`, licencias del toolkit/binding y procedencia de cada kernel.

