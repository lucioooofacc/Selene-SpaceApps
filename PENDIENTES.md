# Pendientes del proyecto

Lista viva de lo que falta aplicar. El plan por etapas (qué se hizo, qué se está viendo y qué sigue) está en `docs/ROADMAP.md`. Las reglas para mantenerla están en `AGENTS.md` (regla 10):

- **Agregar:** todo lo que se detecte y no se resuelva en el momento va como `- [ ]`, con responsable y referencia (DEC-XXX, PR o archivo).
- **Tachar:** cuando se resuelve, se marca `- [x]`, se tacha el texto con `~~ ~~` y se agrega la fecha y el commit o PR. No se borra.
- **Descartar:** si se decide no hacerlo, se tacha y se agrega "descartado: motivo".

Última actualización: 2026-11-14.

---

## Diseño (réplica del Figma)

- [x] ~~Leer el color de la franja de 8 px entre el encabezado y el cuerpo (frame "Vista 7").~~ Se mantiene el color de fondo: el MCP de Figma necesita la URL del archivo en figma.com y el repo solo tiene el `.fig` local. Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Reemplazar las imágenes de GLOBAL y POLO SUR por un modelo 3D de la Luna (fuentes NASA), con opción de alternar entre 3D y vistas 2D.~~ three.js + CGI Moon Kit de NASA SVS. Resuelto 2026-11-14 (rama `feat/luna-3d`, #25, DEC-021).
- [x] ~~Mejorar el detalle del polo sur en 2D (textura de 8k o mosaico polar de LROC) si el equipo lo necesita. — Desarrollo web, DEC-021~~ Descartado 2026-11-14 (rama `docs/cerrar-diseno`): el detalle actual alcanza para la demo (decisión del equipo).
- [x] ~~"Ver comparación detallada" y "Comparar" llevan a una página nueva que compara dos sitios elegidos con métricas técnicas.~~ `compare.html`. Resuelto 2026-11-14 (rama `feat/comparacion-sitios`, #23).
- [x] ~~Al volver de la comparación a la misión se pierde la selección (sitio y fechas), porque la página de misión no lee la URL. — Desarrollo web, UI-05~~ Resuelto 2026-11-14 (rama `feat/url-estado`, #46, DEC-027).
- [x] ~~"Opción 3" pasa a ser el informe imprimible de la misión planificada.~~ "Informe" en el menú. Resuelto 2026-11-14 (rama `feat/informe-imprimible`, #24).
- [x] ~~"Informe" desde la página de comparación imprime la misión por defecto, no los sitios comparados (misma causa: la misión no lee la URL). — Desarrollo web, UI-06~~ Resuelto 2026-11-14 (rama `feat/url-estado`, #46, DEC-027).
- [x] ~~Quitar "Opción 4" y "Opción 5" del menú.~~ "Opción 3" pasa a llamarse "Informe". Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Corregir las faltas de ortografía heredadas del Figma ("Parametros", "Duracion", "Disponilidad", "comparacion", "Mision", "Opcion").~~ Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~"Mejores lugares": confirmado el subtítulo "Latitud · Longitud".~~ La web ya lo usaba. Resuelto 2026-11-14 (rama `fix/textos-navegacion`, #21).
- [x] ~~Panorama: acercar la iluminación de las dunas y el resplandor a la ilustración del Figma, y que el relieve represente fielmente el horizonte del punto (montañoso, plano, con cráteres).~~ La cresta es el horizonte del motor sin decoración, con escala y fuente indicadas. Resuelto 2026-11-14 (rama `design/panorama-relieve`, #26).
- [x] ~~La fidelidad real del relieve del panorama depende del horizonte LOLA (TERRAIN-02, #8). Propuesta: que la función del horizonte exponga `source: "lola"` para que la leyenda cambie sola. — Facundo, DEC-020~~ `createLolaHorizon()` expone `horizon.source = "lola"`; el panorama lo mostrará cuando CORE-01 use ese horizonte. Resuelto 2026-11-14 (rama `feat/horizonte-lola`, DEC-030).
- [x] ~~Calendario: permitir moverse entre días con las flechas del teclado.~~ Flechas, Inicio/Fin, RePág/AvPág, Enter y Escape (el foco vuelve al botón). Resuelto 2026-11-14 (rama `feat/calendario-teclado`, #22).
- [x] ~~Definir el destino del botón de configuración (el equipo todavía no lo decidió). — Configuracion sera un modal con: accesibilidad, estilo daltonismo. Opciones diversas, etc.~~ Modal con idioma, paleta para daltonismo, alto contraste, reducir movimiento y vista del mapa. Resuelto 2026-11-14 (rama `feat/configuracion`, #37, DEC-023).
- [x] ~~El mapa de calor (imagen del Figma) no cambia con la paleta para daltonismo; revisarlo cuando se haga MAP-01. — Desarrollo web, DEC-023~~ Ahora es elevación LOLA coloreada en el navegador, con paleta estándar o cividis y vista 3D física. Resuelto 2026-11-14 (rama `feat/mapa-elevacion`, #42, DEC-026).
- [x] ~~Regenerar el mapa de elevación desde el producto polar `LDEM_60S_240M` (TERRAIN-01, #39, ya integrado; DEC-025), si el equipo lo prefiere. — Facundo, Desarrollo web · DEC-026~~ Descartado 2026-11-14 (rama `docs/cerrar-diseno`): ELEVACIÓN ya usa datos reales de LOLA; la descarga (~240 MB) no se justifica para la demo (decisión del equipo).
- [x] ~~Corregir alineaciones y desbordes: columnas desalineadas, "Lectura del momento" fuera de la sección, coordenadas sobre la esquina del mapa, menú y pestañas descentrados, leyenda del panorama superpuesta.~~ Resuelto 2026-11-14 (rama `design/ajustes-layout`, #35, DEC-022).
- [x] ~~Mostrar en la interfaz los datos reales disponibles (horizonte LOLA de TERRAIN-02).~~ Vista previa en el panorama, la comparación y "Datos y fuentes", con marcas de calidad. Resuelto 2026-11-14 (rama `feat/horizonte-lola-ui`, #52, DEC-031).
- [x] ~~Probar el escalado (`zoom`) en Firefox y Safari, además de Chrome. — DEC-015~~ Cerrado por compatibilidad 2026-11-14 (rama `docs/cerrar-diseno`): `zoom` es CSS estándar soportado por Firefox 126+ (2024) y Safari; sin prueba manual (decisión del equipo).
- [x] ~~Íconos deformados: los SVG del Figma usan `preserveAspectRatio="none"` y se forzaban a cuadrado.~~ Resuelto 2026-11-13 (rama `design/figma-exacto`).
- [x] ~~Las tarjetas de "Mejores lugares" se rompían con valores largos ("890 Min", "-46.2°").~~ Resuelto 2026-11-13: columnas de 66 px y minutos en horas desde 100 min.
- [x] ~~Las etiquetas de los marcadores se pisaban cerca del polo.~~ Resuelto 2026-11-13: se ocultan las que chocan (el nombre queda como tooltip) y la del sitio elegido siempre se ve.
- [x] ~~El relieve del panorama quedaba demasiado alto y el equipo fuera de lugar respecto de la ilustración.~~ Resuelto 2026-11-13: 12 px por grado, horizonte en y = 400 y escenografía en las posiciones del Figma.
- [x] ~~La imagen de la pestaña POLO SUR estaba mal ubicada.~~ Resuelto 2026-11-13: posición (136, 176) del Figma.
- [x] ~~El calendario cortaba la columna del domingo.~~ Resuelto 2026-11-13.
- [x] ~~En el panel de la izquierda, del top 5 lugares, tiene que haber categorias para rankear los sitios. Por ejemplo: Interes cientifico, comunicacion terrestre, luz solar aprovechable.~~ Categorías Global, Ciencia, Comunicación y Luz. Resuelto 2026-11-14 (rama `feat/ranking-categorias`, #49, DEC-029).
- [x] ~~Cambiar titulo de Mapa de Calor, a algo relacionado a que el mapa muestra elevacion del terreno~~ Ahora se llama ELEVACIÓN / ELEVATION. Resuelto 2026-11-14 (rama `feat/ranking-categorias`, #49, DEC-029).

## Datos y astronomía (Teo, Facu, Lucio)

- [x] ~~CORE-01: conectar el horizonte LOLA (y las efemérides Horizons cuando haya series) en `analysis.js`; la interfaz ya pasa de "vista previa" a "en uso" sola. — Facundo · #11, DEC-031~~ Horizonte LOLA conectado (parte A). Resuelto 2026-11-14 (rama `feat/integracion-horizonte-lola`, DEC-032).
- [x] ~~CORE-01 parte B: efemérides JPL Horizons en `analysis.js` (series nov 2026 – dic 2027, paso 1 h, interpoladas; fuera del rango, modelo aproximado marcado). — Facundo · #11, DEC-024, DEC-032~~ Resuelto 2026-11-14 (rama `feat/efemerides-horizons-calculo`, DEC-033).
- [ ] UI-01: mostrar `scenario.ephemeris` (Horizons / aproximado / mixto, procedencia y cobertura) y el estado de carga de las efemérides. — Lucio · #13, DEC-033
- [ ] Validar los rasgos de interés científico de `web/src/data/site-traits.js` (y sumar rasgos de IM-1 si corresponde). — Teo, Facu, Lucio · DEC-029
- [x] ~~Verificar las coordenadas de los 7 sitios con LROC Quickmap o Moon Trek. — DEC-006~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DATA-01 #9): valores e identidades confirmados por Facu y normalizados a MOON_ME/DE421 (DEC-019). La procedencia sigue abierta en los puntos de abajo.
- [x] ~~Agregar URLs oficiales verificadas por sitio en `provenance.urls` de `web/src/data/sites.js` (hoy vacías: no hubo acceso web para verificarlas). — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): URLs de NSSDCA, Lunar Surface Data Book, LCROSS (NTRS), PGDA, CNSA y USGS cargadas en `SOURCE_URLS`.
- [x] ~~Confirmar las referencias marcadas como "candidata (no verificada)" en `sites.js` (LCROSS, Chang'e 4, Apollo 11) y citar la publicación LROC de IM-1 y Chandrayaan-3. — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): se quitaron las candidatas; LCROSS cita Marshall et al. (2012), Chang'e 4 y Apollo 11 citan NSSDCA, IM-1 y Chandrayaan-3 citan PGDA (LRA).
- [x] ~~Citar el catálogo que define los puntos Shackleton Rim R04 y Malapert Massif R23. — Facu · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): NASA Lunar Surface Data Book Rev A, tabla A2-2.
- [x] ~~Verificar el marco de cada fuente original (¿MOON_ME o MOON_PA?) y, si alguna está en PA, convertirla con SPICE; luego poner `sourceFrameVerified: true`. — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): Mean Earth declarado en Cabeus, Chang'e 4 y Apollo 11 (`true`). Lo que queda, en el punto siguiente.
- [ ] Confirmar el marco de R04/R23 (inferido de DEM LOLA; el Data Book no lo declara en la tabla) y de IM-1/Chandrayaan-3 (PGDA no lo declara). — Teo, Facu, Lucio · DEC-019
- [ ] Chang'e 4: decidir si se documenta en la interfaz la discrepancia de ≈ 415 m entre NSSDCA (usado) y CNSA (177,5991° E, 45,4446° S). — Teo, Facu, Lucio · DEC-019
- [x] ~~Cargar la exactitud declarada por cada fuente en `precision.accuracyM` (hoy `null`). — Teo, Facu, Lucio · DEC-019~~ Resuelto 2026-11-14 (rama `data/validar-sitios`, DEC-019): 10 m en R04/R23 y 115 m (1σ) en Cabeus, con `accuracyBasis`. Las demás fuentes no la declaran (`null`).
- [x] ~~Decidir si la interfaz muestra la procedencia y la confianza de cada sitio (requiere claves nuevas en `es.js`/`en.js` y consultar el diseño). — Desarrollo web · DEC-019, DEC-014~~ Se muestra en el modal "Datos y fuentes", la comparación y el informe. Resuelto 2026-11-14 (rama `feat/calidad-datos-ui`, #13 parcial, DEC-028).
- [ ] Resto de UI-01: fuente, fecha y cobertura de efemérides y horizonte reales, y estados de carga/error/faltante, cuando exista el contrato de metadatos de CORE-01. — Desarrollo web, Facundo · DEC-028, #13
- [x] ~~Confirmar qué latitud cubre la imagen del MAPA DE CALOR (supuesto: hasta −60°) y su orientación (0° arriba). GLOBAL y POLO SUR ya usan NASA SVS con proyección conocida (DEC-021).~~ Ya no se usa la imagen del Figma: MAPA DE CALOR muestra elevación LOLA (DEC-026). Resuelto 2026-11-14 (rama `feat/mapa-elevacion`, #42).
- [x] ~~Confirmar origen y licencia de la imagen del MAPA DE CALOR que viene del Figma (las otras dos se reemplazaron por NASA SVS).~~ Ya no se usa la imagen del Figma: MAPA DE CALOR muestra elevación LOLA (DEC-026). Resuelto 2026-11-14 (rama `feat/mapa-elevacion`, #42).
- [x] ~~Reemplazar el modelo aproximado del Sol y la Tierra por efemérides de JPL Horizons. — DEC-004 · Avance 2026-11-14 (rama `data/efemerides-horizons`, ASTRO-01 #6, DEC-024): adaptador, adquisición, caché y fixtures listos; falta consumirlos en `analysis.js` (CORE-01 #11).~~ Hecho para los 7 sitios curados entre el 01/11/2026 y el 01/01/2028; fuera de ese rango, en sitios propios y en el mapa de calor sigue el modelo aproximado. Resuelto 2026-11-14 (rama `feat/efemerides-horizons-calculo`, DEC-033).
- [x] ~~Definir la altura datum de cada sitio para Horizons (hoy 0 km sobre la esfera de 1737,4 km, marcado como supuesto). Depende de TERRAIN-01. — Teo, Facu, Lucio · DEC-024~~ Suelo LOLA + 2 m en los sitios polares; 0 km supuesto en Chang'e 4 y Apollo 11. Resuelto 2026-11-14 (rama `feat/efemerides-horizons-calculo`, DEC-033).
- [ ] Validar que pasar coordenadas MOON_ME/DE421 sin transformar al sitio de Horizons (MEAN_ME, DE441) es aceptable a la escala de la app. — Teo, Facu, Lucio · DEC-024
- [x] ~~Generar las series Horizons de los 7 sitios para el período de la demo (hoy solo Shackleton R04, 14–16/11/2026, paso 60 min) y decidir dónde se guardan para la web. Coordinar con CORE-01. — Facu · DEC-024~~ 01/11/2026 – 01/01/2028, paso 1 h, en `web/public/data/ephemerides/`. Resuelto 2026-11-14 (rama `feat/efemerides-horizons-calculo`, DEC-033).
- [ ] Mapa de calor con efemérides de Horizons (hoy modelo aproximado en cada celda; necesitaría series por celda o un modelo mejor). — Desarrollo web · MAP-01 #16, DEC-033
- [ ] Confirmar si los EOP predichos que usa Horizons después del 13/11/2026 afectan los valores a la escala de la app. — Teo, Facu, Lucio · DEC-024
- [ ] Decidir si `analysis.js` usa el diámetro angular de Horizons en lugar de los radios fijos (0,27° Sol, 0,95° Tierra). — CORE-01/CORE-02 · DEC-024
- [ ] Verificar las condiciones de reutilización de datos derivados de JPL Horizons antes de publicarlos. — Equipo · `docs/DATA_SOURCES.md`
- [x] ~~Reemplazar el horizonte sintético por relieve real de LOLA. — DEC-005~~ Hecho para los sitios curados al sur de −60°; sigue sintético en sitios propios, Chang'e 4, Apollo 11 y el mapa de calor. Resuelto 2026-11-14 (rama `feat/integracion-horizonte-lola`, DEC-032).
- [ ] Mapa de calor con horizonte real (hoy sintético en cada celda). — Desarrollo web · MAP-01 #16, DEC-032
- [ ] Validar la orientación de la proyección polar: la ecuación directa de `dsmap_polar.cat` invierte el signo de X respecto de su inversa; se usó la inversa (comprobado con Shackleton). — Teo, Facu, Lucio · DEC-025
- [x] ~~TERRAIN-02: definir el radio de los recortes (hoy ±64 px provisorio) y si los recortes reales se versionan para la demo y con qué tamaño. — Facu, Lucio · DEC-025, TERRAIN-02 #8~~ El horizonte usa rayos de 300 km sobre el raster completo fuera del navegador y se versiona solo la tabla de horizonte (~65 KB); los recortes no se versionan. Resuelto 2026-11-14 (rama `feat/horizonte-lola`, DEC-030).
- [x] ~~Shackleton R04 (−89,7668°, −171,87°) cae en la pared interior del cráter según el DEM LOLA: cresta a ~2 km al este, horizonte de hasta ~31°. Verificar la coordenada y su marco (¿MOON_PA vs MOON_ME?, ¿otro punto de borde?). Desde DEC-032 la web ya muestra Shackleton con ~9 % de luz anual (antes ~96 %); si se corrige, regenerar la tabla. — Teo, Facu, Lucio · DEC-030, DEC-019~~ R04 es el centro de un polígono de la tabla de NASA; se reemplazó por R01 Connecting Ridge (62 % de luz, 46 % de comunicación). Resuelto 2026-11-14 (rama `data/shackleton-r01`, #61, DEC-035).
- [x] ~~Datos reales para los puntos elegidos en el mapa.~~ Sol y Tierra trasladados desde Horizons y horizonte LOLA reducido (480/960 m) al sur de −75°. Resuelto 2026-11-14 (rama `feat/datos-reales-puntos-propios`, #59, DEC-034).
- [ ] Validar si el horizonte LOLA reducido de los puntos propios se muestra como "aproximado" (criterio actual: error medio 0,02–0,77° frente al de 240 m) o como "real". — Teo, Facu, Lucio · DEC-034
- [ ] Comparar el horizonte LOLA con horizontes publicados (p. ej. Mazarico et al. 2011) si se consiguen valores de referencia. — Teo, Facu, Lucio · DEC-030, TEST-01
- [ ] Horizonte LOLA para sitios personalizados (clic en el mapa): requiere el raster o recortes en tiempo de ejecución. — Desarrollo web · DEC-030, PERF-01/CORE-01
- [ ] Copiar la cita completa (autores y año) del DOI 10.17189/1520642 en el manifiesto y en `DATA_SOURCES.md`. — Equipo · DEC-025
- [ ] Cuando el horizonte use LOLA, mostrar en la interfaz los píxeles con `count = 0` como interpolados (confianza baja) y Chang'e 4/Apollo 11 como sin cobertura. — Desarrollo web · DEC-025
- [ ] Revisar los umbrales de viabilidad (luz, potencia, comunicación). — DEC-007

## Textos y traducción

- [x] Revisar los textos en español de `web/src/i18n/es.js`. — Alfonso, Cata
- [x] Revisar la traducción al inglés de `web/src/i18n/en.js`. — Lucio, Cata

## Repositorio y entrega

- [x] ~~Revisar y mergear el PR #1 (web v1) y el PR #2 (réplica del Figma) en `Selene-SpaceApps`.~~ Resuelto 2026-11-14: los dos se mergearon, pero el #2 entró en `feat/web-v1` después de que el #1 ya estaba en `main`. Se integra con la rama `chore/integrar-web-v1`.
- [ ] Revisar la renumeración de decisiones (las de la réplica del Figma pasaron de DEC-011…015 a DEC-014…018) y la fusión de reglas en `AGENTS.md` (regla 5 + regla 10). — Equipo, rama `chore/integrar-web-v1`
- [x] ~~Revisar el resto de `docs/ARCHITECTURE.md`, `docs/TASKS.md` y `web/src/ui/AGENTS.md` contra la interfaz del Figma. En la integración solo se actualizaron la tabla de módulos y el diagrama. — Desarrollo web~~ Resuelto 2026-11-14 (rama `docs/sincronizar-despliegue`, #44).
- [x] ~~Archivar o borrar el repo anterior `Hubble27-SpaceApps` (todavía tiene el historial con co-autores y los PR viejos).~~ Resuelto 2026-11-14: repo borrado por Lucio. `CLAUDE.md` se mantiene.
- [x] ~~Migrar el proyecto a `Selene-SpaceApps` sin co-autores en el historial.~~ Resuelto 2026-11-14 (DEC-018).
- [x] ~~Publicar el build (`npm run build`) en un enlace público para el formulario de Space Apps (GitHub Pages, Netlify o Drive). Hay una vista previa privada en un artifact de claude.ai (hay que compartirla desde su menú). — Desarrollo web~~ Publicado en https://selene-space-apps.vercel.app (Vercel, desde `main`). Resuelto 2026-11-14 (rama `docs/sincronizar-despliegue`, #44).
- [ ] Declarar en la entrega los datos de la NASA usados (JPL Horizons, LOLA, LROC). — Equipo
