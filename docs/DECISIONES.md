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
- **Estado:** vigente para v1. **Reemplazo previsto:** horizonte calculado con mapas de elevación LOLA. **Reemplazada parcialmente por DEC-032** (14/11/2026): los sitios curados al sur de −60° usan el horizonte LOLA; el sintético sigue para sitios propios, Chang'e 4, Apollo 11 y el mapa de calor.

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
- **Estado:** vigente. **Pendiente (resto de UI-01, depende de CORE-01):** fuente, fecha y cobertura de efemérides y horizonte reales; estados de carga, error y faltante; píxeles LOLA con `count = 0` como interpolados (DEC-025).

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
