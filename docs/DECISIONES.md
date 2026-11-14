# Registro de decisiones

Formato y reglas en `AGENTS.md` (sección 3). Las decisiones no se borran: si cambian, se marcan como reemplazadas.

---

## DEC-000 — Organización del repositorio y flujo de trabajo

- **Contexto / problema:** la carpeta del proyecto no era un repositorio git y había un prototipo suelto (`index.html`) en la raíz. Las reglas del equipo piden trabajar en ramas y documentar decisiones.
- **Decisión:** usar el repo `lucioooofacc/Hubble27-SpaceApps` con `main` protegido por convención (solo entra código vía PR desde ramas `feat/`, `fix/`, `docs/`, etc.).
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
- **Estado:** vigente.

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
- **Estado:** vigente. **Pendiente:** confirmar el origen y la licencia de la imagen global del Figma, y verificar que esté centrada en longitud 0°.

## DEC-009 — Panorama centrado en la Tierra y comparador

- **Contexto / problema:** en el polo la Tierra queda en azimut ~0°, justo en el borde de un panorama N→N, y se cortaba.
- **Decisión:** centrar el panorama de 360° en el azimut inicial de la Tierra (casi no se mueve en el cielo lunar) y exagerar la altura ×3. Además, un comparador de hasta 4 escenarios (sitio + fecha) con la "noche más larga" para dimensionar baterías, y botones de ±1 día lunar para el caso de "la misión se atrasa".
- **Estado:** vigente.

## DEC-010 — Solo escritorio (no responsive)

- **Contexto / problema:** se empezó a adaptar la web a celular y el equipo pidió deshacerlo: no es necesario que sea responsive.
- **Decisión:** la v1 se diseña solo para escritorio.
- **Solución aplicada:** se quitaron las media queries de tablet y celular de `main.css`; `body` tiene `min-width: 1200px` (por debajo aparece scroll horizontal). Se mantienen `prefers-reduced-motion` y los estados hover solo para mouse.
- **Estado:** vigente (decisión del equipo).

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
- **Estado:** vigente. **Pendiente:** crear las etiquetas y una Issue por tarea, y completar los números en `docs/TASKS.md`.
