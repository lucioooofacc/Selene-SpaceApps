# Entrega en Space Apps (DEPLOY-01) — borrador

Borrador para cerrar la entrega del **domingo 15/11/2026 antes de las 23:59** ([#14](https://github.com/lucioooofacc/Selene-SpaceApps/issues/14)). Lo preparó el equipo de desarrollo web; **las decisiones marcadas como "Equipo" no están tomadas**. Después de enviar el formulario no se integra nada más a `main`.

## Estado de los criterios de aceptación

| Criterio (docs/TASKS.md) | Estado | Notas |
| --- | --- | --- |
| `npm test` y `npm run build` sin errores | ✅ en `main` al 15/11 (167 pruebas, 2 omitidas sin rasters LOLA) | La CI corre en cada PR. Repetir sobre el commit final. |
| URL pública | ✅ https://selene-space-apps.vercel.app | Vercel publica cada integración a `main`. |
| Revisión en escritorio (≥ 1200 px), ES y EN | ⏳ Equipo | Recorrer misión, comparación, informe impreso, "Datos y fuentes" y las capas del mapa en 2D y 3D. |
| Enlaces, fuentes e idiomas verificados | ⏳ Equipo | Las citas de datos están en `docs/DATA_SOURCES.md` y en el informe. Falta la revisión de traducciones (I18N-01, #17). |
| Commit o tag de entrega registrado | ⏳ Equipo | Propuesta abajo. |

## Texto propuesto para el formulario: datos y recursos de la NASA

> Para pegar en el campo de recursos usados (en inglés). Revisar antes de enviar.

**NASA data and resources used**

- **NASA/JPL Horizons** (Solar System Dynamics, JPL): apparent azimuth, elevation, angular radius and illuminated fraction of the Sun and the Earth as seen from each landing site, hourly from Nov 2026 to Dec 2027 (DE441), queried through the Horizons API on 2026-11-14. Used for all light, power and communication calculations. Citation: NASA/JPL Solar System Dynamics, data retrieved on 2026 Nov 14, https://ssd.jpl.nasa.gov; Giorgini, J. D. and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/.
- **LRO Lunar Orbiter Laser Altimeter (LOLA), NASA PDS**: south polar DEM `LDEM_60S_240M` (240 m/pixel) to compute the real topographic horizon of each polar site and an atlas of horizons for the illumination heat map. Citation: Neumann, G. A. (2011). LRO Moon Laser Altimeter 4 GDR V1.0 [Dataset]. NASA Planetary Data System. https://doi.org/10.17189/1520642.
- **NASA Scientific Visualization Studio, CGI Moon Kit** (LRO LROC WAC color mosaic and LOLA elevation): 2D/3D Moon imagery and the elevation map. https://svs.gsfc.nasa.gov/4720/.
- **Landing site coordinates** from official sources: NASA NSSDCA, NASA NTRS (LCROSS, Lunar Surface Data Book), NASA PGDA, CNSA and USGS Gazetteer of Planetary Nomenclature (listed per site in the app's "Data and sources" panel).

**Other resources**: three.js (3D rendering), Vite (build). No proprietary data.

## Pendientes del equipo antes de enviar

- [ ] Revisión en escritorio y en los dos idiomas (ver tabla).
- [ ] I18N-01 (#17): revisión de traducciones (Lucio, Cata).
- [ ] Revisar las reglas de Space Apps 2026 sobre **declarar el uso de herramientas de IA** y completarlo en el formulario si corresponde (la regla 5 de `AGENTS.md` no elimina esa obligación).
- [ ] Video (guion: Teo y Martín; edición: Lucio y Facu).
- [ ] Decidir el nombre del tag de entrega. Propuesta: `entrega-2026-11-15` sobre el commit de `main` que se publique.

## Pasos de cierre propuestos

1. Integrar el último PR aprobado y esperar la CI verde en `main`.
2. Comprobar que Vercel publicó ese commit (check "Vercel" del commit en GitHub o panel de Vercel).
3. Crear el tag: `git tag -a entrega-2026-11-15 -m "Entrega Space Apps 2026"` y `git push origin entrega-2026-11-15`.
4. Enviar el formulario con la URL pública, el repositorio y el texto de recursos.
5. Anotar en `PENDIENTES.md` y en #14 el hash del tag y la hora de envío. No integrar nada más a `main`.
