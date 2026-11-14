# Catálogo de fuentes científicas

Las fuentes de esta tabla todavía no están integradas en el motor científico, salvo el CGI Moon Kit, que se usa solo como imagen del mapa. Antes de implementar una descarga se debe revisar la documentación vigente del producto concreto, su marco, unidades, cobertura, resolución, atribución y condiciones de uso. Los detalles no confirmados se marcan como pendientes.

## NASA SVS — CGI Moon Kit (imagen del mapa, integrado)

- **URL oficial:** https://svs.gsfc.nasa.gov/4720/ (NASA Scientific Visualization Studio).
- **Finalidad:** textura y relieve de la Luna 3D y de las vistas 2D de GLOBAL y POLO SUR (UI-07, DEC-020). **Solo presentación:** no alimenta ningún cálculo de `src/lib/`.
- **Archivos usados** (descargados el 14/11/2026):
  - `lroc_color_poles_4k.tif` (4096×2048, color LROC WAC, equirectangular centrado en 0° de longitud; SHA-256 `918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f`). Se convirtió a `web/public/nasa/lroc_color_4k.jpg` (JPEG calidad 85) y a `lroc_color_1k.jpg` (vista previa de 1024×512).
  - `ldem_3_8bit.jpg` (1024×512, relieve LOLA en 8 bits; SHA-256 `6d93f887e7d8bedfe35ab89ba785e5e3ca12381bd092a5e6abe2c707dda8bb98`), copiado tal cual a `web/public/nasa/`.
- **Orientación verificada:** el cráter Tycho cae en (−43°, −11°) con lon = x·360 − 180 y lat = 90 − y·180, la misma proyección que `map.js`.
- **Limitaciones:** en 3D el relieve se exagera (`RELIEF_SCALE` en `moon3d.js`) y la luz es ilustrativa, no solar. El mosaico de color tiene poco contraste cerca de los polos. La conversión de unidades del `ldem_3_8bit` (gris → km) no se usa ni se verificó: el relieve 3D es solo visual.
- **Atribución/licencia:** NASA's Scientific Visualization Studio, CGI Moon Kit (Ernie Wright), con datos de LRO/LROC WAC y LOLA. Material de NASA, en general de dominio público; se acredita en la interfaz ("Imagen: NASA SVS…").

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
- **Estado:** no integrado; herramienta de verificación para `sites.js` y productos derivados.
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

