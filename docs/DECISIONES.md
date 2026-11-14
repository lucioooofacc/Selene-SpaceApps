# Registro de decisiones

Formato y reglas en `AGENTS.md` (sección 3). Las decisiones no se borran: si cambian, se marcan como reemplazadas.

---

## DEC-000 — Organización del repositorio y flujo de trabajo

- **Contexto / problema:** la carpeta del proyecto no era un repositorio git y había un prototipo suelto (`index.html`) en la raíz. Las reglas del equipo piden trabajar en ramas y documentar decisiones.
- **Decisión:** usar el repo `lucioooofacc/Hubble27-SpaceApps` (luego migrado a `lucioooofacc/Selene-SpaceApps`, ver DEC-015) con `main` protegido por convención (solo entra código vía PR desde ramas `feat/`, `fix/`, `docs/`, etc.).
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
- **Estado:** reemplazada por DEC-011 (el equipo pidió replicar el Figma tal cual: paleta, tipografías y distribución del archivo).

## DEC-004 — Modelo astronómico aproximado (v1)

- **Contexto / problema:** la v1 no necesita datos reales, pero tiene que comportarse de forma coherente al cambiar sitio y fecha.
- **Decisión:** calcular el Sol y la Tierra con movimientos medios periódicos.
- **Solución aplicada:** `web/src/lib/astro.js`. El punto subsolar se mueve 360° por mes sinódico (29,53 d), con una declinación de ±1,54° (período de 346,6 d). La Tierra oscila por la libración: ±7,9° en longitud (27,55 d) y ±6,68° en latitud (27,21 d). Referencia: luna nueva del 06/01/2000 a las 18:14 UTC. La elevación y el azimut se obtienen por proyección vectorial. La fase de la Tierra es el complemento de la fase lunar.
- **Alternativas descartadas:** datos fijos inventados (no reaccionan a los cambios).
- **Estado:** vigente para v1. **Reemplazo previsto:** efemérides de JPL Horizons (mismas salidas: elevación y azimut por instante), sin tocar `src/ui/`.

## DEC-005 — Horizonte sintético con depresión por altura

- **Contexto / problema:** sin atmósfera, el horizonte lo define el relieve. Con un horizonte plano, Shackleton daba 0 % de luz, cuando en la realidad es de los puntos más iluminados.
- **Decisión:** horizonte sintético por sitio (suma de ondas según el azimut), con un "relieve" característico y la depresión geométrica por altura: `acos(R / (R + h))`.
- **Solución aplicada:** `web/src/lib/terrain.js`. Las formas del horizonte dependen suavemente de la posición, para que el mapa de calor sea continuo. Con los parámetros actuales, el promedio anual de Shackleton queda en ~90 % de luz, coherente con la literatura.
- **Estado:** vigente para v1. **Reemplazo previsto:** horizonte calculado con mapas de elevación LOLA.

## DEC-006 — Sitios curados

- **Contexto / problema:** el desafío sugiere sitios Apollo, CLPS, Artemis y de otros países.
- **Solución aplicada:** `web/src/data/sites.js`: Shackleton, Malapert, Cabeus, IM-1 Odysseus, Chandrayaan-3, Chang'e 4 y Apollo 11.
- **Estado:** **pendiente de validar.** Las coordenadas son aproximadas (Shackleton, Malapert y Cabeus vienen del Figma) y las tiene que verificar el equipo de astronomía (Teo, Facu, Lucio) con LROC Quickmap o Moon Trek.

## DEC-007 — Criterios de viabilidad

- **Contexto / problema:** hace falta una conclusión simple y explicable para el público y para planificadores.
- **Decisión:** tres criterios, cada uno con nivel alto (2 pts), medio (1) o bajo (0): iluminación (% de tiempo con Sol visible; ≥ 65 / ≥ 35), potencia relativa promedio (≥ 0,35 / ≥ 0,15) y comunicación (% de tiempo con Tierra visible; ≥ 50 / ≥ 20). Total sobre 6: ≥ 5 = alta, ≥ 3 = media.
- **Solución aplicada:** `THRESHOLDS` en `web/src/lib/analysis.js`. Paneles verticales en latitudes de |60°| o más (potencia ∝ cos de la elevación) y horizontales en el resto (∝ sen de la elevación).
- **Estado:** vigente; los umbrales son ajustables por el equipo.

## DEC-008 — Mapa de calor calculado y vista global

- **Contexto / problema:** el Figma muestra un "mapa de calor" con manchas decorativas.
- **Decisión:** calcular el mapa de calor real del modelo: % de tiempo con Sol (o Tierra) visible en la ventana, entre −90° y −80°, en proyección azimutal equidistante (0° arriba, 90° E a la derecha). Se suma una vista global (imagen equirectangular de la Luna tomada del Figma) para los sitios lejos del polo.
- **Estado:** reemplazada por DEC-011 y DEC-013 (el mapa usa las tres pestañas e imágenes del Figma, no un mapa de calor calculado).

## DEC-009 — Panorama centrado en la Tierra y comparador

- **Contexto / problema:** en el polo la Tierra queda en azimut ~0°, justo en el borde de un panorama N→N, y se cortaba.
- **Decisión:** centrar el panorama de 360° en el azimut inicial de la Tierra (casi no se mueve en el cielo lunar) y exagerar la altura ×3. Además, un comparador de hasta 4 escenarios (sitio + fecha) con la "noche más larga" para dimensionar baterías, y botones de ±1 día lunar para el caso de "la misión se atrasa".
- **Estado:** reemplazada por DEC-011 (el comparador, los botones de ±1 día lunar y el panorama centrado en la Tierra no están en el diseño). El panorama ahora sigue la ilustración del Figma (DEC-014).

## DEC-010 — Solo escritorio (no responsive)

- **Contexto / problema:** se empezó a adaptar la web a celular y el equipo pidió deshacerlo: no es necesario que sea responsive.
- **Decisión:** la v1 se diseña solo para escritorio.
- **Solución aplicada:** se quitaron las media queries de tablet y celular de `main.css`; `body` tiene `min-width: 1200px` (por debajo aparece scroll horizontal). Se mantienen `prefers-reduced-motion` y los estados hover solo para mouse.
- **Estado:** vigente (decisión del equipo).

---

## DEC-011 — Replicar el Figma tal cual

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

## DEC-012 — Escalado del diseño al ancho de la ventana

- **Contexto / problema:** el Figma mide 1991 px de ancho, más que la mayoría de las pantallas, y el equipo pidió solo escritorio (DEC-010).
- **Decisión:** maquetar con las medidas del Figma sobre un escenario de 1992 px y escalarlo con `zoom` al ancho de la ventana.
- **Solución aplicada:** `fitStage()` en `web/src/main.js` aplica `zoom = anchoVentana / 1992` al `#stage` y lo recalcula al cambiar el tamaño de la ventana.
- **Alternativas descartadas:** reacomodar con media queries (cambia el diseño); `transform: scale` (no ajusta el alto del documento).
- **Estado:** vigente.

## DEC-013 — Extensión de las imágenes polares

- **Contexto / problema:** para ubicar los sitios en "MAPA DE CALOR" y "POLO SUR" hay que saber qué latitud cubre cada imagen. El Figma no lo indica.
- **Decisión:** suponer una proyección azimutal equidistante centrada en el polo sur, con 0° de longitud arriba y borde en −60° (`POLAR_EDGE_LAT` en `web/src/ui/map.js`).
- **Estado:** **pendiente de validar** por astronomía (Teo, Facu, Lucio). También hay que confirmar el origen y la licencia de las tres imágenes. Los sitios fuera de la imagen (como Apollo 11) no se marcan en las vistas polares; en el Figma aparecía marcado a modo de ejemplo.

## DEC-014 — Cómo se interpretó cada elemento del Figma

- **"Mejores lugares para alunizar":** el Figma repite "Apolo 11" como contenido de ejemplo. Se muestran los 5 sitios mejor rankeados (puntos de viabilidad y, a igualdad, más luz), con las mismas cuatro cifras: cobertura de enlace, altura del Sol, altura de la Tierra y luz acumulada. El subtítulo usa siempre "Latitud · Longitud" (el Figma mezclaba ese formato con "Azimut · margen").
- **Título del mapa:** "GLOBAL / MAPA DE CALOR / POLO SUR" son pestañas. El subrayado dorado marca la activa, como en los frames 1 y 2 del archivo, y cada pestaña usa su imagen y su posición.
- **Botón "+" ("Agregar coordenada como sitio"):** guarda el punto observado como sitio propio.
- **"Duración de misión (UTC)" / "Elegir":** abre el calendario de rango del Figma ("image 30"). Primer clic = inicio y segundo = fin, con un máximo de 30 días. Antes de elegir, se analizan 48 h desde el 14/11/2026, igual que la línea de tiempo del diseño (00:00–48:00).
- **"Ventana de análisis":** las cuatro tarjetas usan 3 segmentos (33/66/100 %). VIABLE significa 2 o más segmentos; INVIABLE, 1. Luz y Comunicación usan los niveles de DEC-007; Sol y Tierra, el margen sobre el relieve (oculto = 1, visible = 2, ≥ 3° = 3).
- **Sección inferior:** en el Figma son imágenes (panorama, línea de tiempo, tarjetas y lectura). Se reconstruyeron como componentes que funcionan, con el mismo aspecto. La Tierra queda a la derecha del panorama, como en la ilustración.
- **Menú "Opcion 3/4/5", botón de configuración y "Ver comparacion detallada":** se replican tal cual, pero todavía no tienen destino, porque el diseño no define esas pantallas. El globo cambia el idioma ES/EN.
- **Franja de 8 px entre encabezado y cuerpo ("Vista 7"):** sin datos de color (se agotó el límite del plan gratuito del MCP de Figma), se usó el color de fondo.
- **Datos aproximados:** para no agregar elementos visibles, el aviso de modelo aproximado quedó como tooltip del título "Parametros de la misión".
- **Estado:** vigente. **Pendiente de definir por el equipo:** destino de "Ver comparacion detallada", "Comparar" y "Opcion 3/4/5", y si se corrigen los textos del Figma ("Parametros", "Duracion", "Disponilidad", "comparacion").

---

## DEC-015 — Migración a `Selene-SpaceApps` y commits sin co-autores

- **Contexto / problema:** el equipo no quiere co-autores ni atribuciones de herramientas en el historial ni en los PR.
- **Decisión:** prohibirlos (regla 6 de `AGENTS.md`) y migrar el proyecto al repositorio `lucioooofacc/Selene-SpaceApps`.
- **Solución aplicada:** se quitaron las líneas `Co-Authored-By` de todos los commits de `main`, `feat/web-v1` y `design/figma-exacto` (sin tocar el contenido de los archivos). Se subieron las tres ramas al repo nuevo, que pasa a ser `origin`; el anterior se borró el 2026-11-14. `CLAUDE.md` se mantiene porque Claude Code lo usa para cargar las reglas de `AGENTS.md`. Los PR #1 y #2 se guardaron en `docs/prs/` y se recrearon en el repo nuevo sin atribuciones.
- **Estado:** vigente.
