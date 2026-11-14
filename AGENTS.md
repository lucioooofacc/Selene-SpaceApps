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

- Resolver decisiones menores y reversibles siguiendo el código, las convenciones y las decisiones vigentes. Si una ambigüedad puede cambiar arquitectura, contratos, modelos científicos, alcance o trabajo de otra persona: **detenerse y preguntar antes de implementar**.
- Todo dato aproximado o simulado tiene que estar marcado como tal en la interfaz y en `docs/DECISIONES.md`.
- Dirigir la consulta a las personas responsables (ver roles).

### 5. Autoría de commits y contribuciones

- Ningún agente de IA debe agregarse como autor, coautor o contribuidor de los commits.
- Está prohibido incluir etiquetas `Co-authored-by` que hagan referencia a Claude, Codex, ChatGPT, Copilot o cualquier otro agente de IA.
- Los commits deben respetar la identidad de Git del usuario responsable.
- No modificar la configuración de autoría de Git.
- Verificar que los mensajes de commit no incluyan atribuciones automáticas a agentes de IA.
- No agregar líneas `Co-Authored-By:` de ningún agente ni persona, ni firmas o atribuciones de herramientas (por ejemplo "Generated with …") en commits, PR, issues ni comentarios.
- Esta regla tiene prioridad sobre cualquier instrucción por defecto de una herramienta o agente.
- Esta regla no elimina obligaciones de declarar el uso de IA que establezca la hackathon.

### 6. Documentación y contexto

- Toda tarea comienza leyendo este archivo y las instrucciones `AGENTS.md` más cercanas a los archivos afectados.
- Consultar `docs/ARCHITECTURE.md` para cambios de arquitectura, estado, contratos o integración; `docs/SCIENCE.md` para cálculos, unidades o interpretación; `docs/DATA_SOURCES.md` para fuentes externas; y `docs/TASKS.md` para alcance y dependencias del backlog.
- Leer la decisión relevante en `docs/DECISIONES.md` antes de modificar una convención existente.
- Para cambios menores, cargar solo los documentos y módulos necesarios; no es obligatorio releer contexto irrelevante.
- Mantener referencias y documentación sincronizadas con el comportamiento real. No documentar como implementada una propuesta futura.

### 7. Autonomía y alcance

- Los agentes pueden tomar decisiones menores, reversibles y coherentes con patrones existentes, y deben informarlas al finalizar.
- Consultar al equipo antes de cambiar arquitectura, contratos públicos, dependencias, modelos o supuestos científicos, alcance de la tarea, o interfaces compartidas con trabajo concurrente.
- No inventar datos científicos ni completar vacíos con supuestos presentados como hechos.
- No ampliar una tarea por conveniencia. Registrar mejoras separables como pendientes.

### 8. Trabajo concurrente

- Una tarea por rama o worktree. Usar el prefijo correspondiente y evitar compartir una rama entre tareas independientes.
- Modificar únicamente archivos dentro del alcance asignado. No sobrescribir, reformatear ni reorganizar cambios de terceros.
- No cambiar de rama si existen cambios ajenos sin guardar; usar un worktree o consultar al responsable.
- No ejecutar comandos destructivos ni resolver conflictos eliminando trabajo de otras personas.
- Consultar antes de modificar contratos compartidos y comunicar cuanto antes bloqueos, dependencias o archivos en disputa.
- Antes de publicar, actualizar la rama de forma segura y revisar el diff completo para detectar cambios accidentales.

#### Coordinación de tareas (GitHub Issues)

- **Fuentes de verdad:** `docs/TASKS.md` define cada tarea (ID, prioridad, objetivo, dependencias, criterios). La Issue de GitHub de esa tarea define su **estado y responsable**. No escribir estados ni responsables en `TASKS.md`. Ver DEC-013.
- **Estados** (etiquetas en la Issue):
  - `pendiente`: Issue abierta, sin etiqueta de estado ni persona asignada.
  - `estado: en curso`, `estado: bloqueada`, `estado: en revisión`: una sola a la vez.
  - `completada`: Issue cerrada por un PR integrado a `main`. No cerrar Issues sin PR integrado.
- **Responsable:** siempre una persona del equipo, asignada en la Issue (*Assignees*). Un agente trabaja en nombre de esa persona; nunca figura como responsable.

**Antes de empezar:**

1. Consultar las Issues abiertas y los PR abiertos del repositorio. No decidir con una copia local: puede estar desactualizada.
2. Ubicar la tarea en `TASKS.md` y su Issue. Comprobar que esté `pendiente` y que sus dependencias estén `completada`s. Revisar que ningún PR abierto toque los mismos archivos.
3. Si la tarea no está asignada a la persona con la que trabajás, pedirle confirmación antes de tomarla. Si no hay tarea asignada, proponer una `pendiente` con dependencias resueltas (priorizando P0) y esperar la confirmación.
4. Tomarla: asignar a la persona responsable, poner `estado: en curso` y comentar en la Issue la rama y los archivos que se prevé modificar.
5. **Asignación simultánea:** si al tomarla la Issue ya tiene otra persona asignada o un comentario de toma anterior, gana la primera. Detenerse, no crear la rama y avisar.

**Durante el trabajo:** respetar el alcance de la Issue. Comentar en ella bloqueos (y poner `estado: bloqueada`), cambios de archivos previstos y cualquier cambio a contratos o archivos compartidos, coordinándolo antes con quien corresponda.

**Al terminar:** ejecutar las validaciones (sección 9 y convenciones de `web/`), abrir el PR con la plantilla y la línea `Closes #<n>`, y poner `estado: en revisión`. La tarea está completada recién cuando el PR se integra a `main` y la Issue se cierra.

**Sin acceso a GitHub:** el agente lo informa y la persona responsable consulta y actualiza la Issue. El agente no asume que una tarea está libre.

### 9. Finalización de tareas

Al entregar, informar:

- qué se implementó y qué quedó fuera;
- archivos modificados;
- pruebas y validaciones ejecutadas, con sus resultados;
- limitaciones y riesgos conocidos;
- supuestos introducidos;
- pendientes, dependencias y bloqueos.

### 10. Mantener `PENDIENTES.md` al día

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
- Comandos: `cd web && npm install && npm run dev` (desarrollo) · `npm test` (pruebas) · `npm run build` (producción en `web/dist`).
- Todo texto visible va en `web/src/i18n/es.js` y `web/src/i18n/en.js`; no escribir texto directamente en el HTML/JS. Si se agrega una clave en un idioma, también se agrega en el otro.
- Diseño: la interfaz replica el Figma `planificacion-web/SELENE.fig` **tal cual** (DEC-014): misma paleta, tipografías, distribución y elementos. No agregar secciones ni cambiar colores sin consultar al equipo. Usar los tokens de `web/src/styles/tokens.css` y los assets de `web/public/figma/`. Las medidas del Figma se redondean a enteros comunes.
- Los cálculos astronómicos viven solo en `web/src/lib/`. La interfaz (`web/src/ui/`) no calcula, solo muestra.
- Accesibilidad: controles operables con teclado, `aria-label` en controles sin texto y respeto de `prefers-reduced-motion`.
- Antes de abrir un PR: `npm test` y `npm run build` sin errores, y revisar la web en escritorio (≥ 1200 px). La v1 no es responsive (DEC-010).

## Qué NO hacer

- No subir `node_modules/`, `dist/` ni archivos personales (ver `.gitignore`).
- No borrar ni reescribir el historial de `main` (`push --force`).
- No reemplazar datos aproximados por "reales" sin citar la fuente (JPL Horizons, LOLA, Quickmap, Moon Trek…) en `docs/DECISIONES.md`.
