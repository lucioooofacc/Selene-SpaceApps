# Registro de decisiones

Formato y reglas en `AGENTS.md` (sección 3). Las decisiones no se borran: si cambian, se marcan como reemplazadas.

> **Renumeración (integración de `feat/web-v1` en `main`, 14/11/2026):** las ramas usaban los mismos números. Se mantuvieron DEC-011 a DEC-013 de `main` y las decisiones de la réplica del Figma pasaron de DEC-011…DEC-015 a **DEC-014…DEC-018** (en ese orden). Los PR #2 y #5 y las copias en `docs/prs/` citan los números viejos de su rama.

---

## DEC-000 — Organización del repositorio y flujo de trabajo

- **Contexto / problema:** la carpeta del proyecto no era un repositorio git y había un prototipo suelto (`index.html`) en la raíz. Las reglas del equipo piden trabajar en ramas y documentar decisiones.
- **Decisión:** usar el repo `lucioooofacc/Hubble27-SpaceApps` (luego migrado a `lucioooofacc/Selene-SpaceApps`, ver DEC-018) con `main` protegido por convención (solo entra código vía PR desde ramas `feat/`, `fix/`, `docs/`, etc.).
- **Solución aplicada:** `git init`, `AGENTS.md` con las reglas, `CLAUDE.md` que importa `AGENTS.md`, este registro de decisiones y el prototipo anterior movido a `legacy/prototipo-v0.html`. `mensajes.md` (chat interno del equipo) queda fuera del repo mediante `.gitignore`, porque Space Apps exige que el proyecto sea público.
- **Alternativas descartadas:** borrar el prototipo anterior (se pierde referencia); publicar `mensajes.md` (contiene organización interna).
- **Estado:** vigente.

---

## DEC-001 — Stack: Vite + JavaScript puro

- **Contexto / problema:** Figma Make generó una base en React + Vite + Tailwind; el prototipo v0 era un único HTML. El equipo pidió Vite + JS puro si el resultado era el mismo, y React si no.
- **Decisión:** Vite + JavaScript puro (ES modules), sin framework.
- **Solución aplicada:** carpeta `web/` con `src/lib` (cálculos), `src/ui` (render de cada panel), `src/state.js` (estado con suscripción) e `src/i18n`. El diseño no necesita nada que solo React resuelva: el resultado visual e interactivo es el mismo.
- **Alternativas descartadas:** React (más curva para el equipo y más dependencias); HTML sin build (se vuelve inmanejable al crecer).
- **Estado:** vigente.

## DEC-002 — Bilingüe ES/EN

- **Contexto / problema:** el jurado internacional evalúa en inglés; el equipo trabaja en español.
- **Decisión:** interfaz bilingüe con botón ES/EN.
- **Solución aplicada:** `web/src/i18n/es.js` y `en.js` con las mismas claves; `data-i18n` en el HTML y `t()` en JS. Idioma inicial: el guardado o el del navegador. Responsables de traducción: Lucio y Cata.
- **Estado:** vigente. **Pendiente:** revisión de los textos en inglés por el equipo de traducción.

## DEC-003 — Medidas redondeadas y tokens de diseño

- **Contexto / problema:** el Figma tiene medidas muy específicas (paddings de 17, 23 o 37 px, por ejemplo). `contexto.md` pide números redondos y comunes.
- **Decisión:** escala de espaciado 4/8/12/16/24/32/48/64, radios 8/12/16 y tipografía 12/14/16/20/24/32/48.
- **Solución aplicada:** `web/src/styles/tokens.css`. Se mantienen la estética del Figma (fondo oscuro, Sol ámbar, Tierra cian, etiquetas en monoespaciada) y su distribución (métricas | mapa | sitio, viabilidad, panorama, línea de tiempo y ventanas del ciclo). Tipografías: Inter y JetBrains Mono (el Figma usaba Arimo e Inter).
- **Estado:** reemplazada por DEC-014 (el equipo pidió replicar el Figma tal cual: paleta, tipografías y distribución del archivo).

## DEC-004 — Modelo astronómico aproximado (v1)

- **Contexto / problema:** la v1 no necesita datos reales, pero tiene que comportarse de forma coherente al cambiar sitio y fecha.
- **Decisión:** calcular el Sol y la Tierra con movimientos medios periódicos.
- **Solución aplicada:** `web/src/lib/astro.js`. El punto subsolar se mueve 360° por mes sinódico (29,53 d), con una declinación de ±1,54° (período de 346,6 d). La Tierra oscila por la libración: ±7,9° en longitud (27,55 d) y ±6,68° en latitud (27,21 d). Referencia: luna nueva del 06/01/2000 a las 18:14 UTC. La elevación y el azimut se obtienen por proyección vectorial. La fase de la Tierra es el complemento de la fase lunar.
- **Alternativas descartadas:** datos fijos inventados (no reaccionan a los cambios).
- **Estado:** vigente para v1. **Reemplazo previsto:** efemérides de JPL Horizons (mismas salidas: elevación y azimut por instante), sin tocar `src/ui/`. Desde DEC-023 existe el adaptador Horizons (`lib/horizons.js`) con fixtures validados; `analysis.js` todavía usa este modelo hasta CORE-01.

## DEC-005 — Horizonte sintético con depresión por altura

- **Contexto / problema:** sin atmósfera, el horizonte lo define el relieve. Con un horizonte plano, Shackleton daba 0 % de luz, cuando en la realidad es de los puntos más iluminados.
- **Decisión:** horizonte sintético por sitio (suma de ondas según el azimut), con un "relieve" característico y la depresión geométrica por altura: `acos(R / (R + h))`.
- **Solución aplicada:** `web/src/lib/terrain.js`. Las formas del horizonte dependen suavemente de la posición, para que el mapa de calor sea continuo. Con los parámetros actuales, el promedio anual de Shackleton queda en ~90 % de luz, coherente con la literatura.
- **Estado:** vigente para v1. **Reemplazo previsto:** horizonte calculado con mapas de elevación LOLA.

## DEC-006 — Sitios curados

- **Contexto / problema:** el desafío sugiere sitios Apollo, CLPS, Artemis y de otros países.
- **Solución aplicada:** `web/src/data/sites.js`: Shackleton, Malapert, Cabeus, IM-1 Odysseus, Chandrayaan-3, Chang'e 4 y Apollo 11.
- **Estado:** coordenadas **reemplazadas por DEC-019** (14/11/2026). Se mantiene la selección de los 7 sitios. Las coordenadas originales eran aproximadas (Shackleton, Malapert y Cabeus venían del Figma).

## DEC-007 — Criterios de viabilidad

- **Contexto / problema:** hace falta una conclusión simple y explicable para el público y para planificadores.
- **Decisión:** tres criterios, cada uno con nivel alto (2 pts), medio (1) o bajo (0): iluminación (% de tiempo con Sol visible; ≥ 65 / ≥ 35), potencia relativa promedio (≥ 0,35 / ≥ 0,15) y comunicación (% de tiempo con Tierra visible; ≥ 50 / ≥ 20). Total sobre 6: ≥ 5 = alta, ≥ 3 = media.
- **Solución aplicada:** `THRESHOLDS` en `web/src/lib/analysis.js`. Paneles verticales en latitudes de |60°| o más (potencia ∝ cos de la elevación) y horizontales en el resto (∝ sen de la elevación).
- **Estado:** vigente; los umbrales son ajustables por el equipo.

## DEC-008 — Mapa de calor calculado y vista global

- **Contexto / problema:** el Figma muestra un "mapa de calor" con manchas decorativas.
- **Decisión:** calcular el mapa de calor real del modelo: % de tiempo con Sol (o Tierra) visible en la ventana, entre −90° y −80°, en proyección azimutal equidistante (0° arriba, 90° E a la derecha). Se suma una vista global (imagen equirectangular de la Luna tomada del Figma) para los sitios lejos del polo.
- **Estado:** reemplazada por DEC-014 y DEC-016 (el mapa usa las tres pestañas e imágenes del Figma, no un mapa de calor calculado).

## DEC-009 — Panorama centrado en la Tierra y comparador

- **Contexto / problema:** en el polo la Tierra queda en azimut ~0°, justo en el borde de un panorama N→N, y se cortaba.
- **Decisión:** centrar el panorama de 360° en el azimut inicial de la Tierra (casi no se mueve en el cielo lunar) y exagerar la altura ×3. Además, un comparador de hasta 4 escenarios (sitio + fecha) con la "noche más larga" para dimensionar baterías, y botones de ±1 día lunar para el caso de "la misión se atrasa".
- **Estado:** reemplazada por DEC-014 (el comparador, los botones de ±1 día lunar y el panorama centrado en la Tierra no están en el diseño). El panorama ahora sigue la ilustración del Figma (DEC-017).

## DEC-010 — Solo escritorio (no responsive)

- **Contexto / problema:** se empezó a adaptar la web a celular y el equipo pidió deshacerlo: no es necesario que sea responsive.
- **Decisión:** la v1 se diseña solo para escritorio.
- **Solución aplicada:** se quitaron las media queries de tablet y celular de `main.css`; `body` tiene `min-width: 1200px` (por debajo aparece scroll horizontal). Se mantienen `prefers-reduced-motion` y los estados hover solo para mouse.
- **Estado:** vigente (decisión del equipo).

---

## DEC-011 — Documentación técnica por responsabilidad

- **Contexto / problema:** durante la hackathon trabajarán varias personas y agentes en paralelo. El contexto científico, los contratos, las fuentes y el backlog estaban repartidos entre código, decisiones y conversaciones, lo que aumenta el riesgo de duplicar trabajo o presentar aproximaciones como datos reales.
- **Decisión:** separar la documentación estable por responsabilidad: arquitectura y contratos (`ARCHITECTURE.md`), convenciones y limitaciones científicas (`SCIENCE.md`), fuentes (`DATA_SOURCES.md`) y backlog (`TASKS.md`). Agregar instrucciones locales para `src/lib/` y `src/ui/`, cargando solo el contexto relevante para cada tarea.
- **Solución aplicada:** nuevos documentos en `docs/`, archivos `AGENTS.md` específicos en el motor y la interfaz, y reglas generales de autonomía, concurrencia, contexto y entrega en el `AGENTS.md` raíz. `CLAUDE.md` se mantiene como punto de entrada que importa las reglas generales.
- **Alternativas descartadas:** concentrar todo en `AGENTS.md` (difícil de consultar y mantener); exigir leer todos los documentos en cada cambio menor (ralentiza tareas simples); documentar propuestas futuras como implementadas (confunde el estado real).
- **Estado:** vigente.

## DEC-012 — Pruebas nativas para invariantes del modelo v1

- **Contexto / problema:** los modelos aproximados y sintéticos no tenían una red mínima de seguridad para detectar cambios accidentales, y añadir un framework de pruebas aumentaría dependencias y preparación.
- **Decisión:** usar `node:test` y `node:assert` para probar contratos matemáticos y comportamiento existente, manteniendo separadas las futuras validaciones contra datos científicos reales.
- **Solución aplicada:** comando `npm test` y suites en `web/tests/` para normalización/rangos astronómicos, geometría conocida, determinismo y continuidad del horizonte, ventanas, métricas y mapas de calor. `web/tests/fixtures/` exige procedencia para futuros casos NASA.
- **Alternativas descartadas:** incorporar un framework externo (innecesario para la cobertura inicial); usar valores NASA sin consulta reproducible (no verificable); cambiar fórmulas existentes para satisfacer pruebas nuevas (ocultaría posibles errores científicos).
- **Estado:** vigente para la infraestructura inicial. Pendiente ampliar validaciones cuando se integren Horizons y LOLA.

## DEC-013 — Coordinación de tareas con GitHub Issues

- **Contexto / problema:** durante la hackathon trabajan en paralelo varias personas y agentes de IA. El estado y el responsable de cada tarea se escribían a mano en `docs/TASKS.md`. Como cada agente trabaja en su propia rama, esa información quedaba desactualizada en cada copia, generaba conflictos de merge y no permitía saber qué tareas estaban tomadas.
- **Decisión:** separar la definición técnica del estado operativo. `docs/TASKS.md` sigue siendo la fuente de verdad de qué es cada tarea; una Issue de GitHub por tarea es la fuente de verdad de su estado y responsable. Los estados se representan con etiquetas: sin etiqueta = `pendiente`; `estado: en curso`, `estado: bloqueada` y `estado: en revisión`; Issue cerrada por un PR integrado = `completada`.
- **Solución aplicada:** protocolo en `AGENTS.md`, sección 8 (*Coordinación de tareas*): consultar Issues y PR abiertos, confirmar con la persona responsable antes de tomar una tarea, registrar rama y archivos en la Issue, vincular el PR con `Closes #n`. En `docs/TASKS.md` se quitaron los estados manuales y cada tarea tiene una línea **Issue** (`sin crear` hasta que exista). Se agregaron `.github/ISSUE_TEMPLATE/task.yml` y `.github/pull_request_template.md`. Sin dependencias nuevas.
- **Alternativas descartadas:** mantener el estado en `TASKS.md` (conflictos entre ramas, datos desactualizados); un archivo de bloqueo o asignaciones en el repositorio (mismo problema de ramas y requiere commits solo para coordinar); GitHub Projects o herramientas externas (más configuración y no todos los agentes pueden acceder); un protocolo extenso con muchos pasos (demasiado costoso para una hackathon de dos días).
- **Limitaciones:** GitHub no impide que dos personas o agentes tomen la misma Issue al mismo tiempo; se resuelve con la regla de que gana la primera asignación o comentario y que se revisa la Issue antes de crear la rama. Los agentes sin acceso a GitHub dependen de que una persona consulte y actualice la Issue. Las etiquetas y las Issues hay que crearlas en GitHub; hasta entonces las tareas figuran como `sin crear`.
- **Estado:** vigente. Etiquetas e Issues #6 a #19 creadas el 14/11/2026, una por tarea del backlog.

## DEC-014 — Replicar el Figma tal cual

- **Contexto / problema:** la v1 tomó como base el código de Figma Make y algunos recortes de imágenes; cambió la paleta y agregó secciones que no estaban en el diseño (introducción, métricas, viabilidad, comparador, "cómo funciona", pie de página). El equipo pidió replicar el Figma exactamente.
- **Decisión:** la interfaz replica los frames "Vista 6" (encabezado) y "Vista 1" (cuerpo) del archivo, leídos con el MCP de Figma (`get_metadata`, `get_screenshot`, `get_design_context`).
- **Solución aplicada:**
  - Colores exactos del archivo en `web/src/styles/tokens.css` (`#04060B`, `#090C12`, `#0B1019`, `#0C111A`, `#F1EDE4`, dorado `#BFA780`, verde `#78B08B`, rojo `#C46B6D`, bordes `#2C3137`/`#2E3339`/`#242830`/`#20252C`, grises `#585E69`/`#7C828D`).
  - Tipografías del archivo: Arimo (regular, negrita y negrita itálica para "SELENE") e Inter (título de la sección inferior).
  - Íconos, marcadores, botón "+", logo e imágenes de la Luna descargados del Figma en `web/public/figma/`.
  - Distribución: "Mejores lugares para alunizar" | mapa (GLOBAL / MAPA DE CALOR / POLO SUR) | "Parámetros de la misión"; debajo, "Comportamiento de los cuerpos celestes" con panorama, línea de tiempo, Energía solar, Comunicación y Lectura del momento.
  - Medidas redondeadas a números enteros comunes (contexto.md); por ejemplo, la tarjeta de lugar de 475×108 pasa a 476×108 y la de parámetros de 408,8×113,2 a 408×112.
  - Se quitaron los módulos `compare.js`, `setup.js`, `panels.js` e `icons.js`.
- **Estado:** vigente.

## DEC-015 — Escalado del diseño al ancho de la ventana

- **Contexto / problema:** el Figma mide 1991 px de ancho, más que la mayoría de las pantallas, y el equipo pidió solo escritorio (DEC-010).
- **Decisión:** maquetar con las medidas del Figma sobre un escenario de 1992 px y escalarlo con `zoom` al ancho de la ventana.
- **Solución aplicada:** `fitStage()` en `web/src/main.js` aplica `zoom = anchoVentana / 1992` al `#stage` y lo recalcula al cambiar el tamaño de la ventana.
- **Alternativas descartadas:** reacomodar con media queries (cambia el diseño); `transform: scale` (no ajusta el alto del documento).
- **Estado:** vigente.

## DEC-016 — Extensión de las imágenes polares

- **Contexto / problema:** para ubicar los sitios en "MAPA DE CALOR" y "POLO SUR" hay que saber qué latitud cubre cada imagen. El Figma no lo indica.
- **Decisión:** suponer una proyección azimutal equidistante centrada en el polo sur, con 0° de longitud arriba y borde en −60° (`POLAR_EDGE_LAT` en `web/src/ui/map.js`).
- **Estado:** **pendiente de validar** por astronomía (Teo, Facu, Lucio) para MAPA DE CALOR. GLOBAL y POLO SUR ya no usan las imágenes del Figma (DEC-021): sus vistas 2D salen del CGI Moon Kit, con la misma proyección por construcción. Falta confirmar el origen y la licencia de la imagen del mapa de calor. Los sitios fuera de la imagen (como Apollo 11) no se marcan en las vistas polares; en el Figma aparecía marcado a modo de ejemplo.

## DEC-017 — Cómo se interpretó cada elemento del Figma

- **"Mejores lugares para alunizar":** el Figma repite "Apolo 11" como contenido de ejemplo. Se muestran los 5 sitios mejor rankeados (puntos de viabilidad y, a igualdad, más luz), con las mismas cuatro cifras: cobertura de enlace, altura del Sol, altura de la Tierra y luz acumulada. El subtítulo usa siempre "Latitud · Longitud" (el Figma mezclaba ese formato con "Azimut · margen").
- **Título del mapa:** "GLOBAL / MAPA DE CALOR / POLO SUR" son pestañas. El subrayado dorado marca la activa, como en los frames 1 y 2 del archivo, y cada pestaña usa su imagen y su posición.
- **Botón "+" ("Agregar coordenada como sitio"):** guarda el punto observado como sitio propio.
- **"Duración de misión (UTC)" / "Elegir":** abre el calendario de rango del Figma ("image 30"). Primer clic = inicio y segundo = fin, con un máximo de 30 días. Antes de elegir, se analizan 48 h desde el 14/11/2026, igual que la línea de tiempo del diseño (00:00–48:00).
- **"Ventana de análisis":** las cuatro tarjetas usan 3 segmentos (33/66/100 %). VIABLE significa 2 o más segmentos; INVIABLE, 1. Luz y Comunicación usan los niveles de DEC-007; Sol y Tierra, el margen sobre el relieve (oculto = 1, visible = 2, ≥ 3° = 3).
- **Sección inferior:** en el Figma son imágenes (panorama, línea de tiempo, tarjetas y lectura). Se reconstruyeron como componentes que funcionan, con el mismo aspecto. La Tierra queda a la derecha del panorama, como en la ilustración.
- **Menú "Opcion 3/4/5", botón de configuración y "Ver comparacion detallada":** se replican tal cual, pero todavía no tienen destino, porque el diseño no define esas pantallas. El globo cambia el idioma ES/EN.
- **Franja de 8 px entre encabezado y cuerpo ("Vista 7"):** sin datos de color (se agotó el límite del plan gratuito del MCP de Figma), se usó el color de fondo.
- **Datos aproximados:** para no agregar elementos visibles, el aviso de modelo aproximado quedó como tooltip del título "Parametros de la misión".
- **Estado:** vigente, salvo los destinos del menú, la ortografía y las imágenes de GLOBAL/POLO SUR, que pasan a DEC-020.

---

## DEC-018 — Migración a `Selene-SpaceApps` y commits sin co-autores

- **Contexto / problema:** el equipo no quiere co-autores ni atribuciones de herramientas en el historial ni en los PR.
- **Decisión:** prohibirlos (regla 5 de `AGENTS.md`, que en la integración absorbió la regla 6 de esta rama) y migrar el proyecto al repositorio `lucioooofacc/Selene-SpaceApps`.
- **Solución aplicada:** se quitaron las líneas `Co-Authored-By` de todos los commits de `main`, `feat/web-v1` y `design/figma-exacto` (sin tocar el contenido de los archivos). Se subieron las tres ramas al repo nuevo, que pasa a ser `origin`; el anterior se borró el 2026-11-14. `CLAUDE.md` se mantiene porque Claude Code lo usa para cargar las reglas de `AGENTS.md`. Los PR #1 y #2 se guardaron en `docs/prs/` y se recrearon en el repo nuevo sin atribuciones.
- **Estado:** vigente.

---

## DEC-019 — Coordenadas de sitios normalizadas a MOON_ME/DE421 (DATA-01)

- **Contexto / problema:** las coordenadas de `sites.js` eran aproximadas (DEC-006), sin marco declarado ni procedencia. ASTRO-01 y TERRAIN-01 dependen de saber exactamente qué punto y en qué marco está cada sitio.
- **Decisión:** usar una referencia común para todos los sitios curados: **MOON_ME / DE421** (la convención "Mean-Earth/polar axis of DE421" de LRO/LOLA), latitud **planetocéntrica**, longitud **este positiva en `[-180°, 180°)`**, esfera de referencia de **1737,4 km**. Facu (astronomía) confirmó el 14/11/2026 la identidad del punto y el valor de cada sitio, y se cotejaron con fuentes oficiales:

  | id | Punto | Tipo | Lat (°) | Lon E (°) | Fuente del valor | Marco declarado | Exactitud (fuente) | Confianza |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | `shackleton` | Shackleton Rim R04 | punto de estudio | -89.7668 | -171.87 | NASA Lunar Surface Data Book Rev A, tabla A2-2 | no (inferido de DEM LOLA) | 5–10 m → 10 | alta |
  | `malapert` | Malapert Massif R23 | punto de estudio | -85.9948 | -0.23578 | NASA Lunar Surface Data Book Rev A, tabla A2-2 | no (inferido de DEM LOLA) | 5–10 m → 10 | alta |
  | `cabeus` | LCROSS Centaur impact site | impacto | -84.6796 | -48.7093 | Marshall et al. (2012) + NSSDCA | sí (Mean Earth; NSSDCA: DE421) | 1σ 115 m lat × 44 m lon → 115 | alta |
  | `im1` | IM-1 Odysseus (LRA) | módulo | -80.1277 | 1.4357 | NASA PGDA LRA (NSSDCA: -80.13, 1.44) | no | no declarada | alta |
  | `chandrayaan3` | Chandrayaan-3 Vikram (LRA) | módulo | -69.3735 | 32.3199 | NASA PGDA LRA (NSSDCA: -69.3741, 32.32) | no | no declarada | alta |
  | `change4` | Chang'e 4 | módulo | -45.4561 | 177.5885 | NSSDCA (CNSA da otro valor, ver abajo) | sí (DE421 mean Earth) | no declarada | alta |
  | `apollo11` | Apollo 11 LM (etapa de descenso) | módulo | 0.67416 | 23.47314 | NSSDCA | sí (DE421 mean Earth) | no declarada | alta |

- **Fuentes oficiales (verificadas el 14/11/2026):**
  - NASA NSSDCA, tabla de impactos y naves en la Luna (convención DE421 mean Earth/polar rotation axis, Williams et al. 2008): https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html
  - NASA Lunar Surface Data Book Rev A (ACD-50044), tabla A2-2, R04 y R23: https://ntrs.nasa.gov/api/citations/20230007818/downloads/ACD-50044%20Lunar%20Surface%20Data%20Book%20Rev%20A.pdf?attachment=true
  - Marshall et al. (2012), *Locating the LCROSS Impact Craters*, Space Sci. Rev. 167:71–92: https://ntrs.nasa.gov/api/citations/20140005563/downloads/20140005563.pdf
  - NASA PGDA, *NASA GSFC Miniature Laser Retroreflector Arrays* (Cremons, 2025, doi:10.60903/GSFC-miniLRAs), LRA de IM-1 y Chandrayaan-3: https://pgda.gsfc.nasa.gov/products/101
  - CNSA, nota del 26/09/2019 sobre la localización del aterrizaje de Chang'e 4: https://www.cnsa.gov.cn/n6758823/n6758838/c6807583/content.html
  - LOLA RDR SIS (marco Mean-Earth/polar axis of DE421, planetocéntrico, 1737,4 km): https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/rdrsis.htm
  - USGS Gazetteer, contexto de los accidentes (el centro del accidente **no** es el punto del sitio): Shackleton https://planetarynames.wr.usgs.gov/Feature/5450 · Cabeus https://planetarynames.wr.usgs.gov/Feature/953 · Malapert https://planetarynames.wr.usgs.gov/Feature/3603
- **Solución aplicada:**
  - `web/src/lib/coordinates.js` (nuevo): `SITE_REFERENCE` (marco, efemérides, convenciones, radio; cita LOLA SIS), `normalizeLongitude()` (los valores ya en rango se devuelven sin tocar para no introducir error de redondeo), `assertLatitude()` (valida sin recortar), `decimalPlaces()` y `quantizationMeters()` (resolución de representación de la cifra).
  - `web/src/data/sites.js`: coordenadas nuevas, normalizadas y validadas al cargar (`defineSite`). `SOURCE_URLS` reúne las URLs verificadas. Cada sitio agrega `point` (`name`, `type`: `lander` | `impact` | `study-point`), `provenance` (`confirmedBy`, `confirmedOn`, `reference`, `sourceFrameVerified`, `frameNote`, `urls`, `featureUrls`), `confidence` (`level`, `reason`) y `precision` (`accuracyM`, `accuracyBasis`). Se conservan `id`, `name`, `agency`, `relief` y `elevationKm`, así que la interfaz no cambia.
  - `web/tests/sites.test.js` (nuevo): referencia común, normalización (bordes ±180°, envoltura, no finitos), latitud, valores confirmados exactos, metadatos obligatorios, URLs solo de la lista verificada, sin referencias candidatas, exactitud tomada de la fuente, sitios con marco declarado, ids estables y resolución de la cifra.
- **Precisión de representación vs. exactitud de la fuente:** son dos cosas distintas y se guardan por separado.
  - *Resolución de representación*: lo que permite expresar la cifra publicada. Con 4–5 decimales es ≤ 3,03 m (1e-4° ≈ 3,03 m sobre 1737,4 km). Se calcula con `quantizationMeters()` y **no** se guarda en `accuracyM`.
  - *Exactitud de la fuente* (`precision.accuracyM`): solo se carga cuando la fuente la declara explícitamente, con la cita en `accuracyBasis`. Si la da por eje o como rango se toma el valor más desfavorable (Cabeus: 115 m; R04/R23: 10 m). Si no la declara, queda `null` (IM-1, Chandrayaan-3, Chang'e 4, Apollo 11).
  - NSSDCA dice que "la precisión del conocimiento de la ubicación se refleja en la precisión de las coordenadas" (0,001° ≈ 30 m). Es una indicación general de la tabla, no una exactitud por sitio, así que **no** se convierte en `accuracyM`: se registra como nota en `accuracyBasis`.
  - Ejemplo de por qué no coinciden: Cabeus tiene 4 decimales (≈ 3 m de resolución) y 115 m de incertidumbre 1σ.
- **Supuestos (a verificar por Teo, Facu, Lucio):**
  - **No se aplicó ninguna transformación de marco.** `sourceFrameVerified: true` solo cuando una fuente del valor declara Mean Earth (Cabeus, Chang'e 4, Apollo 11). En R04/R23 el marco se infiere: el Data Book no lo declara en la tabla, pero dice que las coordenadas salen de DEM LOLA de PGDA, que usan Mean Earth/DE421. En IM-1 y Chandrayaan-3, PGDA no declara el marco; NSSDCA (DE421 mean Earth) da valores coherentes (IM-1 redondeado; Chandrayaan-3 a ≈ 18 m).
  - IM-1 y Chandrayaan-3: el valor es la posición del retrorreflector láser (LRA) montado en el módulo, no el centro del módulo. Se considera equivalente a la escala de la aplicación. El LRA de IM-1 tuvo un despliegue fuera de lo nominal y no está verificado con LOLA; el de Chandrayaan-3 sí lo está.
  - **Chang'e 4, discrepancia entre fuentes:** CNSA informa 177,5991° E, 45,4446° S (Nature Communications, *Descent trajectory reconstruction and landing site positioning of Chang'E-4 on the lunar farside*, con cartografía de Chang'e-2), a ≈ 415 m del valor de NSSDCA. Se usa NSSDCA porque declara el marco común. No se mezclan ni se promedian.
  - La latitud es planetocéntrica y el radio de 1737,4 km es la esfera de referencia; no es un datum vertical ni la altura real del punto.
  - **Confianza:** "alta" en los 7 sitios: valores que coinciden con una fuente oficial; las salvedades (marco inferido o no declarado, discrepancia de CNSA) quedan en `confidence.reason` y `frameNote`.
  - `relief` y `elevationKm` siguen siendo parámetros sintéticos (DEC-005). Con el modelo actual, la luz anual de Shackleton pasa de ~96,2 % (−89,9°, 0°) a ~96,3 % (R04). DEC-005 sigue valiendo.
- **Alternativas descartadas:** convertir los valores entre marcos sin conocer el de origen (se agregaría un error en lugar de quitarlo); deducir la exactitud de la cantidad de decimales (confunde representación con exactitud); usar el valor de CNSA para Chang'e 4 (otra referencia cartográfica); usar el centro USGS del cráter como punto del sitio; citar referencias escritas de memoria sin verificarlas; recortar latitudes fuera de rango en lugar de rechazarlas (ocultaría errores de datos).
- **Estado:** **vigente.** Pendiente de validar por astronomía: el marco inferido de R04/R23 y el no declarado de IM-1/Chandrayaan-3.

## DEC-020 — Destinos del menú, ortografía y vistas del mapa (decisiones del equipo)

- **Contexto / problema:** DEC-017 dejó pendientes de definir varios elementos del Figma sin pantalla de destino y la ortografía heredada del archivo.
- **Decisión** (equipo, 14/11/2026, anotada en `PENDIENTES.md`):
  - "Ver comparación detallada" y "Comparar" llevan a una página nueva que compara dos sitios con métricas técnicas (UI-05).
  - "Opción 3" pasa a ser el informe imprimible de la misión planificada (UI-06). "Opción 4" y "Opción 5" se quitan.
  - Se corrigen las faltas de ortografía del Figma (UI-03).
  - "Mejores lugares" usa "Latitud · Longitud" (confirmado).
  - GLOBAL y POLO SUR pasan a un modelo 3D de la Luna con fuentes NASA y alternancia a vistas 2D (UI-07). MAPA DE CALOR queda como está hasta MAP-01.
  - El panorama dibuja fielmente el horizonte del motor (UI-08); el relieve real llega con TERRAIN-02 (Facundo).
  - Franja de 8 px: si el MCP de Figma sigue sin responder, se mantiene el color de fondo.
- **Solución aplicada:** una tarea y una Issue por bloque (#21 a #26) en `docs/TASKS.md`. Cada tarea registra acá su implementación.
  - **UI-08 (#26):** `src/ui/panorama.js` dibuja la cresta con `scenario.horizon(az)` cada 2 px (~0,6° de azimut), sin recortes. Se quitaron las dunas decorativas cercanas, que inventaban relieve; delante queda un suelo plano (zona de alunizaje). Se agregaron la línea de 0° (horizonte matemático), los puntos cardinales y una leyenda con la fuente del horizonte y la exageración vertical (12 px/° en vertical contra 1240/360 px/° en horizontal ≈ ×3,5). La leyenda dice "horizonte LOLA" si la función del horizonte trae `source === "lola"`; si no, "horizonte sintético". Esa propiedad opcional es una **propuesta para TERRAIN-02 (Facundo)**: hoy no existe y no cambia el contrato. La luz sigue la ilustración del Figma (`SELENE.fig`, imagen 1242×546): halo cálido más alto que ancho, brillo en el horizonte bajo el Sol y luz rasante sobre la cresta del lado del Sol, más fuerte con el Sol bajo. Un Sol o una Tierra más altos que el cielo dibujado (~31°) se muestran arriba con "↑" y su altura real, en lugar de recortarse en silencio.
  - **UI-06 (#24):** "Informe" (`data-report-link`) arma `#report` con `src/ui/report.js` desde el escenario vigente y llama a `window.print()`; desde el diálogo también se guarda en PDF. `src/styles/report.css` oculta la interfaz al imprimir y muestra el informe en A4: sitio, período, viabilidad y criterios, las 9 métricas de `lib/compare.js`, ventanas de luz y enlace (hasta 12 por tabla), aviso de modelo aproximado y fuentes. `beforeprint` lo actualiza también con Ctrl+P. Desde la comparación, "Informe" abre `index.html#informe`, que imprime al cargar.
  - **UI-05 (#23):** página `web/compare.html` (Vite multipágina, `vite.config.js`), con entrada `src/compare.js`, vista `src/ui/compare.js`, estilos `src/styles/compare.css` y enlaces `src/ui/links.js`. La selección viaja en la URL (`?a=&b=&start=&days=`): un sitio es un id curado o `pt:lat,lon`. A es el sitio activo de la misión y B, el mejor del ranking. La lógica comparativa está en `src/lib/compare.js` (con pruebas en `tests/compare.test.js`): reordena el resumen de `computeScenario`, sin fórmulas nuevas. Hay empate si la diferencia es menor que un paso de muestreo, 0,5 p. p., 0,01 de potencia relativa o 0,1°; esas tolerancias son de presentación y el equipo las puede ajustar. Sin diseño en el Figma, la página usa los tokens y componentes de la página de misión (A en dorado, B en el celeste de la Tierra).
  - **UI-03 (#21):** `es.js` corrige "Misión", "Parámetros", "Duración de misión", "Disponibilidad de comunicación" y "Ver comparación detallada". La clave `nav.option3` pasa a `nav.report` ("Informe" / "Report") y se quitan `option4` y `option5` de `index.html` y de los dos idiomas. La franja de 8 px mantiene el color de fondo: el MCP de Figma necesita la URL del archivo en figma.com, y en el repo solo está el `.fig` local.
- **Alternativas descartadas:** comparación como vista con hash dentro de la misma página (la página aparte es más simple y no necesita router); calcular el horizonte LOLA desde el frontend (duplicaría TERRAIN-01/02).
- **Estado:** vigente. **Pendiente:** destino del botón de configuración.

## DEC-021 — Luna 3D con three.js y vistas 2D del CGI Moon Kit

- **Contexto / problema:** el equipo pidió reemplazar las imágenes de GLOBAL y POLO SUR por un modelo 3D con fuentes NASA, con opción de alternar a 2D (DEC-020, UI-07). Las imágenes del Figma tenían origen, licencia y proyección sin confirmar (DEC-016).
- **Decisión:** usar three.js como dependencia (aprobada por el equipo el 14/11/2026) y las texturas del CGI Moon Kit de NASA SVS (color LROC WAC y relieve LOLA). Detalles de la fuente en `docs/DATA_SOURCES.md`.
- **Solución aplicada:**
  - `three@0.186.1` con versión exacta en `web/package.json` (la última con más de dos semanas publicada; la 0.187 tenía dos). Se carga con `import()` diferido: el chunk (~187 KB gzip) solo se descarga al abrir GLOBAL o POLO SUR en 3D.
  - `src/ui/moon3d.js`: esfera de 384×192 segmentos con `displacementMap`/`bumpMap` LOLA y escala vertical exagerada (`RELIEF_SCALE = 0.03` del radio, contra ~0,012 real). Luz ilustrativa (ambiente + luz rasante que acompaña a la cámara). Render a demanda, sin rotación automática. Arrastrar o flechas = girar; rueda o +/− = acercar; Enter = elegir el centro; clic = elegir coordenadas (raycast sobre la esfera base). Los marcadores son los mismos elementos HTML de `map.js`: se proyectan desde `data-lat`/`data-lon` y se ocultan del lado de atrás.
  - Convención: lon 0 → +X, lon 90° E → −Z, norte → +Y (coincide con las UV de `SphereGeometry` y la textura centrada en 0°). GLOBAL arranca en (0°, 0°); POLO SUR, en el polo con 0° de longitud arriba, igual que la vista 2D.
  - Vistas 2D: GLOBAL usa el mosaico equirectangular; POLO SUR se reproyecta en el navegador (`src/ui/polar2d.js`) a azimutal equidistante hasta `POLAR_EDGE_LAT = −60°`. Imagen y marcadores usan la misma fórmula, así que coinciden por construcción.
  - Selector 3D/2D (`state.mapMode`, por defecto "3d"), crédito de la fuente bajo el mapa y estado "Cargando mapa…". Sin WebGL, se vuelve a 2D con un aviso.
  - MAPA DE CALOR no cambia (imagen del Figma) hasta MAP-01.
- **Alternativas descartadas:** renderer propio sin dependencias (más tiempo y menos calidad); imágenes polares de LROC ya proyectadas (otra descarga, con un borde y una orientación que habría que hacer coincidir con `map.js`); textura de 2k (el polo sur se veía borroso en 2D).
- **Estado:** vigente. La imagen 2D del polo sur pierde detalle cerca de −90° porque sale de un mosaico de 4096 px (~11 px por grado); si hace falta más detalle, usar la de 8k o un mosaico polar de LROC.

## DEC-022 — Ajustes de alineación y desbordes sobre el Figma (UI-09)

- **Contexto / problema:** con las medidas del Figma, la fila superior iba de 16 a 1912 px (espacios entre columnas de 32 y 72 px) y la sección inferior, de 40 a 1944 px. "Lectura del momento" (608 px) se salía de la sección. Las coordenadas y el botón "+" pisaban la esquina redondeada del mapa, el crédito de la fuente chocaba con las coordenadas, el menú y la línea de las pestañas no estaban centrados, la última tarjeta de parámetros tocaba el borde y la leyenda del panorama se superponía con la antena.
- **Decisión:** priorizar alineación y contención sobre la posición exacta del Figma (pedido del equipo, 14/11/2026). Paleta, tipografías y componentes no cambian.
- **Solución aplicada** (`web/src/styles/main.css`, `compare.css`, `web/src/ui/map.js`, `web/index.html`):
  - Ancho útil de 40 a 1952 px en todas las secciones. Fila superior: 520 + 60 + 848 + 60 + 424; "Mejores lugares" estirado a 808 px para terminar a la misma altura que el mapa y los parámetros. Sección inferior: 1912 px, padding 40, columnas 1240 + 32 + 560; "Lectura del momento" de 560 px con el borde de las tarjetas. Se quitó el `min-height` de 1248 px, que dejaba un vacío abajo.
  - Mapa: área de 600 px (antes 640) en MAPA DE CALOR y 3D. Las coordenadas quedan centradas abajo con el "+" a la derecha y el crédito centrado debajo, todo dentro de la tarjeta.
  - Pestañas con separadores iguales; `placeAccent()` ajusta la línea al ancho real del texto. El menú queda centrado en la página.
  - Parámetros: 8 px entre tarjetas. Leyenda del panorama arriba a la derecha, bajo el reloj, con fondo.
  - Comparación: mismos márgenes de 40 px y controles a todo el ancho.
- **Alternativas descartadas:** mantener las posiciones del Figma y solo recortar (seguían las cajas desalineadas).
- **Estado:** vigente. Ajusta DEC-014 en las medidas mencionadas.

## DEC-023 — Efemérides JPL Horizons: adaptador puro, adquisición fuera del navegador y caché versionada (ASTRO-01)

- **Contexto / problema:** el Sol y la Tierra salen de un modelo periódico aproximado (DEC-004). ASTRO-01 (#6) pide series verificables desde un observador en la superficie lunar, con consulta reproducible, unidades/marco/cobertura registrados, caché, faltantes y errores explícitos, comparación controlada con la fuente y sin peticiones por cuadro en la UI.
- **Decisión:**
  1. **Fuente:** API oficial de NASA/JPL Horizons v1.2, tabla `OBSERVER` con centro `coord@301` (sitio geodésico sobre la Luna, esfera 1737,4 km, polo `MEAN_ME`).
  2. **Perfil fijo y versionado** `selene-observer-v1`: `COORD_TYPE=GEODETIC`, `TIME_TYPE=UT`, `CAL_FORMAT=JD`, `ANG_FORMAT=DEG`, `APPARENT=AIRLESS`, `REF_SYSTEM=ICRF`, `QUANTITIES=4,10,13` (azimut/elevación aparentes, % iluminado, diámetro angular), `CSV_FORMAT=YES`, `ELEV_CUT=-90` (no se descartan filas bajo el horizonte).
  3. **Separación red / cálculo:** el módulo del navegador (`lib/horizons.js`) es puro: construye la consulta, interpreta y valida, pero no hace red ni importa Node. La adquisición es un script Node (`web/scripts/fetch-horizons.mjs`) que se corre antes, nunca desde el render ni desde bucles de análisis.
  4. **Altura obligatoria con base declarada:** `altitudeKm` + `altitudeBasis` (`measured-datum` | `assumed-zero-reference-sphere`). `elevationKm` de `sites.js` (sintético, DEC-005) se rechaza como altura.
  5. **Errores, no recortes:** faltantes `n.a.` → `null` contados en `coverage.missing`; valores fuera de rango, columnas inesperadas, filas faltantes, paso irregular o sitio/objetivo/perfil distintos de lo pedido → `HorizonsError` con `code`.
  6. **No se integra todavía en `analysis.js` ni en la UI:** la combinación con el horizonte y el manejo de carga/estados es CORE-01 (#11). DEC-004 sigue vigente para la interfaz.
- **Solución aplicada:**
  - `web/src/lib/horizons.js`: `normalizeRequest()` (sitio MOON_ME vía `coordinates.js`, intervalo en minuto exacto y dentro del rango de `Date` (±8,64e15 ms, si no `invalid-interval`), paso entero que divide el intervalo, máximo 50 000 filas), `buildQueryParams()` / `buildQueryUrl()` (orden fijo, valores entre comillas simples), `cacheKey()` (fuente, versión de API, versión de perfil, objetivo, lon/lat, altura y base, inicio, fin, paso), `unwrapApiResponse()` (firma y campo `error` de la API), `parseObserverTable()` (tabla `$$SOE`/`$$EOE`, encabezado, columnas, rangos, monotonía), `normalizeHorizons()` (valida contra la petición y devuelve `selene.horizons.observer/1` con `source`, `profile`, `request`, `frame`, `units`, `coverage`, `samples`, `assumptions`, `warnings`) y `jdToUnixMs()` (separa parte entera y fraccionaria para conservar precisión de milisegundos).
  - `web/scripts/fetch-horizons.mjs`: CLI con `--site` o `--lat/--lon`, `--alt-km` o `--assume-zero-altitude` (excluyentes, obligatorio uno), `--start/--stop` ISO con zona, `--step-min`, `--targets`, `--out` (por defecto `web/.cache/horizons`, ignorado por git), `--force` y `--offline`. Guarda el crudo **sin modificar** y su SHA-256, valida antes de escribir (una respuesta con error no entra en caché), revalida clave y hash al reutilizar la caché y mantiene `manifest.json`. Las respuestas HTTP fuera de 2xx no se cachean.
  - Fixtures en `web/tests/fixtures/horizons/` (Sol y Tierra desde Shackleton R04, 14–16/11/2026, paso 60 min, 49 filas, obtenidos el 14/11/2026 13:28 UTC) con `README.md` de procedencia.
  - Pruebas: `web/tests/horizons.test.js` (unitarias: validación de petición, perfil, URL, clave de caché, envoltura, parser, `n.a.`, rangos, discrepancias, módulo sin red) y `web/tests/horizons.fixture.test.js` (comparación exacta con la respuesta oficial).
- **Comparación controlada con la fuente:** tolerancia **0**: cada celda de la tabla oficial debe ser igual a la serie normalizada, el crudo debe conservar su SHA-256 y renormalizar debe dar exactamente el fixture. La tolerancia es cero porque solo se prueba el parseo; no se compara Horizons contra `astro.js` (eso corresponde a CORE-01/TEST-01). El sitio que Horizons dice haber usado se compara con tolerancia 1e-6° y 1e-6 km (Horizons devuelve la altura 0 como `1.92896e-13` y la longitud −171,87° como 188,13°).
- **Supuestos (a verificar por Teo, Facu, Lucio):**
  - **Altura 0 km sobre la esfera de 1737,4 km en los fixtures: SUPUESTO**, no medida. Falta una altura datum por sitio (dependencia de TERRAIN-01). Queda registrado en `assumptions` y en `altitudeBasis`.
  - Las coordenadas de `sites.js` (MOON_ME/DE421, DEC-019) se pasan **sin transformación** al sitio de Horizons, que usa `MEAN_ME (high precision)` con DE441. No se evaluó la diferencia entre ambas realizaciones del marco Mean Earth.
  - La elevación es respecto del plano tangente local (horizonte matemático): no incluye topografía. Los códigos de presencia solar (`*`) e interferencia (`i`) de Horizons tampoco consideran relieve y se guardan solo como referencia.
  - `APPARENT=AIRLESS` (sin refracción, correcto para la Luna); azimut/elevación son aparentes (tiempo de luz y aberración según Horizons).
  - JD UT de Horizons (UTC desde 1962) → Unix ms sin segundos intercalares, igual que el resto de la web.
  - Los fixtures cubren un intervalo posterior al último EOP medido (`eop.261113.p270209`, medido hasta 2026-11-13): Horizons usa EOP predichos. Se registra en `frame.eopCoverage`.
  - El diámetro angular de Horizons (segundos de arco) reemplazaría los radios fijos de `analysis.js` (0,27° Sol, 0,95° Tierra) recién en CORE-01; cambiar eso es una decisión científica aparte (CORE-02).
- **Alternativas descartadas:**
  - Consultar Horizons desde el navegador: depende de CORS y de la red durante la demo, y arriesga peticiones por cuadro.
  - Tabla `VECTORS` y cálculo local de azimut/elevación: agrega transformaciones de marco propias sin necesidad, ya que `OBSERVER` entrega azimut/elevación directamente.
  - Formato de texto sin CSV: parseo por columnas fijas más frágil.
  - Usar `elevationKm` como altura del observador: es un parámetro sintético (DEC-005).
  - Interpolar o poner 0 en faltantes: ocultaría huecos de cobertura.
  - SPICE local: más reproducible a largo plazo pero exige seleccionar y empaquetar kernels; queda como alternativa en `DATA_SOURCES.md`.
- **Estado:** **vigente** para el adaptador, la adquisición y la caché. Pendiente de validar por astronomía: altura de los sitios, equivalencia MOON_ME/DE421 ↔ MEAN_ME/DE441 y uso de los EOP predichos. La integración en `analysis.js` y la UI queda en CORE-01.
