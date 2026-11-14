# Instrucciones para la interfaz

Estas reglas complementan `AGENTS.md` en la raíz. Ante conflicto, prevalecen las reglas generales.

## Contexto obligatorio

- Leer `docs/ARCHITECTURE.md` para entender el flujo estado → análisis → renderizado.
- Consultar `docs/SCIENCE.md` cuando se presenten métricas, unidades, fuentes o advertencias científicas.
- Para cambios visuales, revisar los componentes afectados, `web/src/styles/tokens.css` y el diseño existente. No cargar documentación científica no relacionada con un ajuste menor.

## Reglas de interfaz

- Mantener el lenguaje visual y la estructura existentes; no rediseñar sin acuerdo del equipo.
- Usar tokens y escalas definidos en `tokens.css`. Mantener Vite + JavaScript puro, sin introducir frameworks o dependencias sin aprobación.
- Todo texto visible debe existir en ES y EN mediante `src/i18n/`; agregar siempre las mismas claves en ambos idiomas.
- Preservar navegación por teclado, foco visible, nombres accesibles y `prefers-reduced-motion`.
- Toda operación asíncrona debe tener estados de carga, error, datos no disponibles y, cuando corresponda, resultado anterior/desactualizado claramente identificado.
- Diferenciar visual y textualmente datos reales, aproximados y sintéticos. No presentar visibilidad terrestre como garantía de comunicación ni potencia relativa como potencia eléctrica.
- La UI muestra resultados del motor; no debe implementar fórmulas, umbrales científicos ni conversiones de referencia.
- Evitar cálculos costosos, red o reconstrucciones completas dentro de animaciones. Respetar el renderizado incremental coordinado por `main.js`.
- Validar en escritorio de al menos 1200 px y revisar ambos idiomas, teclado, estados vacíos y movimiento reducido.

