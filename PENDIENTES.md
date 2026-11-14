# Pendientes del proyecto

Lista viva de lo que falta aplicar. Las reglas para mantenerla están en `AGENTS.md` (regla 10):

- **Agregar:** todo lo que se detecte y no se resuelva en el momento va como `- [ ]`, con responsable y referencia (DEC-XXX, PR o archivo).
- **Tachar:** cuando se resuelve, se marca `- [x]`, se tacha el texto con `~~ ~~` y se agrega la fecha y el commit o PR. No se borra.
- **Descartar:** si se decide no hacerlo, se tacha y se agrega "descartado: motivo".

Última actualización: 2026-11-14.

---

## Diseño (réplica del Figma)

- [ ] Leer el color de la franja de 8 px entre el encabezado y el cuerpo (frame "Vista 7"). Ahora usa el color de fondo, porque se agotó el límite del MCP de Figma. — DEC-017
- [ ] Verificar con `get_design_context` las pestañas GLOBAL y POLO SUR (frames 44:5 y 44:6): posición exacta de las imágenes y del subrayado. Ahora se toman de los metadatos. — DEC-017
- [ ] Definir el destino de "Ver comparacion detallada", "Comparar", "Opcion 3/4/5" y del botón de configuración (el diseño no tiene esas pantallas). — Equipo
- [ ] Decidir si se corrigen las faltas de ortografía del Figma ("Parametros", "Duracion", "Disponilidad", "comparacion", "Mision", "Opcion") o se dejan tal cual. — Alfonso, Cata
- [ ] En el Figma, "Mejores lugares" mezcla dos subtítulos ("Latitud · Longitud" y "Azimut · margen"); la web usa siempre el primero. Confirmar. — Equipo
- [ ] Panorama: acercar más la iluminación de las dunas y el resplandor al de la ilustración del Figma. — Desarrollo web
- [ ] Calendario: permitir moverse entre días con las flechas del teclado.
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
