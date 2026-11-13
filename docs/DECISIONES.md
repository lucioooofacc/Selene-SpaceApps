# Registro de decisiones

Formato y reglas en `AGENTS.md` (sección 3). Las decisiones no se borran: si cambian, se marcan como reemplazadas.

---

## DEC-000 — Organización del repositorio y flujo de trabajo

- **Contexto / problema:** la carpeta del proyecto no era un repositorio git y había un prototipo suelto (`index.html`) en la raíz. Las reglas del equipo piden trabajar en ramas y documentar decisiones.
- **Decisión:** usar el repo `lucioooofacc/Hubble27-SpaceApps` con `main` protegido por convención (solo entra código vía PR desde ramas `feat/`, `fix/`, `docs/`, etc.).
- **Solución aplicada:** `git init`, `AGENTS.md` con las reglas, `CLAUDE.md` que importa `AGENTS.md`, este registro de decisiones y el prototipo anterior movido a `legacy/prototipo-v0.html`. `mensajes.md` (chat interno del equipo) queda fuera del repo mediante `.gitignore`, porque Space Apps exige que el proyecto sea público.
- **Alternativas descartadas:** borrar el prototipo anterior (se pierde referencia); publicar `mensajes.md` (contiene organización interna).
- **Estado:** vigente.
