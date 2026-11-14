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
- Colores de estado (favorable / intermedio / desfavorable): usar los tokens `--green`/`--red` o agregar la variante para daltonismo en `src/styles/settings.css` (`:root[data-palette="cvd"]`). Si una imagen o SVG tiene un color de estado fijo, darle una alternativa en ese modo (DEC-023).
- `three` se importa solo dentro de `moon3d.js` y con `import()` diferido; no importarlo desde otros módulos para no agrandar el bundle inicial (DEC-021).
- Las imágenes derivadas de `public/nasa/` se regeneran con los scripts de `web/scripts/` y se documentan en `docs/DATA_SOURCES.md`; no editarlas a mano.
- Una página nueva necesita su entrada en `vite.config.js` (`build.rollupOptions.input`) y el mismo encabezado, configuración y escalado que las existentes.
- Lo que entra a `main` se publica en https://selene-space-apps.vercel.app: revisar el build de producción (`npm run build` + `npx vite preview`) antes de integrar.

