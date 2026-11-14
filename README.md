# Hubble27 · Explorador de sitios de alunizaje (SELENE)

Proyecto del equipo **Hubble27** para el **NASA Space Apps Challenge 2026** (sede Salto/Paysandú, Uruguay), desafío 4: *Crea un explorador de misiones lunares*.

**Sitio publicado:** https://selene-space-apps.vercel.app

Herramienta web para comparar sitios y fechas de alunizaje, con foco en el polo sur lunar. Muestra la posición del Sol y de la Tierra respecto del horizonte local para evaluar la **generación de energía solar** y las **ventanas de comunicación directa con la Tierra**.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `web/` | Aplicación web (Vite + JavaScript) |
| `docs/DECISIONES.md` | Registro de decisiones técnicas, de diseño y de datos |
| `docs/ARCHITECTURE.md` | Arquitectura, contratos públicos y evolución prevista |
| `docs/SCIENCE.md` | Convenciones, modelos actuales y limitaciones científicas |
| `docs/DATA_SOURCES.md` | Catálogo y estado de fuentes científicas oficiales |
| `docs/TASKS.md` | Backlog priorizado para la hackathon |
| `docs/ROADMAP.md` | Plan por etapas: estado actual, qué se está viendo y qué sigue |
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
npm test         # pruebas nativas de Node.js
npm run build    # versión de producción en web/dist
```

## Despliegue (Vercel)

El sitio se publica en Vercel desde `main` (cada integración a `main` actualiza el sitio público). Configuración del proyecto:

| Campo | Valor |
| --- | --- |
| Root Directory | `web` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

El build es estático y multipágina (`index.html` y `compare.html`, con rutas relativas). Las texturas de NASA de `web/public/nasa/` se copian tal cual; las de elevación LOLA se regeneran con `node web/scripts/build-lola-maps.mjs /ruta/a/ldem_16.tif` (ver `docs/DATA_SOURCES.md`).

Las pruebas actuales cubren invariantes matemáticas y el comportamiento aproximado/sintético implementado. Las futuras validaciones contra datos NASA deben mantenerse separadas y conservar la procedencia de sus fixtures.

## Cómo trabajar

Leer `AGENTS.md` antes de empezar: se trabaja en ramas o worktrees aislados, con commits explicados en detalle, y cada decisión se documenta en `docs/DECISIONES.md`. `web/src/lib/AGENTS.md` y `web/src/ui/AGENTS.md` agregan reglas específicas para el motor científico y la interfaz.
