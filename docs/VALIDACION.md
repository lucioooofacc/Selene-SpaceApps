# Validación científica de SELENE (TEST-01)

Qué se prueba, contra qué fuente, con qué tolerancia y por qué (DEC-037). Complementa a `docs/SCIENCE.md` (modelos) y `docs/DECISIONES.md` (decisiones).

**Actualizado:** 14/11/2026.

## Cómo correr las pruebas

Desde `web/`:

| Comando | Qué corre |
| --- | --- |
| `npm test` | Todo (pruebas unitarias + validaciones). |
| `npm run test:unit` | Pruebas matemáticas y de contratos (`web/tests/*.test.js`). |
| `npm run test:validation` | Validaciones contra datos reales (`web/tests/validacion/*.test.js`). |
| `LOLA_RAW_DIR=<carpeta> npm test` | Además, las pruebas opcionales con los rasters LOLA crudos (~345 MiB, `npm run data:lola:download`): reproducen exactamente la tabla de horizonte y verifican la orientación del DEM. Sin rasters se omiten solas. |

**Integración continua:** `.github/workflows/ci.yml` corre `npm ci`, `test:unit`, `test:validation` y `npm run build` en cada PR y en cada push a `main` (Node 22). Las pruebas con rasters LOLA no corren en CI.

## Validaciones contra fuentes reales (`web/tests/validacion/`)

| Validación | Fuente | Tolerancia | Justificación |
| --- | --- | --- | --- |
| Fixture crudo de Horizons íntegro y reproducible (`horizons-fixture`) | JPL Horizons API 1.2, Shackleton R04, 14–16/11/2026 (SHA-256 del crudo) | Exacta | Misma respuesta, misma normalización y misma clave de caché. |
| Tabla de horizonte LOLA (`horizonte-lola-tabla`) | `LDEM_60S_240M_FLOAT` V2.1 + `LDEC_60S_240M` (MD5 en la tabla) | Exacta (con rasters) | La tabla versionada se regenera idéntica; sin rasters se validan forma, rangos, cobertura y continuidad 0°/360° (< 0,05°). |
| Altura máxima del Sol en los sitios polares (`controles-fisicos`) | Horizons, 01/11/2026–01/01/2028 | ≤ colatitud + 1,543° + 0,1°; ≥ colatitud + 1,2° | La oblicuidad del ecuador lunar es 1,543°; la paralaje solar es < 0,001°. 14 meses cubren un año de eclipses (346,6 d). Medido: Shackleton 2,05° (colatitud 0,54°), Malapert 5,53° (4,01°). |
| Período sinódico en Apollo 11 | Horizons | Media ± 0,02 d; cada mes ± 0,4 d | Mes sinódico medio 29,5306 d; la excentricidad hace variar cada mes ~±0,3 d. Medido: media 29,5336 d (14 intervalos). |
| Tierra siempre visible desde Apollo 11 y nunca desde Chang'e 4 | Horizons | Elevación > 50° / < −30° | Cara visible y cara oculta; la libración es de ±~8°. Medido: 58,0°–73,7° y −51,0° a −37,7°. Comunicación 100 % / 0 % en todo el año. |
| Fase de la Tierra al mediodía y a la medianoche lunar (Apollo 11) | Horizons | ≤ 0,3 con Sol > 60°; ≥ 0,7 con Sol < −60° | Con el Sol alto sobre la cara visible, desde la Luna se ve la noche de la Tierra. Medido: ≤ 0,26 y ≥ 0,75. |
| Cabeus sin Sol todo el año | Horizons + LOLA; Colaprete et al. (2010) | 0 % en cada uno de 12 meses | LCROSS se dirigió a Cabeus por estar en sombra permanente. |
| Estaciones del polo sur (Shackleton R01, Malapert) | Horizons + LOLA | Contraste > 50 puntos; mejor mes oct–feb, peor abr–ago | El Sol cambia de hemisferio lunar con el año de eclipses; bandas anchas porque las estaciones se corren ~19 días por año. |
| Horizonte negativo en cimas, positivo en el fondo de un cráter | LOLA | Malapert y R01 < −1°; Cabeus > 0° | Un punto alto ve por debajo del horizonte matemático. |
| Atlas del mapa de calor (`mapa-calor`) | `LDEM_60S_240M` (MD5) | ± 0,005° (con rasters) | Celdas reproducidas con el mismo algoritmo; la tolerancia es la cuantización del archivo (centésimas). |
| Estaciones y cara visible en el mapa de calor | Horizons + atlas LOLA | Media del polo dic − jun > 5 puntos; Tierra: lado de la cara visible > lado opuesto + 20 puntos | Medido: 33,2 % frente a 21,9 % de luz. |
| Paso adaptativo del mapa de calor | Horizons + atlas LOLA | ≤ 1 punto por celda (2 h frente a 1 h) | Medido: ≤ 0,42 puntos en 30 días. |
| Modos combinados del mapa de calor | Horizons + atlas LOLA | Verano austral > invierno en `both` y `viability` | Medido: 10,1 % frente a 7,6 % y 44,8 % frente a 33,9 %. |
| Interpolación horaria cerca del horizonte (`incertidumbre`) | Horizons | ≤ 0,002° con paso de 2 h y \|elevación\| < 10° | El error lineal crece con el cuadrado del paso: con 1 h es ~4 veces menor (< 0,0003°), despreciable frente al radio del Sol (≈ 0,27°). |

## Pruebas que comparan con datos completos (en `web/tests/`)

| Prueba | Contra | Tolerancia | Medido |
| --- | --- | --- | --- |
| Efemérides en el cálculo (`ephemeris`) | Fixture crudo de ASTRO-01 (serie de R01 trasladada a R04) | < 0,002° | Diferencia de altura y cuantización. |
| Traslado de efemérides a otro punto (`real-points`) | Series Horizons reales de otros sitios | Sol < 0,003°; Tierra < 0,03°; fase < 0,2 % | Sol ≤ 0,0016°, Tierra ≤ 0,025°, fase ≤ 0,12 % (DEC-034). |
| Horizonte LOLA reducido (`real-points`) | Horizonte LOLA de 240 m | Error medio por sitio (ver DEC-034) | R01 0,38°, Malapert 0,19°, Cabeus 0,02°, IM-1 0,77°. |
| Política de visibilidad (`visibility`) | Geometría exacta del disco | 1e-4 | Área del segmento circular; mapa de calor y escenario coinciden celda a celda. |
| Mapa de calor real (`heat-map`) | Traslado de efemérides de CORE-03 en el centro de la celda | ≤ 1 muestra de diferencia | Mismo cálculo por dos caminos. |
| Modos `both` y `viability` (`heat-map`) | Componentes del mismo cálculo y requisitos de DEC-071 | Exacta | `both` ≤ mín(luz, Tierra) y ≥ luz + Tierra − 1; puntos iguales a los de los sitios. |
| Cruces refinados (`crossings`, SCIENCE-02) | Paso de 10 min del mismo escenario | Cada cruce dentro del intervalo de 10 min que lo encierra; bisección hasta 5 s | 46 cruces (7 sitios, 30 días desde 01/01/2027): adelanto medio 4,5 min y máximo 9,7 min respecto de la muestra; ventanas ordenadas y dentro del período; el estado instantáneo cambia en el cruce refinado. |

## Incertidumbre conocida

| Fuente de error | Magnitud | Estado |
| --- | --- | --- |
| Interpolación horaria de Horizons | < 0,0003° cerca del horizonte; hasta ~0,08° cerca del cenit | Medida (arriba). |
| Cuantización de los archivos | 0,001° (ángulos), 0,0001° (radios) | Por diseño (DEC-033, DEC-036). |
| Instante de amaneceres, ocasos, salidas y puestas de la Tierra | Tolerancia de 5 s del refinamiento; la exactitud real la limitan la interpolación horaria y la resolución del horizonte | Por diseño (DEC-048). Los porcentajes siguen con el paso de 10 min. |
| Traslado a puntos propios | Sol ≤ 0,0016°, Tierra ≤ 0,025° | Medida (DEC-034). |
| Distancia Tierra–Luna fija en el traslado | Incluida en el error medido del traslado | Medida en conjunto. |
| Horizonte LOLA reducido (puntos propios) | Error medio 0,02°–0,77° | Medida (DEC-034); se muestra como aproximado. |
| Resolución de LOLA (240 m) | Relieve < ~0,5 km suavizado | No cuantificada: no hay un producto más fino integrado. |
| Marco MOON_ME/DE421 frente a MEAN_ME/DE441 | No evaluada | Pendiente de astronomía (DEC-024). |
| EOP predichos de Horizons después del 13/11/2026 | No evaluada | Pendiente (DEC-024). |
| Visibilidad geométrica de la Tierra frente a un enlace real | No es un presupuesto de enlace | Fuera de alcance (SCIENCE.md). |

## Lo que no se valida

- No hay una prueba automática contra valores publicados de iluminación por sitio. Se hizo una comparación manual con Gläser et al. (2017) el 15/11/2026: ver la sección siguiente.
- Dos valores de los requisitos de viabilidad (DEC-071) son supuestos del equipo, no requisitos publicados: las 24 h de autonomía de las baterías y el 80 % de comunicación directa.

## Revisión de astronomía del 15/11/2026 (DEC-070)

Verificaciones independientes de los puntos de astronomía abiertos en `PENDIENTES.md`, pedidas por Lucio. "Independiente" quiere decir que cada dato se compara con otro producto, otra fuente o una cuenta aparte, no con el mismo código que lo generó. Los scripts fueron exploratorios y no se versionaron; las comparaciones que valen como regresión ya están en `web/tests/validacion/`. Fechas: un año desde el 01/11/2026 o 30 días desde el 01/12/2026, según se indica.

| Punto | Comparación | Resultado | Conclusión |
| --- | --- | --- | --- |
| Orientación de la proyección polar (DEC-025) | Altura del suelo de las 7232 celdas del atlas polar (proyección polar, `LDEM_60S_240M`) contra `LDEM_16` (cilíndrica, otro producto) en el centro de cada celda | Diferencia media 1,1 m, RMS 56 m. Con la X invertida, RMS 2490 m | Orientación correcta |
| Marco de R01 y R23 (DEC-019) | Altura de cada punto contra su entorno en el DEM polar de 480 m (Mean Earth), y contra puntos a 860 m (separación aproximada entre los marcos PA y ME) | R01 supera al 96 % del terreno en 3 km y queda 56 m sobre la media a 860 m: está en la cresta. R23 supera al 64 % y está en la meseta del macizo | Coherente con Mean Earth (el marco sigue sin estar declarado por la fuente) |
| Marco de IM-1 y Chandrayaan-3 (DEC-019) | Valor de PGDA contra NSSDCA, que declara DE421 Mean Earth | 73 m (IM-1; NSSDCA redondea a 0,01°, ±150 m) y 18 m (Chandrayaan-3) | Coherente con Mean Earth: la diferencia entre PA y ME sería de ~860 m |
| Horizonte de Chang'e 4 (DEC-061) | Horizonte de la tabla (`LDEM_128` V3.0) contra el calculado en el punto con `LDEM_16` V3.1 | Diferencia media −0,14°, RMS 0,17°. El máximo de cada azimut está a 50–100 km, el borde de Von Kármán | Validado |
| Borde de banda en −45° (DEC-061) | `LDEM_128` − `LDEM_16` a cada lado de −45° en la ventana de Chang'e 4 | Salto de 0,7 m en el borde frente a 0,4 m lejos de él | Sin artefacto |
| Horizonte de Apollo 11 (DEC-061) | Igual que Chang'e 4 | Diferencia media −0,82°. El horizonte de la tabla sale de puntos a 0,2–0,5 km, en su mayoría píxeles interpolados (74 % de los azimuts), y el suelo del punto queda 13 m por debajo del de `LDEM_16` | **Artefacto cercano**: el horizonte está unos 0,9° alto. Costo estimado: ~0,5 p. p. de luz por año; la Tierra no cambia (siempre alta) |
| Iluminación contra la bibliografía | R01 y sus alrededores (hasta 4,8 km, DEM de 480 m), un año | R01: 59,7 % (240 m). Máximo del entorno: 89,9 %, a 480 m al norte de R01. Gläser et al. (2017) dan 77–88 % de iluminación media en las mejores zonas del polo sur, con el máximo en esta cresta | El modelo reproduce la bibliografía. R01 es el centro de un polígono de la tabla de NASA, no el punto más iluminado |
| Horizonte regional de los puntos propios (DEC-068) | Escenario con el horizonte interpolado del atlas de 2° contra el horizonte exacto del punto con `LDEM_16`, 10 puntos al azar por banda, 30 días | −60° a +60°: luz media 1,1 p. p. (máx. 2,0), Tierra 0. +60° a +75°: luz 2,2 (máx. 6,0), Tierra 2,7 (máx. 23,8). −75° a −60°: luz 3,8 (máx. 9,0), Tierra 14,3 (máx. 100). +75° a +88°: luz 13,9 (máx. 38,6), Tierra 11,3 (máx. 25,5) | **Bueno en latitudes medias; no confiable hacia los polos**, sobre todo para la Tierra cerca del limbo |
| Terreno del informe fuera del polo (DEC-067) | Alturas de la tabla (`LDEM_128`) contra el horizonte de DEC-061 y contra `LDEM_16` | ≤ 1 m y ≤ 13 m. Pendientes medias de 0,3–0,9° en mares y en el fondo de Von Kármán | Validado |
| Mapa de calor global (DEC-065) | Ver DEC-065 y la fila de la proyección polar | Latitudes medias ≤ 0,3 p. p. de luz; empalme en −80° sin sesgo; alturas del atlas polar coherentes con `LDEM_16` | Validado |
| Umbrales de pendiente (DEC-059) | Requisitos de NASA para el HLS de Artemis | Pendiente de aterrizaje < 10° en 100 m (actualización HLS 2024) y tolerancia de inclinación de 8° (informe del Inspector General) | Verde < 5°, dorado 5–10° y rojo ≥ 10° son coherentes. Las pendientes del informe son de escala kilométrica, más suaves que a 100 m |
| Trayectoria (DEC-059) | Δv del modelo contra Apollo 11 | TLI 3,14 km/s (Apollo 11: ~3,18), captura 0,82 km/s (~0,89 con LOI-1) y descenso mínimo 1,63 km/s (el LM gastó ~2,0 km/s con pérdidas por gravedad, que el modelo excluye y lo dice) | Coherente con una transferencia de energía mínima. Órbitas de 185 km y ~100 km y ~1 día en órbita lunar, como en Apollo |
| Rasgos científicos (DEC-029) | Cada rasgo contra su cita; las regiones de Artemis III contra el anuncio de NASA del 28/10/2024 | Las nueve regiones de 2024 incluyen Malapert Massif y no la cresta de Shackleton; el código solo marca Malapert | Validado |
| DE421 contra DE441 al pasar el sitio a Horizons (DEC-024) | Cota del efecto | No se cuantificó la diferencia entre los marcos ME de DE421 y DE441. Aun si fuera de 100 m, la vertical local cambiaría 0,003°, frente a ~0,085° que se mueve el Sol en un paso de 10 min y a la exactitud de las coordenadas (10–115 m) | Aceptable a la escala de la app |
| EOP predichos después del 13/11/2026 (DEC-024) | Razonamiento sobre el modelo | Los parámetros de orientación de la Tierra (EOP) solo orientan el marco fijo a la Tierra. El observador está en la Luna y Horizons da la posición del centro de la Tierra, que no depende de ellos. Un segundo intercalar movería los tiempos 1 s | Sin efecto a la escala de la app |

Fuentes externas consultadas: anuncio de NASA de las regiones de Artemis III (28/10/2024); actualización del HLS de Artemis (NASA, 2024, NTRS 20240009596); Gläser et al. (2017), iluminación de los polos con DTM de LOLA, citado a través de resúmenes (no se leyó el artículo completo); valores de Δv de Apollo 11 de los informes de misión.

