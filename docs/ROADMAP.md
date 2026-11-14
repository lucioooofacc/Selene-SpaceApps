# Plan por etapas (timeline)

Este documento dice **en qué estado está SELENE, qué se está viendo ahora y qué sigue**, para que Lucio (frontend) y Facundo (motor y datos reales) revisen el avance en el mismo lugar. Complementa, sin reemplazarlos, a:

- `docs/TASKS.md`: qué es cada tarea (objetivo, dependencias, criterios).
- Las Issues de GitHub: estado y responsable de cada tarea.
- `PENDIENTES.md`: la lista detallada de lo que falta.
- `docs/DECISIONES.md`: por qué se hizo cada cosa (DEC-xxx).

**Actualizado:** 14/11/2026, noche (día 1 de la hackathon). **Entrega:** domingo 15/11/2026 a las 23:59. Después no se puede modificar nada.
**Sitio publicado:** https://selene-space-apps.vercel.app (se actualiza solo con cada integración a `main`).

Leyenda: ✅ terminado · 🔄 en curso · ⏳ pendiente · ⛔ bloqueado · ➖ descartado u opcional.

---

## Resumen rápido

| Etapa | Qué cubre | Estado | Responsable |
| --- | --- | --- | --- |
| 0 | Base: réplica del Figma, repo y despliegue | ✅ | Equipo |
| 1 | Interfaz completa y pulida | ✅ | Lucio |
| 2 | Datos reales en el motor | ✅ (parte B en revisión) | Facundo |
| 3 | Validación científica | ⏳ | Teo, Facu, Lucio |
| 4 | Visualizaciones con los datos reales | ⏳ / ⛔ | Lucio (con Facundo) |
| 5 | Entrega final | ⏳ | Equipo |

**Hoy estamos entre las etapas 2 y 3:** la interfaz está terminada y publicada. El horizonte real de LOLA ya está en el cálculo (CORE-01 parte A), pero el Sol y la Tierra todavía salen del modelo aproximado.

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

## Etapa 2 — Datos reales en el motor 🔄 (Facundo)

| Paso | Estado | Qué significa |
| --- | --- | --- |
| DATA-01 (#9): coordenadas de sitios con fuente | ✅ | Sitios en MOON_ME/DE421 con procedencia (DEC-019) |
| ASTRO-01 (#6): adaptador JPL Horizons | ✅ | Consulta, caché y validación listas (DEC-024); todavía **no** alimentan el cálculo |
| TERRAIN-01 (#7): producto LOLA polar | ✅ | `LDEM_60S_240M` V2.1 verificado (DEC-025) |
| TERRAIN-02 (#8): horizonte LOLA | ✅ | Horizonte real de los 5 sitios polares (DEC-030) |
| CORE-01 parte A (#11): horizonte LOLA en el cálculo | ✅ (PR #54) | Los resultados de los sitios polares ya usan el relieve real (DEC-032) |
| **CORE-01 parte B (#11): efemérides Horizons en el cálculo** | ✅ en revisión | Series de los 7 sitios, nov 2026–dic 2027, paso 1 h; fuera de ese rango, modelo aproximado; `scenario.ephemeris` informa el origen (DEC-033) |

**Qué estamos viendo:** con el horizonte real, los resultados cambiaron mucho. Shackleton R04 bajó de ~96 % a ~9 % de luz y Cabeus quedó en 0 % (sombra permanente, el control esperado). La coordenada de Shackleton R04 cae en la pared interior del cráter según LOLA: **la tiene que revisar astronomía** (etapa 3) antes de presentar conclusiones sobre ese sitio.

## Etapa 3 — Validación científica ⏳ (Teo, Facu, Lucio)

Lo que hay que confirmar o decidir. El detalle está en `PENDIENTES.md`, en "Datos y astronomía":

1. **Shackleton R04:** ¿la coordenada es la correcta para el borde? (DEC-030, DEC-032). Es lo más urgente, porque cambia el ranking publicado.
2. Marcos de R04/R23, IM-1 y Chandrayaan-3, y orientación de la proyección polar (DEC-019, DEC-025).
3. Altura datum de cada sitio para Horizons y validez de MOON_ME/DE421 frente a MEAN_ME/DE441 (DEC-024).
4. Rasgos de "Interés científico" (DEC-029) y umbrales de viabilidad (DEC-007).
5. TEST-01 (#10): pruebas contra fuentes reales. CORE-02 (#12): un solo criterio de visibilidad.

## Etapa 4 — Visualizaciones con datos reales ⏳ / ⛔ (Lucio, con Facundo)

| Tarea | Estado | Depende de |
| --- | --- | --- |
| UI-01 resto (#13): fuente, fecha y cobertura de efemérides y horizonte; estados de carga y error | ⏳ desbloqueada al integrar la parte B | `scenario.ephemeris` (DEC-033) |
| UI-02 (#15): resolución, huecos y cambios asíncronos | ⏳ | CORE-01, UI-01 |
| MAP-01 (#16): modo de iluminación calculada en el mapa (hoy el horizonte de cada celda es sintético) | ⏳ | CORE-01, CORE-02 |
| I18N-01 (#17): revisión de traducciones ES/EN | ⏳ | Textos finales de UI-01/UI-02 |

## Etapa 5 — Entrega ⏳ (equipo, antes del 15/11 23:59)

DEPLOY-01 (#14):

- [ ] `npm test` y `npm run build` en `main`, más una revisión en escritorio (≥ 1200 px) del sitio publicado, en ES y EN.
- [ ] Textos revisados y avisos de datos aproximados al día (por ejemplo, cuando entre la parte B).
- [ ] Declarar los datos de la NASA usados: JPL Horizons, LOLA (PDS y SVS), LROC (SVS) y las fuentes de los sitios.
- [ ] URL pública en el formulario de Space Apps y commit o tag de entrega registrado.
- [ ] Video (guion: Teo y Martín; edición: Lucio y Facu).

## Opcional (después de lo anterior) ➖

PERF-01 (#18): worker y caché persistente. SCIENCE-02 (#19): cruces temporales más precisos.

---

## Orden sugerido para lo que queda

1. **Ahora:** Facundo cierra CORE-01 parte B. Astronomía revisa Shackleton R04.
2. **Después de la parte B:** Lucio completa UI-01 (fuente y cobertura de las efemérides reales). Se actualizan los avisos de "aproximado".
3. **Domingo a la mañana:** TEST-01 y CORE-02 si llegan; si no, documentar la limitación. Revisión de textos (I18N-01).
4. **Domingo a la tarde:** DEPLOY-01 (checklist de arriba) y video.
5. **Antes de las 23:59:** enviar el formulario. Después de enviarlo, no integrar nada más a `main`.

> Cómo mantener este documento: cuando una tarea cambia de estado, actualizar la fila correspondiente y la línea "Actualizado". El estado oficial sigue estando en las Issues.
