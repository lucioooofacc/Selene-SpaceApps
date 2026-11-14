# PR #2 — design: replicar el Figma SELENE tal cual

- **Rama:** `design/figma-exacto` → `feat/web-v1`
- **Creado:** 2026-11-14 (en el repo anterior, migrado a `Selene-SpaceApps`)

## Descripción

## Resumen
Rehace la interfaz para replicar exactamente los frames **Vista 6** (encabezado) y **Vista 1** (cuerpo) de `planificacion-web/SELENE.fig`, con la paleta, las tipografías, los íconos y la distribución del archivo. Las medidas se redondearon a enteros comunes. Se quitaron las secciones que no estaban en el diseño.

Base: `feat/web-v1` (PR #1), para que se vea solo el cambio de diseño.

## Qué incluye
- Encabezado: logo, SELENE y menú Mision | Comparar | Opcion 3–5. El globo cambia el idioma ES/EN.
- Mejores lugares para alunizar: ranking de los 5 mejores sitios.
- Mapa con pestañas GLOBAL / MAPA DE CALOR / POLO SUR, marcadores, punto observado y botón "+".
- Parámetros de la misión con calendario de rango y las 4 tarjetas VIABLE/INVIABLE.
- Sección "Comportamiento de los cuerpos celestes" con panorama, línea de tiempo, energía, comunicación y lectura del momento.

## A definir por el equipo
- [ ] Destino de "Ver comparacion detallada", "Comparar" y "Opcion 3/4/5" (el diseño no define esas pantallas).
- [ ] ¿Se corrigen los textos del Figma ("Parametros", "Duracion", "Disponilidad", "comparacion")?
- [ ] Astronomía: confirmar qué latitud cubren las imágenes polares (supuesto: −60°, DEC-013).

Detalle en `docs/DECISIONES.md` (DEC-011 a DEC-014).

## Commits

- design(assets): agregar íconos, marcadores e imágenes exportados del …
- design(web): replicar el diseño del Figma tal cual
- docs(decisiones): registrar DEC-011 a DEC-014 de la réplica del Figma
- fix(web): corregir íconos deformados, tarjetas rotas y etiquetas del …
- docs(pendientes): crear PENDIENTES.md y la regla para mantenerlo
