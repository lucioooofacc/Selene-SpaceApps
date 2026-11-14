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
- **Objetivo:** calcular el mapa con fuentes y criterios unificados sin bloquear la interfaz.
- **Rama sugerida:** `feat/mapa-calor-real`.
- **Dependencias:** CORE-01, CORE-02, TERRAIN-01.
- **Archivos afectados:** `analysis.js`, `ui/map.js`, worker/caché y pruebas.
- **Criterios de aceptación:** cálculo cancelable/cacheado; resolución y cobertura indicadas; sin red en bucles por celda; coherencia con escenarios puntuales.
- **Fuera de alcance:** mapa global de precisión cartográfica no necesario para la demo.

### I18N-01 — Revisar traducciones

- **Prioridad:** P1 · **Issue:** [#17](https://github.com/lucioooofacc/Selene-SpaceApps/issues/17).
- **Objetivo:** revisar equivalencia y claridad científica ES/EN.
- **Rama sugerida:** `i18n/revision-cientifica`.
- **Dependencias:** textos finales de UI-01/UI-02.
- **Archivos afectados:** `web/src/i18n/es.js`, `en.js`.
- **Criterios de aceptación:** mismas claves; revisión de Lucio/Cata; terminología y advertencias equivalentes; sin texto visible incrustado en JS/HTML.
- **Fuera de alcance:** nuevos idiomas.

## Frontend — Pendientes del diseño (DEC-019)

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

## P2 — Opcionales

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

