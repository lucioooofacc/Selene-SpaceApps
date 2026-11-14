# Catálogo de fuentes científicas

Las fuentes de esta tabla todavía no están integradas en el motor científico, salvo las coordenadas de sitios curados (DEC-019) y el CGI Moon Kit, que se usa solo como imagen del mapa (DEC-021). El producto LOLA ya se descarga y se recorta por sitio (DEC-024), pero el motor todavía no lo consume. Antes de implementar una descarga se debe revisar la documentación vigente del producto concreto, su marco, unidades, cobertura, resolución, atribución y condiciones de uso. Los detalles no confirmados se marcan como pendientes.

## NASA SVS — CGI Moon Kit (imagen del mapa, integrado)

- **URL oficial:** https://svs.gsfc.nasa.gov/4720/ (NASA Scientific Visualization Studio).
- **Finalidad:** textura y relieve de la Luna 3D y de las vistas 2D de GLOBAL y POLO SUR (UI-07, DEC-021). **Solo presentación:** no alimenta ningún cálculo de `src/lib/`.
- **Archivos usados** (descargados el 14/11/2026):
  - `lroc_color_poles_4k.tif` (4096×2048, color LROC WAC, equirectangular centrado en 0° de longitud; SHA-256 `918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f`). Se convirtió a `web/public/nasa/lroc_color_4k.jpg` (JPEG calidad 85) y a `lroc_color_1k.jpg` (vista previa de 1024×512).
  - `ldem_3_8bit.jpg` (1024×512, relieve LOLA en 8 bits; SHA-256 `6d93f887e7d8bedfe35ab89ba785e5e3ca12381bd092a5e6abe2c707dda8bb98`), copiado tal cual a `web/public/nasa/`.
- **Orientación verificada:** el cráter Tycho cae en (−43°, −11°) con lon = x·360 − 180 y lat = 90 − y·180, la misma proyección que `map.js`.
- **Limitaciones:** en 3D el relieve se exagera (`RELIEF_SCALE` en `moon3d.js`) y la luz es ilustrativa, no solar. El mosaico de color tiene poco contraste cerca de los polos. La conversión de unidades del `ldem_3_8bit` (gris → km) no se usa ni se verificó: el relieve 3D es solo visual.
- **Atribución/licencia:** NASA's Scientific Visualization Studio, CGI Moon Kit (Ernie Wright), con datos de LRO/LROC WAC y LOLA. Material de NASA, en general de dominio público; se acredita en la interfaz ("Imagen: NASA SVS…").

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

- **URL oficial:** https://ssd.jpl.nasa.gov/horizons/ · API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- **Finalidad:** reemplazar el modelo periódico de `astro.js` con posiciones del Sol y la Tierra respecto de un observador lunar.
- **Datos requeridos:** azimut/elevación topocéntricos o vectores suficientes para derivarlos; instante/intervalo, sitio, escala temporal y marco explícitos.
- **Formato:** tablas de observador, vectores o elementos en texto; opción CSV; la API devuelve una envoltura documentada. La selección exacta queda pendiente de prototipo.
- **Cobertura:** depende del objeto y del tipo de efeméride; debe validarse para cada consulta.
- **Referencia:** Horizons permite configurar centro/observador, sistema de coordenadas, plano y correcciones. La configuración exacta para superficie lunar está pendiente de validar.
- **Limitaciones:** red externa, límites y errores de consulta; valores por defecto pueden no ser adecuados; Horizons no aporta el horizonte topográfico local.
- **Estado:** no integrado; reemplazo previsto de `web/src/lib/astro.js` mediante adaptador y caché.
- **Módulos responsables:** futuro adaptador de efemérides; consumidor `analysis.js`.
- **Atribución/licencia:** citar JPL Horizons y conservar parámetros/fecha de consulta. Condiciones específicas de reutilización: pendiente de verificar antes de publicar datos derivados.

## LOLA / Lunar Reconnaissance Orbiter

- **URL oficial:** https://pds-geosciences.wustl.edu/missions/lro/lola.htm · directorio del producto: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/
- **Finalidad:** obtener elevaciones lunares y construir un horizonte topográfico real.
- **Producto seleccionado (TERRAIN-01, DEC-024):** data set `LRO-L-LOLA-4-GDR-V1.0`, DOI [10.17189/1520642](https://doi.org/10.17189/1520642). DEM `LDEM_60S_240M_FLOAT` V2.1 (`float_img/`) y conteos `LDEC_60S_240M` (`img/`), con sus etiquetas `.lbl` (PDS3) y `.xml` (PDS4). URLs, bytes y MD5 de los seis archivos en DEC-024 y en `web/src/data/terrain/lola-ldem-60s-240m.js`.
- **Formato:** imágenes crudas sin cabecera, 7760 × 7760, orden por filas. DEM float32 little-endian, altura en km sobre la esfera de 1737,4 km. Conteos int16 little-endian, número de mediciones LOLA por píxel.
- **Cobertura:** nominal −90°..−60° (las esquinas llegan a −48,49°, no se usan). Cubre Shackleton, Malapert, Cabeus, IM-1 y Chandrayaan-3; **no** cubre Chang'e 4 ni Apollo 11.
- **Referencia:** estereográfica polar esférica centrada en −90°, 240 m/píxel exactos, latitud planetocéntrica, longitud este positiva, "Mean Earth/Polar Axis of DE421", esfera de 1737,4 km (etiquetas y `catalog/dsmap_polar.cat`). Coincide con la referencia de los sitios (DEC-019); no se aplica transformación.
- **Ausencias y confianza:** el DEM float no declara valor de ausencia (los huecos ya vienen interpolados). Por eso se usa `LDEC`: `count = 0` ⇒ valor interpolado, sin medición directa, confianza baja.
- **Pipeline:** `web/scripts/download-lola.mjs` (descarga y MD5 en streaming) → `web/data/raw/` · `web/scripts/prepare-lola.mjs` (recortes por sitio) → `web/data/derived/lola-60s-240m/` · lectura en `web/src/lib/terrain-data.js`. `web/data/` está en `.gitignore`.
- **Limitaciones:** ~345 MiB de descarga; 240 m/píxel no resuelve relieve menor a ese tamaño; los recortes se hacen sobre la grilla nativa, sin remuestreo. Hallazgo sobre el signo de la ecuación directa del catálogo, a validar por astronomía (DEC-024).
- **Estado:** producto seleccionado, descargado y verificado (2026-11-14). Recortes reales no versionados todavía; el horizonte (TERRAIN-02) aún no los consume.
- **Módulos responsables:** `web/scripts/*-lola.mjs`, `web/src/lib/terrain-data.js`, `web/src/data/terrain/`; consumidor futuro: horizonte de TERRAIN-02.
- **Atribución/licencia:** citar LRO/LOLA y el DOI 10.17189/1520642 con la cita que publica PDS para el data set (autores y año pendientes de copiar textualmente). Los datos del PDS son de NASA y de uso público; revisar la política de citación antes de publicar derivados.

## NASA PDS Geosciences Node

- **URL oficial:** https://pds-geosciences.wustl.edu/missions/lro/ · citas PDS4: https://pds.nasa.gov/datastandards/citing/
- **Finalidad:** archivo autoritativo de productos LRO/LOLA, documentación SIS, etiquetas y metadatos de procedencia.
- **Datos requeridos:** bundles/collections/productos elegidos y sus etiquetas; DOI o información de citación.
- **Formato:** PDS4 para productos migrados/recientes y colecciones históricas PDS3; cada producto define su estructura.
- **Cobertura:** la de cada misión, instrumento y release; no existe una cobertura única del nodo.
- **Referencia:** declarada en etiquetas y documentación de cada producto.
- **Limitaciones:** catálogo amplio, versiones/releases y archivos de gran tamaño; exige seleccionar el producto correcto.
- **Estado:** fuente del producto LOLA seleccionado (`LDEM_60S_240M_FLOAT` V2.1 + `LDEC_60S_240M`, DEC-024); se descarga con `web/scripts/download-lola.mjs`.
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

