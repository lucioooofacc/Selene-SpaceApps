# Entrega en Space Apps (DEPLOY-01) — borrador

Borrador para cerrar la entrega del **domingo 15/11/2026 antes de las 23:59** ([#14](https://github.com/lucioooofacc/Selene-SpaceApps/issues/14)). Lo preparó el equipo de desarrollo web; **las decisiones marcadas como "Equipo" no están tomadas**. Después de enviar el formulario no se integra nada más a `main`.

## Estado de los criterios de aceptación

| Criterio (docs/TASKS.md) | Estado | Notas |
| --- | --- | --- |
| `npm test` y `npm run build` sin errores | ✅ sobre `main` `7e08114` (15/11): 226 pruebas, 223 pasan, 0 fallan, 3 omitidas porque no están los rasters LOLA. El build termina sin errores, con un solo aviso de tamaño por el bloque de three.js (736 kB, 187 kB comprimido). | Node 24.18, `npm ci`. Repetir sobre el commit final si entra otro PR. |
| URL pública | ✅ https://selene-space-apps.vercel.app | `/`, `/compare.html` e `/informe.html` responden 200. El check "Vercel" de `7e08114` dice "Deployment has completed". |
| Revisión en escritorio (≥ 1200 px), ES y EN | ✅ 15/11 sobre la URL pública (`main` `4fac79f`), Chrome con 1280 px de ancho | Se recorrió la misión (Global, Mapa de calor con la capa Elevación, Polo Sur, 3D y 2D, Shackleton del 17 al 28/11 con ranking, viabilidad, panorama, línea de tiempo y tarjetas), la comparación (Shackleton y Malapert) y el informe web, en ES y en EN. No hubo errores en la consola ni textos sin traducir. No se probaron la impresión del informe, el panel "Datos y fuentes" ni las otras capas del mapa. |
| Enlaces, fuentes e idiomas verificados | ✅ automático (15/11) · ⏳ lectura humana | Idiomas: `es.js` y `en.js` tienen las mismas 640 claves, ninguna vacía. La revisión de traducciones (I18N-01, #17) está cerrada. Enlaces: se probaron los 42 URL de `web/src`, los HTML, `README.md`, `docs/DATA_SOURCES.md` y este archivo, y todos los reales responden. CNSA es lento pero responde 200. El DOI de Science y la página de JPL bloquean clientes automáticos, pero abren en un navegador. No son enlaces para seguir: `localhost`, la plantilla `doi.org/${product.doi}` y los dominios de Google Fonts. |
| Commit o tag de entrega registrado | ✅ tag `entrega-2026-11-15` | Va sobre el merge del PR que cierra #14, y el hash queda anotado en #14. Si entra otro PR antes de enviar, hay que mover el tag (`git tag -f` y `git push -f origin entrega-2026-11-15`) y repetir las pruebas. |

## Texto propuesto para el formulario: datos y recursos de la NASA

> Para pegar en el campo de recursos usados (en inglés). Revisar antes de enviar.

**NASA data and resources used**

- **NASA/JPL Horizons** (Solar System Dynamics, JPL): apparent azimuth, elevation, angular radius and illuminated fraction of the Sun and the Earth as seen from each landing site, hourly from Nov 2026 to Dec 2027 (DE441), queried through the Horizons API on 2026-11-14. Used for all light, power and communication calculations. Citation: NASA/JPL Solar System Dynamics, data retrieved on 2026 Nov 14, https://ssd.jpl.nasa.gov; Giorgini, J. D. and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/.
- **LRO Lunar Orbiter Laser Altimeter (LOLA), NASA PDS**: south polar DEM `LDEM_60S_240M` (240 m/pixel) to compute the real topographic horizon of each polar site and an atlas of horizons for the illumination heat map. Citation: Neumann, G. A. (2011). LRO Moon Laser Altimeter 4 GDR V1.0 [Dataset]. NASA Planetary Data System. https://doi.org/10.17189/1520642.
- **NASA Scientific Visualization Studio, CGI Moon Kit** (LRO LROC WAC color mosaic and LOLA elevation): 2D/3D Moon imagery and the elevation map. https://svs.gsfc.nasa.gov/4720/.
- **Landing site coordinates** from official sources: NASA NSSDCA, NASA NTRS (LCROSS, Lunar Surface Data Book), NASA PGDA, CNSA and USGS Gazetteer of Planetary Nomenclature (listed per site in the app's "Data and sources" panel).

**Other resources**: three.js (3D rendering), Vite (build). No proprietary data.

**Note on Shackleton (DOC-02)** — para pegar en la descripción del proyecto si el formulario lo permite:

> The app reports ~60 % yearly illumination at Shackleton R01, below the 77–88 % that the literature gives for the best area of this ridge (Gläser et al., 2017). This is not a calculation error: R01 is the center of a polygon in NASA's Lunar Surface Data Book table, not the most illuminated spot. 480 m to the north, the same model gives 89.9 %. The app explains this in the site's provenance.

## Pendientes del equipo antes de enviar

- [x] ~~Revisión en escritorio y en los dos idiomas (ver tabla).~~ Hecha el 15/11/2026 (rama `docs/cierre-deploy-01`).
- [x] ~~I18N-01 (#17): revisión de traducciones (Lucio, Cata).~~ Issue cerrada el 15/11/2026.
- [ ] Revisar las reglas de Space Apps 2026 sobre **declarar el uso de herramientas de IA** y completarlo en el formulario si corresponde (la regla 5 de `AGENTS.md` no elimina esa obligación).
- [ ] Video (guion: Teo y Martín; edición: Lucio y Facu).
- [x] ~~Decidir el nombre del tag de entrega. Propuesta: `entrega-2026-11-15` sobre el commit de `main` que se publique.~~ Se usa `entrega-2026-11-15` (15/11/2026, rama `docs/cierre-deploy-01`).

## Pasos de cierre propuestos

1. Integrar el último PR aprobado y esperar la CI verde en `main`.
2. Comprobar que Vercel publicó ese commit (check "Vercel" del commit en GitHub o panel de Vercel).
3. Crear el tag: `git tag -a entrega-2026-11-15 -m "Entrega Space Apps 2026"` y `git push origin entrega-2026-11-15`.
4. Enviar el formulario con la URL pública, el repositorio y el texto de recursos.
5. Anotar en `PENDIENTES.md` y en #14 el hash del tag y la hora de envío. No integrar nada más a `main`.
