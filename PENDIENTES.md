# Pendientes del proyecto

Lista viva de lo que falta aplicar. Las reglas para mantenerla están en `AGENTS.md` (regla 10):

- **Agregar:** todo lo que se detecte y no se resuelva en el momento va como `- [ ]`, con responsable y referencia (DEC-XXX, PR o archivo).
- **Tachar:** cuando se resuelve, se marca `- [x]`, se tacha el texto con `~~ ~~` y se agrega la fecha y el commit o PR. No se borra.
- **Descartar:** si se decide no hacerlo, se tacha y se agrega "descartado: motivo".

Última actualización: 2026-11-14.

---

## Diseño (réplica del Figma)

- [x] ~~Leer el color de la franja de 8 px entre el encabezado y el cuerpo (frame "Vista 7").~~ Se mantiene el color de fondo: el MCP de Figma necesita la URL del archivo en figma.com y el repo solo tiene el `.fig` local. Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [ ] Reemplazar las imágenes de GLOBAL y POLO SUR por un modelo 3D de la Luna (fuentes NASA), con opción de alternar entre 3D y vistas 2D. Reemplaza la verificación de posición de las imágenes (frames 44:5 y 44:6). — UI-07 (#25), DEC-019
- [ ] "Ver comparación detallada" y "Comparar" llevan a una página nueva que compara dos sitios elegidos con métricas técnicas. — UI-05 (#23), DEC-019
- [ ] "Opción 3" pasa a ser el informe imprimible de la misión planificada. — UI-06 (#24), DEC-019
- [x] ~~Quitar "Opción 4" y "Opción 5" del menú.~~ "Opción 3" pasa a llamarse "Informe". Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Corregir las faltas de ortografía heredadas del Figma ("Parametros", "Duracion", "Disponilidad", "comparacion", "Mision", "Opcion").~~ Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~"Mejores lugares": confirmado el subtítulo "Latitud · Longitud".~~ La web ya lo usaba. Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [ ] Panorama: acercar la iluminación de las dunas y el resplandor a la ilustración del Figma, y que el relieve represente fielmente el horizonte del punto (montañoso, plano, con cráteres). La UI dibuja `scenario.horizon(az)`; la fidelidad real depende del horizonte LOLA (TERRAIN-02, #8, Facundo). — UI-08 (#26), DEC-019
- [x] ~~Calendario: permitir moverse entre días con las flechas del teclado.~~ Flechas, Inicio/Fin, RePág/AvPág, Enter y Escape (el foco vuelve al botón). Resuelto 2026-11-14 (rama `feat/calendario-teclado`, #22).
- [ ] Definir el destino del botón de configuración (el equipo todavía no lo decidió). — Equipo
- [ ] Probar el escalado (`zoom`) en Firefox y Safari, además de Chrome. — DEC-015
- [x] ~~Íconos deformados: los SVG del Figma usan `preserveAspectRatio="none"` y se forzaban a cuadrado.~~ Resuelto 2026-11-13 (rama `design/figma-exacto`).
- [x] ~~Las tarjetas de "Mejores lugares" se rompían con valores largos ("890 Min", "-46.2°").~~ Resuelto 2026-11-13: columnas de 66 px y minutos en horas desde 100 min.
- [x] ~~Las etiquetas de los marcadores se pisaban cerca del polo.~~ Resuelto 2026-11-13: se ocultan las que chocan (el nombre queda como tooltip) y la del sitio elegido siempre se ve.
- [x] ~~El relieve del panorama quedaba demasiado alto y el equipo fuera de lugar respecto de la ilustración.~~ Resuelto 2026-11-13: 12 px por grado, horizonte en y = 400 y escenografía en las posiciones del Figma.
- [x] ~~La imagen de la pestaña POLO SUR estaba mal ubicada.~~ Resuelto 2026-11-13: posición (136, 176) del Figma.
- [x] ~~El calendario cortaba la columna del domingo.~~ Resuelto 2026-11-13.

## Datos y astronomía (Teo, Facu, Lucio)

- [ ] Verificar las coordenadas de los 7 sitios con LROC Quickmap o Moon Trek. — DEC-006
- [ ] Confirmar qué latitud cubren las imágenes polares (supuesto: hasta −60°) y su orientación (0° arriba). — DEC-016
- [ ] Confirmar origen y licencia de las imágenes de la Luna que vienen del Figma. — DEC-016
- [ ] Reemplazar el modelo aproximado del Sol y la Tierra por efemérides de JPL Horizons. — DEC-004
- [ ] Reemplazar el horizonte sintético por relieve real de LOLA. — DEC-005
- [ ] Revisar los umbrales de viabilidad (luz, potencia, comunicación). — DEC-007

## Textos y traducción

- [ ] Revisar los textos en español de `web/src/i18n/es.js`. — Alfonso, Cata
- [ ] Revisar la traducción al inglés de `web/src/i18n/en.js`. — Lucio, Cata

## Repositorio y entrega

- [x] ~~Revisar y mergear el PR #1 (web v1) y el PR #2 (réplica del Figma) en `Selene-SpaceApps`.~~ Resuelto 2026-11-14: los dos se mergearon, pero el #2 entró en `feat/web-v1` después de que el #1 ya estaba en `main`. Se integra con la rama `chore/integrar-web-v1`.
- [ ] Revisar la renumeración de decisiones (las de la réplica del Figma pasaron de DEC-011…015 a DEC-014…018) y la fusión de reglas en `AGENTS.md` (regla 5 + regla 10). — Equipo, rama `chore/integrar-web-v1`
- [ ] Revisar el resto de `docs/ARCHITECTURE.md`, `docs/TASKS.md` y `web/src/ui/AGENTS.md` contra la interfaz del Figma. En la integración solo se actualizaron la tabla de módulos y el diagrama. — Desarrollo web
- [x] ~~Archivar o borrar el repo anterior `Hubble27-SpaceApps` (todavía tiene el historial con co-autores y los PR viejos).~~ Resuelto 2026-11-14: repo borrado por Lucio. `CLAUDE.md` se mantiene.
- [x] ~~Migrar el proyecto a `Selene-SpaceApps` sin co-autores en el historial.~~ Resuelto 2026-11-14 (DEC-018).
- [ ] Publicar el build (`npm run build`) en un enlace público para el formulario de Space Apps (GitHub Pages, Netlify o Drive). Hay una vista previa privada en un artifact de claude.ai (hay que compartirla desde su menú). — Desarrollo web
- [ ] Declarar en la entrega los datos de la NASA usados (JPL Horizons, LOLA, LROC). — Equipo
