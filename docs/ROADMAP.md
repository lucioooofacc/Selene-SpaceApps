# Plan por etapas (timeline)

Este documento dice **en qué estado está SELENE, qué se está viendo ahora y qué sigue**, para que Lucio (frontend) y Facundo (motor y datos reales) revisen el avance en el mismo lugar. Complementa, sin reemplazarlos, a:

- `docs/TASKS.md`: qué es cada tarea (objetivo, dependencias, criterios).
- Las Issues de GitHub: estado y responsable de cada tarea.
- `PENDIENTES.md`: la lista detallada de lo que falta.
- `docs/DECISIONES.md`: por qué se hizo cada cosa (DEC-xxx).

**Actualizado:** 14/11/2026, 14:30 (día 1 de la hackathon). **Entrega:** domingo 15/11/2026 a las 23:59. Después no se puede modificar nada.
**Sitio publicado:** https://selene-space-apps.vercel.app (se actualiza solo con cada integración a `main`).

Leyenda: ✅ terminado · 🔄 en curso · ⏳ pendiente · ⛔ bloqueado · ➖ descartado u opcional.

---

## Resumen rápido

| Etapa | Qué cubre | Estado | Responsable |
| --- | --- | --- | --- |
| 0 | Base: réplica del Figma, repo y despliegue | ✅ | Equipo |
| 1 | Interfaz completa y pulida | ✅ | Lucio |
| 2 | Datos reales en el motor | ✅ | Facundo |
| 3 | Validación científica | ⏳ | Teo, Facu, Lucio |
| 4 | Visualizaciones con los datos reales | ⏳ / ⛔ | Lucio (con Facundo) |
| 5 | Entrega final | ⏳ | Equipo |

**Hoy estamos entre las etapas 3 y 4:** la interfaz está terminada y publicada, y el motor ya calcula con datos reales. Sol y Tierra salen de JPL Horizons (nov 2026 – dic 2027) y el horizonte, de LOLA, para los sitios curados y para los puntos elegidos en el mapa (DEC-030 a DEC-035). Falta validar (etapa 3), terminar de mostrar la procedencia (etapa 4) y entregar (etapa 5).

---

## Etapa 0 — Base ✅

- Réplica del Figma (DEC-014 a DEC-017), migración del repo sin coautores (DEC-018), coordinación con Issues (DEC-013).
- Sitio publicado en Vercel desde `main` (DOC-01, #44).

## Etapa 1 — Interfaz completa ✅ (Lucio)

Todo integrado y publicado:

| Tarea | Qué quedó | DEC |
| --- | --- | --- |
| UI-03 a UI-08 (#21–#26) | Ortografía y menú; calendario con teclado; página de comparación; informe imprimible; Luna 3D/2D (three.js + NASA SVS); panorama con relieve fiel | 020, 021 |
| UI-09 (#35) | Alineación y cajas que se desbordaban | 022 |
| UI-10 (#37) | Configuración: idioma, paleta para daltonismo, alto contraste, menos movimiento | 023 |
| UI-11 (#42) | Pestaña ELEVACIÓN con elevación LOLA y vista 3D física | 026 |
| UI-12 (#46) | Selección (sitio y fechas) en la URL | 027 |
| UI-01 parcial (#13) | "Datos y fuentes": procedencia y calidad de cada dato | 028 |
| UI-13 (#49) | Categorías del ranking (Global, Ciencia, Comunicación, Luz) | 029 |
| UI-14 (#52) | Horizonte LOLA en la interfaz (vista previa → en uso) | 031 |
| UI-15 (#57) | Tarjetas con período (MISIÓN / AHORA, VISIBLE / OCULTO) e "Ir a fecha y hora" | 033 |

La sección Diseño de `PENDIENTES.md` quedó cerrada (sin puntos abiertos).

## Etapa 2 — Datos reales en el motor ✅ (Facundo)

| Paso | Estado | Qué significa |
| --- | --- | --- |
| DATA-01 (#9): coordenadas de sitios con fuente | ✅ | Sitios en MOON_ME/DE421 con procedencia (DEC-019) |
| ASTRO-01 (#6): adaptador JPL Horizons | ✅ | Consulta, caché y validación (DEC-024) |
| TERRAIN-01 (#7): producto LOLA polar | ✅ | `LDEM_60S_240M` V2.1 verificado (DEC-025) |
| TERRAIN-02 (#8): horizonte LOLA | ✅ | Horizonte real de los 5 sitios polares (DEC-030) |
| CORE-01 parte A (#11): horizonte LOLA en el cálculo | ✅ (PR #54) | Los resultados de los sitios polares ya usan el relieve real (DEC-032) |
| CORE-01 parte B (#11): efemérides Horizons en el cálculo | ✅ (PR #56) | Series de los 7 sitios, nov 2026–dic 2027, paso 1 h; fuera de ese rango, modelo aproximado; `scenario.ephemeris` informa el origen (DEC-033) |
| CORE-03 (#59): datos reales para puntos del mapa | ✅ (PR #60) | Sol y Tierra de Horizons trasladados a cualquier punto; horizonte LOLA reducido (480/960 m) al sur de −75°, marcado aproximado (DEC-034) |
| DATA-02 (#61): Shackleton R04 → R01 | ✅ (PR #62) | R04 era el centro de un polígono en la pared del cráter; R01 Connecting Ridge (DEC-035) |

**Qué cambió con los datos reales** (media anual, Sol y Tierra de Horizons + horizonte LOLA):

| Sitio | Luz | Comunicación | Comentario |
| --- | --- | --- | --- |
| Shackleton (R01) | 62 % | 46 % | 100 % de luz en el verano austral (nov–ene) |
| Malapert | 43 % | 51 % | Estaciones marcadas: 0–75 % según el mes |
| Cabeus | 0 % | 22 % | Sombra permanente (impacto de LCROSS): el control esperado |
| IM-1 | 39 % | 100 % | |
| Chandrayaan-3 | 47 % | 100 % | |
| Chang'e 4 | 50 % | 0 % | Cara oculta |
| Apollo 11 | 49 % | 100 % | Cara visible |

El modelo aproximado anterior erraba ~2° en la altura del Sol y tenía las estaciones lunares invertidas (DEC-033).

## Etapa 3 — Validación científica ⏳ (Teo, Facu, Lucio)

Lo que hay que confirmar o decidir. El detalle está en `PENDIENTES.md`, en "Datos y astronomía":

1. ~~**Shackleton R04:** ¿la coordenada es la correcta para el borde?~~ Resuelto: R04 era el centro de un polígono; se usa R01 Connecting Ridge (DEC-035, #61).
2. Marcos de R01/R23, IM-1 y Chandrayaan-3, y orientación de la proyección polar (DEC-019, DEC-025).
3. ~~Altura datum de cada sitio para Horizons~~ (suelo LOLA + 2 m, DEC-033) y validez de MOON_ME/DE421 frente a MEAN_ME/DE441 (DEC-024).
4. Rasgos de "Interés científico" (DEC-029) y umbrales de viabilidad (DEC-007).
5. ~~TEST-01 (#10): pruebas contra fuentes reales~~ en revisión: validaciones separadas, controles físicos, tolerancias en `docs/VALIDACION.md` y CI (DEC-037). ~~CORE-02 (#12): un solo criterio de visibilidad~~ hecho: Sol con medio disco, Tierra con cualquier parte, radios de Horizons (DEC-036).
6. Si el horizonte LOLA reducido de los puntos del mapa se muestra como "aproximado" o "real" (DEC-034).

## Etapa 4 — Visualizaciones con datos reales ⏳ / ⛔ (Lucio, con Facundo)

| Tarea | Estado | Depende de |
| --- | --- | --- |
| UI-01 resto (#13): fuente, fecha y cobertura de efemérides y horizonte; estados de carga y error | 🔄 en revisión (rama `feat/calidad-datos-efemerides`, DEC-039) | `scenario.ephemeris` (DEC-033/034) |
| UI-02 (#15): resolución, huecos y cambios asíncronos | ⏳ | CORE-01, UI-01 |
| MAP-01 (#16): modo de iluminación calculada en el mapa | 🔄 motor real en revisión (Facundo, DEC-038); falta el selector en la interfaz (Lucio) | — |
| I18N-01 (#17): revisión de traducciones ES/EN | ⏳ | Textos finales de UI-01/UI-02 |

## Etapa 5 — Entrega ⏳ (equipo, antes del 15/11 23:59)

DEPLOY-01 (#14):

- [ ] `npm test` y `npm run build` en `main`, más una revisión en escritorio (≥ 1200 px) del sitio publicado, en ES y EN.
- [ ] Textos revisados y avisos de datos aproximados al día (el motor ya usa datos reales: revisar textos que todavía digan "aproximado" o "sintético").
- [ ] Declarar los datos de la NASA usados: JPL Horizons, LOLA (PDS y SVS), LROC (SVS) y las fuentes de los sitios.
- [ ] URL pública en el formulario de Space Apps y commit o tag de entrega registrado.
- [ ] Video (guion: Teo y Martín; edición: Lucio y Facu).

## Opcional (después de lo anterior) ➖

PERF-01 (#18): worker y caché persistente. SCIENCE-02 (#19): cruces temporales más precisos.

---

## Orden sugerido para lo que queda

1. ~~**Ahora:** Facundo cierra CORE-01 parte B. Astronomía revisa Shackleton R04.~~ Hecho (DEC-033, DEC-034, DEC-035).
2. **Sábado a la tarde:** Lucio completa UI-01 (fuente, cobertura y estados de carga de las efemérides reales). Facundo hace CORE-02 (criterio único de visibilidad), porque cambia los números que van al video.
3. **Sábado a la noche:** TEST-01 (pasar a pruebas formales las validaciones ya medidas: Cabeus en sombra, cruces con fixtures, errores del DEM reducido y del traslado).
4. **Domingo a la mañana:** revisión de textos (I18N-01) y revisión visual en ES y EN. MAP-01 solo si sobra tiempo; si no, documentar la limitación.
5. **Domingo a la tarde:** DEPLOY-01 (checklist de arriba) y video, con los números de la tabla de la etapa 2.
6. **Antes de las 23:59:** enviar el formulario. Después de enviarlo, no integrar nada más a `main`.

> Cómo mantener este documento: cuando una tarea cambia de estado, actualizar la fila correspondiente y la línea "Actualizado". El estado oficial sigue estando en las Issues.
