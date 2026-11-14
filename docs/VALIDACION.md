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
| Interpolación horaria cerca del horizonte (`incertidumbre`) | Horizons | ≤ 0,002° con paso de 2 h y \|elevación\| < 10° | El error lineal crece con el cuadrado del paso: con 1 h es ~4 veces menor (< 0,0003°), despreciable frente al radio del Sol (≈ 0,27°). |

## Pruebas que comparan con datos completos (en `web/tests/`)

| Prueba | Contra | Tolerancia | Medido |
| --- | --- | --- | --- |
| Efemérides en el cálculo (`ephemeris`) | Fixture crudo de ASTRO-01 (serie de R01 trasladada a R04) | < 0,002° | Diferencia de altura y cuantización. |
| Traslado de efemérides a otro punto (`real-points`) | Series Horizons reales de otros sitios | Sol < 0,003°; Tierra < 0,03°; fase < 0,2 % | Sol ≤ 0,0016°, Tierra ≤ 0,025°, fase ≤ 0,12 % (DEC-034). |
| Horizonte LOLA reducido (`real-points`) | Horizonte LOLA de 240 m | Error medio por sitio (ver DEC-034) | R01 0,38°, Malapert 0,19°, Cabeus 0,02°, IM-1 0,77°. |
| Política de visibilidad (`visibility`) | Geometría exacta del disco | 1e-4 | Área del segmento circular; mapa de calor y escenario coinciden celda a celda. |

## Incertidumbre conocida

| Fuente de error | Magnitud | Estado |
| --- | --- | --- |
| Interpolación horaria de Horizons | < 0,0003° cerca del horizonte; hasta ~0,08° cerca del cenit | Medida (arriba). |
| Cuantización de los archivos | 0,001° (ángulos), 0,0001° (radios) | Por diseño (DEC-033, DEC-036). |
| Traslado a puntos propios | Sol ≤ 0,0016°, Tierra ≤ 0,025° | Medida (DEC-034). |
| Distancia Tierra–Luna fija en el traslado | Incluida en el error medido del traslado | Medida en conjunto. |
| Horizonte LOLA reducido (puntos propios) | Error medio 0,02°–0,77° | Medida (DEC-034); se muestra como aproximado. |
| Resolución de LOLA (240 m) | Relieve < ~0,5 km suavizado | No cuantificada: no hay un producto más fino integrado. |
| Marco MOON_ME/DE421 frente a MEAN_ME/DE441 | No evaluada | Pendiente de astronomía (DEC-024). |
| EOP predichos de Horizons después del 13/11/2026 | No evaluada | Pendiente (DEC-024). |
| Visibilidad geométrica de la Tierra frente a un enlace real | No es un presupuesto de enlace | Fuera de alcance (SCIENCE.md). |

## Lo que no se valida

- No hay valores publicados de iluminación por sitio integrados para comparar (por ejemplo, Mazarico et al. 2011): **no se inventan**. Queda en `PENDIENTES.md`.
- Los umbrales de viabilidad (DEC-007) son un criterio del equipo, no una magnitud física.
