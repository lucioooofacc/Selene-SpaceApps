# Modelo científico y convenciones

SELENE v1 es una herramienta conceptual. Combina efemérides **reales de JPL Horizons** para los 7 sitios curados entre el 01/11/2026 y el 01/01/2028 (DEC-033), con el modelo **aproximado** fuera de ese rango y en sitios propios, el horizonte **real de LOLA** en los 7 sitios curados (DEC-032; Chang'e 4 y Apollo 11 desde `LDEM_128`, DEC-061) y un horizonte **sintético** en el resto, y coordenadas de sitios confirmadas por el equipo y cotejadas con fuentes oficiales (DEC-019).

## Convenciones y unidades

- Coordenadas selenográficas en grados decimales: latitud positiva al norte y negativa al sur; longitud este positiva, normalmente expresada en `[-180°, 180°)`.
- Azimut local en grados desde el norte lunar y en sentido horario: este `90°`, sur `180°`, oeste `270°`.
- Elevación en grados sobre el horizonte matemático: `0°` es el plano tangente local. La visibilidad usa además el perfil topográfico.
- Distancias de terreno en kilómetros. El radio lunar usado por `terrain.js` es `1737,4 km`.
- Instantes como milisegundos Unix y fechas mostradas en UTC. Los campos `datetime-local` se interpretan deliberadamente como componentes UTC en `format.js`.
- Duraciones de análisis en días y minutos; el muestreo científico actual es cada 10 minutos.
- Potencia relativa y calidad de enlace son magnitudes adimensionales entre 0 y 1. No son watts ni una garantía de desempeño.

## Sistemas de referencia

Los sitios curados declaran su referencia desde DEC-019: MOON_ME / DE421, latitud planetocéntrica, longitud este positiva en `[-180°, 180°)` y esfera de 1737,4 km (`SITE_REFERENCE` en `lib/coordinates.js`). No se aplica ninguna transformación: el marco Mean Earth lo declara la fuente en Cabeus, Chang'e 4 y Apollo 11; en R04/R23 se infiere de los DEM LOLA y en IM-1/Chandrayaan-3 no está declarado. La exactitud de la fuente (`precision.accuracyM`) se guarda aparte de la resolución de la cifra (`quantizationMeters()`).

El modelo astronómico usa una esfera lunar y coordenadas selenográficas simplificadas. No declara actualmente un marco IAU o SPICE específico, el datum vertical de las coordenadas ni una realización cartográfica. Esto es aceptable solo para el prototipo aproximado y debe resolverse antes de mezclar datos de distintas fuentes.

El adaptador Horizons (DEC-024) fija su propia referencia: centro `coord@301` sobre la esfera de 1737,4 km con polo `MEAN_ME (high precision)` y efemérides DE441, coordenadas geodésicas con longitud este, escala UT (UTC) y valores aparentes sin refracción (`AIRLESS`). Las coordenadas MOON_ME/DE421 de los sitios se pasan sin transformación; la diferencia entre ambas realizaciones no está evaluada.

Una integración real deberá fijar y registrar, como mínimo: marco lunar, convención de longitud, datum/radio de referencia, escala temporal, correcciones de luz/aberración y transformación entre el producto topográfico y el observador de Horizons o SPICE.

## Modelo astronómico implementado

`astro.js` usa como época una luna nueva el 6 de enero de 2000 a las 18:14 UTC.

- El punto subsolar recorre 360° durante un mes sinódico de `29,530589 d` y su latitud oscila con amplitud `1,54°` y período `346,62 d`.
- El punto subterrestre representa libración mediante senos independientes: amplitud `7,9°` en longitud con período `27,55455 d`, y `6,68°` en latitud con período `27,212221 d`.
- `skyPosition()` proyecta el vector del punto subyacente sobre ejes locales arriba/este/norte. En el polo exacto limita la latitud a `±89,99°` para evitar una singularidad de azimut.
- La fase visible de la Tierra es el complemento periódico de la fase lunar y se expresa como fracción `[0,1]`.

Estas expresiones generan movimiento coherente para la interfaz, pero no son efemérides de navegación, no incluyen todos los términos orbitales ni sustituyen Horizons/SPICE.

## Efemérides JPL Horizons (adaptador, DEC-024)

`lib/horizons.js` interpreta tablas `OBSERVER` de Horizons para el Sol (`10`) y la Tierra (`399`) vistos desde un sitio lunar. Desde DEC-033 sus series (7 sitios, nov 2026 – dic 2027, paso 1 h) alimentan `analysis.js` a través de `lib/ephemeris.js`, con interpolación lineal entre horas; fuera de la cobertura se usa el modelo aproximado y `scenario.ephemeris.source` lo informa (`horizons`, `approximate` o `mixed`).

| Campo de la serie | Unidad / convención |
| --- | --- |
| `timeMs` | Unix ms UTC, convertido desde JD UT sin segundos intercalares |
| `jdUt` | día juliano UT tal como lo da Horizons |
| `azimuthDeg` | `[0°, 360°)` desde el norte, sentido horario; aparente, sin aire |
| `elevationDeg` | `[-90°, 90°]` sobre el plano tangente local; aparente, sin aire; **sin topografía** |
| `illuminatedPct` | `[0, 100]` % del disco iluminado (Sol siempre 100) |
| `angularDiameterArcsec` | segundos de arco, `> 0` |
| `solarPresence`, `interfererPresence` | códigos de Horizons (`*`, `i`); consideran solo el horizonte matemático |

- **Altura del observador:** obligatoria y con base declarada (`measured-datum` o `assumed-zero-reference-sphere`). Los fixtures usan 0 km como **supuesto**; `elevationKm` (sintético) no se acepta.
- **Faltantes:** `n.a.` se guarda como `null` y se cuenta en `coverage.missing`; nunca se reemplaza por cero ni se interpola.
- **Validación:** valores fuera de rango, filas o pasos irregulares, cobertura distinta de la pedida y sitio/objetivo/perfil no coincidentes son errores (`HorizonsError`), no se recortan.
- **Cobertura:** cada serie registra inicio, fin, paso, filas y completitud, y el período de EOP usado (`frame.eopCoverage`); fuera del período medido Horizons usa EOP predichos.
- **Comparación con la fuente:** exacta (tolerancia 0) contra las respuestas oficiales guardadas en `web/tests/fixtures/horizons/`. No se mide aún la diferencia con el modelo de `astro.js`.
- **Radios angulares:** Horizons entrega el diámetro real; desde DEC-036 `analysis.js` usa la mitad de ese diámetro en cada instante (ver "Visibilidad, radios angulares y fracción parcial").

## Horizonte sintético y curvatura

`terrain.js` no consulta un DEM. Construye un perfil determinista sumando seis ondas con fases y amplitudes derivadas de ruido suave dependiente de latitud y longitud. El relieve característico sale siempre de `estimateRelief()`: desde DEC-063 los sitios curados no traen `relief` (usan el horizonte LOLA, DEC-061) y el sintético es solo el respaldo de puntos sin LOLA.

`horizonDip()` calcula la depresión geométrica de un observador elevado; desde DEC-063 `createHorizon()` ya no la aplica, y queda como utilidad para las pruebas del horizonte LOLA:

`dip = acos(R / (R + h))`

donde `R = 1737,4 km` y `h` está en km. La función de horizonte devuelve elevación en grados para cualquier azimut y, por defecto, interpola una tabla precalculada cada grado con continuidad circular entre 359° y 0°.

El término de curvatura representa la depresión geométrica de un observador elevado sobre una esfera. No modela el perfil real, pendientes locales, datum del DEM ni oclusiones a distancia derivadas de LOLA.

## Horizonte topográfico LOLA (TERRAIN-02)

`lib/horizon-lola.js` calcula el horizonte real desde `LDEM_60S_240M_FLOAT` (DEC-025, DEC-030). Por cada azimut (cada 0,5°, desde el norte en sentido horario) recorre un círculo máximo desde el sitio, cada 120 m hasta 300 km, interpola la altura bilinealmente y toma el máximo de

`e(δ) = atan2(r·cos δ − r₀, r·sin δ)`

con `δ = d / R`, `r = R + h(d)` y `r₀ = R + h₀ + 2 m` (observador a 2 m sobre el suelo, `R = 1737,4 km`). La curvatura entra sin aproximar; sobre una esfera lisa el resultado es `−acos(R / r₀)`, la misma depresión del modelo sintético.

- El cálculo se hace fuera del navegador (`scripts/build-lola-horizons.mjs`); la web interpola la tabla `data/terrain/lola-horizons.js` con continuidad 0°/360°.
- Calidad por azimut: distancia del punto que define el horizonte, baja confianza si usa píxeles con `count = 0` y distancia alcanzada. Si el rayo sale de la cobertura (−60°) el valor es una cota inferior.
- Para los sitios curados al sur de −60°, a 240 m (`scenarioHorizon`, DEC-032).
- Para puntos propios al sur de −75°, calculado en el navegador sobre un DEM reducido (480 m hasta −80°, 960 m hasta −75°), cada 1° y paso de 240 m (DEC-034). Error medio medido frente al de 240 m: 0,02–0,77°; se muestra como aproximado.
- Para Chang'e 4 y Apollo 11, fuera de la cobertura polar, con el mismo algoritmo sobre una ventana del DEM global `LDEM_128` (cilíndrica simple, 128 píxeles/grado ≈ 237 m; `createCylindricalWindowSampler`, DEC-061). Control cruzado en Chandrayaan-3, cubierto por los dos productos: mismo suelo y diferencia RMS de 0,069° en los azimuts no truncados.
- Los puntos propios fuera de −75° usan el horizonte LOLA regional, interpolado del atlas global de 2° (DEC-068): relieve medido de la zona, no del punto. El sintético queda como respaldo mientras cargan los datos y en el mapa de calor aproximado.

### Puntos propios: Sol y Tierra trasladados (DEC-034)

Para un punto sin serie propia, cada dirección de la serie Horizons más cercana se lleva al marco fijo a la Luna y se proyecta en los ejes locales (arriba, este, norte) del punto. El Sol se toma en la misma dirección; la Tierra se ubica a 384 400 km del sitio de origen para corregir la paralaje entre los dos puntos. Error medido contra series reales: Sol ≤ 0,0016°, Tierra ≤ 0,025°.

## Datos de elevación LOLA (TERRAIN-01)

Producto: `LDEM_60S_240M_FLOAT` V2.1 + `LDEC_60S_240M`, data set `LRO-L-LOLA-4-GDR-V1.0`, DOI 10.17189/1520642 (DEC-025). `lib/terrain-data.js` es puro y todavía no lo usa `analysis.js`.

- **Proyección:** estereográfica polar esférica centrada en −90°, `R = 1737,4 km`, 240 m/píxel exactos en el polo, grilla 7760 × 7760, offset 3879,5. Con índices base 0 (`l` fila, `s` columna):

  ```text
  X = (s − 3879,5)·240 m        Y = −(l − 3879,5)·240 m
  ρ = √(X² + Y²)                lon = atan2(X, Y)
  lat = −90° + 2·atan(ρ / 2R)
  ```

  y la inversa `ρ = 2R·tan((90° + lat)/2)`, `s = 3879,5 + ρ·sin(lon)/240`, `l = 3879,5 − ρ·cos(lon)/240`. Longitud 0° hacia arriba y 90° E a la derecha. La ecuación directa publicada en `dsmap_polar.cat` tiene el signo de X invertido respecto de su inversa; ver el hallazgo y la comprobación empírica en DEC-025.
- **Unidades:** el DEM está en km sobre la esfera de 1737,4 km; los recortes lo expresan en metros (redondeo a 1 mm). No es altura sobre un geoide.
- **Conteos:** `LDEC` da el número de mediciones LOLA por píxel. `count = 0` significa que el valor del DEM es interpolado: se marca sin medición directa y con confianza baja. Para `count > 0` no se definieron umbrales de calidad.
- **Cobertura:** latitud ≤ −60° y píxel dentro de la grilla. Cubre Shackleton, Malapert, Cabeus, IM-1 y Chandrayaan-3; Chang'e 4 y Apollo 11 quedan fuera y no reciben datos.
- **Sin remuestreo:** los recortes conservan la grilla nativa; el valor en un punto es el del píxel más cercano.

Este módulo **no** calcula un horizonte topográfico ni incorpora curvatura por distancia: eso corresponde a TERRAIN-02.

## Visibilidad, radios angulares y fracción parcial

Política única (CORE-02, DEC-036), la misma en `computeScenario()`, `sampleAt()` y `computePolarHeatmap()` (`VISIBILITY_POLICY` en `analysis.js`). Para cada cuerpo se calcula el margen `m = elevación − horizonte(azimut)` y se toma el horizonte localmente recto a la escala del disco.

- **Radio angular `r`:** el de JPL Horizons en cada instante (mitad del diámetro, interpolado por hora) cuando hay serie: Sol 0,261°–0,272°, Tierra 0,899°–1,025° (media 0,951°) entre nov 2026 y dic 2027. Con el modelo aproximado, los radios medios `0,27°` y `0,95°`.
- **Sol visible:** asoma al menos la mitad del disco (`m > 0`).
- **Potencia:** proporcional a la fracción del disco que asoma, con el área exacta del segmento circular: `f = 1 − (acos(d) − d·√(1 − d²)) / π`, con `d = m / r` (0 si `m ≤ −r`, 1 si `m ≥ r`).
- **Tierra visible (comunicación):** asoma cualquier parte del disco (`m > −r`).

La visibilidad geométrica de la Tierra **no garantiza comunicación**. No incorpora enlace de radio, potencia, ganancia, orientación de antena, banda, ruido, propagación, ocultaciones por infraestructura ni disponibilidad de estaciones terrestres.

## Muestreo y ventanas operativas

`computeScenario()` muestrea a intervalos de 10 minutos. La cantidad de pasos de la ventana se redondea y se agregan 32 días de anticipación para buscar el próximo cambio de visibilidad mostrado en la UI.

Las ventanas son secuencias contiguas de banderas de visibilidad. Sus límites quedan cuantizados al paso de 10 minutos; no se resuelve el cruce exacto del horizonte. Los minutos acumulados también se calculan contando pasos, no integrando una fracción continua.

`sampleAt()` interpola elevaciones, azimuts y métricas entre muestras. Las banderas instantáneas y los acumulados permanecen discretos según el índice inferior.

## Potencia solar relativa

La potencia usa la fracción solar aproximada multiplicada por un factor de orientación:

- latitudes con `|lat| >= 60°`: panel idealizado vertical, factor `cos(elevación)`;
- resto: panel idealizado horizontal, factor `max(0, sin(elevación))`.

El promedio del escenario es una razón conceptual `[0,1]`. **No es potencia eléctrica real**: no incluye irradiancia variable, área, eficiencia, temperatura, orientación/seguimiento real, pérdidas, sombras del vehículo, degradación ni almacenamiento.

## Calidad de enlace y viabilidad

La calidad de enlace es una heurística que aumenta con el margen terrestre sobre el horizonte. La comunicación resumida es el porcentaje de muestras con alguna parte de la Tierra visible.

La viabilidad se evalúa con requisitos de misión (DEC-071, `REQUIREMENTS` en `lib/analysis.js`). Cada requisito queda en "cumple", "al límite" o "no cumple", y la viabilidad global es la del peor requisito evaluado.

| Requisito | Cumple | Al límite | No cumple | Base |
| --- | --- | --- | --- | --- |
| Luz continua: noche más larga del período | sin noche | hasta 24 h | más de 24 h | Artemis III exige Sol durante toda la estadía (NASA, 2022). El límite de 24 h es un **supuesto** del equipo sobre la autonomía de las baterías de un módulo chico |
| Comunicación: % del período con la Tierra visible | `>= 80 %` | menos de 80 % | nunca | El 80 % es un **supuesto** del equipo. Por debajo se asume un satélite de relevo, como en los planes de Artemis |
| Pendiente del terreno (solo donde hay datos) | `< 8°` | `< 10°` | `>= 10°` | Tolerancia de inclinación de 8° y aterrizaje en menos de 10° en 100 m del HLS (NASA, 2024) |

- La noche más larga se cuenta en las muestras de 10 min del escenario; en el mapa de calor, en el paso de su cálculo (1–2 h).
- La pendiente usa la del punto con el DEM polar o la tabla de `LDEM_128` (escala kilométrica, más suave que a 100 m). Con `LDEM_16` (escala regional) no se evalúa. Por eso solo cuenta en la comparación y en los informes; el ranking, las fechas, la página principal y el mapa de calor evalúan luz y comunicación.
- La potencia relativa media dejó de ser criterio; sigue como métrica.
- **Consecuencia física:** en misiones de más de unos días, cualquier sitio fuera de las zonas polares más iluminadas tiene una noche de hasta 14 días y no cumple la luz continua. Con 30 días, ninguna celda del casquete polar la cumple (la noche más corta medida es de 112 h).

## Limitaciones conocidas

- Dentro del 01/11/2026 – 01/01/2028 se usan efemérides de Horizons: las propias de cada sitio curado (DEC-033) y, para los puntos propios y el mapa de calor, las de un sitio curado trasladadas al punto (DEC-034, DEC-038). Fuera de ese rango se usa el modelo periódico aproximado, rotulado como tal. Los radios angulares salen de Horizons en cada instante (DEC-036).
- Altura del observador en las series Horizons: suelo LOLA + 2 m en los 7 sitios curados (DEC-033; Chang'e 4 y Apollo 11 desde `LDEM_128`, DEC-061).
- Horizonte: LOLA de 240 m en los 7 sitios curados (DEC-030, DEC-061), LOLA reducido en los puntos propios al sur de −75° (DEC-034) y LOLA regional del atlas de 2° en el resto (DEC-068). El sintético (DEC-005) queda como respaldo mientras cargan los datos o si fallan.
- Coordenadas de sitios con fuente oficial (DEC-019); marco inferido o no declarado en 4 sitios y exactitud no declarada en 4. Los sitios ya no tienen parámetros sintéticos de relieve (DEC-063).
- Marco lunar del modelo astronómico y datum aún no formalizados.
- Resolución temporal fija de 10 minutos; los cruces de Sol y Tierra se refinan entre muestras (SCIENCE-02, DEC-048).
- Sin barras de incertidumbre en los resultados. La procedencia, la calidad y la cobertura de cada dato se muestran en "Datos y fuentes" (DEC-039).
- El mapa de calor aplica la misma política de visibilidad (DEC-036). Con el atlas LOLA y las efemérides cargados usa datos reales: horizonte LOLA del centro de cada celda (96 × 96 hasta −80°, cada 5°) y Sol y Tierra de Horizons, cada 1–2 h (DEC-038). Si no, el modelo aproximado y el horizonte sintético, informado en `source.kind`. Fuera del casquete, `computeGlobalHeatmap()` aplica lo mismo sobre una grilla de 2° con horizontes LOLA de `LDEM_16` (~1,9 km/píxel; MAP-02, DEC-065). Solo con datos reales: sin atlas global o fuera de Horizons no se calcula. Coincide con el escenario puntual en latitudes medias (≤ 0,3 p. p. de luz) y no tiene un salto sistemático en −80°.
- Las métricas de comunicación y potencia son indicadores geométricos, no subsistemas de ingeniería.

## Sustitución por datos reales

1. Definir explícitamente marcos, escalas temporales, unidades y convenciones comunes.
2. Validar sitios y procedencia antes de analizarlos.
3. ~~Obtener efemérides topocéntricas del Sol y la Tierra con Horizons o calcularlas con SPICE; almacenar consulta y cobertura.~~ Adaptador, adquisición y caché listos (DEC-024) y consumidos por `analysis.js` (DEC-033).
4. Elegir un producto LOLA adecuado y calcular perfiles de horizonte con curvatura y datum documentados.
5. Mantener los contratos de azimut/elevación/horizonte o versionar el cambio.
6. Comparar contra casos controlados y datos externos sin convertir valores de referencia no verificados en “verdad NASA”.
7. Mostrar en la UI fuente, modelo, resolución, fecha de obtención, cobertura y advertencias.

## Validación

Las validaciones contra fuentes reales, sus tolerancias y la incertidumbre conocida están en `docs/VALIDACION.md` (TEST-01, DEC-037).
