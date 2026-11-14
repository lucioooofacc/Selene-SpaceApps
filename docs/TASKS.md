# Backlog de la hackathon

Estados válidos: `pendiente`, `en curso`, `bloqueada`, `en revisión`, `completada`. Todas las tareas comienzan sin asignar y no deben marcarse como completadas sin evidencia en código y pruebas.

## P0 — Imprescindibles

### ASTRO-01 — Integrar efemérides reales

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** sustituir las posiciones periódicas por series verificables del Sol y la Tierra.
- **Rama sugerida:** `data/efemerides-horizons`.
- **Dependencias:** definición de marco y contrato; acceso a Horizons; DATA-01.
- **Archivos afectados:** nuevo adaptador/caché en `web/src/lib/`, `analysis.js`, documentación y pruebas.
- **Criterios de aceptación:** consulta reproducible; unidades/marco/cobertura registrados; caché; errores y faltantes explícitos; comparación controlada con la fuente; UI sin peticiones por cuadro.
- **Fuera de alcance:** navegación de precisión, certificación de misión y topografía.

### TERRAIN-01 — Obtener y procesar datos LOLA

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** seleccionar y preparar un producto topográfico oficial para los sitios de demostración.
- **Rama sugerida:** `data/lola-dem`.
- **Dependencias:** DATA-01; selección de producto, datum y resolución.
- **Archivos afectados:** pipeline/datos nuevos, `docs/DATA_SOURCES.md`, metadatos y pruebas de ingestión.
- **Criterios de aceptación:** producto y versión citados; descarga reproducible o artefacto derivado verificable; coordenadas, ausencias y unidades validadas; tamaño apto para la demo.
- **Fuera de alcance:** descargar todo el archivo global en el navegador.

### TERRAIN-02 — Calcular horizonte topográfico real

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** producir `horizon(azimuth) -> elevation` desde el DEM y la curvatura lunar.
- **Rama sugerida:** `feat/horizonte-lola`.
- **Dependencias:** TERRAIN-01; marco/datum acordados.
- **Archivos afectados:** `web/src/lib/terrain.js` o adaptador nuevo, fixtures y pruebas.
- **Criterios de aceptación:** contrato público preservado o migrado explícitamente; continuidad 0°/360°; cobertura/ausencias visibles; casos geométricos y comparación visual documentados.
- **Fuera de alcance:** modelado de atmósfera o sombras del vehículo.

### DATA-01 — Validar coordenadas de sitios

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** verificar coordenadas y procedencia de todos los sitios curados.
- **Rama sugerida:** `data/validar-sitios`.
- **Dependencias:** fuente oficial o cartográfica elegida; revisión de astronomía.
- **Archivos afectados:** `web/src/data/sites.js`, `docs/DECISIONES.md`, catálogo de fuentes.
- **Criterios de aceptación:** latitud/longitud, convención, precisión y referencia citadas por sitio; valores dudosos marcados; revisión de Teo/Facu/Lucio.
- **Fuera de alcance:** agregar sitios sin fuente.

### TEST-01 — Pruebas científicas

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** ampliar las pruebas matemáticas y crear validaciones separadas contra fuentes reales.
- **Rama sugerida:** `test/modelos-cientificos`.
- **Dependencias:** ASTRO-01, TERRAIN-02 para validaciones reales.
- **Archivos afectados:** `web/tests/`, fixtures con procedencia y documentación.
- **Criterios de aceptación:** casos límite, unidades, continuidad, faltantes e incertidumbre cubiertos; fixtures citados; tolerancias justificadas; CI o ejecución documentada.
- **Fuera de alcance:** inventar valores NASA o corregir fórmulas sin decisión.

### CORE-01 — Integrar los modelos reales

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** combinar efemérides y horizonte reales en escenarios sin romper la UI.
- **Rama sugerida:** `feat/integracion-modelos-reales`.
- **Dependencias:** ASTRO-01, TERRAIN-02, TEST-01.
- **Archivos afectados:** `analysis.js`, `main.js`, estado/caché y UI de estados.
- **Criterios de aceptación:** carga/cancelación/caché; resultados obsoletos descartados; procedencia propagada; métricas existentes funcionan; pruebas y build verdes.
- **Fuera de alcance:** rediseño visual.

### CORE-02 — Unificar criterios de visibilidad

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** usar una única definición documentada de visibilidad en escenario, muestra y mapa de calor.
- **Rama sugerida:** `fix/criterios-visibilidad`.
- **Dependencias:** acuerdo científico sobre disco parcial y horizonte.
- **Archivos afectados:** `analysis.js`, pruebas, `docs/SCIENCE.md`.
- **Criterios de aceptación:** Sol/Tierra aplican políticas explícitas; mapa y escenario concuerdan para mismos datos/pasos; tolerancias probadas.
- **Fuera de alcance:** presupuesto real de enlace.

### UI-01 — Identificar fuentes y calidad de datos

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** mostrar si un resultado es aproximado, sintético, real, incompleto o no disponible.
- **Rama sugerida:** `feat/calidad-datos-ui`.
- **Dependencias:** contrato de metadatos de CORE-01.
- **Archivos afectados:** i18n, paneles, mapa, estilos.
- **Criterios de aceptación:** etiquetas ES/EN accesibles; fuente/fecha/cobertura visibles; estados de carga/error/faltante; sin presentar aproximaciones como reales.
- **Fuera de alcance:** modificar modelos.

### DEPLOY-01 — Despliegue y validación final

- **Prioridad / estado / responsable:** P0 · pendiente · sin asignar.
- **Objetivo:** publicar una versión reproducible y comprobar la entrega.
- **Rama sugerida:** `chore/despliegue-final`.
- **Dependencias:** tareas P0 aceptadas; textos y atribuciones cerrados.
- **Archivos afectados:** configuración de despliegue, README y checklist.
- **Criterios de aceptación:** `npm test` y `npm run build`; URL pública; escritorio ≥1200 px revisado; enlaces/fuentes/idiomas verificados; commit/tag de entrega registrado.
- **Fuera de alcance:** cambios posteriores al cierre de Space Apps.

## P1 — Importantes

### UI-02 — Adaptar visualizaciones a modelos reales

- **Prioridad / estado / responsable:** P1 · pendiente · sin asignar.
- **Objetivo:** representar resolución, huecos y cambios asíncronos sin perder legibilidad.
- **Rama sugerida:** `design/visualizaciones-datos-reales`.
- **Dependencias:** CORE-01, UI-01.
- **Archivos afectados:** `web/src/ui/`, estilos e i18n.
- **Criterios de aceptación:** carga/error/faltantes visibles; escalas y leyendas correctas; teclado y movimiento reducido; validación visual de escritorio.
- **Fuera de alcance:** cambiar el sistema de diseño.

### MAP-01 — Adaptar el mapa de calor

- **Prioridad / estado / responsable:** P1 · pendiente · sin asignar.
- **Objetivo:** calcular el mapa con fuentes y criterios unificados sin bloquear la interfaz.
- **Rama sugerida:** `feat/mapa-calor-real`.
- **Dependencias:** CORE-01, CORE-02, TERRAIN-01.
- **Archivos afectados:** `analysis.js`, `ui/map.js`, worker/caché y pruebas.
- **Criterios de aceptación:** cálculo cancelable/cacheado; resolución y cobertura indicadas; sin red en bucles por celda; coherencia con escenarios puntuales.
- **Fuera de alcance:** mapa global de precisión cartográfica no necesario para la demo.

### I18N-01 — Revisar traducciones

- **Prioridad / estado / responsable:** P1 · pendiente · sin asignar.
- **Objetivo:** revisar equivalencia y claridad científica ES/EN.
- **Rama sugerida:** `i18n/revision-cientifica`.
- **Dependencias:** textos finales de UI-01/UI-02.
- **Archivos afectados:** `web/src/i18n/es.js`, `en.js`.
- **Criterios de aceptación:** mismas claves; revisión de Lucio/Cata; terminología y advertencias equivalentes; sin texto visible incrustado en JS/HTML.
- **Fuera de alcance:** nuevos idiomas.

## P2 — Opcionales

### PERF-01 — Worker y caché persistente

- **Prioridad / estado / responsable:** P2 · pendiente · sin asignar.
- **Objetivo:** aislar cálculos intensivos y reutilizar resultados entre sesiones.
- **Rama sugerida:** `perf/worker-cache`.
- **Dependencias:** CORE-01 y esquema estable de versión.
- **Archivos afectados:** worker, caché, `main.js`, pruebas.
- **Criterios de aceptación:** UI no bloqueada; invalidación por versión/fuente; límites de almacenamiento y recuperación de errores.
- **Fuera de alcance:** infraestructura de servidor.

### SCIENCE-02 — Refinar cruces temporales

- **Prioridad / estado / responsable:** P2 · pendiente · sin asignar.
- **Objetivo:** interpolar o buscar con mayor precisión amaneceres, ocasos y Earthset.
- **Rama sugerida:** `feat/refinar-ventanas`.
- **Dependencias:** CORE-02 y fuentes reales estables.
- **Archivos afectados:** `analysis.js`, pruebas y documentación.
- **Criterios de aceptación:** método/tolerancia documentados; comparación contra paso de 10 min; ventanas ordenadas y dentro de cobertura.
- **Fuera de alcance:** planificación operativa certificada.

