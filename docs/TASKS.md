# Backlog de la hackathon

Este archivo define **qué** es cada tarea: identificador, prioridad, objetivo, dependencias, archivos y criterios de aceptación. El **estado** (`pendiente`, `en curso`, `bloqueada`, `en revisión`, `completada`) y el **responsable** de cada tarea viven solo en su Issue de GitHub; no se registran acá para no duplicarlos. El protocolo está en `AGENTS.md` (sección 8, *Coordinación de tareas*) y la decisión en DEC-013.

Cada tarea tiene una línea **Issue** con el número de su Issue (por ejemplo `#12`) o `sin crear` si todavía no existe. Ninguna tarea se considera completada sin evidencia en código y pruebas y sin el PR integrado a `main`.

## P0 — Imprescindibles

### ASTRO-01 — Integrar efemérides reales

- **Prioridad:** P0 · **Issue:** [#6](https://github.com/lucioooofacc/Selene-SpaceApps/issues/6).
- **Objetivo:** sustituir las posiciones periódicas por series verificables del Sol y la Tierra.
- **Rama sugerida:** `data/efemerides-horizons`.
- **Dependencias:** definición de marco y contrato; acceso a Horizons; DATA-01.
- **Archivos afectados:** nuevo adaptador/caché en `web/src/lib/`, `analysis.js`, documentación y pruebas.
- **Criterios de aceptación:** consulta reproducible; unidades/marco/cobertura registrados; caché; errores y faltantes explícitos; comparación controlada con la fuente; UI sin peticiones por cuadro.
- **Fuera de alcance:** navegación de precisión, certificación de misión y topografía.

### TERRAIN-01 — Obtener y procesar datos LOLA

- **Prioridad:** P0 · **Issue:** [#7](https://github.com/lucioooofacc/Selene-SpaceApps/issues/7).
- **Objetivo:** seleccionar y preparar un producto topográfico oficial para los sitios de demostración.
- **Rama sugerida:** `data/lola-dem`.
- **Dependencias:** DATA-01; selección de producto, datum y resolución.
- **Archivos afectados:** pipeline/datos nuevos, `docs/DATA_SOURCES.md`, metadatos y pruebas de ingestión.
- **Criterios de aceptación:** producto y versión citados; descarga reproducible o artefacto derivado verificable; coordenadas, ausencias y unidades validadas; tamaño apto para la demo.
- **Fuera de alcance:** descargar todo el archivo global en el navegador.

### TERRAIN-02 — Calcular horizonte topográfico real

- **Prioridad:** P0 · **Issue:** [#8](https://github.com/lucioooofacc/Selene-SpaceApps/issues/8).
- **Objetivo:** producir `horizon(azimuth) -> elevation` desde el DEM y la curvatura lunar.
- **Rama sugerida:** `feat/horizonte-lola`.
- **Dependencias:** TERRAIN-01; marco/datum acordados.
- **Archivos afectados:** `web/src/lib/terrain.js` o adaptador nuevo, fixtures y pruebas.
- **Criterios de aceptación:** contrato público preservado o migrado explícitamente; continuidad 0°/360°; cobertura/ausencias visibles; casos geométricos y comparación visual documentados.
- **Fuera de alcance:** modelado de atmósfera o sombras del vehículo.

### TERRAIN-03 — Horizonte LOLA real para Chang'e 4 y Apollo 11

- **Prioridad:** P1 · **Issue:** [#71](https://github.com/lucioooofacc/Selene-SpaceApps/issues/71).
- **Objetivo:** reemplazar el horizonte sintético (DEC-005) de Chang'e 4 y Apollo 11, fuera de la cobertura de `LDEM_60S_240M`, por uno calculado desde un producto global de LOLA con el algoritmo de TERRAIN-02.
- **Rama sugerida:** `feat/horizonte-lola-global`.
- **Dependencias:** TERRAIN-02, CORE-01.
- **Archivos afectados:** manifiesto del producto global, scripts de descarga y horizonte, `lib/horizon-lola.js`, tabla `lola-horizons.js`, efemérides de esos dos sitios con altura medida, pruebas y docs.
- **Criterios de aceptación:** los dos sitios con horizonte `source = "lola"` y resolución en `meta`; producto citado con DOI, versión y MD5; tabla reproducible; comparación antes/después y efecto en luz y comunicación documentados; pruebas, build y CI verdes.
- **Fuera de alcance:** puntos propios al norte de −75°; cambiar coordenadas.

### DATA-01 — Validar coordenadas de sitios

- **Prioridad:** P0 · **Issue:** [#9](https://github.com/lucioooofacc/Selene-SpaceApps/issues/9).
- **Objetivo:** verificar coordenadas y procedencia de todos los sitios curados.
- **Rama sugerida:** `data/validar-sitios`.
- **Dependencias:** fuente oficial o cartográfica elegida; revisión de astronomía.
- **Archivos afectados:** `web/src/data/sites.js`, `docs/DECISIONES.md`, catálogo de fuentes.
- **Criterios de aceptación:** latitud/longitud, convención, precisión y referencia citadas por sitio; valores dudosos marcados; revisión de Teo/Facu/Lucio.
- **Fuera de alcance:** agregar sitios sin fuente.

### TEST-01 — Pruebas científicas

- **Prioridad:** P0 · **Issue:** [#10](https://github.com/lucioooofacc/Selene-SpaceApps/issues/10).
- **Objetivo:** ampliar las pruebas matemáticas y crear validaciones separadas contra fuentes reales.
- **Rama sugerida:** `test/modelos-cientificos`.
- **Dependencias:** ASTRO-01, TERRAIN-02 para validaciones reales.
- **Archivos afectados:** `web/tests/`, fixtures con procedencia y documentación.
- **Criterios de aceptación:** casos límite, unidades, continuidad, faltantes e incertidumbre cubiertos; fixtures citados; tolerancias justificadas; CI o ejecución documentada.
- **Fuera de alcance:** inventar valores NASA o corregir fórmulas sin decisión.

### CORE-01 — Integrar los modelos reales

- **Prioridad:** P0 · **Issue:** [#11](https://github.com/lucioooofacc/Selene-SpaceApps/issues/11).
- **Objetivo:** combinar efemérides y horizonte reales en escenarios sin romper la UI.
- **Rama sugerida:** `feat/integracion-modelos-reales`.
- **Dependencias:** ASTRO-01, TERRAIN-02, TEST-01.
- **Archivos afectados:** `analysis.js`, `main.js`, estado/caché y UI de estados.
- **Criterios de aceptación:** carga/cancelación/caché; resultados obsoletos descartados; procedencia propagada; métricas existentes funcionan; pruebas y build verdes.
- **Fuera de alcance:** rediseño visual.

### CORE-03 — Datos reales para los puntos propios del mapa

- **Prioridad:** P1 · **Issue:** [#59](https://github.com/lucioooofacc/Selene-SpaceApps/issues/59).
- **Objetivo:** que los puntos elegidos en el mapa usen el Sol y la Tierra de Horizons (trasladados) y un horizonte LOLA calculado en el navegador cuando estén al sur de −75°.
- **Rama sugerida:** `feat/datos-reales-puntos-propios`.
- **Dependencias:** CORE-01, TERRAIN-02.
- **Archivos afectados:** `lib/ephemeris.js`, `lib/horizon-lola.js`, `lib/polar-dem.js`, `lib/analysis.js`, script del DEM reducido, `public/data/terrain/`, carga en la interfaz y "Datos y fuentes".
- **Criterios de aceptación:** errores medidos contra los datos completos y documentados; procedencia y resolución visibles; fuera de cobertura, sintético/aproximado marcado; pruebas y build verdes.
- **Fuera de alcance:** mapa de calor (MAP-01); horizonte real fuera del polo sur.

### DATA-03 — Quitar los parámetros sintéticos de relieve de los sitios curados

- **Prioridad:** P2 · **Issue:** [#72](https://github.com/lucioooofacc/Selene-SpaceApps/issues/72).
- **Objetivo:** quitar `relief` y `elevationKm` de `data/sites.js`, que solo alimentan el horizonte sintético, cuando todos los sitios curados tengan horizonte LOLA.
- **Rama sugerida:** `data/quitar-relieve-sintetico`.
- **Dependencias:** TERRAIN-03.
- **Archivos afectados:** `data/sites.js`, `main.js` (coordinar con Lucio), `lib/terrain.js`, `lib/horizons.js`, pruebas que los usan, `docs/DECISIONES.md` (DEC-005), `PENDIENTES.md`.
- **Criterios de aceptación:** ningún sitio curado conserva esos campos; el horizonte sintético sigue funcionando para puntos propios sin datos; pruebas, build y CI verdes.
- **Fuera de alcance:** eliminar el horizonte sintético (sigue como respaldo).

### CORE-02 — Unificar criterios de visibilidad

- **Prioridad:** P0 · **Issue:** [#12](https://github.com/lucioooofacc/Selene-SpaceApps/issues/12).
- **Objetivo:** usar una única definición documentada de visibilidad en escenario, muestra y mapa de calor.
- **Rama sugerida:** `fix/criterios-visibilidad`.
- **Dependencias:** acuerdo científico sobre disco parcial y horizonte.
- **Archivos afectados:** `analysis.js`, pruebas, `docs/SCIENCE.md`.
- **Criterios de aceptación:** Sol/Tierra aplican políticas explícitas; mapa y escenario concuerdan para mismos datos/pasos; tolerancias probadas.
- **Fuera de alcance:** presupuesto real de enlace.

### UI-01 — Identificar fuentes y calidad de datos

- **Prioridad:** P0 · **Issue:** [#13](https://github.com/lucioooofacc/Selene-SpaceApps/issues/13).
- **Objetivo:** mostrar si un resultado es aproximado, sintético, real, incompleto o no disponible.
- **Rama sugerida:** `feat/calidad-datos-ui`.
- **Dependencias:** contrato de metadatos de CORE-01.
- **Archivos afectados:** i18n, paneles, mapa, estilos.
- **Criterios de aceptación:** etiquetas ES/EN accesibles; fuente/fecha/cobertura visibles; estados de carga/error/faltante; sin presentar aproximaciones como reales.
- **Fuera de alcance:** modificar modelos.

### DEPLOY-01 — Despliegue y validación final

- **Prioridad:** P0 · **Issue:** [#14](https://github.com/lucioooofacc/Selene-SpaceApps/issues/14).
- **Objetivo:** publicar una versión reproducible y comprobar la entrega.
- **Rama sugerida:** `chore/despliegue-final`.
- **Dependencias:** tareas P0 aceptadas; textos y atribuciones cerrados.
- **Archivos afectados:** configuración de despliegue, README y checklist.
- **Criterios de aceptación:** `npm test` y `npm run build`; URL pública; escritorio ≥1200 px revisado; enlaces/fuentes/idiomas verificados; commit/tag de entrega registrado.
- **Fuera de alcance:** cambios posteriores al cierre de Space Apps.

## P1 — Importantes

### UI-02 — Adaptar visualizaciones a modelos reales

- **Prioridad:** P1 · **Issue:** [#15](https://github.com/lucioooofacc/Selene-SpaceApps/issues/15).
- **Objetivo:** representar resolución, huecos y cambios asíncronos sin perder legibilidad.
- **Rama sugerida:** `design/visualizaciones-datos-reales`.
- **Dependencias:** CORE-01, UI-01.
- **Archivos afectados:** `web/src/ui/`, estilos e i18n.
- **Criterios de aceptación:** carga/error/faltantes visibles; escalas y leyendas correctas; teclado y movimiento reducido; validación visual de escritorio.
- **Fuera de alcance:** cambiar el sistema de diseño.

### MAP-01 — Adaptar el mapa de calor

- **Prioridad:** P1 · **Issue:** [#16](https://github.com/lucioooofacc/Selene-SpaceApps/issues/16).
- **Objetivo:** calcular el mapa con fuentes y criterios unificados sin bloquear la interfaz. Hoy la pestaña MAPA DE CALOR muestra elevación LOLA (UI-11, DEC-026); MAP-01 agrega el modo de iluminación calculada, sin quitar la elevación.
- **Rama sugerida:** `feat/mapa-calor-real`.
- **Dependencias:** CORE-01, CORE-02, TERRAIN-01.
- **Archivos afectados:** `analysis.js`, `ui/map.js`, worker/caché y pruebas.
- **Criterios de aceptación:** cálculo cancelable/cacheado; resolución y cobertura indicadas; sin red en bucles por celda; coherencia con escenarios puntuales.
- **Fuera de alcance:** mapa global de precisión cartográfica no necesario para la demo.

### CORE-04 — Horizonte LOLA regional para puntos propios

- **Prioridad:** P1 · **Issue:** [#104](https://github.com/lucioooofacc/Selene-SpaceApps/issues/104).
- **Objetivo:** que los puntos propios al norte de −75° dejen de usar el horizonte sintético. Decisión de Lucio (15/11/2026): horizonte interpolado del atlas global LOLA (MAP-02), rotulado como aproximado.
- **Rama sugerida:** `feat/horizonte-atlas-global`.
- **Dependencias:** MAP-02.
- **Archivos afectados:** `lib/heat-map.js`, `lib/analysis.js`, `ui/ephemerides.js`, `ui/provenance.js`, `ui/panorama.js`, `ui/places.js`, i18n y pruebas.
- **Criterios de aceptación:** el sintético queda solo como respaldo mientras cargan los datos o si fallan; la interfaz dice que el horizonte es de la zona y no del punto; coherencia medida con los horizontes de alta resolución; pruebas y build en verde.
- **Fuera de alcance:** horizonte exacto del punto fuera del polo (necesitaría un DEM global en la página principal).

### MAP-02 — Mapa de calor en toda la superficie lunar

- **Prioridad:** P1 · **Issue:** [#100](https://github.com/lucioooofacc/Selene-SpaceApps/issues/100).
- **Objetivo:** que las capas calculadas del mapa de calor (luz, Tierra, Sol + Tierra, viabilidad) cubran toda la Luna, no solo el casquete hasta −80°. Decisión del equipo (Lucio, 15/11/2026): horizonte LOLA global desde `LDEM_16` (PDS) fuera del casquete; Luna 3D coloreada entera y vista 2D polar sin cambios.
- **Rama sugerida:** `feat/mapa-calor-global`.
- **Dependencias:** MAP-01, TERRAIN-03.
- **Archivos afectados:** `lib/heat-map.js`, `lib/analysis.js`, `lib/horizon-lola.js`, script del atlas global, `ui/heat-layer.js`, `ui/map.js`, `ui/compute.js`/worker, i18n, pruebas y documentación.
- **Criterios de aceptación:** atlas global reproducible con MD5 de origen; el casquete sur conserva el atlas de 240 m; resolución y fuente de cada zona indicadas en el crédito; pruebas y build en verde.
- **Fuera de alcance:** horizonte de alta resolución fuera del polo sur; cambiar la vista 2D.

### I18N-01 — Revisar traducciones

- **Prioridad:** P1 · **Issue:** [#17](https://github.com/lucioooofacc/Selene-SpaceApps/issues/17).
- **Objetivo:** revisar equivalencia y claridad científica ES/EN.
- **Rama sugerida:** `i18n/revision-cientifica`.
- **Dependencias:** textos finales de UI-01/UI-02.
- **Archivos afectados:** `web/src/i18n/es.js`, `en.js`.
- **Criterios de aceptación:** mismas claves; revisión de Lucio/Cata; terminología y advertencias equivalentes; sin texto visible incrustado en JS/HTML.
- **Fuera de alcance:** nuevos idiomas.

## Frontend — Pendientes del diseño (DEC-020)

Tareas definidas por el equipo el 14/11/2026 a partir de `PENDIENTES.md`. No dependen de CORE-01.

### UI-03 — Corregir textos y navegación del encabezado

- **Prioridad:** P0 · **Issue:** [#21](https://github.com/lucioooofacc/Selene-SpaceApps/issues/21).
- **Objetivo:** corregir la ortografía heredada del Figma, quitar "Opción 4/5", confirmar el subtítulo "Latitud · Longitud" y resolver el color de la franja de 8 px.
- **Rama sugerida:** `fix/textos-navegacion`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `web/index.html`, `web/src/i18n/es.js`, `en.js`, `web/src/styles/main.css`, `docs/DECISIONES.md`.
- **Criterios de aceptación:** textos corregidos en ES/EN; menú con Misión, Comparar e Informe; franja con el color del Figma o el fondo vigente si el MCP no responde.
- **Fuera de alcance:** redactar textos nuevos más allá de las correcciones.

### UI-04 — Navegar el calendario con el teclado

- **Prioridad:** P1 · **Issue:** [#22](https://github.com/lucioooofacc/Selene-SpaceApps/issues/22).
- **Objetivo:** moverse entre los días del calendario con las flechas, Inicio/Fin y RePág/AvPág.
- **Rama sugerida:** `feat/calendario-teclado`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `web/src/ui/calendar.js`, estilos.
- **Criterios de aceptación:** las flechas mueven el foco y cambian de mes en los bordes; Enter/Espacio eligen; foco visible; Escape cierra y devuelve el foco al botón.
- **Fuera de alcance:** cambiar el diseño del calendario.

### UI-05 — Página de comparación detallada entre dos sitios

- **Prioridad:** P0 · **Issue:** [#23](https://github.com/lucioooofacc/Selene-SpaceApps/issues/23).
- **Objetivo:** página nueva que compara dos sitios elegidos con métricas técnicas del motor. "Comparar" y "Ver comparación detallada" llevan a ella.
- **Rama sugerida:** `feat/comparacion-sitios`.
- **Dependencias:** ninguna (usa `computeScenario`; con modelos reales se actualiza sola).
- **Archivos afectados:** `web/compare.html`, `web/src/compare.js`, `web/src/ui/compare.js`, `web/vite.config.js`, i18n, estilos.
- **Criterios de aceptación:** Vite multipágina; mismo encabezado y tokens; métricas tomadas de `lib/analysis.js` (la UI no calcula); datos aproximados marcados; ES/EN; teclado.
- **Fuera de alcance:** modelos científicos nuevos.

### UI-06 — Informe imprimible de la misión planificada

- **Prioridad:** P1 · **Issue:** [#24](https://github.com/lucioooofacc/Selene-SpaceApps/issues/24).
- **Objetivo:** "Opción 3" pasa a ser "Informe": imprime o guarda en PDF un informe con sitio, fechas, viabilidad, ventanas y avisos de datos aproximados.
- **Rama sugerida:** `feat/informe-imprimible`.
- **Dependencias:** UI-03 (menú).
- **Archivos afectados:** `web/src/ui/report.js`, estilos de impresión, i18n, `web/index.html`.
- **Criterios de aceptación:** el botón del menú abre la impresión; hoja A4 legible; ES/EN; incluye el aviso de modelo aproximado.
- **Fuera de alcance:** exportar a formatos distintos de la impresión del navegador.

### UI-07 — Luna en 3D con alternancia 2D en GLOBAL y POLO SUR

- **Prioridad:** P1 · **Issue:** [#25](https://github.com/lucioooofacc/Selene-SpaceApps/issues/25).
- **Objetivo:** reemplazar las imágenes de GLOBAL y POLO SUR por un modelo 3D de la Luna (three.js + CGI Moon Kit de NASA SVS), con opción de alternar a vistas 2D de fuentes NASA.
- **Rama sugerida:** `feat/luna-3d`.
- **Dependencias:** aprobación de three.js como dependencia (dada por el equipo el 14/11/2026).
- **Archivos afectados:** `web/src/ui/moon3d.js`, `web/src/ui/map.js`, `web/public/nasa/`, `web/package.json`, i18n, estilos, `docs/DATA_SOURCES.md`.
- **Criterios de aceptación:** esfera con textura LROC y relieve LOLA; sitios marcados y clic para elegir coordenadas; control 3D/2D accesible; fuentes citadas; respeto de `prefers-reduced-motion`.
- **Fuera de alcance:** mapa de calor calculado (MAP-01).

### UI-08 — Panorama fiel al horizonte del sitio

- **Prioridad:** P1 · **Issue:** [#26](https://github.com/lucioooofacc/Selene-SpaceApps/issues/26).
- **Objetivo:** que el relieve del panorama represente fielmente `scenario.horizon(az)` y acercar la iluminación al Figma. Con el horizonte LOLA (TERRAIN-02) se ve sin cambios en la UI.
- **Rama sugerida:** `design/panorama-relieve`.
- **Dependencias:** ninguna para la UI; la fidelidad real depende de TERRAIN-02.
- **Archivos afectados:** `web/src/ui/panorama.js`, estilos, i18n.
- **Criterios de aceptación:** perfil del horizonte sin recortar; escala vertical indicada; etiqueta de horizonte sintético mientras no haya LOLA; Sol y Tierra tapados por el relieve correcto.
- **Fuera de alcance:** calcular el horizonte LOLA (TERRAIN-01/02).

### UI-09 — Corregir alineaciones y desbordes de la interfaz

- **Prioridad:** P0 · **Issue:** [#35](https://github.com/lucioooofacc/Selene-SpaceApps/issues/35).
- **Objetivo:** corregir columnas desalineadas, cajas que se salen de su contenedor, elementos descentrados y superposiciones.
- **Rama sugerida:** `design/ajustes-layout`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `web/src/styles/main.css`, `compare.css`, `web/src/ui/map.js`, `web/index.html`.
- **Criterios de aceptación:** márgenes laterales iguales; ninguna caja sale de su contenedor; menú y pestañas centrados; sin superposiciones; revisión en escritorio ≥ 1200 px.
- **Fuera de alcance:** rediseñar componentes o cambiar la paleta.

### UI-10 — Modal de configuración: accesibilidad y paleta para daltonismo

- **Prioridad:** P1 · **Issue:** [#37](https://github.com/lucioooofacc/Selene-SpaceApps/issues/37).
- **Objetivo:** modal del engranaje con idioma, paleta apta para daltonismo, alto contraste, reducir movimiento y vista del mapa por defecto.
- **Rama sugerida:** `feat/configuracion`.
- **Dependencias:** UI-09 (comparte estilos e HTML).
- **Archivos afectados:** `web/src/ui/settings.js`, `web/src/styles/settings.css`, `web/src/main.js`, `web/src/compare.js`, `web/index.html`, `web/compare.html`, i18n.
- **Criterios de aceptación:** modal accesible (Escape cierra y devuelve el foco); opciones aplicadas al instante y recordadas; verde/rojo → azul/naranja en estados y barras; ES/EN; misión y comparación.
- **Fuera de alcance:** recolorear la imagen del mapa de calor; tamaño de letra.

### UI-11 — Mapa de calor con elevación real de LOLA y vista 3D física

- **Prioridad:** P1 · **Issue:** [#42](https://github.com/lucioooofacc/Selene-SpaceApps/issues/42).
- **Objetivo:** reemplazar la imagen fija del MAPA DE CALOR por la elevación LOLA, coloreada con leyenda en km y paleta compatible con el modo para daltonismo, y sumar una vista 3D tipo mapa físico.
- **Rama sugerida:** `feat/mapa-elevacion`.
- **Dependencias:** ninguna bloqueante; relación con TERRAIN-01 (#39) y MAP-01 (#16).
- **Archivos afectados:** `web/scripts/build-lola-maps.mjs`, `web/public/nasa/`, `web/src/data/lola-maps.js`, `web/src/ui/elevation.js`, `map.js`, `moon3d.js`, `settings.js`, `index.html`, estilos, i18n.
- **Criterios de aceptación:** datos citados y procedimiento reproducible; leyenda en km; paletas estándar y para daltonismo; 2D con la proyección de los marcadores; vista 3D física; ES/EN; sin presentarlo como mapa de iluminación.
- **Fuera de alcance:** mapa de iluminación (MAP-01); horizonte topográfico (TERRAIN-02).

### DOC-01 — Sincronizar documentación con la interfaz y registrar el despliegue

- **Prioridad:** P1 · **Issue:** [#44](https://github.com/lucioooofacc/Selene-SpaceApps/issues/44).
- **Objetivo:** alinear `ARCHITECTURE.md`, `TASKS.md`, `web/src/ui/AGENTS.md` y el README con la interfaz actual y documentar el sitio publicado en Vercel.
- **Rama sugerida:** `docs/sincronizar-despliegue`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `README.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `web/src/ui/AGENTS.md`, `PENDIENTES.md`.
- **Criterios de aceptación:** sin menciones desactualizadas; URL y configuración de Vercel documentadas; reglas de UI al día.
- **Fuera de alcance:** validación final de la entrega (DEPLOY-01).

### UI-12 — Guardar la selección de la misión en la URL

- **Prioridad:** P1 · **Issue:** [#46](https://github.com/lucioooofacc/Selene-SpaceApps/issues/46).
- **Objetivo:** que la misión lea y escriba sitio y fechas en la URL, para volver desde la comparación sin perder la selección, imprimir el informe de los sitios comparados y compartir enlaces.
- **Rama sugerida:** `feat/url-estado`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `web/src/ui/links.js`, `web/src/main.js`, `web/src/compare.js`, `web/compare.html`, `web/tests/links.test.js`.
- **Criterios de aceptación:** la misión restaura y actualiza la URL; los enlaces desde la comparación conservan el sitio A y las fechas; lo inválido se ignora; pruebas del parseo.
- **Fuera de alcance:** guardar el instante de la línea de tiempo o la pestaña del mapa.

### UI-13 — Categorías para rankear sitios y pestaña ELEVACIÓN

- **Prioridad:** P1 · **Issue:** [#49](https://github.com/lucioooofacc/Selene-SpaceApps/issues/49).
- **Objetivo:** categorías para rankear "Mejores lugares" (global, interés científico, comunicación, luz) y renombrar la pestaña MAPA DE CALOR a ELEVACIÓN.
- **Rama sugerida:** `feat/ranking-categorias`.
- **Dependencias:** ninguna; los rasgos científicos quedan pendientes de validar por astronomía.
- **Archivos afectados:** `web/src/data/site-traits.js`, `web/src/lib/ranking.js`, `web/src/ui/places.js`, `web/src/ui/provenance.js`, `web/index.html`, estilos, i18n, `web/tests/ranking.test.js`.
- **Criterios de aceptación:** selector accesible; comunicación y luz con métricas del motor; ciencia con rasgos citados y aviso de validación pendiente; pestaña renombrada en ES/EN; pruebas.
- **Fuera de alcance:** modificar `sites.js` o crear métricas científicas nuevas.

### UI-14 — Mostrar el horizonte LOLA real en la interfaz

- **Prioridad:** P1 · **Issue:** [#52](https://github.com/lucioooofacc/Selene-SpaceApps/issues/52).
- **Objetivo:** vista previa del horizonte LOLA (TERRAIN-02) en el panorama y la comparación mientras el cálculo usa el sintético, resumen en "Datos y fuentes" y marcas de baja confianza y truncamiento cuando CORE-01 lo conecte.
- **Rama sugerida:** `feat/horizonte-lola-ui`.
- **Dependencias:** TERRAIN-02 (#8, PR #50).
- **Archivos afectados:** `web/src/ui/lola.js`, `panorama.js`, `provenance.js`, `compare.js`, estilos, i18n, `web/tests/lola-ui.test.js`.
- **Criterios de aceptación:** vista previa marcada como tal; resumen LOLA; marcas por azimut; sitios sin cobertura indicados; ES/EN.
- **Fuera de alcance:** conectar el horizonte en `analysis.js` (CORE-01).

### UI-15 — Tarjetas con período claro y elegir una hora

- **Prioridad:** P1 · **Issue:** [#57](https://github.com/lucioooofacc/Selene-SpaceApps/issues/57).
- **Objetivo:** distinguir las tarjetas de misión (VIABLE/INVIABLE) de las instantáneas (VISIBLE/OCULTO) y permitir elegir una fecha y hora para ver si el Sol y la Tierra son visibles.
- **Rama sugerida:** `feat/tarjetas-hora`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `web/src/ui/params.js`, `web/src/ui/timeline.js`, `web/index.html`, estilos, i18n.
- **Criterios de aceptación:** período visible en cada tarjeta; selector UTC acotado a la misión con respuesta de visibilidad; ES/EN.
- **Fuera de alcance:** cambiar los criterios de viabilidad.

## P2 — Opcionales

### UI-16 — Claridad para quien no conoce el proyecto

- **Prioridad:** P1 · **Issue:** [#102](https://github.com/lucioooofacc/Selene-SpaceApps/issues/102).
- **Objetivo:** que alguien externo entienda la página. Notas de Lucio (15/11/2026): sin fechas no se muestra el top 5 de lugares y sin sitio no se muestra el de fechas; ayuda en cada tarjeta y recorrido guiado; leyenda del panorama con un renglón por dato.
- **Rama sugerida:** `feat/claridad-interfaz`.
- **Dependencias:** ninguna.
- **Archivos afectados:** `index.html`, `ui/help.js`, `styles/help.css`, `ui/places.js`, `ui/panorama.js`, `main.js`, i18n.
- **Criterios de aceptación:** ayuda y recorrido operables con teclado y en ES/EN; textos en oraciones naturales; nada de datos por defecto presentados como elección del usuario; pruebas y build en verde.
- **Fuera de alcance:** rediseñar la distribución del Figma.

### PERF-01 — Worker y caché persistente

- **Prioridad:** P2 · **Issue:** [#18](https://github.com/lucioooofacc/Selene-SpaceApps/issues/18).
- **Objetivo:** aislar cálculos intensivos y reutilizar resultados entre sesiones.
- **Rama sugerida:** `perf/worker-cache`.
- **Dependencias:** CORE-01 y esquema estable de versión.
- **Archivos afectados:** worker, caché, `main.js`, pruebas.
- **Criterios de aceptación:** UI no bloqueada; invalidación por versión/fuente; límites de almacenamiento y recuperación de errores.
- **Fuera de alcance:** infraestructura de servidor.

### SCIENCE-02 — Refinar cruces temporales

- **Prioridad:** P2 · **Issue:** [#19](https://github.com/lucioooofacc/Selene-SpaceApps/issues/19).
- **Objetivo:** interpolar o buscar con mayor precisión amaneceres, ocasos y Earthset.
- **Rama sugerida:** `feat/refinar-ventanas`.
- **Dependencias:** CORE-02 y fuentes reales estables.
- **Archivos afectados:** `analysis.js`, pruebas y documentación.
- **Criterios de aceptación:** método/tolerancia documentados; comparación contra paso de 10 min; ventanas ordenadas y dentro de cobertura.
- **Fuera de alcance:** planificación operativa certificada.

