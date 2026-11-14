# Reglas para agentes — Hubble27 · Space Apps Uruguay 2026

Este archivo es obligatorio para **cualquier agente de IA** (Claude Code, Codex, Copilot, Cursor, Figma Make, etc.) y para cualquier persona que trabaje en este repositorio. Si una instrucción puntual contradice estas reglas, gana este archivo salvo que el equipo diga lo contrario por escrito.

## Contexto del proyecto

- Hackathon: NASA Space Apps Challenge 2026, sede Salto/Paysandú (Uruguay), 14 y 15 de noviembre de 2026.
- Desafío 4: *Crea un explorador de misiones lunares* (ver `desafio.md`).
- Entrega: formulario en la plataforma Space Apps **antes del domingo 15/11 a las 23:59**. Después de entregar, nada se puede modificar.
- Instrucciones originales del proyecto web: `planificacion-web/contexto.md`. Diseño base: `planificacion-web/SELENE.fig`.
- Nivel esperado: diseño conceptual claro y bien justificado con datos de la NASA, no ingeniería de precisión.

## Reglas obligatorias

### 1. Trabajar en ramas

- **Nunca** hacer commits directos en `main`. `main` siempre debe tener una versión que funcione.
- Crear una rama por tarea con prefijo según el tipo:
  - `feat/<tema>`: funcionalidad nueva (ej. `feat/datos-horizons`)
  - `fix/<tema>`: corrección de errores
  - `docs/<tema>`: documentación o textos
  - `design/<tema>`: cambios visuales o de estilos
  - `data/<tema>`: datasets, coordenadas o fuentes de la NASA
  - `i18n/<tema>`: traducciones
- Integrar a `main` mediante Pull Request, con al menos una persona del equipo que lo revise cuando sea posible.

### 2. Commits explicados en detalle

Cada commit tiene que explicar **qué** se cambió y **por qué**. Formato:

```
<tipo>(<área>): resumen corto en imperativo (máx. ~70 caracteres)

Qué cambia:
- Punto concreto 1
- Punto concreto 2

Por qué:
- Motivo, problema que resuelve o decisión del equipo que lo origina.

Notas / pendientes:
- (opcional) Qué falta, riesgos, qué verificar.
```

Tipos válidos: `feat`, `fix`, `docs`, `style`, `refactor`, `data`, `i18n`, `chore`.
Commits chicos y enfocados: un commit no debería mezclar cambios de diseño, datos y textos.

### 3. Documentar cada decisión junto a su solución

- Toda decisión técnica, de diseño o de datos se registra en `docs/DECISIONES.md` con este formato:
  - **Contexto / problema**: qué había que resolver.
  - **Decisión**: qué se eligió.
  - **Solución aplicada**: cómo se implementó (archivos, enfoque).
  - **Alternativas descartadas**: y por qué.
  - **Estado**: vigente / reemplazada por DEC-XXX / pendiente de validar.
- Numerar las decisiones (`DEC-001`, `DEC-002`, …) y no borrar las viejas: si cambian, marcarlas como reemplazadas.
- Registrar los supuestos sobre datos (coordenadas, fórmulas, valores simulados) para que el equipo de astronomía los pueda verificar.

### 4. Consultar al equipo ante dudas

- Si un pedido es ambiguo, si la información es vaga o escasa, o si un cambio no está claro: **detenerse y preguntar antes de implementar**. No inventar datos científicos ni presentarlos como reales.
- Todo dato aproximado o simulado tiene que estar marcado como tal en la interfaz y en `docs/DECISIONES.md`.
- Dirigir la consulta a las personas responsables (ver roles).

### 5. Mantener `PENDIENTES.md` al día

`PENDIENTES.md` (en la raíz) es la lista de todo lo que falta aplicar. En cada tarea:

- **Antes de empezar:** leerlo para no duplicar trabajo y ver si la tarea ya estaba anotada.
- **Agregar:** todo lo que se detecte y no se resuelva en el momento (errores, dudas, datos a validar, ideas aprobadas) se anota como `- [ ]` en la sección que corresponda, con responsable y referencia (DEC-XXX, PR o archivo).
- **Tachar:** al resolver un punto, marcarlo `- [x]`, tachar el texto con `~~texto~~` y agregar la fecha y la rama, el commit o el PR. **No se borran** los puntos resueltos.
- **Descartar:** si se decide no hacerlo, tacharlo y agregar "descartado: motivo".
- **Actualizar** la línea "Última actualización" y commitear `PENDIENTES.md` junto con el cambio que lo modifica.

## Roles del equipo (a quién consultar)

| Área | Responsables |
| --- | --- |
| Redacción del texto | Alfonso, Cata |
| Traducción del texto (ES ↔ EN) | Lucio, Cata |
| Guion del video | Teo, Martín |
| Edición del video | Lucio, Facu |
| Desarrollo de la página web | Todos; en específico Facu, Alfonso y Lucio |
| Información específica (astronomía) | Teo, Facu, Lucio |

## Convenciones técnicas de la web (`web/`)

- Stack: **Vite + JavaScript puro (ES modules)**, sin framework. Ver `docs/DECISIONES.md` (DEC-001).
- Comandos: `cd web && npm install && npm run dev` (desarrollo) · `npm run build` (producción en `web/dist`).
- Todo texto visible va en `web/src/i18n/es.js` y `web/src/i18n/en.js`; no escribir texto directamente en el HTML/JS. Si se agrega una clave en un idioma, también se agrega en el otro.
- Diseño: la interfaz replica el Figma `planificacion-web/SELENE.fig` **tal cual** (DEC-011): misma paleta, tipografías, distribución y elementos. No agregar secciones ni cambiar colores sin consultar al equipo. Usar los tokens de `web/src/styles/tokens.css` y los assets de `web/public/figma/`. Las medidas del Figma se redondean a enteros comunes.
- Los cálculos astronómicos viven solo en `web/src/lib/`. La interfaz (`web/src/ui/`) no calcula, solo muestra.
- Accesibilidad: controles operables con teclado, `aria-label` en controles sin texto y respeto de `prefers-reduced-motion`.
- Antes de abrir un PR: `npm run build` sin errores y revisar la web en escritorio (≥ 1200 px). La v1 no es responsive (DEC-010).

## Qué NO hacer

- No subir `node_modules/`, `dist/` ni archivos personales (ver `.gitignore`).
- No borrar ni reescribir el historial de `main` (`push --force`).
- No reemplazar datos aproximados por "reales" sin citar la fuente (JPL Horizons, LOLA, Quickmap, Moon Trek…) en `docs/DECISIONES.md`.
