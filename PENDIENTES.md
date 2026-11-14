# Pendientes del proyecto

Lista viva de lo que falta aplicar. Las reglas para mantenerla están en `AGENTS.md` (regla 10):

- **Agregar:** todo lo que se detecte y no se resuelva en el momento va como `- [ ]`, con responsable y referencia (DEC-XXX, PR o archivo).
- **Tachar:** cuando se resuelve, se marca `- [x]`, se tacha el texto con `~~ ~~` y se agrega la fecha y el commit o PR. No se borra.
- **Descartar:** si se decide no hacerlo, se tacha y se agrega "descartado: motivo".

Última actualización: 2026-11-14.

---

## Diseño (réplica del Figma)

- [x] ~~Leer el color de la franja de 8 px entre el encabezado y el cuerpo (frame "Vista 7").~~ Se mantiene el color de fondo: el MCP de Figma necesita la URL del archivo en figma.com y el repo solo tiene el `.fig` local. Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Reemplazar las imágenes de GLOBAL y POLO SUR por un modelo 3D de la Luna (fuentes NASA), con opción de alternar entre 3D y vistas 2D.~~ three.js + CGI Moon Kit de NASA SVS. Resuelto 2026-11-14 (rama `feat/luna-3d`, #25, DEC-021).
- [ ] Mejorar el detalle del polo sur en 2D (textura de 8k o mosaico polar de LROC) si el equipo lo necesita. — Desarrollo web, DEC-021
- [x] ~~"Ver comparación detallada" y "Comparar" llevan a una página nueva que compara dos sitios elegidos con métricas técnicas.~~ `compare.html`. Resuelto 2026-11-14 (rama `feat/comparacion-sitios`, #23).
- [ ] Al volver de la comparación a la misión se pierde la selección (sitio y fechas), porque la página de misión no lee la URL. — Desarrollo web, UI-05
- [x] ~~"Opción 3" pasa a ser el informe imprimible de la misión planificada.~~ "Informe" en el menú. Resuelto 2026-11-14 (rama `feat/informe-imprimible`, #24).
- [ ] "Informe" desde la página de comparación imprime la misión por defecto, no los sitios comparados (misma causa: la misión no lee la URL). — Desarrollo web, UI-06
- [x] ~~Quitar "Opción 4" y "Opción 5" del menú.~~ "Opción 3" pasa a llamarse "Informe". Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Corregir las faltas de ortografía heredadas del Figma ("Parametros", "Duracion", "Disponilidad", "comparacion", "Mision", "Opcion").~~ Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~"Mejores lugares": confirmado el subtítulo "Latitud · Longitud".~~ La web ya lo usaba. Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Panorama: acercar la iluminación de las dunas y el resplandor a la ilustración del Figma, y que el relieve represente fielmente el horizonte del punto (montañoso, plano, con cráteres).~~ La cresta es el horizonte del motor sin decoración, con escala y fuente indicadas. Resuelto 2026-11-14 (rama `design/panorama-relieve`, #26).
- [ ] La fidelidad real del relieve del panorama depende del horizonte LOLA (TERRAIN-02, #8). Propuesta: que la función del horizonte exponga `source: "lola"` para que la leyenda cambie sola. — Facundo, DEC-020
- [x] ~~Calendario: permitir moverse entre días con las flechas del teclado.~~ Flechas, Inicio/Fin, RePág/AvPág, Enter y Escape (el foco vuelve al botón). Resuelto 2026-11-14 (rama `feat/calendario-teclado`, #22).
- [ ] Definir el destino del botón de configuración (el equipo todavía no lo decidió). — Configuracion sera un modal con: accesibilidad, estilo daltonismo. Opciones diversas, etc.
- [x] ~~Corregir alineaciones y desbordes: columnas desalineadas, "Lectura del momento" fuera de la sección, coordenadas sobre la esquina del mapa, menú y pestañas descentrados, leyenda del panorama superpuesta.~~ Resuelto 2026-11-14 (rama `design/ajustes-layout`, #35, DEC-022).
- [ ] Probar el escalado (`zoom`) en Firefox y Safari, además de Chrome. — DEC-015
- [x] ~~Íconos deformados: los SVG del Figma usan `preserveAspectRatio="none"` y se forzaban a cuadrado.~~ Resuelto 2026-11-13 (rama `design/figma-exacto`).
- [x] ~~Las tarjetas de "Mejores lugares" se rompían con valores largos ("890 Min", "-46.2°").~~ Resuelto 2026-11-13: columnas de 66 px y minutos en horas desde 100 min.
- [x] ~~Las etiquetas de los marcadores se pisaban cerca del polo.~~ Resuelto 2026-11-13: se ocultan las que chocan (el nombre queda como tooltip) y la del sitio elegido siempre se ve.
- [x] ~~El relieve del panorama quedaba demasiado alto y el equipo fuera de lugar respecto de la ilustración.~~ Resuelto 2026-11-13: 12 px por grado, horizonte en y = 400 y escenografía en las posiciones del Figma.
- [x] ~~La imagen de la pestaña POLO SUR estaba mal ubicada.~~ Resuelto 2026-11-13: posición (136, 176) del Figma.
- [x] ~~El calendario cortaba la columna del domingo.~~ Resuelto 2026-11-13.

## Datos y astronomía (Teo, Facu, Lucio)

- [x] ~~Verificar las coordenadas de los 7 sitios con LROC Quickmap o Moon Trek. — DEC-006~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DATA-01 #9): valores e identidades confirmados por Facu y normalizados a MOON_ME/DE421 (DEC-019). La procedencia sigue abierta en los puntos de abajo.
- [x] ~~Agregar URLs oficiales verificadas por sitio en `provenance.urls` de `web/src/data/sites.js` (hoy vacías: no hubo acceso web para verificarlas). — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): URLs de NSSDCA, Lunar Surface Data Book, LCROSS (NTRS), PGDA, CNSA y USGS cargadas en `SOURCE_URLS`.
- [x] ~~Confirmar las referencias marcadas como "candidata (no verificada)" en `sites.js` (LCROSS, Chang'e 4, Apollo 11) y citar la publicación LROC de IM-1 y Chandrayaan-3. — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): se quitaron las candidatas; LCROSS cita Marshall et al. (2012), Chang'e 4 y Apollo 11 citan NSSDCA, IM-1 y Chandrayaan-3 citan PGDA (LRA).
- [x] ~~Citar el catálogo que define los puntos Shackleton Rim R04 y Malapert Massif R23. — Facu · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): NASA Lunar Surface Data Book Rev A, tabla A2-2.
- [x] ~~Verificar el marco de cada fuente original (¿MOON_ME o MOON_PA?) y, si alguna está en PA, convertirla con SPICE; luego poner `sourceFrameVerified: true`. — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): Mean Earth declarado en Cabeus, Chang'e 4 y Apollo 11 (`true`). Lo que queda, en el punto siguiente.
- [ ] Confirmar el marco de R04/R23 (inferido de DEM LOLA; el Data Book no lo declara en la tabla) y de IM-1/Chandrayaan-3 (PGDA no lo declara). — Teo, Facu, Lucio · DEC-019
- [ ] Chang'e 4: decidir si se documenta en la interfaz la discrepancia de ≈ 415 m entre NSSDCA (usado) y CNSA (177,5991° E, 45,4446° S). — Teo, Facu, Lucio · DEC-019
- [x] ~~Cargar la exactitud declarada por cada fuente en `precision.accuracyM` (hoy `null`). — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): 10 m en R04/R23 y 115 m (1σ) en Cabeus, con `accuracyBasis`. Las demás fuentes no la declaran (`null`).
- [ ] Decidir si la interfaz muestra la procedencia y la confianza de cada sitio (requiere claves nuevas en `es.js`/`en.js` y consultar el diseño). — Desarrollo web · DEC-019, DEC-014
- [ ] Confirmar qué latitud cubre la imagen del MAPA DE CALOR (supuesto: hasta −60°) y su orientación (0° arriba). GLOBAL y POLO SUR ya usan NASA SVS con proyección conocida (DEC-021). — DEC-016
- [ ] Confirmar origen y licencia de la imagen del MAPA DE CALOR que viene del Figma (las otras dos se reemplazaron por NASA SVS). — DEC-016
- [ ] Reemplazar el modelo aproximado del Sol y la Tierra por efemérides de JPL Horizons. — DEC-004
- [ ] Reemplazar el horizonte sintético por relieve real de LOLA. — DEC-005
- [ ] Revisar los umbrales de viabilidad (luz, potencia, comunicación). — DEC-007

## Textos y traducción

- [x] Revisar los textos en español de `web/src/i18n/es.js`. — Alfonso, Cata
- [x] Revisar la traducción al inglés de `web/src/i18n/en.js`. — Lucio, Cata

## Repositorio y entrega

- [x] ~~Revisar y mergear el PR #1 (web v1) y el PR #2 (réplica del Figma) en `Selene-SpaceApps`.~~ Resuelto 2026-11-14: los dos se mergearon, pero el #2 entró en `feat/web-v1` después de que el #1 ya estaba en `main`. Se integra con la rama `chore/integrar-web-v1`.
- [ ] Revisar la renumeración de decisiones (las de la réplica del Figma pasaron de DEC-011…015 a DEC-014…018) y la fusión de reglas en `AGENTS.md` (regla 5 + regla 10). — Equipo, rama `chore/integrar-web-v1`
- [ ] Revisar el resto de `docs/ARCHITECTURE.md`, `docs/TASKS.md` y `web/src/ui/AGENTS.md` contra la interfaz del Figma. En la integración solo se actualizaron la tabla de módulos y el diagrama. — Desarrollo web
- [x] ~~Archivar o borrar el repo anterior `Hubble27-SpaceApps` (todavía tiene el historial con co-autores y los PR viejos).~~ Resuelto 2026-11-14: repo borrado por Lucio. `CLAUDE.md` se mantiene.
- [x] ~~Migrar el proyecto a `Selene-SpaceApps` sin co-autores en el historial.~~ Resuelto 2026-11-14 (DEC-018).
- [ ] Publicar el build (`npm run build`) en un enlace público para el formulario de Space Apps (GitHub Pages, Netlify o Drive). Hay una vista previa privada en un artifact de claude.ai (hay que compartirla desde su menú). — Desarrollo web
- [ ] Declarar en la entrega los datos de la NASA usados (JPL Horizons, LOLA, LROC). — Equipo
