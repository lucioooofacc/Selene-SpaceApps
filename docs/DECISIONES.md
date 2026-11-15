# Registro de decisiones

Formato y reglas en `AGENTS.md` (sección 3). Las decisiones no se borran: si cambian, se marcan como reemplazadas.

> **Renumeración (integración de `feat/web-v1` en `main`, 14/11/2026):** las ramas usaban los mismos números. Se mantuvieron DEC-011 a DEC-013 de `main` y las decisiones de la réplica del Figma pasaron de DEC-011…DEC-015 a **DEC-014…DEC-018** (en ese orden). Los PR #2 y #5 y las copias en `docs/prs/` citan los números viejos de su rama.
>
> **Renumeración (integración de `main` en `data/lola-dem`, 14/11/2026):** `main` ya usaba DEC-020 a DEC-023 (DEC-023: modal de configuración) y DEC-024 queda reservada para ASTRO, así que la decisión del producto LOLA (TERRAIN-01) pasó de DEC-021 a **DEC-025** (en un paso intermedio de esta rama figuró como DEC-024). El commit `c024d26` cita el número viejo.
>
> **Renumeración (integración de `main` en `feat/mapa-elevacion`, 14/11/2026):** la decisión del mapa de calor con elevación LOLA (UI-11) se había numerado DEC-024; como `main` ya tenía DEC-024 (ASTRO-01) y DEC-025 (TERRAIN-01), pasó a **DEC-026**.

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
- **Estado:** vigente para v1. **Reemplazo previsto:** efemérides de JPL Horizons (mismas salidas: elevación y azimut por instante), sin tocar `src/ui/`. Desde DEC-024 existe el adaptador Horizons (`lib/horizons.js`) con fixtures validados; `analysis.js` todavía usa este modelo hasta CORE-01.

## DEC-005 — Horizonte sintético con depresión por altura

- **Contexto / problema:** sin atmósfera, el horizonte lo define el relieve. Con un horizonte plano, Shackleton daba 0 % de luz, cuando en la realidad es de los puntos más iluminados.
- **Decisión:** horizonte sintético por sitio (suma de ondas según el azimut), con un "relieve" característico y la depresión geométrica por altura: `acos(R / (R + h))`.
- **Solución aplicada:** `web/src/lib/terrain.js`. Las formas del horizonte dependen suavemente de la posición, para que el mapa de calor sea continuo. Con los parámetros actuales, el promedio anual de Shackleton queda en ~90 % de luz, coherente con la literatura.
- **Estado:** vigente para v1. **Reemplazo previsto:** horizonte calculado con mapas de elevación LOLA. **Reemplazada parcialmente por DEC-032** (14/11/2026): los sitios curados al sur de −60° usan el horizonte LOLA; el sintético sigue para sitios propios, Chang'e 4, Apollo 11 y el mapa de calor. **Para los sitios curados, reemplazada por DEC-061 y DEC-063** (15/11/2026): los 7 usan LOLA y ya no tienen `relief` ni `elevationKm`; el sintético queda solo como respaldo de puntos sin horizonte LOLA, con `estimateRelief()`. **Desde DEC-068** (15/11/2026) los puntos propios fuera del polo usan el horizonte LOLA regional del atlas global, y el sintético solo se usa mientras cargan los datos o si fallan.

## DEC-006 — Sitios curados

- **Contexto / problema:** el desafío sugiere sitios Apollo, CLPS, Artemis y de otros países.
- **Solución aplicada:** `web/src/data/sites.js`: Shackleton, Malapert, Cabeus, IM-1 Odysseus, Chandrayaan-3, Chang'e 4 y Apollo 11.
- **Estado:** coordenadas **reemplazadas por DEC-019** (14/11/2026). Se mantiene la selección de los 7 sitios. Las coordenadas originales eran aproximadas (Shackleton, Malapert y Cabeus venían del Figma).

## DEC-007 — Criterios de viabilidad

- **Contexto / problema:** hace falta una conclusión simple y explicable para el público y para planificadores.
- **Decisión:** tres criterios, cada uno con nivel alto (2 pts), medio (1) o bajo (0): iluminación (% de tiempo con Sol visible; ≥ 65 / ≥ 35), potencia relativa promedio (≥ 0,35 / ≥ 0,15) y comunicación (% de tiempo con Tierra visible; ≥ 50 / ≥ 20). Total sobre 6: ≥ 5 = alta, ≥ 3 = media.
- **Solución aplicada:** `THRESHOLDS` en `web/src/lib/analysis.js`. Paneles verticales en latitudes de |60°| o más (potencia ∝ cos de la elevación) y horizontales en el resto (∝ sen de la elevación).
- **Estado:** **reemplazada por DEC-071** (15/11/2026): requisitos de misión en lugar de puntos.

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
- **Estado:** reemplazada por DEC-021 (GLOBAL y POLO SUR) y DEC-026 (MAPA DE CALOR); ninguna pestaña usa ya las imágenes del Figma. Texto original: GLOBAL y POLO SUR ya no usan las imágenes del Figma (DEC-021): sus vistas 2D salen del CGI Moon Kit, con la misma proyección por construcción. Falta confirmar el origen y la licencia de la imagen del mapa de calor. Los sitios fuera de la imagen (como Apollo 11) no se marcan en las vistas polares; en el Figma aparecía marcado a modo de ejemplo.

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

## DEC-023 — Modal de configuración: accesibilidad y paleta para daltonismo (UI-10)

- **Contexto / problema:** el botón del engranaje no tenía destino. El equipo decidió (anotado en `PENDIENTES.md`) un modal con accesibilidad, modo para daltonismo y otras opciones.
- **Decisión:** un `<dialog>` nativo, compartido por la misión y la comparación, con: idioma (ES/EN); colores estándar o aptos para daltonismo; alto contraste; reducir movimiento (por defecto sigue la preferencia del sistema operativo); y, solo en la misión, la vista del mapa en GLOBAL y POLO SUR (3D/2D).
- **Solución aplicada:**
  - `web/src/ui/settings.js`: arma el modal, aplica las opciones al instante con `data-palette`, `data-contrast` y `data-motion` en `<html>`, y las guarda en `localStorage` (`selene.settings`) como comodidad (si el navegador lo bloquea, funciona con los valores por defecto). "Restablecer" vuelve a los valores por defecto. Escape, "Listo", × o clic en el fondo cierran el modal y devuelven el foco al engranaje.
  - `web/src/styles/settings.css` (importado desde `main.css`): la paleta para daltonismo usa los colores de Okabe e Ito (azul `#56B4E9` para favorable, naranja `#E69F00` para desfavorable y amarillo `#F0E442` para intermedio). Cambia los tokens `--green`/`--red`, las etiquetas de estado y el punto de VIABLE/INVIABLE (un SVG del Figma con color fijo, que en este modo se dibuja con CSS). El alto contraste aclara `--muted`, `--muted-2`, los bordes y los segmentos apagados. Reducir movimiento anula transiciones y animaciones.
  - `main.js` aplica las opciones antes del primer dibujo y toma `mapMode` de la configuración; `compare.js` también las aplica. Textos en `settings.*` (ES/EN).
- **Alternativas descartadas:** tamaño de letra (el diseño se escala con `zoom` a 1992 px y rompería la grilla); recolorear la imagen del mapa de calor del Figma (es un bitmap; corresponde a MAP-01).
- **Estado:** vigente.

## DEC-024 — Efemérides JPL Horizons: adaptador puro, adquisición fuera del navegador y caché versionada (ASTRO-01)

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

## DEC-025 — Producto LOLA `LDEM_60S_240M_FLOAT` V2.1 + `LDEC_60S_240M` (TERRAIN-01)

- **Contexto / problema:** TERRAIN-01 (P0) pide un producto topográfico oficial citado con versión, descarga reproducible o artefacto verificable, coordenadas/ausencias/unidades validadas y tamaño apto para la demo. Los sitios australes del catálogo (DEC-019) llegan hasta −69,37° (Chandrayaan-3).
- **Decisión (requisito cerrado por el equipo):**
  - NASA PDS, data set `LRO-L-LOLA-4-GDR-V1.0`, DOI [10.17189/1520642](https://doi.org/10.17189/1520642).
  - DEM `LDEM_60S_240M_FLOAT` **V2.1** y mapa de conteos `LDEC_60S_240M` (misma grilla).
  - Cobertura nominal −90°..−60°, 240 m/píxel, 7760 × 7760, estereográfica polar esférica centrada en −90°, latitud planetocéntrica, longitud este positiva, marco "Mean Earth/Polar Axis of DE421", esfera de 1737,4 km.
  - DEM: float32 little-endian (`PC_REAL`, 32 bits), altura en **km** sobre la esfera de 1737,4 km (`SCALING_FACTOR = 1`, `OFFSET = 1737.4` es el radio). Conteos: int16 little-endian (`LSB_INTEGER`, 16 bits), número de mediciones LOLA usadas en cada píxel.
  - **`count = 0` ⇒ sin medición directa:** el DEM tiene un valor (interpolado) pero se marca `direct: false`, `confidence: "baja"`. No se inventan umbrales para `count > 0` (se marca `"medida"`).
  - Cubiertos: Shackleton, Malapert, Cabeus, IM-1 y Chandrayaan-3. Fuera de cobertura: Chang'e 4 (−45,46°) y Apollo 11 (hemisferio norte); se listan como excluidos, sin datos inventados.
- **Archivos e integridad** (URLs oficiales de PDS Geosciences, base `https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/`):

  | Archivo | Bytes | MD5 |
  | --- | --- | --- |
  | `float_img/ldem_60s_240m_float.img` | 240 870 400 | `45d376f634f0c4ad2bf628fd5f66b3c0` |
  | `float_img/ldem_60s_240m_float.lbl` | 4 877 | `113c40f0f2a9af1f5311365e3836d754` |
  | `float_img/ldem_60s_240m_float.xml` | 11 633 | `eff8f4de7ee6de290ee1e992a30f164b` |
  | `img/ldec_60s_240m.img` | 120 435 200 | `4b7340bc337009aa02b80a1bf9eeadd4` |
  | `img/ldec_60s_240m.lbl` | 3 822 | `d7952c6d113fb0aa66e2e29d6c5c0b35` |
  | `img/ldec_60s_240m.xml` | 10 639 | `31f38d6a20db7b2a35eccb016d092411` |

  Verificado el 2026-11-14: los seis archivos se descargaron con `download-lola.mjs` y sus MD5 coinciden (también con `md5sum`). Los tamaños de imagen son exactamente 7760² × 4 y 7760² × 2 bytes. Los parámetros de arriba se leyeron de las etiquetas `.lbl`.
- **Solución aplicada:**
  - `web/src/data/terrain/lola-ldem-60s-240m.js`: manifiesto del producto (DOI, versión, URLs, bytes, MD5, grilla, proyección). No contiene muestras.
  - `web/scripts/download-lola.mjs`: descarga los seis archivos del manifiesto (no acepta URLs arbitrarias), calcula MD5 en streaming sobre `<archivo>.part`, controla el tamaño y solo renombra si verifica; omite lo ya verificado; `--verify`, `--dry-run`, `--only labels`. Destino `web/data/raw/` (ignorado por git).
  - `web/scripts/prepare-lola.mjs`: verifica tamaño y MD5, lee por ventanas (sin cargar el raster entero) float32 LE + int16 LE, convierte km → m (redondeo a 1 mm) y escribe un JSON por sitio cubierto más `index.json` en `web/data/derived/lola-60s-240m/` (ignorado). Rechaza alturas no finitas y conteos negativos. Ventana por defecto ±64 px (≈ ±15 km), **provisoria**: el radio real lo define TERRAIN-02.
  - `web/src/lib/terrain-data.js`: proyección directa/inversa, cobertura, interpretación de conteos, validación de recortes y lectura del píxel más cercano. Puro, sin DOM ni red. No calcula horizonte.
  - Pruebas: `web/tests/terrain-data.test.js` (manifiesto, orientación, bordes publicados, ida y vuelta, cobertura de sitios, conteos) y `web/tests/lola-pipeline.test.js` (descarga simulada con MD5/tamaño/HTTP, lectura float32/int16, `count = 0`, exclusiones, bordes; y una prueba opcional con el producto real).
  - Fixture **sintético solo para pruebas** en `web/tests/fixtures/lola/synthetic-grid.mjs` (32 × 32 px de 60 km, generado en un directorio temporal). No está en `src/` ni se presenta como dato NASA.
- **Convenciones fijadas:**
  - Índices base 0: `line` (0 arriba) y `sample` (0 a la izquierda); centro del píxel en coordenadas enteras; offset de proyección 3879,5 (etiqueta).
  - Inversa (catálogo): `X = (s − 3879,5)·240`, `Y = −(l − 3879,5)·240`, `lon = atan2(X, Y)`, `lat = −90° + 2·atan(ρ / 2R)`. Directa: `ρ = 2R·tan((90° + lat)/2)`, `s = 3879,5 + ρ·sin(lon)/240`, `l = 3879,5 − ρ·cos(lon)/240`.
  - Cobertura: latitud ≤ −60° **y** píxel dentro de la grilla. Las esquinas del raster llegan a −48,49°, pero no se usan.
- **Supuestos / hallazgos a verificar por astronomía (Teo, Facu, Lucio):**
  - En `catalog/dsmap_polar.cat`, la ecuación **directa** publicada para el hemisferio sur (`R` con signo negativo, `X = R·sin(lon)`) invierte el signo de X respecto de su propia ecuación inversa y del texto ("90° E a la derecha"). Se implementó la versión consistente con la inversa y el texto. Comprobación empírica con el producto real: en el centro USGS de Shackleton (−89,67°, 129,78° E) el DEM da −2786 m (fondo del cráter); las posiciones espejadas en X o en Y dan +685 m y +750 m (fuera del cráter). Malapert da +4790 m y Cabeus −3832 m.
  - Las alturas son relativas a la esfera de 1737,4 km, no a un geoide; no se aplicó transformación de marco (sitios y producto están en MOON_ME/DE421, DEC-019).
  - Redondeo a 1 mm en los recortes: menor que la resolución float32 a esas alturas y muy por debajo de la exactitud vertical de LOLA.
- **Alternativas descartadas:** versionar el raster (~345 MiB); remuestrear a lat/lon (agrega error y no hace falta: la lib trabaja en la grilla nativa); aceptar una URL arbitraria en la descarga; tratar `count = 0` como dato medido; usar el producto int16 `LDEM_60S_240M.IMG` (el equipo eligió la versión float).
- **Estado:** **vigente.** Pendiente de validar por astronomía la orientación (hallazgo del catálogo) y de definir en TERRAIN-02 el radio de recorte y si los recortes reales se versionan para la demo.

## DEC-026 — MAPA DE CALOR con elevación real de LOLA y vista 3D física (UI-11)

- **Contexto / problema:** la pestaña MAPA DE CALOR mostraba una imagen fija del Figma, con origen, licencia y proyección sin confirmar (DEC-016), que no respondía a la paleta para daltonismo (DEC-023). El equipo pidió reemplazarla y sumar una vista 3D del terreno como mapa físico.
- **Decisión:** mostrar la elevación LOLA del CGI Moon Kit (`ldem_16.tif`), coloreada en el navegador con tinte hipsométrico y sombreado del relieve. Hay leyenda en km y paleta estándar (similar a la del Figma) o cividis (modo para daltonismo). Se suma el selector 3D/2D también en esta pestaña.
- **Solución aplicada:**
  - `web/scripts/build-lola-maps.mjs` (Node, sin dependencias) lee el TIFF, reproyecta el polo con la misma proyección que `map.js`, calcula el sombreado y guarda dos PNG más los metadatos (`src/data/lola-maps.js`). Detalles y rangos en `docs/DATA_SOURCES.md`.
  - `src/ui/elevation.js` colorea los PNG (tabla de 256 colores × sombreado) y cachea por paleta. `map.js` usa la imagen polar en 2D y, en 3D, `moon3d.setSurface("physical", canvas)` con el mapa global, centrado en el polo sur. La configuración emite `selene:palette` para recolorear al instante.
  - La leyenda muestra el rango del mapa visible (polar en 2D, global en 3D). El crédito aclara que el sombreado es ilustrativo y que **no es un mapa de iluminación** (eso sigue siendo MAP-01).
- **Alternativas descartadas:** `ldem_4` (polo borroso, ~120 px de radio); esperar al producto PDS de TERRAIN-01 (DEC-025: pesado, prepara recortes por sitio y en ese momento no estaba integrado); colorear offline (no permitiría cambiar la paleta).
- **Estado:** vigente. Reemplaza el uso de la imagen del Figma de DEC-016 en MAPA DE CALOR. **Pendiente:** regenerar el mapa desde `LDEM_60S_240M` (TERRAIN-01, DEC-025, ya integrado), si el equipo lo prefiere.

## DEC-027 — La selección de la misión vive en la URL (UI-12)

- **Contexto / problema:** al volver de la comparación a la misión se perdían el sitio y las fechas, e "Informe" desde la comparación imprimía la misión por defecto. Con el sitio publicado (https://selene-space-apps.vercel.app) también conviene poder compartir un enlace con un sitio elegido.
- **Decisión:** la página de misión lee y escribe `index.html?site=<sitio>&start=AAAA-MM-DD&days=N`, con el mismo formato de sitio que la comparación (id curado o `pt:lat,lon`). Las fechas solo se escriben si el usuario las eligió.
- **Solución aplicada:** `src/ui/links.js` suma `missionQuery`, `missionUrl` y `parseMissionQuery`, y comparte con la comparación la validación de fechas: día UTC real (descarta, por ejemplo, 2026-02-31) y de 1 a 30 días. `main.js` aplica la URL antes del primer dibujo, la normaliza (lo inválido se reemplaza por la selección real) y la actualiza con `history.replaceState` cuando cambian el sitio o las fechas. En `compare.html`, "Misión", "Volver a la misión" e "Informe" llevan el sitio A y las fechas. Pruebas en `tests/links.test.js`.
- **Alternativas descartadas:** `sessionStorage` (no sirve para compartir enlaces); guardar también el instante de la línea de tiempo y la pestaña del mapa (más ruido en la URL; se puede sumar después).
- **Estado:** vigente.

## DEC-028 — Procedencia de los sitios y calidad de los datos en la interfaz (UI-01 parcial)

- **Contexto / problema:** UI-01 (#13) pide mostrar si cada resultado es real, aproximado o sintético, y su fuente. DATA-01 cargó procedencia, confianza y exactitud por sitio (DEC-019), y quedó anotado "decidir si la interfaz muestra la procedencia y la confianza". El contrato de metadatos de CORE-01 todavía no existe.
- **Decisión** (pedido del equipo, 14/11/2026): mostrar ya lo que existe, sin esperar a CORE-01.
  - **Procedencia del sitio:** solo campos traducibles (tipo de punto, confianza, exactitud declarada, marco declarado o inferido, fuentes oficiales con enlace y fecha de confirmación). Las notas en prosa de `sites.js` están solo en español y no se muestran. Un punto elegido en el mapa figura como "Sin fuente".
  - **Calidad de los datos:** coordenadas (real si hay procedencia), Sol y Tierra (aproximado, DEC-004), horizonte (sintético, DEC-005; pasa a real si la función declara `source === "lola"`), imágenes del mapa (real, DEC-021/026) y umbrales (aproximado, DEC-007).
- **Solución aplicada:** `web/src/ui/provenance.js` arma los dos bloques. Se muestran en un modal "Datos y fuentes" (botón "i" en el panel de parámetros de la misión), en la comparación (procedencia plegable por sitio y panel de calidad) y en el informe imprimible. Las etiquetas usan los tokens de color, así que siguen la paleta para daltonismo. Textos en `quality.*` (ES/EN). El pie del informe dejó de decir que los sitios están "pendientes de validar".
- **Alternativas descartadas:** mostrar las notas en prosa (rompería el bilingüismo); esperar al contrato de CORE-01 (dejaba sin mostrar datos que ya están).
- **Estado:** vigente. **Pendiente (resto de UI-01, depende de CORE-01):** fuente, fecha y cobertura de efemérides y horizonte reales; estados de carga, error y faltante; píxeles LOLA con `count = 0` como interpolados (DEC-025). Completado: píxeles interpolados en DEC-031; efemérides y estados de carga en DEC-039.

## DEC-029 — Categorías del ranking de sitios y pestaña ELEVACIÓN (UI-13)

- **Contexto / problema:** el equipo pidió (`PENDIENTES.md`) categorías para rankear "Mejores lugares" (interés científico, comunicación terrestre, luz solar aprovechable) y cambiar el título "MAPA DE CALOR", porque la pestaña muestra elevación (DEC-026).
- **Decisión:**
  - Cuatro categorías: **Global** (orden anterior: puntos de viabilidad, después iluminación), **Ciencia**, **Comunicación** (% del tiempo con la Tierra visible, después la altura máxima de la Tierra) y **Luz** (potencia solar relativa promedio, después los minutos con Sol). Las tres últimas ordenan resultados que el motor ya calcula.
  - **Interés científico** no existe como dato. Se cuenta cuántos **rasgos con fuente citada** tiene cada sitio (decisión del equipo). Cabeus: hielo de agua y región en sombra permanente (Colaprete et al. 2010). Shackleton: junto a un cráter con fondo en sombra permanente (Zuber et al. 2012; ese trabajo no confirma hielo, así que no se le asigna). Malapert: región candidata de Artemis III (NASA, 28/10/2024). Chandrayaan-3: primeras mediciones in situ cerca del polo sur, con azufre (ISRO 2023). Chang'e 4: posible material del manto y cara oculta en la cuenca SPA (Li et al. 2019). Apollo 11: muestras traídas a la Tierra (NASA JSC). IM-1: sin rasgos cargados. **Pendiente de validar por astronomía; no es una métrica científica** (se aclara en la interfaz).
  - La pestaña pasa a **ELEVACIÓN / ELEVATION**. El identificador interno sigue siendo `heat` (estado, CSS) para no tocar código ajeno; solo cambia el texto visible.
- **Solución aplicada:** `web/src/data/site-traits.js` (rasgos y citas, separado de `sites.js` para no modificar el contrato de DATA-01); `web/src/lib/ranking.js` (`rankEntries`, puro, con desempate por nombre); `places.js` con selector tipo radiogroup (clic y flechas) y estado `placesCategory`. En "Ciencia", el subtítulo de cada tarjeta muestra los rasgos (máximo dos líneas, con el texto completo como tooltip). El modal "Datos y fuentes" suma "Interés científico" con las citas. Pruebas en `tests/ranking.test.js`.
- **Alternativas descartadas:** un puntaje científico ponderado (inventaría pesos); dejar la categoría deshabilitada hasta que astronomía defina criterios.
- **Estado:** vigente. **Pendiente:** validación de los rasgos por Teo, Facu y Lucio, y rasgos para IM-1 si corresponde.

## DEC-030 — Horizonte topográfico LOLA precalculado por sitio (TERRAIN-02)

- **Contexto / problema:** TERRAIN-02 (P0, #8) pide `horizon(azimuth) -> elevation` desde el DEM LOLA (DEC-025) y la curvatura lunar, con continuidad 0°/360° y cobertura/ausencias visibles. El raster pesa ~345 MiB y no puede descargarse ni recorrerse en el navegador.
- **Decisión:**
  - El horizonte se **precalcula fuera del navegador** para los sitios curados cubiertos y se versiona como tabla chica (~65 KB): `web/src/data/terrain/lola-horizons.js`. En el navegador solo se interpola.
  - Parámetros acordados con Facundo (14/11/2026): **D_max = 300 km**, observador a **2 m** sobre el terreno, **720 azimuts (0,5°)**, paso del rayo 120 m (medio píxel), sin distancia mínima.
  - **Curvatura exacta:** el terreno a distancia angular `δ = d/R` y radio `r = R + h` se ve desde el observador de radio `r₀ = R + h₀ + 2 m` con elevación `atan2(r·cos δ − r₀, r·sin δ)` (R = 1737,4 km). Los rayos siguen círculos máximos desde el sitio; las alturas se interpolan bilinealmente en la grilla estereográfica nativa. El horizonte es el máximo de esa elevación a lo largo del rayo.
  - **Calidad propagada por azimut:** distancia del punto que define el horizonte; baja confianza si ese punto usa algún píxel con `count = 0` (el valor del DEM se usa igual, no se pone a cero); distancia alcanzada por el rayo. Si el rayo sale de la cobertura (−60° o borde de la grilla) se corta ahí, sin extrapolar, y el horizonte de ese azimut es una **cota inferior**.
  - Sitios fuera de cobertura (Chang'e 4, Apollo 11) no tienen horizonte LOLA: `createLolaHorizon()` devuelve `null` y la tabla los lista como excluidos.
- **Solución aplicada:**
  - `web/src/lib/horizon-lola.js` (puro): `destination`, `elevationAngleDeg`, `createRasterSampler`, `computeHorizonProfile`, `summarizeProfile` y `createLolaHorizon(siteId)`. La función devuelta cumple el contrato `horizon(azimuth) -> elevation` (grados, interpolación lineal circular) y expone `horizon.source = "lola"` (propuesta de Lucio en #8, ya leída por `ui/panorama.js`), `horizon.meta` (producto, MD5, algoritmo, parámetros, resumen) y `horizon.detail(az)`.
  - `web/scripts/build-lola-horizons.mjs` (`npm run data:lola:horizons`): verifica tamaño y MD5 de los rasters, los carga enteros y escribe la tabla de forma determinista (sin fecha). `--svg` genera la comparación visual `docs/img/horizonte-lola.svg` (LOLA vs. sintético v1, marcas de `count = 0` y truncamiento).
  - Algoritmo versionado como `selene-lola-horizon/v1`; la tabla guarda algoritmo, parámetros y MD5 del producto.
  - Pruebas: `web/tests/horizon-lola.test.js` (grillas sintéticas en memoria: esfera lisa = depresión `acos(R/(R+h))`, anillo de altura conocida, montaña en un solo rumbo, `count = 0`, truncamiento, observador fuera de cobertura, determinismo, continuidad 0°/360°) y `web/tests/horizon-lola.table.test.js` (procedencia, forma, rangos, cobertura y, si están los rasters en `LOLA_RAW_DIR`, reproducción exacta de la tabla).
  - **No se tocó** `terrain.js`, `analysis.js` ni la UI: la integración es de CORE-01 (#11).
- **Resultados (producto real, 14/11/2026):**

  | Sitio | Suelo (m) | Horizonte mín / medio / máx (°) | `count = 0` | Truncado |
  | --- | --- | --- | --- | --- |
  | Shackleton R04 | 770,7 | 0,065 / 12,309 / 31,744 | 0 % | 0 % |
  | Malapert R23 | 4786,2 | −4,618 / 0,656 / 4,605 | 0 % | 0 % |
  | Cabeus (LCROSS) | −3830,9 | 1,072 / 6,054 / 11,316 | 0 % | 0 % |
  | IM-1 | 2576,3 | −0,216 / 5,024 / 11,078 | 0,1 % | 0 % |
  | Chandrayaan-3 | 529,7 | 0,383 / 1,335 / 2,455 | 4,0 % | 12,4 % (rayos al norte, borde −60°) |

  Comparación visual en `docs/img/horizonte-lola.svg`.
- **Hallazgo a validar por astronomía (Teo, Facu, Lucio) — Shackleton R04** (*resuelto en DEC-035: R04 es un centro de polígono; se usa R01*): con la coordenada de DEC-019 (−89,7668°, −171,87°) el DEM ubica el punto sobre la **pared interior** del cráter: la cresta (≈ 1730 m) está a ~2 km hacia el este (azimut 90–110°) y el terreno baja hacia el fondo al oeste-suroeste. Por eso el horizonte llega a ~31° entre 30° y 150° de azimut. No es un artefacto del píxel: ignorando el primer kilómetro el máximo sigue en ~31° (media 12,1°). La orientación del DEM está verificada (DEC-025). El marco de R04 figura como inferido (`sourceFrameVerified: false`); una diferencia MOON_PA/MOON_ME (~0,9 km) no alcanza por sí sola a explicar 2 km. Cuando CORE-01 integre este horizonte, la iluminación de Shackleton bajará respecto del ~90 % del modelo sintético (DEC-005). No se cambió la coordenada (corresponde a DATA-01).
- **Supuestos:** alturas sobre la esfera de 1737,4 km (sin geoide); 240 m/píxel limita el detalle a menos de ~0,5 km; la interpolación bilineal suaviza bordes en ±1 píxel; observador a 2 m (mástil o antena típica, no un vehículo concreto). Más allá de ~250 km la curvatura hace que el relieve lunar (≲ 10 km) no pueda levantar el horizonte de sitios bajos; 300 km da margen para horizontes negativos en cimas.
- **Alternativas descartadas:** calcular en el navegador (raster de ~345 MiB); versionar recortes de ±300 km (~25 MB por sitio); aproximar la curvatura con `d²/2R` (la fórmula exacta cuesta lo mismo); modificar `createHorizon()` (cambio de contrato y de resultados que corresponde a CORE-01); horizonte para sitios personalizados (requiere el raster en tiempo de ejecución: pendiente, PERF-01/CORE-01).
- **Estado:** vigente. Pendiente de validar por astronomía el hallazgo de Shackleton R04 y de comparar contra horizontes publicados (p. ej. Mazarico et al. 2011) si el equipo consigue los valores.

## DEC-031 — El horizonte LOLA real en la interfaz, antes y después de CORE-01 (UI-14)

- **Contexto / problema:** TERRAIN-02 (#50, DEC-030) precalcula el horizonte real de los cinco sitios curados al sur de −60°, pero conectarlo al cálculo es CORE-01 (#11, trabajo de motor). El equipo pidió aplicar en la interfaz los datos reales que ya existen.
- **Decisión:** no tocar `analysis.js`. Mostrar el horizonte LOLA como **vista previa**, marcada como tal, mientras el escenario use el sintético, y dejar la interfaz lista para cuando lo use.
- **Solución aplicada:**
  - `web/src/ui/lola.js` → `lolaForScenario(scenario)` devuelve el modo `active` (el escenario ya trae `horizon.source === "lola"`), `preview` (hay LOLA para el sitio, pero el cálculo usa el sintético) o `none` (sitio propio, o Chang'e 4 y Apollo 11, fuera de cobertura).
  - **Panorama:** en `preview`, el relieve LOLA se superpone con una línea punteada dorada y la leyenda aclara que el cálculo todavía usa el sintético. En los dos modos, los tramos con baja confianza (`count = 0`, rojo) o truncados por la cobertura (cota inferior, gris) se marcan con `horizon.detail(az)`.
  - **"Datos y fuentes":** bloque "Horizonte LOLA real" con el estado, la altura del suelo, el horizonte mínimo/medio/máximo, el % de azimuts de baja confianza y fuera de cobertura, y el producto con su DOI. La fila "Horizonte" de calidad distingue los tres casos.
  - **Comparación:** perfiles LOLA punteados sobre el gráfico del horizonte, con leyenda.
  - Pruebas en `tests/lola-ui.test.js`.
- **Hallazgo visible:** en Shackleton R04, el relieve LOLA llega a ~31° (la pared del cráter, ya señalado en DEC-030), mientras el cálculo sintético da el Sol visible. La vista previa lo deja a la vista hasta que astronomía revise la coordenada y CORE-01 conecte el horizonte.
- **Alternativas descartadas:** reemplazar el horizonte en `analysis.js` desde la interfaz (es CORE-01 y cambia todos los resultados publicados); esperar sin mostrar nada.
- **Estado:** vigente. Depende de que se integre el PR #50.

## DEC-032 — El cálculo usa el horizonte LOLA en los sitios curados cubiertos (CORE-01, parte A)

- **Contexto / problema:** el horizonte LOLA (TERRAIN-02, DEC-030) existía y la interfaz lo mostraba como vista previa (UI-14, DEC-031), pero `analysis.js` seguía calculando luz, potencia, comunicación y viabilidad con el horizonte sintético (DEC-005). CORE-01 (#11) se divide en dos partes por el plazo: **A**, horizonte real; **B**, efemérides JPL Horizons (rango acordado: nov 2026 – dic 2027, paso 1 h).
- **Decisión:** `computeScenario()` usa el horizonte LOLA cuando el sitio es curado, está en la tabla y sus coordenadas coinciden exactamente; si no, el sintético. No se extrapola LOLA a otros puntos.
- **Solución aplicada:**
  - `web/src/lib/analysis.js`: nueva `scenarioHorizon(site)`; `computeScenario()` la usa. Sitios con `custom: true`, ids desconocidos o coordenadas distintas de la tabla → sintético. `scenario.horizon.source === "lola"` hace que `ui/lola.js` pase de "vista previa" a "en uso" sin tocar la interfaz.
  - `web/src/lib/horizon-lola.js`: `horizon.meta` incluye `lat`/`lon` del perfil para esa comprobación.
  - Pruebas en `web/tests/analysis.test.js`: selección de horizonte (cubiertos, fuera de cobertura, propios, coordenadas distintas), `sampleAt` coherente y control físico de Cabeus.
  - Sin cambios en el contrato de `computeScenario()`, `sampleAt()` ni en la UI. `computePolarHeatmap()` sigue con el sintético (MAP-01, #16). El Sol y la Tierra siguen saliendo del modelo aproximado (DEC-004) hasta la parte B.
- **Efecto medido** (modelo astronómico aproximado; media de 12 ventanas de 30 días desde el 14/11/2026):

  | Sitio | Luz sintético → LOLA | Comunicación sintético → LOLA |
  | --- | --- | --- |
  | Shackleton R04 | 96,1 % → 8,9 % | 62,4 % → 25,6 % |
  | Malapert R23 | 53,4 % → 37,7 % (0 % a 74 % según la estación) | 87,6 % → 54,0 % |
  | Cabeus (LCROSS) | 29,8 % → **0,0 %** | 59,3 % → 15,0 % |
  | IM-1 | 48,0 % → 37,9 % | 100 % → 100 % |
  | Chandrayaan-3 | 48,8 % → 48,4 % | 100 % → 100 % |

  - **Control físico:** Cabeus es el sitio de impacto de LCROSS, elegido por estar en sombra permanente; con LOLA da 0 % de luz todo el año (el sintético le daba ~30 %).
  - **Shackleton:** la caída se debe a que R04 cae en la pared interior del cráter según el DEM (hallazgo de DEC-030, pendiente de astronomía). Si se corrige la coordenada, hay que regenerar la tabla (`npm run data:lola:horizons`).
- **Alternativas descartadas:** elegir el horizonte por id sin comprobar coordenadas (un punto propio con id repetido recibiría el horizonte de otro lugar); calcular LOLA para sitios propios en el navegador (requiere el raster; pendiente PERF-01); esperar a la parte B para integrar ambos juntos (demoraba el dato real ya disponible).
- **Estado:** vigente. La parte B se completó en DEC-033. Pendiente: revisión de Shackleton R04. Se adelanta a TEST-01 (#10), todavía sin hacer.

## DEC-033 — El cálculo usa efemérides JPL Horizons (CORE-01, parte B)

- **Contexto / problema:** el Sol y la Tierra salían del modelo periódico aproximado (DEC-004). Comparado con Horizons para nov 2026 – dic 2027, ese modelo erra en promedio ~2° en la elevación del Sol en todos los sitios (máx. 3–4,7°) y hasta ~8,7° de media en la de la Tierra en Apollo 11. En el polo, donde el Sol no pasa de ~1,5°, ese error decide si hay luz. Además tenía las **estaciones lunares desfasadas**. El adaptador y la caché ya existían (ASTRO-01, DEC-024), pero el navegador no puede consultar la API.
- **Decisión (rango y paso acordados con Facundo en #11):**
  - Series de Horizons para los **7 sitios curados**, del **01/11/2026 00:00 UTC al 01/01/2028 00:00 UTC**, **paso 1 h** (10 225 filas por cuerpo), perfil `selene-observer-v1` (DEC-024), efemérides DE441.
  - Altura del observador: **suelo LOLA + 2 m** en los 5 sitios polares (la misma que el horizonte, DEC-030; base `measured-datum`); **0 km supuesto** en Chang'e 4 y Apollo 11 (fuera de LOLA polar). A la distancia del Sol y la Tierra el efecto de la altura es < 0,001°.
  - Entre horas, **interpolación lineal** (azimut por el camino corto). El cálculo sigue muestreando cada 10 min.
  - **Fuera del rango**, o si el archivo no cargó, o en sitios propios: modelo aproximado, y el escenario lo informa.
- **Solución aplicada:**
  - `web/scripts/build-ephemerides.mjs` (`npm run data:ephemerides`): toma de la caché de `fetch-horizons.mjs` las consultas del Sol y la Tierra de cada sitio con ese rango y paso, verifica completitud, mismos instantes, mismo sitio y misma altura, y escribe `web/public/data/ephemerides/<id>.json` (`selene-ephemeris/v1`: ángulos en milésimas de grado, % iluminado de la Tierra en centésimas; ~280–320 KiB por sitio, ~120 KiB comprimido) más `index.json`. Cada archivo guarda URL de consulta, fecha de obtención, SHA-256 de la respuesta cruda, efemérides y supuestos. Determinista para la misma caché.
  - `web/src/lib/ephemeris.js` (puro): decodificación y validación, `positionsAt(eph, ms)`, registro en memoria con `ephemerisVersion()`, `ephemerisFor(site)` (solo sitio curado, no propio, con coordenadas idénticas) y `loadEphemerides(ids, fetchJson)` (un archivo fallido no frena al resto).
  - `web/src/lib/analysis.js`: `computeScenario()` toma cada muestra de Horizons si está cubierta y del modelo aproximado si no. Nueva serie `earthPhase` (fase de la Tierra de Horizons) que usa `sampleAt()`. **Contrato nuevo, aditivo:** `scenario.ephemeris = { source: "horizons" | "approximate" | "mixed", windowFraction, lookaheadComplete, meta }`, donde `meta` es la procedencia de la serie (solo si se usó). Es el contrato de metadatos que esperaba UI-01 (#13).
  - Interfaz (mínimo): `web/src/ui/ephemerides.js` baja los 7 archivos en segundo plano una sola vez por página. `main.js`, `ui/places.js` y `compare.js` agregan `ephemerisVersion()` a sus claves de caché y vuelven a dibujar cuando llegan los datos: hasta entonces (≈ 1 s) se ve el modelo aproximado. No hay resultados obsoletos porque el cálculo es sincrónico y la clave incluye la versión de los datos.
  - Pruebas en `web/tests/ephemeris.test.js`: decodificación, interpolación y cruce por 0°/360°, registro, fallos de carga, archivos versionados (rango, coordenadas, DE44x), **cruce con los fixtures crudos de ASTRO-01** (Shackleton 14–16/11/2026, diferencias < 0,002°), uso en `computeScenario`, casos fuera de rango, `mixed` en el borde y determinismo.
- **Efecto medido** (horizonte LOLA en ambos casos; media de 13 ventanas de 30 días desde el 01/11/2026):

  | Sitio | Luz aproximado → Horizons | Comunicación aproximado → Horizons |
  | --- | --- | --- |
  | Shackleton R04 | 8,2 % → 10,9 % | 25,3 % → **0,0 %** |
  | Malapert R23 | 35,4 % → 42,7 % | 52,7 % → 50,6 % |
  | Cabeus | 0,0 % → 0,0 % | 15,0 % → 21,6 % |
  | IM-1 | 37,7 % → 38,6 % | 100 % → 100 % |
  | Chandrayaan-3 | 47,0 % → 47,4 % | 100 % → 100 % |
  | Chang'e 4 | 49,8 % → 50,0 % | 0 % → 0 % (cara oculta) |
  | Apollo 11 | 49,2 % → 49,2 % | 100 % → 100 % |

  Con Horizons, el polo sur tiene luz en nov 2026 – ene 2027 y oscuridad de feb a sep de 2027; el modelo aproximado invertía esas estaciones. Shackleton R04 queda sin Tierra visible porque la pared del cráter la tapa (hallazgo de DEC-030).
- **Supuestos y límites:** sitios en MOON_ME/DE421 pasados sin transformar a MEAN_ME/DE441 (DEC-024, pendiente); radios angulares fijos de `astro.js` (0,27° Sol, 0,95° Tierra) aunque Horizons da el diámetro real (CORE-02); el mapa de calor (`computePolarHeatmap`) sigue con el modelo aproximado y el horizonte sintético (MAP-01); interpolación lineal horaria (el Sol se mueve ~0,5° por hora en azimut y mucho menos en elevación).
- **Alternativas descartadas:** consultar Horizons desde el navegador (la API no lo permite y haría peticiones en cada cambio); meter las series en el bundle de JS (~2 MB extra en la carga inicial y en cada página); paso de 10 min (6× más pesado sin ganancia visible frente a la interpolación); volver `computeScenario()` asincrónico (cambiaba el contrato que usa toda la interfaz).
- **Estado:** vigente. Reemplaza a DEC-004 dentro del rango y para los sitios curados. Pendiente: validar MOON_ME vs MEAN_ME, decidir los radios angulares (CORE-02) y extender el rango si el equipo lo necesita (correr `fetch-horizons.mjs` y `npm run data:ephemerides`).

## DEC-034 — Datos reales para los puntos propios del mapa (CORE-03)

- **Contexto / problema:** los datos reales (horizonte LOLA de 240 m, DEC-030; series de JPL Horizons, DEC-033) se preparan fuera del navegador y solo existían para los 7 sitios curados. Un punto elegido en el mapa usaba el horizonte sintético y el modelo aproximado, marcados como no reales. Facundo pidió hacerlos reales (Issue #59).
- **Decisión:**
  - **A. Sol y Tierra trasladados.** Para un punto sin serie propia se toma la serie registrada más cercana, se pasa cada dirección al marco fijo a la Luna y se proyecta en el cielo local del punto. El Sol está tan lejos que su dirección es la misma en toda la Luna. La Tierra se corrige por paralaje con una distancia fija de 384 400 km (la real varía entre ~356 500 y ~406 700 km; la paralaje máxima es ~0,26°). Observador sobre la esfera de 1737,4 km.
  - **B. Horizonte LOLA reducido en el navegador.** Dos niveles promediados desde `LDEM_60S_240M` (bloques alineados con la grilla nativa): **480 m/píxel hasta −80°** y **960 m/píxel hasta −75°**. Para un punto al sur de −75° se calcula el horizonte con el mismo algoritmo de TERRAIN-02 (rayos de 300 km, curvatura exacta, observador a 2 m), cada 1° de azimut y paso de 240 m; cada muestra sale del nivel más fino que la cubra. Un bloque es de baja confianza si ≥ 50 % de sus píxeles nativos tienen `count = 0`.
  - Elegido por Facundo frente a 960 m solos (más liviano pero con error medio de hasta 1,2°) o no hacer B.
- **Errores medidos contra los datos completos:**
  - A (traslado entre sitios curados y su serie real, 01/11/2026–01/01/2028): Sol ≤ 0,0016°; Tierra ≤ 0,025° aun de Apollo 11 a Malapert; fase de la Tierra ≤ 0,12 %.
  - B (horizonte reducido vs. 240 m, 360 azimuts): Shackleton R04 medio 0,13° / máx. 0,36°; Malapert 0,19° / 0,85°; Cabeus 0,02° / 0,09°; IM-1 0,77° / 1,78° (horizonte a ~1 km, sesgo −0,77°: el promedio suaviza las pendientes cercanas). Suelo dentro de ±10 m. Con 960 m solos el error medio llegaba a 1,16° (Malapert).
- **Solución aplicada:**
  - `web/src/lib/ephemeris.js`: `derivedEphemerisFor(site)` y `EARTH_DISTANCE_KM`. `analysis.js` la usa cuando el sitio no tiene serie propia; `scenario.ephemeris.derived = true` y `meta.derivedFrom` indican el sitio de origen.
  - `web/scripts/build-lola-polar-reduced.mjs`: genera `web/public/data/terrain/lola-polar-480m.{bin,json}` (1272², 4,6 MiB) y `lola-polar-960m.{bin,json}` (958², 2,6 MiB): alturas int16 en m + % de `count = 0` en uint8, con fuente, MD5 del producto y SHA-256 del binario. ~4,4 MB comprimido en total.
  - `web/src/lib/polar-dem.js` (puro): decodificación, registro de niveles con `polarDemVersion()`, `polarHorizonFor(site)` con caché de 64 puntos (~150 ms por punto).
  - `web/src/lib/horizon-lola.js`: `createProfileHorizon()` arma el horizonte con la misma interfaz que el de 240 m (`source = "lola"`, `meta`, `detail`); `meta.reduced = true` y `meta.resolutionsM = [480, 960]` lo distinguen.
  - `analysis.js`: orden de horizonte LOLA 240 m (curado) → LOLA reducido → sintético; `needsPolarDem(site)` y `realDataVersion()` (efemérides + DEM) para las claves de caché.
  - Interfaz: `ui/ephemerides.js` baja el DEM reducido **solo si** algún sitio en pantalla lo necesita; `main.js`, `ui/places.js` y `compare.js` usan `realDataVersion()`. "Datos y fuentes": Sol y Tierra trasladados = **real** ("trasladadas desde el sitio curado más cercano"); horizonte reducido = **aproximado** ("LOLA real a menor resolución", con el error medido), porque su error en cimas no es despreciable frente a la altura del Sol en el polo.
  - Pruebas en `web/tests/real-points.test.js` con esas tolerancias.
- **Supuestos y límites:** fuera de −75° (o si el DEM no cargó) el horizonte de un punto propio sigue sintético; fuera del 01/11/2026–01/01/2028, el modelo aproximado. El mapa de calor no cambia (MAP-01). La distancia Tierra–Luna fija agrega < 0,02° a la Tierra.
- **Alternativas descartadas:** consultar Horizons por punto (el navegador no puede); bajar el raster completo (~345 MiB); un solo nivel de 480 m hasta −75° (~11 MB); recortes nativos por teselas (~44 MB en el repo); tomar el máximo en vez del promedio de cada bloque (corrige el sesgo a ojo, sin respaldo).
- **Estado:** vigente. Pendiente de validar por astronomía la clasificación "aproximado" del horizonte reducido.

## DEC-035 — Shackleton: R01 Connecting Ridge reemplaza a R04 (DATA-02)

- **Contexto / problema:** el sitio "Shackleton" usaba R04 "Shackleton Rim" (−89,7668°, −171,87°, DEC-019). Con el horizonte LOLA (DEC-030) caía en la pared interior del cráter: cresta a ~2 km al este, horizonte de hasta ~31°. Con LOLA + Horizons daba 10,9 % de luz y **0 % de Tierra visible** al año (DEC-033), y eso cambiaba el ranking publicado.
- **Causa (verificada en la fuente):** la tabla A2-2 del *Lunar Surface Data Book* Rev A dice que sus coordenadas son *"the center points of the original polygons"* (sección A2.1). R04 es el centro de una zona que sigue un tramo curvo del borde, así que ese centro queda hacia adentro del cráter. La coordenada estaba bien copiada; el problema era usarla como punto de aterrizaje.
- **Comparación** (LOLA 240 m + Horizons, 01/11/2026–01/11/2027, cada 1 h; método de la investigación de Facundo, 14/11/2026):

  | Punto (tabla A2-2 salvo indicación) | Suelo | Luz | Tierra visible |
  | --- | --- | --- | --- |
  | R04 Shackleton Rim (anterior) | 771 m | 9 % | 0 % |
  | Cresta a 1,6 km al ENE de R04 (calculada, no oficial) | ~1690 m | ~58 % | ~44–48 % |
  | **R01 Connecting Ridge** | **1943 m** | **60 %** | **46 %** |
  | LM1 Shackleton Rim B | −32 m | 36 % | 52 % |

- **Decisión (Facundo, 14/11/2026):** usar **R01 "Connecting Ridge"** (−89,4632°, −137,49°), de la misma tabla oficial: la cresta que une los bordes de Shackleton y de Gerlache. Se descartó la cresta calculada por nosotros porque sería presentar como oficial un punto propio.
- **Solución aplicada:**
  - `web/src/data/sites.js`: coordenadas, `point.name = "Connecting Ridge R01"` y referencia. Se mantienen el id `shackleton` (enlaces y URL), el nombre visible "Shackleton" (la cresta sale de su borde) y el rasgo "junto a un cráter con fondo en sombra permanente" (Zuber et al. 2012), que sigue valiendo.
  - Tabla de horizonte regenerada (`npm run data:lola:horizons`): suelo 1942,5 m; horizonte −3,344° / −0,375° / 1,264° (mín./medio/máx.), sin `count = 0` ni truncamiento. Comparación visual actualizada en `docs/img/horizonte-lola.svg`.
  - Efemérides regeneradas con `fetch-horizons.mjs` (altura 1,9445 km = suelo + 2 m) y `npm run data:ephemerides`.
  - Pruebas: catálogo; el fixture de ASTRO-01 (descarga histórica de R04) se conserva y se compara contra R04 documentado; el cruce con ese fixture usa la serie de R01 trasladada a R04 (DEC-034, < 0,002°); límite del horizonte reducido en R01 medido en 0,38° / 1,07°.
- **Efecto:** Shackleton pasa de 10,9 % a **62,2 %** de luz y de 0 % a **46,5 %** de comunicación (media de 13 ventanas de 30 días), con 100 % de luz en el verano austral (nov–ene).
- **Alternativas descartadas:** mantener R04 explicándolo (el sitio quedaba como un mal lugar por un artefacto de la tabla); la cresta calculada (no oficial); LM1 Shackleton Rim B (más bajo y con menos luz).
- **Estado:** vigente. Reemplaza el punto de Shackleton de DEC-019 y resuelve el hallazgo de DEC-030. Los valores históricos de R04 en DEC-030, DEC-032 y DEC-033 se dejan como estaban.

## DEC-036 — Política única de visibilidad del Sol y la Tierra (CORE-02)

- **Contexto / problema:** el escenario consideraba visible el Sol con medio disco y la Tierra con cualquier parte, mientras que el mapa de calor usaba el centro para los dos. Los radios eran fijos (0,27° y 0,95°) y la fracción del Sol se aproximaba linealmente. Con datos reales (Horizons < 0,002°, LOLA) el criterio del disco pasó a ser la mayor diferencia posible en los números: Shackleton (R01) va de 56 % a 65 % de luz y Cabeus de 6 % a 21 % de comunicación según la regla elegida.
- **Decisión (Facundo, 14/11/2026, a propuesta del análisis):**
  - **Sol visible** si asoma al menos la mitad del disco (centro sobre el horizonte).
  - **Potencia** proporcional a la fracción del disco que asoma, con el área exacta del segmento circular.
  - **Tierra visible** (comunicación) si asoma cualquier parte del disco: una antena puede enlazar con poca Tierra a la vista.
  - **Radios** de JPL Horizons en cada instante; radios medios solo con el modelo aproximado.
  - **La misma regla** en escenario, muestra instantánea y mapa de calor.
- **Solución aplicada:**
  - `web/src/lib/analysis.js`: `VISIBILITY_POLICY`, `discFraction(margin, radius)`, `sunVisible(margin)`, `earthVisible(margin, radius)`; `computeScenario()` las usa con el radio de cada muestra; `computePolarHeatmap()` también (antes probaba el centro de la Tierra); `scenario.visibility` expone la política.
  - Efemérides `selene-ephemeris/v2`: agregan `sunRadius` y `earthRadius` (diezmilésimas de grado, mitad del diámetro angular de Horizons) a cada archivo (~410 KiB por sitio); `positionsAt()` y el traslado a otros puntos (DEC-034) los devuelven.
  - Pruebas en `web/tests/visibility.test.js`: área exacta (valores conocidos, simetría, monotonía), umbrales, radios de Horizons por muestra, radios medios sin Horizons y concordancia celda a celda entre el mapa de calor y la misma cuenta del escenario.
- **Corrección a la propuesta:** se había dicho que el radio real de la Tierra rondaba 0,90°. Medido en todo el rango de Horizons va de 0,899° a 1,025°, con media 0,951°: el 0,95° fijo era la media correcta y se conserva como valor del modelo aproximado. El Sol va de 0,261° a 0,272° (media 0,267°).
- **Efecto:** con la regla elegida los resultados casi no cambian (media anual: Shackleton 62,2 % de luz y 46,5 % de comunicación; Cabeus 21,6 % → 21,7 % de comunicación). Se gana coherencia entre pantallas, radios medidos y una regla documentada y probada.
- **Alternativas descartadas:** Sol con cualquier parte (sobrestima la energía útil con un borde de Sol); Sol solo con disco entero (subestima, el panel ya recibe energía antes); Tierra por el centro (subestima el enlace); seguir con radios fijos (error de hasta ±8 % en la Tierra).
- **Estado:** vigente. La visibilidad geométrica de la Tierra sigue sin ser un presupuesto de enlace (fuera de alcance). El mapa de calor usa la regla, pero sigue con el modelo aproximado y el horizonte sintético (MAP-01).

## DEC-037 — Validaciones separadas, controles físicos e integración continua (TEST-01)

- **Contexto / problema:** TEST-01 (#10) pide ampliar las pruebas matemáticas y separar las validaciones contra fuentes reales, con casos límite, unidades, continuidad, faltantes e incertidumbre cubiertos, fixtures citados, tolerancias justificadas y CI o ejecución documentada. Ya había 127 pruebas, pero las validaciones contra datos reales estaban mezcladas con las unitarias, los controles físicos medidos no estaban formalizados y el repo no tenía CI. CORE-01 se había adelantado a esta tarea por el plazo.
- **Decisión (Facundo, 14/11/2026):**
  - Validaciones contra datos reales en `web/tests/validacion/` (`npm run test:validation`); pruebas matemáticas en `web/tests/` (`npm run test:unit`); `npm test` sigue corriendo todo.
  - Controles físicos independientes de nuestro código, con tolerancias derivadas de constantes conocidas o de lo medido, sin valores de referencia inventados.
  - Integración continua con GitHub Actions.
- **Solución aplicada:**
  - Movidas a `web/tests/validacion/`: `horizons-fixture.test.js` y `horizonte-lola-tabla.test.js`.
  - Nuevas: `controles-fisicos.test.js` (altura máxima del Sol = colatitud + oblicuidad 1,543°; período sinódico; Tierra siempre visible desde Apollo 11 y nunca desde Chang'e 4; fase de la Tierra al mediodía y a la medianoche lunar; Cabeus sin Sol todo el año; estaciones del polo sur; horizonte negativo en cimas) e `incertidumbre.test.js` (error de la interpolación horaria cerca del horizonte).
  - `docs/VALIDACION.md`: cómo correr cada grupo, tabla de validaciones con fuente, tolerancia y justificación, y tabla de incertidumbre conocida.
  - `.github/workflows/ci.yml`: `npm ci`, `test:unit`, `test:validation` y `build` en cada PR y push a `main` (Node 22, solo lectura). Las pruebas con rasters LOLA se omiten solas.
- **Resultados:** 136 pruebas (112 unitarias + 24 validaciones), 134 pasan y 2 se omiten sin rasters. Medidos: Sol máximo en Shackleton R01 2,05° (colatitud 0,54°); mes sinódico medio 29,5336 d; Tierra en Apollo 11 entre 58,0° y 73,7°; interpolación horaria cerca del horizonte < 0,0003°.
- **Alternativas descartadas:** comparar contra iluminación publicada (no hay valores integrados y no se inventan); correr las pruebas con rasters en CI (descarga de ~345 MiB por corrida); separar con un framework de pruebas nuevo (agrega una dependencia sin necesidad).
- **Estado:** vigente. Pendientes: marco MOON_ME vs MEAN_ME, EOP predichos y comparación con horizontes o iluminación publicados.

## DEC-038 — Mapa de calor del polo sur con datos reales: motor (MAP-01)

- **Contexto / problema:** `computePolarHeatmap()` calculaba, para cada celda del polo sur, la fracción del tiempo con el Sol o la Tierra visibles, pero con el modelo aproximado y el horizonte sintético, y ninguna pantalla lo usaba: la pestaña del medio muestra elevación LOLA (DEC-026, DEC-029). MAP-01 (#16) pide un modo de iluminación calculada que no quite la elevación. Calcular el horizonte LOLA de cada celda en el navegador tardaría ~150 ms por celda (~23 min para 96 × 96).
- **Decisión (Facundo, 14/11/2026):** Facundo hace el motor y **Lucio la interfaz** (selector Elevación / Luz / Tierra en la pestaña ELEVACIÓN).
  - **Atlas de horizontes precalculado offline:** horizonte LOLA del centro de cada celda de la grilla de 96 × 96 hasta −80° (7238 celdas, ~6,3 km), cada 5° de azimut, con el algoritmo de TERRAIN-02 sobre `LDEM_60S_240M` completo (rayos de 300 km, paso 240 m, observador a 2 m).
  - **Sol y Tierra:** direcciones de JPL Horizons en el marco fijo a la Luna, calculadas una vez por instante desde la serie más cercana al polo y proyectadas en cada celda; la Tierra se corrige por paralaje desde la altura del suelo de la celda (como DEC-034).
  - **Visibilidad:** la política única (DEC-036).
  - **Paso:** 1 h, o el múltiplo de 1 h que deja ≤ 360 instantes (30 días → 2 h). Medido: cambia ≤ 0,42 puntos por celda frente a 1 h.
  - Si el atlas no cargó, no hay efemérides o la ventana sale de nov 2026 – dic 2027: el cálculo aproximado de siempre. `source.kind` indica `"real"` o `"approximate"`.
  - **Cuatro modos** (Facundo pidió un modo equilibrado y eligió incluir dos variantes): `"sun"` (% del tiempo con Sol), `"earth"` (% con Tierra), `"both"` (% con Sol **y** Tierra a la vez: energía y comunicación al mismo tiempo) y `"viability"` (puntos 0–6 por celda con los **mismos criterios y umbrales que los sitios y el ranking "Global"**, DEC-007; `values` = puntos/6, `points` y `components` con luz, Tierra y potencia por celda). Se descartó el promedio simple de luz y Tierra (pesos arbitrarios; una zona sin Tierra saldría "regular").
- **Solución aplicada:**
  - `web/scripts/build-heat-atlas.mjs` (`npm run data:heat-atlas`, ~6,5 min): `web/public/data/terrain/heat-atlas-96.{bin,json}` (1,3 MiB, ~0,8 MB comprimido): horizontes int16 en centésimas de grado, altura del suelo y % de azimuts de baja confianza por celda, con MD5 del producto y SHA-256.
  - `web/src/lib/heat-map.js` (puro): `cellCenter`, `decodeHeatAtlas`, registro con `heatAtlasVersion()`, `computeRealHeatmap()` y `heatStepMinutes()`. `web/src/lib/ephemeris.js`: `bodyVectorsAt(ms)`.
  - `web/src/lib/analysis.js`: `computePolarHeatmap()` usa el mapa real cuando puede; el resultado trae `source` (antes no traía). `realDataVersion()` incluye el atlas.
  - `web/src/ui/ephemerides.js`: `ensureHeatAtlas(onLoaded)` para que la interfaz baje el atlas. **No se tocó `ui/map.js`.**
  - Pruebas: `web/tests/heat-map.test.js` (geometría, decodificación, caída al aproximado y coherencia celda a celda con el traslado de CORE-03) y `web/tests/validacion/mapa-calor.test.js` (procedencia, estaciones, cara visible, paso adaptativo y, con rasters, reproducción de celdas).
- **Resultados** (30 días): Sol, media del polo 33,2 % en diciembre 2026 frente a 21,9 % en junio 2027; Tierra, mucho más visible hacia la cara visible; Sol y Tierra a la vez, 10,1 % frente a 7,6 %; viabilidad media 44,8 % frente a 33,9 % (ninguna celda llega a 6 puntos; 14 % del polo tiene 5 en diciembre). Tiempo de cálculo en Node: 0,15–0,40 s por mapa de un cuerpo y ~0,8–0,95 s en los modos combinados.
- **Límites:** cada celda vale lo que su **centro** (no un promedio del área de ~6 km); horizonte cada 5° de azimut; fuera de −80° no hay mapa. Para no bloquear la interfaz en equipos lentos convendría un worker (PERF-01).
- **Alternativas descartadas:** calcular el horizonte por celda en el navegador (~23 min); usar el DEM reducido de CORE-03 (más lento y menos exacto que precalcular con el de 240 m); precalcular el mapa de luz para fechas fijas (no seguiría la ventana elegida).
- **Estado:** vigente (motor). Falta la interfaz (Lucio, #16).

## DEC-039 — Fuente, cobertura y estados de carga de los datos reales en "Datos y fuentes" (UI-01, resto)

- **Contexto / problema:** UI-01 (#13) pide que la fuente, la fecha y la cobertura de los datos reales sean visibles y que haya estados de carga, error y faltante, sin presentar aproximaciones como reales. DEC-028 dejó esa parte pendiente hasta que existiera el contrato de CORE-01. Con DEC-033/034, `scenario.ephemeris` ya informa el origen (`horizons` / `mixed` / `approximate`, `derived`, `windowFraction`, `lookaheadComplete`, `meta`), pero la interfaz solo mostraba una fila resumida. Mientras se bajan las series (o si fallan), el cálculo usa el modelo aproximado sin que la página lo diga.
- **Decisión:** mostrar todo dentro del modal "Datos y fuentes" (ya existente, DEC-028), sin agregar elementos a la pantalla principal (DEC-014: réplica del Figma).
  - Bloque nuevo **"Efemérides del Sol y la Tierra"**: estado (series de Horizons del sitio / trasladadas a un punto propio / parcial / cargando / error / falta la serie del sitio / fuera de cobertura), fuente con enlace a la documentación oficial de JPL Horizons, efemérides (DE441) y marco (MEAN_ME), sitio de origen y distancia si están trasladadas, cobertura de la serie (UTC y paso), % del período elegido con Horizons, aviso si el próximo amanecer u ocaso cae fuera, fecha de consulta y altura del observador (medida = suelo LOLA + 2 m, o 0 m supuesto).
  - Etiqueta de calidad nueva **"Cargando"** (borde punteado, sin animación) para datos reales que todavía se están bajando. Un error de carga se muestra como "Aproximado" con su motivo: el dato que se usa es el del modelo, no uno faltante.
  - El horizonte de un punto propio al sur de −75° informa si el DEM LOLA reducido se está cargando o falló (sigue el sintético).
- **Solución aplicada:**
  - `web/src/ui/data-status.js` (nuevo): registro mínimo del estado de carga (`idle` / `loading` / `ready` / `partial` / `error`) con suscripción. Solo guarda y avisa.
  - `web/src/ui/ephemerides.js`: escribe ese estado al pedir y al recibir las efemérides y el DEM reducido. No cambia qué se baja ni cómo.
  - `web/src/ui/provenance.js`: `ephemerisHtml()`, estados en `qualityRows()` y `lolaHtml()`, y el modal se vuelve a dibujar si llegan datos con él abierto (conserva el foco en el diálogo). La comparación y el informe heredan las filas nuevas porque usan `qualityHtml()`.
  - Textos en `quality.eph.*`, `quality.lola.dem.*`, `quality.tag.loading` y `quality.rowHint.{ephemeris,horizon}{Loading,Error}` (ES/EN). Estilo `.q-loading` en `settings.css`.
  - Pruebas: `web/tests/data-status.test.js` (carga, error, serie real con cobertura, fuera de cobertura, punto propio trasladado y DEM reducido).
- **Supuestos:** el estado `idle` (las series nunca se pidieron, como en las pruebas o el informe sin cargar) se muestra como modelo aproximado, no como "cargando". La cobertura textual "nov 2026 – dic 2027" del estado "fuera de cobertura" es la de DEC-033; la cobertura exacta se lee de `meta.coverage` cuando hay serie.
- **Alternativas descartadas:** un indicador de carga en la pantalla principal (agrega un elemento que el Figma no tiene, DEC-014); mostrar `meta.assumptions` (están solo en español, como las notas de `sites.js` en DEC-028); un spinner animado (innecesario y en conflicto con "menos movimiento").
- **Estado:** vigente. Pendiente: revisión de los textos nuevos en I18N-01 (#17).

## DEC-040 — Capas calculadas en la pestaña ELEVACIÓN (MAP-01, interfaz)

- **Contexto / problema:** el motor de MAP-01 (DEC-038) calcula luz, Tierra, Sol + Tierra y viabilidad por celda del polo sur con datos reales, pero ninguna pantalla lo mostraba. La pestaña ELEVACIÓN muestra la elevación LOLA (DEC-026) y el Figma no tiene un mapa de iluminación.
- **Decisión** (reparto acordado con Facundo en #16 y DEC-038): un selector de capa en la pestaña ELEVACIÓN, con la elevación como capa por defecto para que la vista inicial siga igual al Figma.
  - Capas: **Elevación**, **Luz** (% del tiempo con Sol), **Tierra** (% con la Tierra visible), **Sol + Tierra** (% con los dos a la vez) y **Viabilidad** (0–6 puntos con los criterios del ranking "Global"). Se muestran las dos variantes "equilibradas" del motor porque responden preguntas distintas (simultaneidad vs. criterios de la misión).
  - Las capas calculadas se ven **solo en 2D**, con la proyección polar hasta **−80°** (el borde de la grilla) para que el disco ocupe el mapa; el selector 3D/2D se oculta mientras se ven. Los marcadores y el clic usan esa misma proyección.
  - **Un píxel por celda** (~6,3 km) sin suavizar (`image-rendering: pixelated`), para no aparentar más resolución que la del cálculo.
  - Misma paleta que la elevación (estándar o cividis para daltonismo): no se agregan colores. Leyenda en % (0–100) o en puntos (0–6).
  - **Procedencia en el crédito** debajo del mapa: real (JPL Horizons + horizontes LOLA, tamaño de celda y paso) o aproximado, con el motivo (cargando el atlas, error de carga o período fuera de nov 2026 – dic 2027).
  - El período es el de la misión (fecha de inicio y ventana de análisis elegidas).
- **Solución aplicada:**
  - `web/src/ui/heat-layer.js` (nuevo): llama a `computePolarHeatmap()` y colorea la grilla en un PNG de 96 × 96; caché por capa, período, paleta y `realDataVersion()` (24 entradas).
  - `web/src/ui/map.js`: selector, proyección con borde variable (`edgeFor`), leyenda, crédito y cálculo diferido con el aviso "Cargando mapa…". Pide el atlas (`ensureHeatAtlas`) recién al elegir una capa calculada.
  - `web/src/ui/data-status.js` y `web/src/ui/ephemerides.js`: estado de carga del atlas (el estado se publica después de guardar la promesa para evitar llamadas recursivas).
  - `web/src/ui/elevation.js`: exporta `lut()` para reutilizar la paleta. `web/src/state.js`: `heatLayer`. `web/index.html`: grupo de botones con `aria-pressed`. Estilos en `main.css` (la leyenda baja 40 px para dejar lugar al selector). Textos `map.layer*` (ES/EN).
- **Supuestos y límites:** cada celda vale lo de su centro (DEC-038); el primer cálculo de cada capa y período bloquea 0,2–1 s el hilo principal (PERF-01, opcional); la capa elegida no se guarda en la URL.
- **Alternativas descartadas:** mostrar la grilla con la proyección hasta −60° (el disco calculado ocuparía un tercio del radio); pintar la capa sobre la Luna 3D (la grilla solo cubre el polo y requeriría otra textura); suavizar la imagen (sugiere una resolución que no existe); un selector de colores propio (DEC-014).
- **Estado:** vigente; la parte "solo en 2D" la reemplazó DEC-050 y la de "un píxel por celda sin suavizar", DEC-051.

## DEC-041 — Origen de los datos en la línea de tiempo, el panorama, el informe y la comparación (UI-02)

- **Contexto / problema:** UI-02 (#15) pide representar resolución, huecos y cambios asíncronos sin perder legibilidad. Con los datos reales integrados (DEC-033/034/038), la interfaz seguía diciendo "valores calculados con el modelo aproximado v1" en el informe, la comparación y el tooltip de Parámetros, aunque casi siempre se usan JPL Horizons y LOLA. Además, cuando el período sale de la cobertura de las series (nov 2026 – dic 2027) o todavía se están cargando, la línea de tiempo no mostraba qué tramo usa el modelo aproximado.
- **Decisión:**
  - **Línea de tiempo:** un rayado gris (no solo color, para cualquier paleta) sobre el deslizador marca los tramos del período con el modelo aproximado del Sol y la Tierra, con una nota debajo que dice por qué (fuera de cobertura, todo aproximado o cargando). Si todo el período tiene datos de Horizons no se muestra nada.
  - **Panorama:** la línea del relieve empieza con el origen del Sol y la Tierra (Horizons / trasladadas / Horizons y aproximado / aproximado), sin sumar renglones.
  - **Informe y comparación:** el aviso fijo se reemplaza por una nota calculada del escenario: origen del Sol y la Tierra, origen del horizonte (LOLA / LOLA reducido / sintético) y que los umbrales son criterio del equipo. En la comparación va una nota por sitio, porque pueden diferir.
  - **Tooltip de Parámetros:** deja de afirmar "modelo aproximado" y remite al botón "i" (Datos y fuentes, DEC-028/039).
- **Solución aplicada:** `web/src/ui/provenance.js` (`dataNote()` y `approxSegments()`, que solo compara instantes con `meta.coverage`, sin calcular posiciones), `web/src/ui/timeline.js` (`renderCoverage()`), `web/src/main.js` (la llama al recalcular el escenario y al cambiar de idioma), `web/src/ui/panorama.js`, `web/src/ui/report.js`, `web/src/ui/compare.js`, `web/index.html`, `web/compare.html`, `main.css` y textos `dataNote.*`, `sim.bodies.*`, `sim.coverage.*`, `params.dataHint` (ES/EN; se quitan `params.modelNote` y `compare.modelNote`). Pruebas en `web/tests/data-status.test.js`.
- **Alternativas descartadas:** guardar en la serie qué muestras son reales (cambiaría el contrato de `analysis.js`, compartido con el motor; la cobertura declarada alcanza para ubicar los tramos); un aviso emergente al salir de la cobertura (interrumpe y agrega un elemento que el Figma no tiene).
- **Estado:** vigente. Pendiente: revisión de los textos nuevos en I18N-01 (#17).

## DEC-042 — "Ventana de análisis" con promedios del período y espaciado de los paneles

- **Contexto / problema:** bloc de notas de UI de Lucio (14/11/2026). (1) Las tarjetas de "Mejores lugares" estaban repartidas en todo el alto (`space-between`) y quedaban muy separadas frente a las del panel derecho. (2) Los títulos del panel derecho estaban pegados ("Parámetros de la misión" → "Sitio de alunizaje"). (3) En "Ventana de análisis" se alternaban tarjetas de misión (Luz, Comunicación) con tarjetas del instante (Sol, Tierra: "AHORA", VISIBLE/OCULTO, UI-15, PR #58, que no había quedado registrada aquí), y se pidió que Sol y Tierra muestren la posición promedio del período, de forma que se entienda que no es un momento puntual.
- **Decisión** (pedido de Lucio, responsable de la web):
  - Separación de 8 px en las dos listas. En "Mejores lugares" el espacio libre debajo de las 5 tarjetas muestra el criterio de orden de la categoría elegida (antes solo estaba en el código).
  - Más aire entre los títulos del panel derecho (título a 12 px del borde y 14 px hasta "Sitio de alunizaje"); las tarjetas pasan de 112 a 106 px para que entre todo en los 848 px del Figma.
  - Orden: Luz acumulada y Comunicación (MISIÓN, VIABLE/INVIABLE); debajo, el título **"Posición promedio en el período"** con las fechas y "no es un instante", y las tarjetas Sol y Tierra con etiqueta PROMEDIO: elevación media (valor grande), % del período visible, mínimo, máximo y relieve medio en su dirección. El tooltip explica que es el promedio cada 10 min entre las fechas elegidas.
  - No se muestra un azimut medio: cerca del polo el Sol recorre todo el horizonte y el promedio de azimuts no significa nada.
  - El instante elegido sigue en "Comportamiento de los cuerpos celestes" (tarjetas de energía y comunicación, "Ir a fecha y hora").
- **Solución aplicada:** `web/src/lib/stats.js` (nuevo, puro: `windowStats()` con medias, extremos y rachas dentro de la ventana) y `web/tests/stats.test.js`; `web/src/ui/params.js` (`averageCard()`, las tarjetas ya no se redibujan en cada cuadro); `web/src/ui/places.js` e `index.html` (`#places-hint`); `main.css`; textos `params.avg*`, `params.period.avg`, `params.periodTitle.avg`, `places.categoryHint.*` (ES/EN; se quitan `period.now` y `periodTitle.now`).
- **Alternativas descartadas:** promediar también el azimut (ver arriba); mostrar 6 lugares en vez de 5 (no entran 6 tarjetas de 108 px con 8 px de separación).
- **Estado:** vigente. Reemplaza la parte "AHORA" de UI-15 en el panel de parámetros.

## DEC-043 — Menú del botón "+" con nombre del sitio y avisos de confirmación

- **Contexto / problema:** bloc de notas de UI de Lucio. El "+" agregaba el punto observado al instante con el nombre "Sitio propio N", y el texto "Agregar coordenada como sitio" estaba siempre visible a su lado. En el Figma ese texto es el menú que sale del botón, pero faltaba la lógica. También se pidió poder nombrar el sitio al crearlo y dar respuestas visibles a las acciones.
- **Decisión:** el "+" abre un menú (formulario) encima del botón con el título del Figma, las coordenadas, un campo "Nombre del sitio" (precargado con "Sitio propio N" y seleccionado) y los botones Cancelar / Agregar. Enter confirma; Escape, Cancelar o un clic afuera cierran. Al agregar se muestra un aviso breve ("Sitio «X» agregado…").
- **Solución aplicada:** `web/index.html` (formulario `#add-menu`, `aria-haspopup`/`aria-expanded`), `web/src/ui/map.js` (`initAddMenu()`), `web/src/ui/toast.js` (nuevo, aviso con `role="status"`, sin animación con `data-motion="reduced"`), estilos en `main.css` (menú con el borde dorado del Figma; hover y estado deshabilitado del "+"), textos `map.add*` (ES/EN).
- **Supuestos y límites:** los nombres se muestran con `innerHTML` en varias vistas, así que al crearlos se quitan `< > & " ' \``; ids `custom-<marca de tiempo>` para que no choquen. Los sitios propios siguen viviendo solo en la página (no se guardan al recargar) y la comparación los recibe por coordenadas.
- **Alternativas descartadas:** `prompt()` del navegador (bloquea la página y rompe la automatización); escapar en cada vista (más cambios y fácil de olvidar en una nueva).
- **Estado:** vigente.

## DEC-044 — Informe imprimible como documento de texto

- **Contexto / problema:** bloc de notas de UI de Lucio: el informe (UI-06) tenía grillas de tres columnas, tablas con bordes, un aviso en recuadro con fondo y etiquetas de calidad en "píldoras" con bordes redondeados. Se pidió que sea solo texto, apto para impresión.
- **Decisión:** documento corrido en una columna, tipografía serif de imprenta, en negro sobre blanco y sin cajas, fondos, bordes ni esquinas redondeadas. Secciones numeradas: 1. Sitio y período (en un párrafo), 2. Viabilidad, 3. Métricas (lista "Métrica: valor. explicación"), 4. Posición promedio en el período y rachas (noche, luz continua y corte de comunicación más largos, de `windowStats`, DEC-042), 5. Ventanas de luz y de enlace (lista "inicio → fin (duración)"), 6. Procedencia y calidad ("[Real] Dato — explicación"), y el pie con las fuentes.
- **Solución aplicada:** `web/src/ui/report.js` (`renderReport()` y `windowsList()` reescritos), `web/src/styles/report.css` reescrito (una regla anula fondos, bordes y sombras dentro del informe; las etiquetas de calidad se imprimen entre corchetes), textos `report.periodLine`, `report.windowsTitle`, `report.avgLine`, `report.runs` (ES/EN).
- **Alternativas descartadas:** mantener tablas sin bordes (siguen leyéndose como recuadros alineados en columnas angostas); generar un PDF propio (agrega una dependencia; el navegador ya guarda en PDF).
- **Estado:** vigente. Reemplaza el diseño del informe de UI-06 (DEC-020 sigue vigente para su contenido y su acceso desde el menú).

## DEC-045 — "Resumen del período" en Comportamiento de los cuerpos celestes, y hover

- **Contexto / problema:** bloc de notas de UI de Lucio: la sección "Comportamiento de los cuerpos celestes" tenía poca información y espacio libre en la columna derecha; había datos importantes escondidos (la viabilidad global, puntos sobre 6, solo aparecía en la comparación y el informe; "Datos y fuentes" solo era accesible con un botón "i"), y faltaban hover y respuestas visibles en varios controles.
- **Decisión:**
  - Tarjeta **"Resumen del período"** debajo de "Lectura del momento", con el estilo de las tarjetas existentes: viabilidad global (nivel y puntos, con su color), noche más larga, luz continua más larga, corte de comunicación más largo y % del período con el Sol y la Tierra visibles a la vez. Cada dato explica en su tooltip para qué sirve (baterías, satélite de relevo, energía y enlace simultáneos). Un enlace "Ver datos y fuentes" abre el mismo modal que el botón "i". No depende del instante: complementa las tarjetas instantáneas de arriba.
  - **Hover y foco visible** en pestañas, categorías, chips, selector 3D/2D, capas, botones de la línea de tiempo, campos y tarjetas (cambio de borde o de color, sin movimiento; con "menos movimiento" no hay transiciones).
- **Solución aplicada:** `web/src/lib/stats.js` (`bothFraction`) y su prueba; `web/src/ui/status.js` (`renderPeriodSummary()`, `initPeriodSummary()`); `web/index.html` (`#period-card`); `web/src/main.js`; `main.css` (separación de la columna de 36 a 24 px para que termine a la par del panorama y la línea de tiempo; bloque de hover); textos `periodCard.*` (ES/EN).
- **Alternativas descartadas:** agregar más datos a las tarjetas de energía y comunicación (mezclaría instante y período, el mismo problema de DEC-042); un gráfico de rachas (recarga la sección).
- **Estado:** vigente.

## DEC-046 — "Mejores fechas" para el sitio elegido

- **Contexto / problema:** bloc de notas de UI de Lucio: "así como hay mejores lugares para alunizar, debe haber mejores fechas para hacerlo en un punto determinado".
- **Decisión:**
  - El título del panel "Mejores lugares para alunizar" pasa a dos pestañas de texto, con el patrón de las del mapa: **Mejores lugares / Mejores fechas**. Lugares queda por defecto.
  - En **Mejores fechas** se evalúan todas las fechas de inicio a las 00:00 UTC, una por día, con la duración elegida, **solo dentro de la cobertura de JPL Horizons** del sitio (nov 2026 – dic 2027; serie propia o trasladada), para que el orden salga de datos reales. Sin serie, se avisa en lugar de ordenar con el modelo aproximado.
  - Mismo orden que los lugares (`rankEntries`): Global (puntos y horas de luz), Comunicación y Luz. **Ciencia** queda deshabilitada (los rasgos dependen del sitio, no de la fecha). A igualdad gana la fecha más temprana.
  - Se muestran 5 fechas **cuyos períodos no se superponen** (si no, salían 21, 22 y 23 de julio: la misma ventana corrida un día).
  - Cada tarjeta muestra el rango (con `Intl.formatRange`, localizado), la viabilidad, cobertura de comunicación, % con Sol, altura máxima de la Tierra y horas de luz. Un clic aplica la fecha de inicio (misma duración).
- **Solución aplicada:** `web/src/lib/dates.js` (nuevo, puro: `dateScenarios()` y `pickDistinct()`) y `web/tests/dates.test.js`; `web/src/ui/places.js` (modo fechas, cálculo diferido con "Calculando…" y caché por sitio, duración y versión de datos); `web/src/state.js` (`placesMode`); `web/src/main.js`; `web/index.html`; `main.css`; textos `places.mode*` y `places.dates.*` (ES/EN).
- **Supuestos y límites:** paso de un día entre candidatas; el cálculo (0,4–1 s, medido 0,4–0,7 s en Node) corre en el hilo principal la primera vez (PERF-01).
- **Alternativas descartadas:** ponerlo dentro del calendario (queda escondido en un desplegable); ordenar también fuera de la cobertura con el modelo aproximado (mezclaría datos reales y aproximados en un mismo ranking).
- **Estado:** vigente.

## DEC-047 — Worker de cálculo y caché persistente (PERF-01)

- **Contexto / problema:** PERF-01 (#18) pide no bloquear la interfaz con los cálculos intensivos y reutilizar resultados entre sesiones. Las capas del mapa de calor (DEC-040) y "Mejores fechas" (DEC-046) bloqueaban 0,2–1 s el hilo principal la primera vez.
- **Decisión:**
  - Un **worker de módulo** corre `computePolarHeatmap()` y `dateScenarios()` con los mismos módulos de `lib/`. El registro de datos de la página no se comparte, así que el worker baja los mismos archivos (servidos desde la caché del navegador) según lo que la página ya tiene cargado (efemérides, atlas, DEM reducido): así los resultados coinciden. Si el worker no se puede crear o falla, se calcula en la página como antes.
  - El worker devuelve lo mínimo: la grilla del mapa (transferida, sin copia) y, para las fechas, solo los campos del resumen que usan el ranking y las tarjetas.
  - **Caché persistente** en `localStorage` (`selene-cache-v1`): solo resultados calculados con todos los datos reales necesarios (mapa real con efemérides y atlas; fechas con efemérides y, si el punto lo necesita, el DEM reducido). Se guardan la imagen de la capa y las 5 fechas elegidas por categoría, no las series. Se invalida con cada build (`__SELENE_BUILD__`, definido en `vite.config.js`), máximo 40 entradas (se borran las más viejas) y, si la cuota se llena o el almacenamiento está bloqueado, se vacía y se sigue sin caché.
- **Solución aplicada:** `web/src/workers/compute.worker.js` (nuevo), `web/src/ui/compute.js` (nuevo: `runInWorker()`, `loadedData()`, `persisted()`, `persist()`), `web/src/ui/heat-layer.js` (`heatLayerAsync()`, `cachedHeatLayer()` mira también la caché persistente), `web/src/ui/map.js`, `web/src/ui/places.js`, `web/vite.config.js` (`define` y `worker.format`).
- **Resultados medidos** (navegador, Shackleton, 10 días): con capa Viabilidad y Mejores fechas pedidas a la vez, el hilo principal no se detuvo más de 37 ms (antes 0,4–1 s). Las 5 fechas del worker coinciden con las calculadas en la página. Al recargar, las dos salen de la caché persistente al instante.
- **Alternativas descartadas:** IndexedDB (más código para resultados que pesan unos KB); compartir el registro de datos con `SharedArrayBuffer` (exige cabeceras COOP/COEP que el despliegue no tiene); guardar las series completas (varios MB).
- **Estado:** vigente.

## DEC-048 — Cruces refinados de amaneceres, ocasos y de la Tierra (SCIENCE-02)

- **Contexto / problema:** SCIENCE-02 (#19). Las ventanas de luz y de enlace y los "próximo amanecer/ocaso" caían siempre en la muestra de 10 min siguiente al cruce real (hasta 10 min tarde).
- **Decisión:** refinar cada cruce por **bisección** entre las dos muestras que lo encierran, evaluando en instantes intermedios las mismas posiciones del escenario (JPL Horizons interpolado o el modelo, DEC-033) y el mismo horizonte, con la política de visibilidad de DEC-036 (Sol: medio disco; Tierra: cualquier parte del disco, con su radio). Tolerancia de **5 s**. Supone un solo cruce por intervalo de 10 min (el mismo supuesto del muestreo).
  - Se refinan los bordes de las ventanas dentro del período (el inicio y el fin del período quedan igual) y el estado instantáneo: si el cruce ya pasó dentro del intervalo, el cuerpo cambia de estado y "próximo cambio" apunta al siguiente.
  - **No cambian** los porcentajes, minutos acumulados ni puntos de viabilidad (siguen contando muestras): el ranking, los mapas y los números de la tabla de la etapa 2 quedan iguales. La suma de las ventanas puede diferir de los minutos con Sol en menos de 10 min por cruce.
- **Solución aplicada:** `web/src/lib/analysis.js` (`refineCrossing()`, `refineAll()`, `CROSSING_TOLERANCE_MS`; `series.sunCross` y `series.earthCross`; `computeWindows()` y `nextChange()`/`bodyState()` los usan). Pruebas en `web/tests/crossings.test.js`. Fila nueva en `docs/VALIDACION.md`.
- **Resultados medidos:** 46 cruces en 7 sitios × 30 días (desde 01/01/2027): los bordes se adelantan en promedio 4,5 min (máximo 9,7 min) respecto de la muestra, lo esperable para un error uniforme de hasta un paso. Costo extra despreciable (~7 evaluaciones por cruce).
- **Alternativas descartadas:** interpolación lineal del margen entre muestras (ignora cambios del perfil del horizonte entre las dos direcciones); bajar el paso a 1 min en todo el escenario (10 veces más cálculo para mejorar solo los bordes).
- **Estado:** vigente. La exactitud real de los instantes la limitan la interpolación horaria de Horizons y la resolución del horizonte, no la tolerancia de 5 s.

## DEC-049 — Ajustes del bloc de notas de UI 2: ventana de análisis vacía, nombre en la URL, menú y viabilidad

- **Contexto / problema:** segundo bloc de notas de UI de Lucio (14/11/2026, noche).
- **Decisión y solución aplicada:**
  - **Ventana de análisis sin selección:** hasta que se elijan un sitio (o punto) y las fechas, en lugar de las tarjetas con los valores del punto de ejemplo del Figma se muestra qué falta elegir. Nuevo indicador `siteChosen` en `web/src/state.js` (se activa al elegir un sitio de la lista o del selector, hacer clic en el mapa, editar coordenadas, agregar un sitio o llegar con un sitio en la URL); `web/src/ui/params.js` (`renderCriteria()`), `web/src/main.js`, textos `params.emptyWindow.*`.
  - **Nombre del sitio propio en la URL:** el parámetro de un sitio propio con nombre pasa a `pt:lat,lon~Nombre` (`web/src/ui/links.js`: `siteParam()`, `parseSiteParam()`, `cleanLabel()`; nombre sin caracteres de HTML y hasta 40 caracteres). Así la comparación muestra el nombre, y la misión, al cargar esa URL, vuelve a poner el sitio en la lista con su nombre (también al recargar). Sin nombre, el formato es el de siempre. Prueba en `web/tests/links.test.js`.
  - **Menú del "+":** el campo de texto tomaba el ancho mínimo del navegador y empujaba el contenido fuera del menú; ahora todo el menú usa `box-sizing: border-box` y `min-width: 0`.
  - **Viabilidad en "Mejores fechas":** etiqueta de color en lugar de texto gris (verde alta, dorado media, rojo baja, con los tokens existentes).
- **Alternativas descartadas:** ocultar también el "Resumen del período" sin selección (no se pidió y sigue siendo útil con el punto de ejemplo); guardar todos los sitios propios en `localStorage` (más allá de lo pedido; anotado en PENDIENTES).
- **Estado:** vigente.

## DEC-050 — Capas calculadas también en la Luna 3D

- **Contexto / problema:** bloc de notas de UI 2 de Lucio: las capas Luz, Tierra, Sol + Tierra y Viabilidad (DEC-040) se veían solo en 2D, mientras la elevación también tiene vista 3D. En DEC-040 se había descartado pintarlas en 3D porque la grilla solo cubre el polo.
- **Decisión:** con 3D elegido, la capa calculada se pinta sobre la Luna 3D:
  - Textura equirectangular de 4096 × 2048 (la convención de `moon3d.js`): de base, el mosaico LROC oscurecido; en el casquete hasta −80°, cada píxel toma la celda de la grilla del motor que le corresponde por la misma proyección polar (vecino más cercano, sin suavizar, como en 2D). Fuera del casquete no hay datos calculados y se ve la Luna real atenuada.
  - Vista 3D propia para las capas (`heatCalc`: polo sur, cámara a la distancia mínima, 2,1) para que el casquete de 10° llene la vista; se puede girar y acercar como siempre.
  - El selector 3D/2D vuelve a verse con las capas calculadas; leyenda, crédito, marcadores y caché (DEC-047) son los mismos.
- **Solución aplicada:** `web/src/ui/heat-layer.js` (`heatLayerTexture()`, cacheada por imagen de la capa), `web/src/ui/map.js` (rama 3D de las capas), `web/src/ui/moon3d.js` (vista `heatCalc`).
- **Alternativas descartadas:** pintar la capa sobre la elevación coloreada (dos escalas de color en la misma superficie); una esfera aparte solo para el casquete (más código de three.js para el mismo resultado).
- **Nota (15/11/2026):** con MAP-02 (DEC-065), fuera del casquete se pinta la capa global y la vista `heatCalc` muestra la Luna entera.
- **Estado:** vigente. Reemplaza la parte "solo en 2D" de DEC-040. El muestreo "sin suavizar" lo reemplazó DEC-051.

## DEC-051 — Mapa de calor calculado suavizado; mapa global en espera de TERRAIN-03

- **Contexto / problema:** pedido de Lucio: (1) aplicar el mapa de calor a toda la superficie lunar y (2) suavizar el render, que se veía pixelado (DEC-040 mostraba un píxel por celda de ~6,3 km a propósito, para no aparentar más resolución).
- **Decisión:**
  - **Suavizado:** la imagen de la capa pasa de 96 × 96 a 384 × 384 px. Cada píxel interpola en forma bilineal los **valores** de las 4 celdas vecinas (no los colores, para no inventar tonos que no corresponden a ningún dato) y después toma el color de la paleta; las celdas sin dato no participan y el borde del disco se suaviza. La textura 3D (DEC-050) usa la misma imagen y mezcla el borde con el mosaico. El crédito sigue indicando el tamaño real de las celdas ("celdas de ~6,3 km, suavizadas entre sí").
  - **Toda la superficie: en espera.** El atlas de horizontes LOLA (DEC-038) solo cubre hasta −80°. Se ofrecieron tres caminos: horizonte sin relieve fuera del polo, un atlas global con el DEM SVS de baja resolución o esperar a TERRAIN-03 (#71, horizonte LOLA global, Facundo). **Lucio eligió esperar a TERRAIN-03**; queda anotado en PENDIENTES.
- **Solución aplicada:** `web/src/ui/heat-layer.js` (`colorize()` con interpolación bilineal; clave persistente `heat2|…` para no reutilizar imágenes viejas; mezcla del borde en `heatLayerTexture()`), `main.css` (sin `image-rendering: pixelated`), texto `map.layerCredit.real` (ES/EN).
- **Alternativas descartadas:** suavizar con el escalado del navegador (interpola colores: aparecen tonos intermedios sin dato); interpolación bicúbica (puede sobrepasar el rango 0–100 % entre celdas).
- **Estado:** vigente. Reemplaza el "un píxel por celda, sin suavizar" de DEC-040 y DEC-050.

## DEC-052 — Sin referencias internas en la interfaz; "Datos y fuentes" a pantalla completa

- **Contexto / problema:** bloc de notas de UI 3 de Lucio. (1) El proyecto lo evalúa un jurado externo, pero la interfaz mostraba referencias al trabajo interno: "(DEC-xxx)" en cada fila de calidad (también en la comparación y el informe), "Confirmado por astronomía", "pendiente de validar por astronomía", el pie del modal que remitía a `docs/DECISIONES.md` y los DEC del pie del informe. (2) "Datos y fuentes" era una columna angosta que obligaba a desplazarse mucho.
- **Decisión y solución aplicada:**
  - Las filas de calidad dejan de mostrar su referencia (`web/src/ui/provenance.js`, `qualityHtml()`); se quita la fila "Confirmado por astronomía" de la procedencia y la clave `quality.confirmed`. Textos reescritos en ES/EN sin referencias internas: interés científico "según la bibliografía citada" y "es una guía, no una métrica científica"; umbrales "definidos por el equipo"; pie del modal con las fuentes (Horizons, LOLA, LROC y publicaciones); pie del informe sin DEC. La documentación interna (`docs/`, comentarios del código) conserva las referencias.
  - "Datos y fuentes" ocupa casi toda la ventana y reparte los bloques en tres columnas (procedencia e interés científico; efemérides y horizonte LOLA; calidad de los datos), con texto más compacto y etiquetas que se parten antes que los valores (`web/src/styles/settings.css`). Medido: entra sin desplazarse incluso en una ventana de 930 × 893 px; si la ventana es muy baja, se desplaza solo la grilla.
- **Alternativas descartadas:** pestañas dentro del modal (esconden información y suman clics); quitar contenido del modal (es la procedencia de los datos que se pide mostrar).
- **Estado:** vigente.

## DEC-053 — Luna 3D en toda la tarjeta del mapa, sin recorte cuadrado

- **Contexto / problema:** bloc de notas de UI 3: en 3D la Luna vivía en un cuadrado de 600 px en el centro de la tarjeta del mapa; al acercar se cortaba en ese cuadrado y quedaba "cuadrada". Se pidió que no la corte la caja y que lo que hay alrededor (pestañas, selectores, leyenda, coordenadas, "+", crédito) no se pierda ni quede aislado.
- **Decisión:** en 3D el lienzo de la Luna ocupa **toda la tarjeta** (848 × 848, con sus esquinas redondeadas y fondo transparente); los controles quedan por encima (`z-index`) y los textos que caen sobre la Luna llevan una sombra para leerse sobre relieve claro. Las distancias iniciales de cámara se recalcularon para el lienzo más grande: la Luna arranca algo más grande que antes (~610 px de diámetro, entre las pestañas y la caja de coordenadas), se puede acercar hasta llenar la tarjeta y alejar hasta verla entera (máximo 6,5). En 2D no cambia nada.
- **Solución aplicada:** `web/src/styles/main.css` (`.map-area[data-mode="3d"]` con el tamaño de la tarjeta, `z-index` de los controles, sombra de texto), `web/src/ui/moon3d.js` (`DIST` y `VIEWS`).
- **Alternativas descartadas:** agrandar el cuadrado del centro (el corte seguía, solo más afuera); una máscara circular en el centro (la Luna seguiría cortada al acercar, ahora en círculo).
- **Estado:** vigente.

## DEC-054 — "Ubicación de los sitios" en 3D en la comparación

- **Contexto / problema:** bloc de notas de UI 3: la comparación no tenía una vista visual de dónde están los dos puntos; se pidió usar el modelo 3D común, en vista normal, con los dos sitios ubicados y "algo interesante".
- **Decisión:** panel nuevo "Ubicación de los sitios" debajo de las tarjetas de los sitios:
  - La misma Luna 3D de la misión (`moon3d.js`, mosaico LROC) en vista normal, centrada en el **punto medio** entre A y B, con sus marcadores (A dorado, B celeste, como el resto de la comparación) y el **camino más corto por la superficie** (arco de círculo máximo) en puntos blancos. Se puede girar y acercar; solo se recentra cuando cambian los sitios.
  - Al lado, datos para leerla: distancia por la superficie (km y grados de arco), coordenadas, diferencia de latitud y longitud, y % del período con Sol y con la Tierra visible de cada sitio.
- **Solución aplicada:** `web/src/lib/geo.js` (nuevo, puro: `centralAngle()`, `surfaceDistanceKm()`, `greatCirclePoints()`, `midpoint()`, esfera de 1737,4 km de `SITE_REFERENCE`) y `web/tests/geo.test.js`; `web/src/ui/compare-globe.js` (nuevo); `web/src/ui/compare.js`; `web/compare.html`; `web/src/styles/compare.css`; `web/src/ui/moon3d.js` (vista `compare`); textos `compare.globe.*` (ES/EN).
- **Supuestos:** distancia sobre la esfera de referencia, sin relieve (es la distancia geodésica, no un recorrido transitable). Si los sitios fueran antípodas, el arco no está definido y no se dibuja.
- **Alternativas descartadas:** un mapa 2D con los dos puntos (ya existe en la misión; se pidió 3D); mover la cámara automáticamente para encuadrar ambos sitios (se pidió la vista normal).
- **Estado:** vigente.

## DEC-055 — Panorama con más detalle, fiel a la ilustración del Figma

- **Contexto / problema:** pedido de Lucio: dibujar con más exactitud la ilustración del panorama ("Comportamiento de los cuerpos celestes"), con más calidad en el terreno y detalle en la Tierra. La referencia es la imagen del frame "image 22" del Figma (1242 × 546): relieve en capas con luces suaves, suelo de regolito con cráteres de borde claro, piedras facetadas, paneles con celdas, módulo dorado y una Tierra con continentes.
- **Decisión:** mejorar la ilustración **sin cambiar lo que se calcula**:
  - La silueta del relieve sigue siendo exactamente el horizonte del escenario (LOLA o sintético, UI-08). Dentro de ella se agregan dos **bandas de profundidad** que siguen la cresta (bajada y suavizada) y una textura de grano fino; todo se recorta con la silueta, así que no se inventa relieve.
  - **Suelo delantero:** degradado más profundo, textura de regolito, luz del Sol centrada en su azimut (solo si es visible), cráteres con cuenco, pared en sombra y borde iluminado, piedras con cara iluminada y cara en sombra con su sombra, y ~90 guijarros con perspectiva.
  - **Tierra:** océanos, continentes y nubes estilizados con casquete polar y halo de atmósfera; la sombra sigue siendo la **fase real** (Horizons). Radio 11 px, como en el Figma.
  - **Sol:** halo interno además del resplandor. **Estrellas:** algunas brillantes con halo.
  - **Equipos** (mismas posiciones del Figma): paneles con marco, celdas, reflejo, patas y sombra; módulo con lámina dorada, cubierta, patas con platos y antena; antena con trípode, plato con interior y alimentador.
- **Solución aplicada:** `web/src/ui/panorama.js` (`scenery()`, `stars()`, `noiseDataUrl()`, `bandPath()`, nuevas definiciones SVG y la Tierra en un `clipPath`). La textura es un patrón PNG de ruido generado una vez (más barato de pintar al animar que un filtro `feTurbulence`). Medido en el navegador de pruebas: 1,1 ms de JavaScript por actualización de la escena y sin pérdida de cuadros frente a `main` al reproducir.
- **Alternativas descartadas:** usar la imagen del Figma de fondo (el relieve dejaría de ser el del sitio); filtros SVG de turbulencia (caros de repintar en cada cuadro).
- **Estado:** vigente.

## DEC-056 — Recorrido del Sol y la Tierra en el panorama

- **Contexto / problema:** pedido de Lucio: mostrar en la ilustración del panorama la órbita de los cuerpos celestes. El panorama mostraba solo la posición del instante elegido.
- **Decisión:** dibujar el **recorrido aparente** del Sol (dorado) y de la Tierra (celeste) en el cielo del sitio durante todo el período elegido, como líneas punteadas con un punto por día (00:00 UTC desde el inicio). Es la trayectoria en azimut y elevación vista desde el sitio, no la órbita en el espacio: es lo que sirve para planificar (cuándo y por dónde pasan, y cuándo los tapa el relieve).
  - Los recorridos salen de las mismas posiciones del escenario (JPL Horizons o el modelo, DEC-033); no se calcula nada nuevo.
  - Se dibujan detrás del relieve (el horizonte tapa los tramos ocultos) y, encima, una copia tenue, para que se lea la órbita completa y se vea qué parte pasa detrás de las montañas.
  - Lo que se ve tiene sentido físico: cerca del polo el Sol da una vuelta completa de azimut por mes lunar, rasante, y la Tierra casi no se mueve (solo sube y baja por la libración).
- **Solución aplicada:** `web/src/ui/panorama.js` (`orbitPath()`, `orbitDays()`; ~900 puntos por recorrido; se recalcula solo al cambiar el escenario), estilos en `main.css`, nota en la leyenda (`sim.orbits`, ES/EN).
- **Alternativas descartadas:** dibujar solo el tramo ya recorrido hasta el instante (hay que recalcular en cada cuadro y se pierde la vista del período completo); un diagrama orbital en el espacio (no responde a la pregunta del sitio).
- **Estado:** vigente.

## DEC-057 — La capa calculada del mapa viaja en la URL

- **Contexto / problema:** pendiente de DEC-040: la capa elegida en la pestaña ELEVACIÓN (Luz, Tierra, Sol + Tierra, Viabilidad) se perdía al recargar o al compartir el enlace.
- **Decisión:** agregar `layer=<capa>` a la URL de la misión (como el sitio y las fechas, UI-12), solo para las capas calculadas; la elevación es la de siempre y no se escribe. Al abrir una URL con `layer`, la página arranca en ELEVACIÓN con esa capa. Un valor desconocido se ignora.
- **Solución aplicada:** `web/src/ui/links.js` (`missionQuery()`, `parseMissionQuery()`), `web/src/main.js` (`stateFromUrl()` y actualización de la URL al cambiar de capa), prueba en `web/tests/links.test.js`.
- **Alternativas descartadas:** guardarla en la configuración (`localStorage`): no se comparte con el enlace y cambiaría la vista inicial para todos los sitios.
- **Estado:** vigente.

## DEC-058 — La pestaña del mapa vuelve a llamarse "MAPA DE CALOR"

- **Contexto / problema:** en UI-13 (DEC-029) la pestaña "MAPA DE CALOR" del Figma se renombró "ELEVACIÓN" porque solo mostraba la altura LOLA. Desde MAP-01 (DEC-040, DEC-050) tiene cinco capas: Elevación, Luz, Tierra, Sol + Tierra y Viabilidad, y el título quedó corto (pedido de Lucio).
- **Decisión:** volver a **"MAPA DE CALOR"** / **"HEAT MAP"**: describe todas las capas (cada una es un mapa coloreado de un valor) y es el nombre original del Figma (DEC-014). La capa "Elevación" conserva su nombre dentro del selector.
- **Solución aplicada:** textos `map.heat` (ES/EN). El subrayado de la pestaña se ajusta solo al ancho del texto.
- **Alternativas descartadas:** "CAPAS" (no dice qué muestra); "ILUMINACIÓN" (deja afuera elevación y Tierra).
- **Estado:** vigente. Reemplaza el renombre de DEC-029.

## DEC-059 — Informe web del sitio: terreno, mejores fechas y trayectoria Tierra–Luna

- **Contexto / problema:** pedido de Lucio: "Informe" era solo un documento para imprimir (DEC-044). Se pidió también un apartado web, "como comparar pero específico de ese punto, con muchísima más información", con la viabilidad del terreno e incluso el cálculo de una trayectoria desde la Tierra hasta la Luna.
- **Decisión:** página nueva `informe.html` (misma consulta que la misión: sitio y fechas en la URL). "Informe" en el menú de la misión y de la comparación abre esta página; el botón "Imprimir / guardar PDF" imprime el informe de texto de DEC-044. Secciones:
  - **Resumen del período:** viabilidad, % de luz y de comunicación, Sol y Tierra a la vez, noche y corte de comunicación más largos.
  - **Ubicación:** la Luna 3D (`moon3d.js`) centrada en el sitio.
  - **Terreno** (`lib/site-terrain.js`, nuevo): con el DEM LOLA polar reducido (DEC-034, 480/960 m): altura del suelo, pendiente en el punto (diferencias centradas a ±2 píxeles), pendiente media y máxima en 3 km a la redonda, % del área con pendiente menor que 5°, 10° y 15°, rugosidad (desvío de la altura) y desnivel, más el horizonte LOLA. Los colores de la pendiente (verde < 5°, dorado 5–10°, rojo ≥ 10°) son una **referencia orientativa del equipo**, no un requisito de un vehículo concreto. Fuera de la cobertura (al norte de −75°: Chandrayaan-3, Chang'e 4, Apollo 11) se dice que no hay datos, sin estimarlos. Las pendientes son de escala kilométrica (el DEM suaviza lo menor a ~1 km).
  - **Luz y comunicación:** ventanas de luz y de enlace como franjas sobre el período y la tabla de métricas.
  - **Posición promedio** del Sol y la Tierra y rachas (DEC-042).
  - **Mejores fechas** del sitio (DEC-046), con clic para aplicarlas.
  - **Trayectoria Tierra–Luna** (`lib/trajectory.js`, nuevo): transferencia de **Hohmann** con cónicas enlazadas desde una órbita de espera de 185 km hasta el apogeo a la distancia de la Luna, captura en órbita lunar circular de 100 km y descenso. La distancia Tierra–Luna al llegar sale del radio angular de la Tierra en la serie de **JPL Horizons** del sitio (si no hay serie, la distancia media). Muestra fecha de la inyección translunar (contando hacia atrás desde el alunizaje = inicio del período, con 1 día en órbita lunar), tiempo de viaje, Δv de cada maniobra y total, y un diagrama a escala. Constantes: μ Tierra 398 600,4418 km³/s², μ Luna 4902,8001 km³/s², radio terrestre 6378,137 km. Valores de control: ~5 días y Δv de TLI ~3,13 km/s, como en la bibliografía.
  - **Datos y fuentes:** procedencia, interés científico y calidad de cada dato.
- **Supuestos y límites** (a la vista en la página): la trayectoria es la de menor energía en el modelo de dos cuerpos, sin pérdidas por gravedad, cambios de plano ni correcciones; las misiones tripuladas suelen usar trayectorias más rápidas (Apollo: ~3 días). Sirve para dimensionar fechas y Δv, no para planificar un vuelo.
- **Solución aplicada:** `web/informe.html`, `web/src/informe.js`, `web/src/ui/site-report.js` (nuevos); `web/src/lib/trajectory.js` y `web/src/lib/site-terrain.js` (nuevos, puros) con `web/tests/informe-calc.test.js`; `web/src/lib/polar-dem.js` (`polarDemSample()`, `polarDemResolutionM()`, solo lectura); `web/src/ui/ephemerides.js` (`loadPolarTerrain()`); `web/src/lib/format.js` (`rangeUTC()`); `web/src/ui/links.js` (`informeUrl()`); enlaces "Informe" en `index.html`, `compare.html` y `src/compare.js`; `vite.config.js` (tercera página); estilos en `compare.css`; textos `reportWeb.*` (ES/EN).
- **Alternativas descartadas:** propagar la trayectoria con integración numérica de tres cuerpos (mucho más trabajo y supuestos para una estimación); usar umbrales de pendiente de un vehículo real (no hay uno elegido; se marcan como referencia).
- **Estado:** vigente. Pendiente: validar los umbrales de pendiente y los supuestos de la trayectoria (PENDIENTES).

## DEC-060 — Calendario con la paleta de la web y Luna animada de fondo

- **Contexto / problema:** pedido de Lucio: (1) el calendario desplegable era blanco (copia de la imagen "image 30" del Figma) y no combinaba con el resto; se pidió mantener su estructura y adaptarlo a la paleta. (2) Sumar una animación de la Luna en el fondo, con las tarjetas medio transparentes. Ambos se apartan del Figma (DEC-014) por pedido explícito del responsable de la web.
- **Decisión y solución aplicada:**
  - **Calendario** (`main.css`): misma estructura (encabezado con flechas, grilla de 7 columnas, aviso), con fondo de campo oscuro opaco, borde dorado como el menú del "+", flechas con borde y hover, días de la semana en mono, rango en dorado tenue, extremos en dorado lleno con texto oscuro, hover y foco visibles, días deshabilitados en gris.
  - **Luna de fondo** (`index.html`, `compare.html`, `informe.html`, `main.css`): esfera fija detrás de la página (`.moon-backdrop`, `z-index` por debajo del escenario) con el mosaico LROC de NASA SVS (el de 4k que ya bajan las vistas 3D, sin descargas extra) girando una vuelta cada 240 s. La animación mueve una tira con la textura repetida con `transform` (barato de animar); un degradado le da volumen y un halo la separa del fondo. Es decorativa (`aria-hidden`) y con "menos movimiento" queda quieta. La proyección es ilustrativa (textura plana sobre un disco), no una vista física.
  - **Tarjetas semitransparentes** (`tokens.css`): `--panel`, `--panel-2` y `--field` pasan a los mismos colores del Figma con alfa (0,74; 0,78; 0,86) y los contenedores grandes desenfocan lo que tienen detrás (`backdrop-filter`). Los emergentes y modales (calendario, menú del "+", avisos, "Datos y fuentes", configuración) usan las versiones opacas nuevas (`--panel-solid`, `--panel-2-solid`, `--field-solid`) para que se lean bien.
- **Alternativas descartadas:** una segunda Luna 3D con three.js de fondo (otro contexto WebGL encima del del mapa); animar `background-position` (repinta en cada cuadro).
- **Corrección (15/11):** `backdrop-filter` crea un contexto de apilamiento por caja y el calendario de la comparación y del informe quedaba debajo de las tarjetas siguientes; los controles (`.cmp-controls`) van con `z-index: 20` y el panel de parámetros con `z-index: 2`.
- **Estado:** vigente. Reemplaza el calendario blanco de la réplica del Figma.

## DEC-061 — Horizonte LOLA real para Chang'e 4 y Apollo 11 desde `LDEM_128` (TERRAIN-03)

- **Contexto / problema:** Chang'e 4 (−45,46°) y Apollo 11 (0,67°) eran los únicos sitios curados con horizonte **sintético** (DEC-005), porque `LDEM_60S_240M` (DEC-025) solo cubre −90°..−60°. TERRAIN-03 (#71) pide calcularlo desde un producto global de LOLA con el mismo algoritmo que TERRAIN-02 (DEC-030). Las imágenes globales pesan ~2 GiB cada una y la máquina tenía ~8 GB libres.
- **Decisión:**
  - Producto: NASA PDS, data set `LRO-L-LOLA-4-GDR-V1.0` (DOI [10.17189/1520642](https://doi.org/10.17189/1520642)), DEM **`LDEM_128` V3.0** y conteos **`LDEC_128`**: cilíndrica simple, 128 píxeles/grado (236,901 m/píxel en el ecuador), 23 040 × 46 080, int16 little-endian, altura = DN × 0,5 m sobre la esfera de 1737,4 km, marco "Mean Earth/Polar Axis of DE421" (el mismo que el polar). Es el global de un solo archivo con resolución comparable al polar de 240 m.
  - Mismo algoritmo y parámetros que DEC-030 (`selene-lola-horizon/v1`: rayos de 300 km, paso 0,12 km, 0,5° de azimut, observador a 2 m, curvatura exacta). Solo cambia el muestreador.
  - No se guardan las imágenes enteras: se recorren en streaming, se verifica el tamaño y el MD5 del **archivo completo** y se guarda solo una ventana alrededor de cada sitio (radio del horizonte + 0,25°).
  - Altura del observador en las efemérides de esos dos sitios: suelo LOLA + 2 m (`measured-datum`), como en los polares (DEC-033). Reemplaza los 0 km supuestos.
- **Archivos e integridad** (base `https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/`). PDS no publica el MD5 de las imágenes: se calculó en la descarga del 2026-11-14 y una **segunda descarga independiente** dio el mismo MD5 y ventanas idénticas byte a byte.

  | Archivo | Bytes | MD5 |
  | --- | --- | --- |
  | `ldem_128.img` | 2 123 366 400 | `397c24a9a5eb71cba641373fe9adb3a4` |
  | `ldem_128.lbl` | — | `f6d5cef735e6b236a7821cb278a11efe` |
  | `ldem_128.xml` | — | `ccc90d3c00d1be4443430a1b2ff05ea1` |
  | `ldec_128.img` | 2 123 366 400 | `118203c4632ac4940713f7d54070e803` |
  | `ldec_128.lbl` | — | `d4221ab1e14aabbcc095a2b6389712f2` |
  | `ldec_128.xml` | — | `01db219b4917fe0bd904eefedd323c9c` |

  Proyección (de la etiqueta): línea 0 al norte, sample 0 en 0° E, *pixel registered*; `línea = 11519,5 − 128·lat` y `sample = 23039,5 + 128·(lon − 180°)`, 0-based, con lon en 0..360 (la longitud se lee con módulo).
- **Solución aplicada:**
  - `web/src/data/terrain/lola-ldem-128.js` (nuevo): manifiesto (DOI, versión, URLs, bytes, MD5, grilla y proyección). No contiene muestras.
  - `web/scripts/extract-lola-global.mjs` (nuevo, `npm run data:lola:global`): descarga en streaming las dos imágenes en paralelo (~4,2 GB en ~3 min a ~23 MB/s), verifica tamaño y MD5 y escribe las ventanas de Chang'e 4 (2599 × 4598), Apollo 11 (2599 × 2645) y Chandrayaan-3 (2599 × 14 274, solo para validar) en `web/data/derived/lola-128/` (~220 MB, ignorado por git) con su `index.json` (MD5 de origen y de cada ventana). `--src` lee imágenes locales en lugar de la red.
  - `web/src/lib/horizon-lola.js`: `createCylindricalWindowSampler()` (bilineal, mismo contrato que `createRasterSampler`, `count = 0` ⇒ baja confianza, `null` fuera de la ventana: no se extrapola). `createLolaHorizon()` usa el `source` de la entrada si lo tiene, y si no, el de la tabla.
  - `web/scripts/build-lola-horizons.mjs`: lee y verifica las ventanas (`loadGlobalWindows`), agrega las entradas de LDEM_128 con su propio `source` (producto, versión, MD5, proyección y escala) y deja `excluded` vacío. `--global-only` recalcula solo esas entradas y conserva las polares de la tabla versionada sin tocarlas (en esta máquina no estaban los rasters polares; se comprobó que las 5 entradas polares quedaron idénticas). `--svg` regenera `docs/img/horizonte-lola.svg` con los 7 sitios (LOLA vs. sintético: la comparación antes/después).
  - `web/src/data/terrain/lola-horizons.js` regenerada; `web/public/data/ephemerides/change4.json`, `apollo11.json` e `index.json` regeneradas con `fetch-horizons.mjs --alt-km=-5.9284` / `--alt-km=-1.9329` y `build-ephemerides.mjs --sites change4,apollo11` (opción nueva: rehace solo esos sitios y actualiza su entrada del índice).
  - Pruebas: `web/tests/horizon-lola.test.js` (ventana cilíndrica sintética: centros de píxel, escala de DN, cruce de 0°/360°, `count = 0`, esfera lisa ⇒ depresión del observador, `source` por entrada); `web/tests/validacion/horizonte-lola-global.test.js` (nuevo: entradas completas y sin truncar; con las ventanas presentes, reproducción exacta y control cruzado); `horizonte-lola-tabla.test.js`, `analysis.test.js` y `lola-ui.test.js` actualizadas.
  - Textos ES/EN: la nota del perfil del horizonte y el pie del informe ya no dicen que el LOLA es solo polar; "240 m/píxel" pasa a "≈ 240 m/píxel".
- **Resultados:**

  | Sitio | Suelo LOLA | Horizonte (mín / media / máx) | `count = 0` | Luz media anual | Comunicación |
  | --- | --- | --- | --- | --- | --- |
  | Chang'e 4 | −5930,4 m | −0,02° / 1,19° / 2,99° | 65,4 % de azimuts | 49,9 % → **49,7 %** | 0 % → 0 % |
  | Apollo 11 | −1934,9 m | 0,02° / 0,89° / 1,78° | 73,9 % de azimuts | 49,2 % → **48,9 %** | 100 % → 100 % |

  Luz y comunicación: media de 12 ventanas de 30 días desde el 01/11/2026, antes (sintético, `main`) y después. El efecto es chico porque a esas latitudes el Sol sube mucho más que el horizonte; el cambio importante es que el relieve mostrado ya es medido. Las alturas son coherentes con el fondo de Von Kármán y con Mare Tranquillitatis.
- **Control cruzado:** en Chandrayaan-3 (−69,37°), cubierto por los dos productos, el mismo algoritmo con LDEM_128 da el **mismo suelo** (529,7 m) y, en los 631 azimuts que el polar no trunca, una diferencia de media +0,028°, RMS 0,069° y máximo 0,309°. Las tolerancias de la prueba (media < 0,1°, RMS < 0,15°, máximo < 0,5°) son del equipo.
- **Supuestos y límites:**
  - `count = 0` en la mayoría de los azimuts: cerca del ecuador las trazas de LOLA están más separadas que 237 m y muchos píxeles son interpolados por el equipo LOLA (GMT `surface`). Se marca baja confianza, como en DEC-030; no se inventa un umbral.
  - La etiqueta avisa de posibles artefactos en los bordes de las bandas de 45° de latitud con que se generó el producto: Chang'e 4 (−45,46°) está a 0,46° (~14 km) del borde de −45°. En la ventana, la diferencia media de altura entre las dos filas del borde es 20,2 m, frente a una mediana de 17,6 m (máximo 20,6 m) en las 80 filas vecinas: no se ve un escalón, pero queda como pendiente de revisión.
  - El MD5 de las imágenes no lo publica PDS: es el calculado por el equipo, comprobado en dos descargas.
  - Los puntos propios al norte de −75° siguen con horizonte sintético (fuera de alcance de TERRAIN-03).
- **Alternativas descartadas:** `LDEM_64` (~474 m/píxel: la mitad de resolución que el polar); SLDEM2015 (±60°: no cubre todos los sitios con un solo producto y suma otro marco de procesamiento); descargar las imágenes enteras (~4,2 GB en disco sin necesidad); pedir rangos HTTP por fila (miles de pedidos y sin MD5 del archivo completo).
- **Estado:** vigente. Desbloquea DATA-03 (#72). Pendiente de validar por astronomía: los dos horizontes y el posible artefacto de borde de banda en Chang'e 4.

## DEC-062 — Fixtures de JPL Horizons sin conversión de fin de línea

- **Contexto / problema:** `web/tests/validacion/horizons-fixture.test.js` verifica el SHA-256 de las respuestas crudas de Horizons guardadas en `web/tests/fixtures/horizons/`. En Windows con `core.autocrlf=true`, Git las reescribía con CRLF al hacer checkout y fallaban 2 pruebas en local (en la CI, sobre Linux, pasaban).
- **Decisión:** marcar esos archivos como no texto para Git (`-text`): se guardan y se extraen byte a byte, sin convertir los fines de línea.
- **Solución aplicada:** `.gitattributes` (nuevo, en la raíz) con `web/tests/fixtures/horizons/*.json -text`. Los archivos del repositorio no cambian (ya estaban con LF); solo se vuelven a extraer en la copia local.
- **Alternativas descartadas:** normalizar los fines de línea en la prueba antes de calcular el hash (dejaría de verificar el crudo exacto de la API); `*.json -text` para todo el repo (más amplio de lo necesario).
- **Estado:** vigente.

## DEC-063 — Sin parámetros sintéticos de relieve en los sitios curados (DATA-03)

- **Contexto / problema:** `relief` y `elevationKm` de `web/src/data/sites.js` solo daban forma al horizonte sintético (DEC-005) y no son medidas. Desde TERRAIN-03 (DEC-061) los 7 sitios curados tienen horizonte LOLA precalculado, que `scenarioHorizon()` prefiere siempre que el sitio conserve sus coordenadas; con coordenadas editadas, `main.js` y `ui/places.js` ya no pasaban esos campos. Es decir, no tenían efecto y podían confundirse con datos reales.
- **Decisión:** quitarlos del catálogo y del código que los copiaba. El horizonte sintético sigue como respaldo para puntos propios sin LOLA (fuera de alcance quitarlo).
- **Solución aplicada:**
  - `web/src/data/sites.js`: sin `relief` ni `elevationKm` en ningún sitio; comentario actualizado.
  - `web/src/main.js` (`ensureScenario`) y `web/src/ui/places.js` (`currentSiteFor`): el sitio del escenario es solo `{id, lat, lon}`.
  - `web/src/lib/terrain.js`: `createHorizon()` toma el relieve siempre de `estimateRelief()` y ya no aplica `horizonDip()`. `horizonDip()` se conserva como utilidad geométrica (la usan las pruebas del horizonte LOLA) y sigue en el contrato de `docs/ARCHITECTURE.md`.
  - `web/src/lib/horizons.js`: se mantiene el rechazo de `elevationKm` como altura del observador (defensa contra el mismo error); solo cambia el comentario.
  - Pruebas: `terrain`, `analysis` y `compare` usan sitios de prueba sin esos campos; `validacion/horizons-fixture.test.js` comprueba que el catálogo no trae `elevationKm`.
- **Verificación:** con el cambio, `scenarioHorizon()` devuelve `source = "lola"` en los 7 sitios curados con sus coordenadas (comprobado con un script local), así que los resultados de los sitios curados no cambian. Para puntos propios tampoco cambian: nunca tuvieron `relief` ni `elevationKm`.
- **Alternativas descartadas:** dejar los campos "por las dudas" (datos inventados en el catálogo sin uso); borrar `horizonDip()` (la usan pruebas del horizonte LOLA y es parte del contrato documentado); eliminar el horizonte sintético (sigue siendo el respaldo, fuera de alcance de DATA-03).
- **Estado:** vigente.

## DEC-064 — Revisión de traducciones ES/EN (I18N-01)

- **Contexto / problema:** I18N-01 (#17) pide comprobar que `es.js` y `en.js` tengan las mismas claves, terminología y advertencias equivalentes, y que no quede texto visible escrito directo en JS o HTML.
- **Decisión:** corregir solo lo que cambia el sentido o rompe la coherencia. No se reescribe el estilo: ese es el trabajo de redacción de Alfonso y Cata.
- **Solución aplicada:**
  - **Claves:** se compararon con un script (claves aplanadas y marcadores `{x}`). Hay 453 claves en cada idioma, con los mismos marcadores.
  - **Texto fijo:** `index.html` tenía `aria-label="Mapa"` en la tarjeta del mapa. Ahora usa `data-i18n-attr` con la clave nueva `map.label` ("Mapa" / "Map"). Las referencias bibliográficas de `ui/report.js` quedan en inglés, como se citan.
  - **Terminología (EN):** el ángulo sobre el horizonte se llama *elevation*, no *height* (`places.dates.earthPeak`, `places.categoryHint.communication`). En `params.avgRange`, "mean terrain" pasa a "mean horizon", porque el valor es la elevación media del horizonte. "Transferred" pasa a "shifted" en las efemérides trasladadas (`sim.bodies.derived`, `dataNote.eph.derived`, `quality.eph.state.derived`, `quality.eph.derivedFrom`, `quality.rowHint.ephemerisDerived`), para no confundirlas con la transferencia de Hohmann del informe. `places.noTraits` usa "features", como el resto de la sección.
  - **Ortografía:** el inglés queda unificado en la variante estadounidense ("Analyzed", "kilometer-scale"), igual que "color" y "behavior". En español, `sim.drag` pasa a voseo ("Arrastrá"), como el resto de la interfaz.
- **Alternativas descartadas:** unificar ahora el espacio antes de `%`. Muchas cifras se arman en `web/src/ui/` sin pasar por `i18n`, así que haría falta un cambio de formato fuera del alcance de esta tarea; queda en `PENDIENTES.md`.
- **Estado:** vigente, pendiente de aprobación de Lucio y Cata en el PR.

## DEC-065 — Mapa de calor en toda la superficie lunar con LOLA global (MAP-02)

- **Contexto / problema:** las capas calculadas del mapa de calor (luz, Tierra, Sol + Tierra, viabilidad; DEC-038, DEC-040, DEC-050) solo cubrían el casquete hasta −80°, porque el atlas de horizontes sale de `LDEM_60S_240M`. Las efemérides de JPL Horizons, en cambio, sirven para cualquier punto (traslado de DEC-034).
- **Decisión** (Lucio, 15/11/2026, MAP-02 #100):
  - El horizonte fuera del casquete sale de un **atlas global LOLA** calculado desde `LDEM_16` + `LDEC_16` de PDS (~1,9 km/píxel). Se descartaron el horizonte matemático y el sintético.
  - En **3D** se colorea la Luna entera y el casquete sur conserva su atlas de 240 m. La **vista 2D** polar no cambia (Figma).
- **Solución aplicada:**
  - Datos: `web/src/data/terrain/lola-ldem-16.js` (manifiesto con URL, bytes, MD5 calculado por el equipo y grilla de las etiquetas PDS3). `web/scripts/build-global-heat-atlas.mjs` genera `web/public/data/terrain/heat-atlas-global-2deg.{bin,json}` (2,3 MiB, 62 s). La grilla es equirectangular de 2° × 2° (180 × 90 celdas, fila 0 al norte, columna 0 desde −180°), con el algoritmo de DEC-030: 72 azimuts cada 5°, rayos de 300 km, paso de 0,95 km (medio píxel) y observador a 2 m. Se usa la misma codificación que el atlas polar.
  - `web/src/lib/horizon-lola.js`: `createGlobalCylindricalSampler()`. Es bilineal, con la longitud circular y la fila más cercana a menos de medio píxel del polo, para que ningún rayo se corte en 0° ni cerca de un polo.
  - `web/src/lib/heat-map.js`:
    - `globalCellCenter()`, `decodeGlobalHeatAtlas()`, `registerGlobalHeatAtlas()` y `computeRealGlobalHeatStats()`.
    - El cálculo por celda se factorizó (`bodySeries()`, `atlasStats()`) y es el mismo para los dos atlas; el resultado polar no cambia.
  - `web/src/lib/analysis.js`: `computeGlobalHeatmap()` tiene las mismas capas y la misma política de visibilidad (DEC-036) y viabilidad (DEC-007) que `computePolarHeatmap()`. **Solo trabaja con datos reales:** si falta el atlas global o la ventana sale de Horizons, devuelve `null` y la interfaz pinta solo el casquete.
  - Interfaz:
    - `ui/ephemerides.js` baja el atlas global junto con el polar, con su estado en `ui/data-status.js` (`globalHeatAtlas`). El worker (`workers/compute.worker.js`) calcula las dos grillas en la misma tarea.
    - `ui/heat-layer.js` colorea la grilla global con la misma interpolación de valores que DEC-051 (longitud circular) y la pinta debajo del casquete detallado en la textura 3D. La caché persistente guarda los valores globales cuantizados a un byte (~22 KB) en lugar de la imagen; la clave pasa a `heat3`.
    - `ui/map.js` agrega al crédito la resolución y la fuente del resto de la Luna (`map.layerCredit.global*`, ES/EN).
    - `ui/moon3d.js`: la vista inicial de las capas (`heatCalc`) pasa a mostrar la Luna entera, inclinada hacia el polo sur (lat −60°, distancia 5,25). Reemplaza la cámara cercana de DEC-050.
- **Validación** (`tests/heat-map-global.test.js` con un atlas sintético; `tests/validacion/heat-atlas-global.test.js` con el atlas real):
  - En ventanas de 30 días desde el 01/12/2026, la luz de la celda global coincide con el escenario puntual (horizonte LOLA de alta resolución) en Chandrayaan-3 (48,9 % frente a 49,1 %), Chang'e 4 (49,7 % frente a 49,4 %) y Apollo 11 (49,4 % frente a 49,1 %). La prueba usa una tolerancia de 2 p. p., criterio del equipo.
  - En el borde de −80°, la diferencia media global − polar es de +2,1 p. p. de luz y +0,4 p. p. de Tierra, sin salto sistemático. El RMS (15 y 24 p. p.) refleja la distinta resolución: celdas de ~60 km contra ~6 km.
  - La cara visible ve la Tierra todo el tiempo y la oculta no, salvo cerca de los polos y en la franja de libración.
- **Supuestos y límites:**
  - Las celdas son de 2° (~61 km en el ecuador, más angostas en longitud cerca de los polos) y cada una vale lo de su centro. LDEM_16 no resuelve relieve menor a ~2 km. Por eso, cerca de los polos, la celda global no representa a un sitio puntual: ahí manda el casquete detallado. El crédito lo indica.
  - La etiqueta de `LDEM_16` declara la versión V3.1 y la de `LDEC_16`, la V3.0. Se usan tal como las publica PDS.
  - El MD5 de las imágenes no lo publica PDS: es el calculado por el equipo sobre la descarga del 15/11/2026.
  - Sol y Tierra salen de la serie de Shackleton trasladada (DEC-034). La distancia Tierra–Luna fija agrega < 0,02° de error.
- **Alternativas descartadas:**
  - Grilla de 1° (9,3 MiB con 72 azimuts: demasiado para la página).
  - `LDEM_128` completo (~2 GiB de descarga y horas de cálculo).
  - Horizonte matemático o sintético fuera del casquete (ver la decisión).
  - Vista 2D equirrectangular (el polo queda muy estirado y cambia el Figma).
  - Guardar la imagen global en localStorage (excede la cuota).
- **Estado:** vigente. Pendiente de validar por astronomía: la grilla global y el empalme en −80°.

## DEC-066 — Ayuda por tarjeta, recorrido guiado y listas que piden lo que falta (UI-16)

- **Contexto / problema:** notas de Lucio del 15/11/2026. La página se entiende si uno conoce el proyecto, pero no dice qué es cada tarjeta ni cómo se lee. Además, "Mejores lugares" mostraba un top 5 aunque no hubiera fechas elegidas (con el período por defecto) y "Mejores fechas" lo mostraba sin sitio elegido (con el sitio por defecto). Por último, la nota del panorama juntaba cuatro datos distintos en un bloque de texto corrido.
- **Decisión** (Lucio, entre tres propuestas): ayuda en cada tarjeta **y** recorrido guiado; se descartó numerar las zonas y agregar una página de guía. Los textos van en una oración corrida o en un punteo, sin frases cortadas.
- **Solución aplicada:**
  - **Listas sin selección** (`web/src/ui/places.js`): sin `dateChosen`, "Mejores lugares" pide las fechas; sin `siteChosen`, "Mejores fechas" pide el sitio. Así no se presenta como resultado un período o un sitio que nadie eligió.
  - **Ayuda por tarjeta** (`web/src/ui/help.js`, `web/src/styles/help.css`, `web/index.html`): un botón «?» en Mejores lugares, mapa, parámetros, panorama y tarjetas de estado. Abre un panel con una oración de introducción y un punteo. Se cierra con Escape, con su botón o con un clic afuera.
  - **Recorrido guiado:** una bienvenida y las cinco zonas en el orden de uso (parámetros, mapa, lugares, panorama, estado), con la zona resaltada y el mismo texto de la ayuda. Se abre solo la primera vez (se recuerda en `localStorage`, clave `selene-tour-seen`) y se repite desde «Guía» en el menú. No se abre solo si la página llega con una selección en la URL o para imprimir.
  - **Leyenda del panorama** (`web/src/ui/panorama.js`): cuatro renglones con etiqueta (Vista, Sol y Tierra, Relieve, Recorridos) y una muestra de la línea punteada de cada cuerpo. Reemplaza las claves `sim.caption`, `sim.bodies.*`, `sim.relief` y `sim.orbits` por `sim.legend.*`.
  - Todo se ubica dentro de `#stage`, en píxeles del diseño. Textos en `help.*` (ES/EN).
- **Supuestos y límites:** estos elementos no están en el Figma (excepción a DEC-014 decidida por Lucio). "Mejores fechas" sigue usando la duración por defecto si no hay fechas elegidas, y lo dice en su texto.
- **Alternativas descartadas:** solo `title` en los títulos (no se ve en pantallas táctiles ni con teclado); un video o una página aparte (saca al usuario de la herramienta).
- **Estado:** vigente.

## DEC-067 — Terreno del informe en toda la superficie lunar (TERRAIN-04)

- **Contexto / problema:** la sección "Terreno" del informe (DEC-059) usa el DEM polar reducido, que llega hasta −75°. Fuera de ahí decía "Sin datos de relieve LOLA para este sitio", incluso para tres sitios de la lista (Chandrayaan-3, Chang'e 4 y Apollo 11).
- **Decisión** (Lucio, 15/11/2026, entre tres alcances): terreno fino precalculado para los sitios curados y DEM global de baja resolución, a demanda, para los puntos propios. Se descartó usar una sola fuente gruesa para todo y dejar a los puntos propios sin datos.
- **Solución aplicada:**
  - **Sitios curados fuera del DEM polar:** `web/scripts/build-site-terrain.mjs` calcula `siteTerrain()` sobre las ventanas de `LDEM_128` + `LDEC_128` (237 m/píxel; `extract-lola-global.mjs` verifica tamaño y MD5 de las imágenes completas) y escribe `web/src/data/terrain/site-terrain.js`. Usa el mismo paso (0,96 km) y radio (3 km) que el cálculo polar, para que las cifras de todos los sitios de la lista sean comparables.
  - **Puntos propios:** `web/scripts/build-global-dem.mjs` empaqueta `LDEM_16` + `LDEC_16` en `web/public/data/terrain/lola-global-16ppd.{bin,json}` (33,6 MiB): las alturas sin modificar y un bit por píxel que marca los interpolados (1,1 % del total). `web/src/lib/global-dem.js` lo decodifica y lo muestrea. La página lo baja solo al abrir el informe de un punto que lo necesita.
  - **Elección de la fuente** (`web/src/lib/site-terrain.js`, `terrainForSite()`): DEM polar reducido, después la tabla precalculada (solo si el sitio conserva sus coordenadas) y por último el DEM global. Con el global el paso es de 3,8 km y el radio de 12 km (`GLOBAL_TERRAIN_PARAMS`), la misma proporción que en el polo.
  - **Interfaz** (`web/src/ui/site-report.js`, `informe.js`, `ephemerides.js`, `data-status.js`): la nota dice la fuente y la escala de cada caso (`reportWeb.terrain.note.polar | fine | global`). Con el DEM global las pendientes no llevan los colores de aptitud para alunizar, porque son de escala regional. Se quita el aviso `reportWeb.terrain.outside`.
- **Resultados de la tabla** (`LDEM_128`, radio de 3 km):

  | Sitio | Altura | Pendiente en el punto | Pendiente media / máxima | Rugosidad / desnivel | Puntos con píxeles interpolados |
  | --- | --- | --- | --- | --- | --- |
  | Chandrayaan-3 | 530 m | 0,39° | 0,69° / 1,79° | 11,5 m / 44,6 m | 31 % |
  | Chang'e 4 | −5930 m | 0,11° | 0,30° / 0,91° | 5,6 m / 28,7 m | 82,8 % |
  | Apollo 11 | −1935 m | 0,85° | 0,85° / 1,32° | 22 m / 77,3 m | 75,9 % |

- **Validación** (`tests/global-dem.test.js`, `tests/validacion/terreno-global.test.js`): las alturas de la tabla coinciden a menos de 1 m con las del horizonte de DEC-061 (mismo producto y mismo punto). Las del DEM global difieren hasta 13 m de esas (la prueba tolera 30 m, criterio del equipo). Los MD5 de `LDEM_128` y `LDEC_128` de esta descarga son los del manifiesto.
- **Supuestos y límites:**
  - Con `LDEM_16` las pendientes son de tramos de unos 4 km: dan contexto, pero no sirven para evaluar una zona de alunizaje. La interfaz lo dice.
  - Cerca del ecuador la mayoría de los píxeles de `LDEM_128` son interpolados por el equipo LOLA (ver la tabla). Se informa el porcentaje; no se descartan.
  - Un sitio curado con coordenadas editadas pasa a tratarse como punto propio (DEM global).
  - El DEM global agrega 33,6 MiB al repositorio y a la descarga de ese informe (queda anotado en `PENDIENTES.md`).
- **Alternativas descartadas:** pedir a PDS solo las filas necesarias por rangos HTTP (no permite verificar el MD5 del archivo completo, criterio de DEC-061); una versión del DEM a 8 píxeles/grado (8 MiB, pero con pendientes de tramos de ~8 km); calcular el terreno de los puntos propios con el atlas de horizontes (no guarda alturas vecinas).
- **Estado:** vigente. Pendiente de validar por astronomía.

## DEC-068 — Horizonte LOLA regional para puntos propios fuera del polo sur (CORE-04)

- **Contexto / problema:** auditoría del 15/11/2026 sobre datos no reales a la vista. Los puntos propios al norte de −75° (cualquier clic fuera del polo sur) seguían usando el horizonte sintético de DEC-005, que es un relieve inventado. Desde MAP-02 (DEC-065) existe un atlas global de horizontes LOLA.
- **Decisión** (Lucio, 15/11/2026): usar ese atlas para esos puntos, rotulado como aproximado. Se descartaron el horizonte plano y dejar el sintético.
- **Solución aplicada:**
  - `web/src/lib/heat-map.js`: `regionalHorizonFor(site)` interpola en forma bilineal, azimut por azimut, los horizontes de los cuatro centros de celda vecinos (longitud circular; hacia los polos se repite la última fila). Devuelve la misma interfaz que un horizonte LOLA, con `meta.regional = true`.
  - `web/src/lib/analysis.js`: `scenarioHorizon()` prefiere, en orden, el LOLA curado, el polar reducido, el regional y el sintético. `needsRegionalAtlas(site)` indica si conviene bajar el atlas.
  - `web/src/ui/ephemerides.js`: `ensurePolarTerrain()` también baja el atlas global (2,3 MiB) si algún sitio no tiene horizonte curado, y avisa a todas las pantallas que lo esperan. El worker lo usa para "Mejores fechas".
  - Interfaz: el panorama, la nota de datos, "Datos y fuentes" y el informe dicen "LOLA de la zona (celdas de 2°, aproximado)" (`sim.horizonRegional`, `dataNote.horizon.regional`, `quality.rowHint.horizonRegional`, `quality.lola.regional`). El estado de carga y de error ya no habla solo del DEM reducido.
- **Validación** (`tests/horizonte-regional.test.js`): en 30 días desde el 01/12/2026, con las coordenadas de los sitios de control tratadas como punto propio:

  | Sitio | Luz: alta resolución / regional / sintético | Tierra |
  | --- | --- | --- |
  | Chandrayaan-3 | 49,1 % / 48,2 % / 47,6 % | 100 % en los tres |
  | Chang'e 4 | 49,4 % / 48,8 % / 49,6 % | 0 % en los tres |
  | Apollo 11 | 49,1 % / 49,3 % / 49,2 % | 100 % en los tres |

  La prueba exige menos de 2 p. p. de diferencia con el de alta resolución (criterio del equipo).
- **Supuestos y límites:**
  - Es el relieve medido de la zona, no el del punto: las celdas miden ~60 km y LDEM_16 no resuelve relieve menor a ~2 km. A latitudes medias el horizonte pesa poco, así que el resultado numérico no mejora respecto del sintético; lo que cambia es que deja de ser inventado.
  - Cerca de los polos una celda de 2° no representa a un punto (en Shackleton da 29 % de luz contra 100 % del horizonte real). Por eso al sur de −75° manda el DEM polar reducido y el regional se usa solo mientras ese DEM carga o si falla. Al norte de +75° no hay DEM fino: el regional es lo único disponible y vale la misma advertencia.
  - El atlas no guarda la distancia ni la confianza por azimut: se informa el % medio de baja confianza de las celdas.
  - El horizonte sintético sigue existiendo como respaldo mientras cargan los datos o si fallan, y en el mapa de calor aproximado.
- **Alternativas descartadas:** calcular el horizonte exacto del punto con LDEM_16 en la página principal (35 MiB de descarga); tomar la celda más cercana sin interpolar (saltos al mover el punto).
- **Estado:** vigente. DEC-005 queda como respaldo. Pendiente de validar por astronomía.

## DEC-069 — La sección inferior pide sitio y fechas en lugar de mostrar un ejemplo (UI-17)

- **Contexto / problema:** auditoría del 15/11/2026. Al abrir la página, el panorama, la línea de tiempo y las tarjetas de energía, comunicación y resumen mostraban resultados del punto de muestra del Figma (−66,52°, −110,98°) y del 14/11/2026. Nadie había elegido ese sitio ni esas fechas. DEC-049 ya ocultaba la "Ventana de análisis" en ese caso y DEC-066 hizo lo mismo con las listas.
- **Decisión** (Lucio, 15/11/2026): mostrar un mensaje que pide lo que falta, igual que en esos dos lugares. Se descartó dejar el ejemplo rotulado.
- **Solución aplicada:** `web/src/main.js` (`renderBehaviorEmpty()`) marca la sección con `data-empty` y escribe el mensaje (`behavior.empty.both | site | date`, ES/EN); `web/src/styles/help.css` oculta la grilla en ese estado. El escenario se sigue calculando por dentro, pero no se muestra. Además, el punto de muestra ya no dispara la descarga de datos de relieve hasta que se elige un sitio. En el recorrido guiado, los pasos de esa sección resaltan la sección entera si la grilla está oculta (`web/src/ui/help.js`).
- **Supuestos y límites:** la página arranca más vacía que el Figma (excepción a DEC-014 decidida por Lucio). El punto de muestra sigue marcado en el mapa y en los campos de latitud y longitud como "Punto observado", que es el punto de partida para elegir en el mapa.
- **Alternativas descartadas:** rotular los resultados como ejemplo (seguiría mostrando un horizonte que no es de ninguna misión); arrancar con un sitio curado elegido (decide por el usuario).
- **Estado:** vigente.

## DEC-070 — Revisión de astronomía de los puntos abiertos (15/11/2026)

- **Contexto / problema:** `PENDIENTES.md` tenía 14 puntos de astronomía sin validar (marcos, horizontes, proyección, terreno, umbrales, trayectoria, rasgos). Lucio pidió validarlos el 15/11/2026.
- **Decisión:** comparar cada dato con otro producto, otra fuente o una cuenta independiente y cerrar los puntos que pasen; los que no, anotarlos con el error medido. No se cambió ningún modelo científico en esta revisión.
- **Solución aplicada:** resultados en `docs/VALIDACION.md` ("Revisión de astronomía del 15/11/2026"). Además se toman tres decisiones menores, reversibles:
  - El horizonte LOLA reducido de los puntos propios **sigue rotulado "aproximado"**: su error medio de hasta 0,77° supera al radio del Sol (~0,27°), así que puede cambiar si el Sol se ve.
  - La discrepancia de ~415 m de Chang'e 4 entre NSSDCA y CNSA **no se muestra en la interfaz**. Está en DEC-019 y en `sites.js`, las dos fuentes están enlazadas en "Datos y fuentes" y el horizonte del sitio sale del borde de Von Kármán, a 50–100 km: correrse 415 m no lo cambia a la escala de la app.
  - El marco de R01, R23, IM-1 y Chandrayaan-3 queda confirmado como Mean Earth **por coherencia**. Se mantiene `sourceFrameVerified: false` y la interfaz sigue diciendo "inferido, no declarado", porque ninguna de esas fuentes lo declara.
- **Hallazgos que quedan abiertos** (en `PENDIENTES.md`):
  - El horizonte regional de los puntos propios (DEC-068) es bueno entre −60° y +60°, pero hacia los polos puede errar mucho, sobre todo en la Tierra cerca del limbo.
  - El horizonte de Apollo 11 (DEC-061) está ~0,9° alto por píxeles interpolados a menos de 0,5 km (~0,5 p. p. de luz por año).
  - La iluminación de Shackleton cambia mucho en pocos cientos de metros: R01 da 60 % y un punto a 480 m da 90 %.
- **Alternativas descartadas:** cambiar ahora los modelos para corregir los hallazgos (son cambios científicos que conviene decidir con el equipo); marcar los marcos como "declarados" (no lo están).
- **Estado:** vigente. Los hallazgos abiertos quedan para decisión del equipo.

## DEC-071 — Viabilidad por requisitos de misión (VIAB-01)

- **Contexto / problema:** la viabilidad (DEC-007) sumaba puntos con umbrales del equipo sin fuente (luz ≥ 65/35 %, potencia ≥ 0,35/0,15, Tierra ≥ 50/20 %). Lucio pidió basarla en algo más real (15/11/2026).
- **Decisión** (Lucio, entre tres bases propuestas): requisitos de misión, como los que usó NASA para elegir las regiones de Artemis III. Se descartaron calibrar los umbrales viejos con la bibliografía y un perfil de misión elegible.
  - **Luz continua:** cumple sin noche, al límite hasta 24 h, no cumple con más.
  - **Comunicación:** cumple con la Tierra visible al menos el 80 % del período.
  - **Pendiente:** cumple por debajo de 8°, al límite por debajo de 10°, no cumple con más; solo donde hay datos de terreno.
  - La viabilidad global es la del peor requisito, y los puntos 0–6 pasan a "requisitos cumplidos".
  - **Ajuste posterior (Lucio):** el diseño aprobado tenía "comunicación al límite desde 30 %, no cumple por debajo". Con eso casi todos los sitios y celdas salían "no viable": en el polo, las semanas con Sol continuo suelen ser semanas sin Tierra a la vista. Se decidió asumir un satélite de relevo, como en los planes de Artemis: por debajo del 80 % la comunicación queda "al límite" y nunca "no cumple".
- **Solución aplicada:**
  - `web/src/lib/analysis.js`:
    - `REQUIREMENTS`, `requirementLevel()`, `viabilityFrom()`, `withSlope()` y `viabilityRank()`.
    - `computeScenario()` calcula `summary.longestNightH` y la viabilidad con luz y comunicación.
    - La capa `viability` del mapa usa la noche más larga de cada celda (`night`, calculada en `lib/heat-map.js` y en el modelo aproximado). Sus valores son 0, 0,5 o 1 y `levels` trae el nivel.
  - `web/src/lib/site-terrain.js`: `slopeForViability()` y `siteViability()` suman la pendiente cuando el terreno sale del DEM polar o de la tabla de `LDEM_128`. Con `LDEM_16` no se evalúa, porque es de escala regional.
  - `web/src/lib/ranking.js`: el orden "Global" y el desempate de "Ciencia" usan el nivel global y después los requisitos cumplidos.
  - Interfaz:
    - Las tarjetas de la ventana de análisis usan el requisito y lo explican al pasar el mouse por el veredicto.
    - El resumen del período, las mejores fechas, la comparación (tabla de requisitos con su valor y la pendiente si hay datos), el informe imprimible y el informe web (lista de requisitos y nota con las fuentes) muestran la viabilidad nueva.
    - La leyenda de la capa va de "Baja" a "Alta".
    - Se cambiaron unos 20 textos en ES y EN.
    - La comparación baja el DEM polar reducido para tener la pendiente de los sitios polares.
  - Las claves de la caché persistente pasan a `heat4` y `dates2`.
- **Resultados** (escenarios desde el 01/12/2026):
  - 7 días: Shackleton queda "media" (sin noche, comunicación con relevo); los otros seis, "baja" (noches de 26 a 168 h).
  - En la comparación con pendiente, Shackleton cumple 2 de 3 requisitos (1,1°) y Apollo 11 también 2 de 3, pero no cumple la luz.
  - Mapa polar, 7 días: 1588 celdas al límite en diciembre y 796 en junio de 2027. Con 30 días, todas "baja".
- **Validación:** `tests/viabilidad.test.js` (límites de cada requisito, el peor manda y pendiente). Se adaptaron `analysis`, `dates`, `ranking`, `heat-map`, `heat-map-global` y `validacion/mapa-calor` (esta compara una semana en lugar de 30 días). 206 pruebas pasan.
- **Supuestos y límites:**
  - Las 24 h de baterías y el 80 % de comunicación son supuestos del equipo, marcados así en la interfaz (nota de la comparación y del informe, "Datos y fuentes") y en el código.
  - La pendiente es de escala kilométrica, más suave que la de 100 m que pide el HLS: puede dar "cumple" en una zona que a 100 m no cumpliría.
  - La página principal, el ranking, las fechas y el mapa de calor no evalúan la pendiente, así que un sitio puede mostrar 1 de 2 requisitos ahí y 2 de 3 en la comparación.
  - Las misiones de más de unos días fuera de las zonas polares más iluminadas salen "baja" por la noche lunar, y es correcto con estos supuestos.
- **Alternativas descartadas:** mantener la suma de puntos (un sitio podía salir viable sin cumplir un requisito); dejar la comunicación estricta (casi todo "no viable"); volver a los umbrales viejos.
- **Estado:** vigente. Reemplaza a DEC-007.

## DEC-072 — Capa "Noche más larga" en el mapa de calor

- **Contexto / problema:** con los requisitos de DEC-071, la capa de viabilidad sale casi toda "baja" en misiones de más de una semana. En 7 días, desde el 01/12/2026, el 71 % de la Luna y el 78 % del casquete sur dan "baja"; en 30 días, el 100 %. Es correcto: casi toda la Luna tiene noches de más de 24 h. Pero así el mapa no ayuda a elegir (reporte de Lucio, 15/11/2026).
- **Decisión** (Lucio, entre tres opciones): mantener la capa de viabilidad y sumar una capa "Noche más larga" con un degradado en horas. Se descartaron dejarlo como estaba con una aclaración y cambiar el requisito de luz.
- **Solución aplicada:**
  - `web/src/lib/analysis.js`: modo `"night"` en `HEAT_MODES`. Usa la misma noche más larga por celda que la viabilidad, con valores `1 − noche / tope`: más claro es mejor, como en las otras capas. El tope es la duración del período, hasta 360 h (una noche lunar). También devuelve `nightH` y `capH`.
  - Interfaz: botón "Noche más larga" en el selector (`index.html`), capa en `ui/heat-layer.js` y en la URL (`ui/links.js`), y leyenda de "0 h" (arriba) a la duración del período (`ui/map.js`).
  - Textos ES/EN: `map.layer.night`, `map.layerLegend.night`, `map.layerAlt.night` y `map.layerUnit.hours`. También se actualizó la ayuda del mapa.
  - El selector de capas pasa de 100 a 124 px, para que "Noche más larga" entre en un renglón sin tapar la leyenda.
- **Validación:** `tests/heat-map.test.js` comprueba que la capa usa las mismas horas que la viabilidad y la fórmula de los valores. En el navegador, con 30 días de diciembre, la zona polar de noches cortas se distingue de las noches de ~354 h de latitudes bajas.
- **Supuestos y límites:** el paso del mapa es de 1–2 h, más grueso que los 10 min del escenario.
- **Estado:** vigente.

## DEC-073 — Guía en comparar e informe, explicación de la viabilidad y cartel del mapa

- **Contexto / problema:** pedidos de Lucio del 15/11/2026:
  - Que comparar e informe también tengan guía.
  - Que se explique en algún lado cómo se calcula la viabilidad (DEC-071).
  - Que el mapa diga por qué la capa de viabilidad sale toda baja.
  - Que la guía refleje los cambios recientes.
- **Decisión:** reutilizar la ayuda y el recorrido de DEC-066 en las tres páginas y sumar un tema "Cómo se calcula la viabilidad", al que se llega desde donde aparece la viabilidad.
- **Solución aplicada:**
  - `web/src/ui/help.js`: `initHelp()` recibe los temas, la clave del recorrido y la bienvenida de cada página. La página principal usa `MAIN_TOPICS`, que suma el tema de viabilidad sobre el resumen del período.
  - Comparar (`compare.html`, `src/compare.js`): «?» en los controles, la ubicación, las métricas, las ventanas, el horizonte y los requisitos, más «Guía» en el menú. El recorrido tiene 7 pasos y no se abre solo, porque la página siempre llega con una selección.
  - Informe (`informe.html`, `src/informe.js`): lo mismo para los controles, el resumen, el terreno, la luz, las fechas y la trayectoria, con un «?» de viabilidad junto a la lista de requisitos (`ui/site-report.js`).
  - Tema "Cómo se calcula la viabilidad" (`help.viability`, ES/EN): los tres requisitos con sus límites y fuentes, qué es supuesto del equipo y por qué en misiones largas suele salir baja. Se abre desde el resumen del período (`ui/status.js`), la tabla de requisitos de la comparación, el informe y el cartel del mapa.
  - Cartel del mapa (`index.html`, `ui/map.js`, `ui/heat-layer.js`): si en la capa de viabilidad todas las celdas quedan en "no cumple", aparece un cartel que explica que todas tienen alguna noche de más de 24 h y sugiere una misión más corta, la capa "Noche más larga" o "Mejores fechas". Va arriba, sobre el norte, para no tapar el polo sur. El dato `allLow` se guarda con la capa, también en la caché persistente.
  - Guía de la página principal: el resumen del período habla de requisitos de misión y la ayuda del mapa nombra las capas nuevas.
- **Validación:** en el navegador se recorrieron las dos guías nuevas: cada paso resalta su sección y la tarjeta no se sale de la pantalla. El cartel aparece con 30 días y su «?» abre la explicación. 207 pruebas pasan.
- **Supuestos y límites:** el cartel solo aparece si todas las celdas son "baja". Con una sola celda "al límite" no se muestra.
- **Estado:** vigente.

## DEC-074 — Explicación de la luz de Shackleton R01 (DOC-02)

- **Contexto / problema:** la app da ~60 % de luz anual en Shackleton R01 y la bibliografía habla de 77–88 % en esa cresta (Gläser et al., 2017). La revisión de DEC-070 mostró que no es un error: R01 es el centro de un polígono del Lunar Surface Data Book y a 480 m al norte el modelo da 89,9 %. Un jurado podría leerlo como un error.
- **Decisión (Lucio, 15/11/2026):** explicarlo en la entrega y en la interfaz. No se cambia el punto R01.
- **Solución aplicada:**
  - `web/src/data/sites.js`: la procedencia de Shackleton lleva `noteKey`.
  - `web/src/ui/provenance.js`: `provenanceHtml()` agrega una fila "Nota" si el sitio tiene `noteKey` y conserva sus coordenadas originales. Se ve en "Datos y fuentes", en la comparación, en el informe web y en el impreso.
  - `web/src/i18n/es.js` y `en.js`: `quality.note` y `quality.siteNote.shackleton`.
  - `docs/ENTREGA.md`: párrafo en inglés para la descripción del formulario.
- **Alternativas descartadas:** mover el sitio al punto de 89,9 %: no es un punto de la tabla de NASA y DOC-02 lo deja fuera de alcance.
- **Supuestos y límites:** los números (59,7 % en R01, 89,9 % a 480 m) son los de la revisión de DEC-070 para un año. La cita de Gläser et al. se tomó de resúmenes (ver `docs/VALIDACION.md`).
- **Estado:** vigente.

## DEC-075 — Altura del observador de un entorno en LDEM_128 (TERRAIN-05)

- **Contexto / problema:** la revisión de DEC-070 encontró que el horizonte de Apollo 11 (`LDEM_128`, DEC-061) estaba ~0,8° más alto que el de `LDEM_16`. El píxel del punto es interpolado (`count = 0`) y deja el suelo 13 m por debajo del terreno medido, así que el observador "ve" el entorno cercano más alto de lo que es.
- **Decisión (Lucio, 15/11/2026):** en el muestreador de `LDEM_128` (Apollo 11 y Chang'e 4), la altura del observador es la mediana de los píxeles con mediciones propias a menos de 1 km. Los sitios polares (`LDEM_60S_240M`) no cambian.
- **Solución aplicada:**
  - `web/src/lib/horizon-lola.js`: `windowGroundMedian()` y `WINDOW_GROUND_RADIUS_KM = 1`. `computeHorizonProfile()` acepta `ground` (altura ya calculada) y la registra en `observer.ground` (`method: "median-measured"`, radio y cantidad de píxeles). Sin píxeles medidos se usa el píxel del punto, como antes.
  - `web/scripts/build-lola-horizons.mjs`: `globalProfile()` usa esa altura. El redondeo convierte −0 en 0 para que la tabla se reproduzca exacta desde el JSON.
  - `web/src/data/terrain/lola-horizons.js`: regeneradas solo las entradas de `LDEM_128` (`--global-only`).
  - Pruebas: unitaria con grilla sintética (`tests/horizon-lola.test.js`) y validación de Apollo 11 contra `LDEM_16` (`tests/validacion/horizonte-lola-global.test.js`).
- **Resultados (medidos el 15/11/2026, un año desde el 15/11/2026):**
  - Apollo 11: suelo −1934,9 → −1930,2 m (34 píxeles medidos). Diferencia media contra `LDEM_16` 0,82° → 0,28° (máximo 1,32° → 0,74°). Luz 51,15 → 51,32 %. Tierra sin cambios (100 %).
  - Chang'e 4: suelo −5930,4 → −5925,5 m. Diferencia media 0,14° → 0,09°. Luz 48,48 → 48,62 %. Tierra sin cambios (0 %).
  - Tolerancia del equipo para la prueba: media < 0,4° y máximo < 1°. `LDEM_16` (1,9 km) no resuelve el relieve cercano, así que no se espera cero.
- **Alternativas descartadas:** ignorar los primeros ~500 m del rayo cuando los píxeles son interpolados. Combinado con la mediana, solo baja la media de 0,28° a 0,22°, y cambia el rayo en lugar del dato que causa el error.
- **Supuestos y límites:**
  - El radio de 1 km es del equipo: con 0,5 km Apollo 11 tiene solo 5 píxeles medidos y con 2 km el resultado es parecido (0,32°).
  - La altura del informe (tabla de `site-terrain.js`) sigue siendo la del píxel del punto: difiere ~5 m de la del horizonte. La prueba de terreno acepta hasta 10 m.
- **Estado:** vigente.

## DEC-076 — Horizonte del punto sobre LDEM_16 cerca de los polos (CORE-05)

- **Contexto / problema:** la revisión de DEC-070 mostró que el horizonte regional de los puntos propios (atlas de 2°, DEC-068) no es confiable hacia los polos: frente al horizonte exacto del punto, la luz difiere hasta 39 p. p. al norte de +75° y la Tierra hasta 100 p. p. entre −75° y −60°.
- **Decisión (Lucio, 15/11/2026):** para los puntos propios con |lat| ≥ 60° que no cubre el DEM polar reducido (al norte de −75°), calcular el horizonte del punto sobre el DEM global `LDEM_16`, que ya se publica para el terreno del informe (DEC-067). Se baja solo cuando hace falta; mientras carga, se usa el regional.
- **Solución aplicada:**
  - `web/src/lib/global-dem.js`: `globalHorizonFor()` (mismo algoritmo que DEC-030; 300 km, paso 0,95 km, 1° de azimut, observador a 2 m), `inPointHorizonBand()`, `POINT_HORIZON_MIN_ABS_LAT = 60`, `GLOBAL_HORIZON_PARAMS`, caché por coordenadas y `globalDemVersion()`.
  - `web/src/lib/analysis.js`: `scenarioHorizon()` prueba el horizonte del punto antes que el regional; `needsGlobalDemHorizon()`; `realDataVersion()` incluye la versión del DEM global, así que los cachés se renuevan al llegar.
  - `web/src/ui/ephemerides.js`: `ensurePolarTerrain()` baja el DEM global si algún sitio lo necesita. La carga es una sola y avisa a todos los que la pidieron mientras bajaba (antes, el segundo pedido perdía su aviso).
  - Worker (`ui/compute.js`, `workers/compute.worker.js`): carga el mismo DEM si la página lo tiene, para que "Mejores fechas" dé lo mismo.
  - Interfaz (ES/EN): nota de datos, fila de calidad (aproximado, DEC-076), producto en "Datos y fuentes" y rótulo del panorama.
  - Pruebas: `tests/horizonte-polar-puntos.test.js` (DEM sintético) y `tests/validacion/horizonte-polar-puntos.test.js` (datos reales).
- **Validación:** en Chandrayaan-3 (−69,4°), el horizonte del punto sobre `LDEM_16` difiere del de 240 m en −0,22° de media (máximo 0,60°); la luz de 30 días da 51,4 % contra 50,7 % y la Tierra 100 % en los dos. El cálculo tarda ~30 ms por punto.
- **Alternativas descartadas:** solo avisar del error en la interfaz: el dato seguiría mal en la banda donde más importa la Tierra cerca del limbo.
- **Supuestos y límites:**
  - El umbral de 60° sale de las bandas medidas en DEC-070; entre −60° y +60° el regional sigue (error medido ≤ 2 p. p.).
  - `LDEM_16` no resuelve relieve menor a ~2 km: el horizonte del punto se rotula como aproximado.
  - Un punto propio cerca de los polos baja ~35 MiB, una vez por página. Si falla, sigue el regional.
  - La única referencia fina en la banda es Chandrayaan-3; al norte de +60° no hay sitio curado para comparar.
- **Estado:** vigente.

## DEC-077 — Logo nuevo e inglés como idioma por defecto

- **Contexto / problema:** pedido de Lucio del 15/11/2026: usar el logo nuevo del equipo (`logo.jpeg`, guardado en la raíz) y que la página abra en inglés.
- **Decisión:** reemplazar el logo del Figma por el nuevo en las tres páginas y en el ícono de la pestaña, y abrir en inglés salvo que el visitante ya haya elegido un idioma. Cambia DEC-014 (réplica del Figma) solo en el logo, por pedido explícito.
- **Solución aplicada:**
  - `web/public/logo.png` (256 px) y `web/public/favicon.png` (64 px): recorte circular del original con fondo transparente (el original tiene esquinas blancas que se veían sobre el encabezado oscuro).
  - `index.html`, `compare.html`, `informe.html`: logo de 64 × 64, favicon nuevo y `lang="en"`.
  - `web/src/styles/main.css`: `.header-logo` cuadrado, con el mismo centro que el de 80 × 64 del Figma.
  - `web/src/i18n/index.js`: `initialLang()` devuelve el idioma guardado o, si no hay, `"en"` (antes seguía el idioma del navegador). El botón de idioma sigue igual.
  - `tests/data-status.test.js`: fija el español porque sus textos esperados están en español.
- **Alternativas descartadas:** seguir el idioma del navegador: el jurado de Space Apps es internacional y un navegador en español abriría la página en español.
- **Supuestos y límites:** quien ya eligió español (queda guardado en el navegador) la sigue viendo en español. `web/public/figma/logo.png` queda en el repositorio sin uso.
- **Estado:** vigente.

## DEC-078 — Aviso de logo con IA, cartel de hora en las ventanas y leyenda del mapa

- **Contexto / problema:** pedidos de Lucio del 15/11/2026:
  - Aclarar que el logo (DEC-077) es una imagen generada con IA, chico pero a la vista.
  - En los gráficos de ventanas de comparar e informe, mostrar un cartel propio con la hora donde está el mouse (antes solo había el `<title>` nativo de cada barra).
  - El título de la leyenda del mapa de calor quedaba pegado a "Noche más larga".
- **Decisión y solución aplicada:**
  - Logo: rótulo `app.aiLogo` ("AI GENERATED IMAGE" / "IMAGEN GENERADA CON IA") debajo del logo en las tres páginas (`.header-logo-note`, 11 px, color atenuado, en un renglón). El logo sube 6 px para dejarle lugar.
  - Cartel de hora: `web/src/ui/chart-hover.js` (`attachTimeHover`). Una línea punteada sigue al cursor y un cartel muestra la fecha y hora UTC de ese punto y, sobre un carril, si hay luz o enlace en ese instante (`chartTip.*`, ES/EN). `windowsChart()` (`ui/compare.js`) y `windowsSvg()` (`ui/site-report.js`) devuelven el SVG y su geometría. Se quitan los `<title>` de las barras para que no aparezcan dos carteles. La posición se calcula en fracciones del gráfico, así que funciona con el `zoom` del stage. No calcula nada astronómico: usa las ventanas que ya calculó `lib/`.
  - Leyenda del mapa: `.map-legend` baja de 340 a 376 px (mismo borde inferior) y el título se ancla por abajo, así crece hacia arriba con 1 a 3 renglones sin pisar la barra ni los botones de capa (que terminan en 304 px).
- **Alternativas descartadas:** dejar el `<title>` nativo: tarda en aparecer, no sigue al cursor y solo da el inicio y fin de cada barra.
- **Supuestos y límites:** el cartel es solo con mouse; el gráfico mantiene su descripción accesible (`aria-label`). La hora es la del punto del eje bajo el cursor, con la resolución del ancho del gráfico (en 30 días, unos 25 min por píxel).
- **Estado:** vigente.

## DEC-079 — La Luna 3D gira hasta el sitio elegido

- **Contexto / problema:** pedido de Lucio del 15/11/2026: al elegir un punto, que la Luna se anime y lleve la vista hasta él. Antes la vista 3D quedaba donde estaba y el sitio podía quedar del otro lado.
- **Decisión:** al cambiar el sitio elegido (lista, selector, botones rápidos, marcador o clic en la Luna), la vista 3D gira por el camino más corto hasta dejarlo en el centro, con un leve alejamiento a mitad de camino para que se lea el giro.
- **Solución aplicada:**
  - `web/src/ui/moon3d.js`: `flyTo(lat, lon)`. Curva ease-in-out, 0,7 a 1,3 s según el ángulo, alejamiento de hasta 15 % de la distancia (sin pasar el máximo). El arrastre, la rueda, el teclado y el cambio de pestaña cancelan el vuelo. Con movimiento reducido (`prefers-reduced-motion` o el ajuste de la página) salta directo, sin animación.
  - `web/src/ui/map.js`: `renderMap()` recuerda el último sitio y llama a `flyTo()` cuando cambia. Al abrir la página solo se registra: la vista no se mueve sola.
- **Alternativas descartadas:** animar también en 2D: la imagen 2D es fija y el sitio ya se ve marcado.
- **Supuestos y límites:** solo en la página principal; la Luna de la comparación ya encuadra los dos sitios (DEC-054). En las pestañas del polo y del mapa de calor también gira hasta el sitio, dejando el polo descentrado hasta que se cambie de pestaña.
- **Estado:** vigente.


## DEC-080 — Demo en video: motion graphic con voz generada por IA

- **Contexto / problema:** la entrega exige una demo (video de hasta 30 s o hasta 7 diapositivas, en inglés o con subtítulos en inglés). Los integrantes son menores y no pueden aparecer ni hablar en el video.
- **Decisión:** video motion graphic de ≤ 30 s, 1920×1080, con voz en off en inglés generada con ElevenLabs, subtítulos en inglés siempre visibles y capturas reales de la web. Sigue el guion de `video/script.md` (estructura de la guía de Space Apps: equipo → desafío → nombre y lema → idea y datos de la NASA → futuro).
- **Solución aplicada:**
  - `video/demo/` (Remotion 4, fuera de `web/`): una línea de tiempo en segundos de la voz; las escenas y los efectos se enganchan a palabras de la alineación forzada de ElevenLabs (`src/voz-tiempos.json`).
  - Voz: `eleven_v4`, voz "Liam". Los apellidos se dicen en español (pedido de Lucio, 15/11/2026): se genera una toma aparte con la misma voz y `language_code: "es"` ("Barbato, Duarte, Fachín, Péiren, Ligüera y Santana": Fa-CHÍN y PÉI-ren confirmados por Lucio) y se empalma entre "We are" y "team Hubble 27" de la toma en inglés. Los subtítulos muestran la grafía real y "and". Los silencios entre frases se acortan con ffmpeg y se acelera 4 % sin cambiar el tono para entrar en 30 s. Música (ElevenLabs Music) y efectos (ElevenLabs Sound Effects) generados con scripts.
  - Capturas de la web en inglés con `scripts/capturas.mjs` (Shackleton, 14–27/11/2026; comparación Shackleton vs. Malapert). La Luna girando usa la textura LROC del CGI Moon Kit (NASA SVS) que ya usa la web.
  - En pantalla: "AI-GENERATED VOICE · ELEVENLABS".
- **Ajustes al guion (para entrar en 30 s):** "to optimize lunar landing operations and compares these potential sites with data such as JPL Horizons, LOLA from NASA" → "to find the best lunar landing sites, comparing them with NASA data like JPL Horizons and LOLA"; el cierre pasa a "Comparing sites quickly shortens mission planning, helping us find new answers to the unknown, and making life easier for all of us". La pregunta en pantalla se escribe "What can SELENE do for people, the world, and beyond?". Pendiente de validar por redacción y guion (Alfonso, Cata, Teo, Martín).
- **Alternativas descartadas:** diapositivas (menos impacto visual); grabar pantalla con voz propia (no pueden aparecer ni hablar); voz en español con subtítulos (el guion ya estaba en inglés y evita depender de los subtítulos).
- **Supuestos y límites:** la Luna girando es ilustrativa (textura desplazada en un círculo, no una proyección exacta). El empalme de los apellidos se verificó por volumen, no de oído: conviene escucharlo. Con los apellidos en español el video dura 29,7 s.
- **Estado:** pendiente de validar.

## DEC-081 — Dos versiones más de la demo: "Emoción" y "Ensayo"

- **Contexto / problema:** pedido de Lucio del 15/11/2026: además de la v1 (DEC-080), una versión con más emoción y otra con el estilo del video-ensayo hecho para Inglés ("One minute for change"), para elegir cuál se entrega.
- **Decisión:** dos composiciones nuevas en `video/demo/`, con el mismo texto que la v1 (mismos datos y mismo orden del guion) y distinta interpretación y lenguaje visual. Las dos en 1920×1080 (la del ensayo original era vertical; se pasa a horizontal porque se sube a YouTube para Space Apps).
- **Solución aplicada:**
  - `scripts/voz.mjs` y `scripts/musica.mjs` aceptan la versión (`v1`, `emocion`, `ensayo`); la configuración de cada voz está en `scripts/texto-voz.mjs`. `src/anim.ts` crea una línea de tiempo por voz (`crearLinea`) y las escenas compartidas la leen por contexto (`src/linea.tsx`); la v1 no cambia.
  - **Emoción** (`DemoEmocion`, `src/emocion/`): voz Liam más actuada, música orquestal épica con crescendo hacia la revelación, amanecer sobre el horizonte lunar, franjas de cine que se abren con "SELENE", destello y chispas, luces cálidas, web con leve inclinación 3D y salida de la Tierra (foto Apollo 17, NASA) en el cierre.
  - **Ensayo** (`DemoEnsayo`, `src/ensayo/`): subtítulos serif de hasta 3 palabras con itálica dorada en palabras clave; una foto de archivo de la NASA en blanco y negro por apellido; placa roja "Team Hubble 27"; placa de papel con sello "COMPLEX" y resaltador; foto de Orion junto a la Luna (Artemis I) que recupera el color con "SELENE"; buscador que se tipea; muro curvo con capturas reales y tarjetas con datos reales de la web (Shackleton, 14–27/11/2026: 336 h de luz acumulada, Tierra a la vista 73 %); JPL Horizons y LOLA con resaltador; ráfaga de fotos a color y créditos.
  - Voz siempre ~18 dB por encima de la música, que sube en las pausas (preferencia de Lucio del video de Inglés).
- **Alternativas descartadas:** voces de narrador George, Brian y Matilda para el ensayo: hablan más lento y no entraban en 30 s sin acelerarlas demasiado; se usó Liam con un tono más reflexivo. Formato vertical para el ensayo: Space Apps se ve en horizontal.
- **Supuestos y límites:** las fotos son de images.nasa.gov (dominio público; créditos en `video/demo/public/ensayo/fotos/creditos.json` y en los créditos del video). Las voces se verificaron transcribiéndolas con ElevenLabs (sin palabras de más ni indicaciones leídas), no de oído. El "COMPLEX" del sello y los textos de las tarjetas son agregados visuales; los datos de las tarjetas salen de la web. Pendiente de validar por redacción, guion y edición.
- **Estado:** pendiente de validar.

