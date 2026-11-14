# PR #1 — feat: web v1 de SELENE (explorador de sitios de alunizaje)

- **Rama:** `feat/web-v1` → `main`
- **Creado:** 2026-11-13 (en el repo anterior, migrado a `Selene-SpaceApps`)

## Descripción

## Resumen
Primera versión de la web para el desafío 4 de Space Apps 2026, basada en el diseño `planificacion-web/SELENE.fig`, con medidas redondeadas.

## Qué incluye
- Dashboard: métricas instantáneas (Sol, Tierra, luz y enlace acumulados, próxima puesta del Sol y de la Tierra), mapa de calor calculado del polo sur más una vista global, y panel del sitio con 7 sitios curados, coordenadas libres, fecha UTC, ±1 día lunar y ventana de 1 a 30 días.
- Energía solar, comunicación y viabilidad del escenario (3 criterios, 6 puntos).
- Panorama 360° con el Sol y la Tierra sobre el horizonte, lectura del momento, reproducción temporal y ventanas del ciclo.
- Comparador de hasta 4 escenarios.
- Bilingüe ES/EN y solo para escritorio.

## A revisar por el equipo
- [ ] Astronomía (Teo, Facu, Lucio): coordenadas de los sitios (DEC-006) y modelo aproximado (DEC-004 y DEC-005).
- [ ] Traducción (Lucio, Cata): textos en `web/src/i18n/en.js`.
- [ ] Redacción (Alfonso, Cata): textos en `web/src/i18n/es.js`.
- [ ] Origen y licencia de la imagen global de la Luna del Figma (DEC-008).

## Cómo probar
```bash
cd web && npm install && npm run dev
```

Las decisiones están en `docs/DECISIONES.md` y las reglas en `AGENTS.md`.

## Commits

- chore(web): crear proyecto Vite con JavaScript puro
- feat(modelo): agregar modelo aproximado de Sol, Tierra y horizonte
- feat(web): construir la interfaz v1 de SELENE basada en el Figma
- docs(decisiones): registrar DEC-001 a DEC-010 de la web v1
