# Instrucciones para el motor científico

Estas reglas complementan `AGENTS.md` en la raíz. Ante conflicto, prevalecen las reglas generales.

## Contexto obligatorio

- Leer `docs/SCIENCE.md` y `docs/ARCHITECTURE.md` antes de cambiar cálculos o contratos.
- Leer `docs/DATA_SOURCES.md` y la decisión relacionada en `docs/DECISIONES.md` cuando se incorporen o evalúen datos externos.
- Consultar solo los módulos y pruebas afectados para cambios menores; no cargar documentación irrelevante.

## Reglas científicas y técnicas

- Mantener las convenciones de latitud/longitud selenográfica, longitud este positiva, azimut desde norte en sentido horario, grados para ángulos, km para terreno y milisegundos Unix UTC para instantes.
- Preservar contratos públicos, unidades y rangos. Consultar al equipo antes de modificarlos.
- No inventar valores, fuentes, resoluciones, coberturas ni resultados de referencia.
- Marcar en código, metadatos, documentación y UI toda aproximación, dato sintético o supuesto.
- Representar datos faltantes, fuera de cobertura o inválidos explícitamente; no convertirlos a cero ni extrapolarlos sin una política acordada.
- Los mismos datos y parámetros deben producir el mismo resultado. Fijar y documentar cualquier semilla o versión de algoritmo.
- Cachear por todas las entradas que afecten el resultado, incluida la versión de fuente/modelo. Definir invalidación y límites.
- No realizar peticiones externas dentro de bucles de muestreo, animación, renderizado o celdas de mapas. Obtener y cachear datos antes del cálculo.
- Separar adquisición, normalización, cálculo y presentación. `src/lib/` no debe manipular el DOM ni depender de `src/ui/`.
- Evitar optimizaciones que cambien resultados sin pruebas y decisión documentada.

## Validación

- Todo cambio de cálculo requiere pruebas matemáticas de casos normales, límites, continuidad, rangos, determinismo y datos faltantes según corresponda.
- Las validaciones contra NASA deben usar fixtures con fuente, consulta/producto, fecha, marco, unidades y tolerancia justificada; separarlas de las pruebas unitarias matemáticas.
- Si una prueba revela un posible error científico, documentar el hallazgo y consultar. No modificar silenciosamente una fórmula para que la prueba pase.
- Ejecutar `npm test` y `npm run build` antes de entregar.

