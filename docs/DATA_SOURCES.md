# Catálogo de fuentes científicas

Salvo las coordenadas de sitios (DEC-019) y el adaptador de JPL Horizons (DEC-020), las fuentes de esta tabla todavía no están integradas. Antes de implementar una descarga se debe revisar la documentación vigente del producto concreto, su marco, unidades, cobertura, resolución, atribución y condiciones de uso. Los detalles no confirmados se marcan como pendientes.

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
- **Finalidad:** reemplazar el modelo periódico de `astro.js` con posiciones del Sol y la Tierra respecto de un observador lunar (ASTRO-01, DEC-020).
- **Consulta (perfil `selene-observer-v1`):** `EPHEM_TYPE=OBSERVER`, `COMMAND=10` (Sol) o `399` (Tierra), `CENTER=coord@301`, `COORD_TYPE=GEODETIC`, `SITE_COORD=lon_E,lat,alt_km`, `TIME_TYPE=UT`, `CAL_FORMAT=JD`, `ANG_FORMAT=DEG`, `APPARENT=AIRLESS`, `REF_SYSTEM=ICRF`, `QUANTITIES=4,10,13`, `CSV_FORMAT=YES`, `ELEV_CUT=-90`, `OBJ_DATA=NO`. La URL exacta la arma `buildQueryUrl()` y queda guardada en cada serie.
- **Formato:** envoltura JSON de la API (`signature`, `result`, `error`); `result` contiene una tabla CSV entre `$$SOE` y `$$EOE`. Validado con la versión 1.2.
- **Cobertura:** la de DE441 para Sol y Tierra; cada serie registra inicio, fin, paso, filas, faltantes y período de EOP (medido o predicho). Máximo 50 000 filas por consulta en el adaptador.
- **Referencia:** centro Luna (301), esfera de 1737,4 km, polo `MEAN_ME (high precision)`, efeméride DE441 (informados por Horizons). Los sitios MOON_ME/DE421 se pasan sin transformar.
- **Unidades:** azimut/elevación en grados (aparentes, sin aire), % iluminado, diámetro angular en segundos de arco, tiempo JD UT → Unix ms UTC. Detalle en `docs/SCIENCE.md`.
- **Limitaciones:** requiere red al adquirir (no en la demo); la API responde errores de consulta con HTTP 200 y campo `error`; no aporta horizonte topográfico; la altura del observador debe darse explícitamente (hoy 0 km supuesto).
- **Caché:** `web/scripts/fetch-horizons.mjs` guarda el crudo sin modificar + SHA-256, la serie normalizada y un `manifest.json`, con clave que incluye fuente, versiones de API y perfil, objetivo, sitio, altura y su base, intervalo y paso. Por defecto en `web/.cache/horizons` (ignorado por git); `--offline` solo lee la caché.
- **Datos incluidos en el repo:** fixtures de Sol y Tierra desde Shackleton R04, 14–16/11/2026, paso 60 min, obtenidos el 14/11/2026 (`web/tests/fixtures/horizons/README.md`).
- **Estado:** adaptador, adquisición y caché integrados y probados; **no** consumidos todavía por `analysis.js` ni la UI (CORE-01).
- **Módulos responsables:** `web/src/lib/horizons.js` (puro, sin red), `web/scripts/fetch-horizons.mjs` (adquisición en Node); pruebas en `web/tests/horizons.test.js` y `web/tests/horizons.fixture.test.js`.
- **Atribución/licencia:** citar NASA/JPL Horizons y conservar parámetros, versión de API, efeméride y fecha de consulta (ya guardados en `source`). Condiciones específicas de reutilización: pendiente de verificar antes de publicar datos derivados.

## LOLA / Lunar Reconnaissance Orbiter

- **URL oficial:** https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- **Finalidad:** obtener elevaciones lunares y construir un horizonte topográfico real.
- **Datos requeridos:** producto de elevación apropiado (por ejemplo GDR/SLDEM según el área), etiquetas PDS, datum, proyección, escala y valor de ausencia.
- **Formato:** PDS3/PDS4 según producto y fecha; existen EDR, RDR, GDR, SHADR y SLDEM. La selección y el decodificador exactos quedan pendientes.
- **Cobertura:** LOLA ofrece topografía global; cobertura y densidad efectivas varían espacialmente y por producto. Verificar en la etiqueta del producto elegido.
- **Referencia:** definido por la etiqueta y el SIS del producto; no asumir que coincide con coordenadas o radios internos actuales.
- **Limitaciones:** volumen, resolución desigual, proyecciones/datum, huecos y necesidad de preprocesado; no descargar dentro de bucles interactivos.
- **Estado:** no integrado; reemplazo previsto de `terrain.js`.
- **Módulos responsables:** futuro pipeline topográfico y adaptador de horizonte; consumidor `analysis.js`.
- **Atribución/licencia:** citar el conjunto PDS y su DOI/citación cuando exista, además de LRO/LOLA. Revisar etiqueta y política PDS del producto.

## NASA PDS Geosciences Node

- **URL oficial:** https://pds-geosciences.wustl.edu/missions/lro/ · citas PDS4: https://pds.nasa.gov/datastandards/citing/
- **Finalidad:** archivo autoritativo de productos LRO/LOLA, documentación SIS, etiquetas y metadatos de procedencia.
- **Datos requeridos:** bundles/collections/productos elegidos y sus etiquetas; DOI o información de citación.
- **Formato:** PDS4 para productos migrados/recientes y colecciones históricas PDS3; cada producto define su estructura.
- **Cobertura:** la de cada misión, instrumento y release; no existe una cobertura única del nodo.
- **Referencia:** declarada en etiquetas y documentación de cada producto.
- **Limitaciones:** catálogo amplio, versiones/releases y archivos de gran tamaño; exige seleccionar el producto correcto.
- **Estado:** no integrado; fuente primaria prevista para LOLA.
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

