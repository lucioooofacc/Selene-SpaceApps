# Hubble27 · Explorador de sitios de alunizaje (SELENE)

Proyecto del equipo **Hubble27** para el **NASA Space Apps Challenge 2026** (sede Salto/Paysandú, Uruguay), desafío 4: *Crea un explorador de misiones lunares*.

Herramienta web para comparar sitios y fechas de alunizaje, con foco en el polo sur lunar. Muestra la posición del Sol y de la Tierra respecto del horizonte local para evaluar la **generación de energía solar** y las **ventanas de comunicación directa con la Tierra**.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `web/` | Aplicación web (Vite + JavaScript) |
| `docs/DECISIONES.md` | Registro de decisiones técnicas, de diseño y de datos |
| `PENDIENTES.md` | Lista viva de lo que falta aplicar (se agrega y se tacha) |
| `AGENTS.md` | Reglas obligatorias para agentes de IA y para el equipo |
| `desafio.md` | Enunciado del desafío de la NASA |
| `planificacion-web/` | Instrucciones del proyecto web y diseño en Figma (`SELENE.fig`) |
| `figma/` | Íconos exportados del diseño |
| `legacy/` | Prototipo anterior (v0), solo como referencia |

## Cómo correr la web

```bash
cd web
npm install
npm run dev      # servidor local en http://localhost:5173
npm run build    # versión de producción en web/dist
```

## Cómo trabajar

Leer `AGENTS.md` antes de empezar: se trabaja en ramas, con commits explicados en detalle, y cada decisión se documenta en `docs/DECISIONES.md`.
