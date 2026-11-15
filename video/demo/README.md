# Demo en video de SELENE (Remotion)

Tres versiones de ≤ 30 s para la entrega de Space Apps 2026, todas en inglés, con subtítulos en inglés, voz
generada con IA (ElevenLabs) y apellidos dichos en español. Decisiones: DEC-080 (v1) y DEC-081 (v2 y v3).
Guion base: `../script.md`.

| Composición | Archivo final | Estilo |
| --- | --- | --- |
| `DemoSelene` | `out/selene-demo-final.mp4` | v1 · motion graphic con la estética de la web |
| `DemoEmocion` | `out/selene-demo-emocion.mp4` | v2 · más emoción: voz actuada, música épica, amanecer y salida de la Tierra, destello en la revelación |
| `DemoEnsayo` | `out/selene-demo-ensayo.mp4` | v3 · video-ensayo (serif grande, placas de tinta/papel/rojo, ráfagas de fotos de la NASA, buscador, muro curvo) |

```sh
npm install
npm run studio                                   # vista previa y edición de las tres
npm run render                                   # v1 → out/selene-demo.mp4
npm run render:emocion                           # v2 → out/selene-demo-emocion-crudo.mp4
npm run render:ensayo                            # v3 → out/selene-demo-ensayo-crudo.mp4
# volumen final para YouTube (−14 LUFS), sin recodificar la imagen:
ffmpeg -i <crudo>.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k <final>.mp4
```

Regenerar material (la clave `ELEVENLABS_API_KEY` no se versiona; se pasa con `--env-file`):

```sh
node --env-file=<.env> scripts/voz.mjs [v1|emocion|ensayo]                 # voz + tiempos por palabra
node --env-file=<.env> scripts/voz.mjs [v1|emocion|ensayo] --solo-alinear  # solo empalme, silencios y alineación
node --env-file=<.env> scripts/musica.mjs [v1|emocion|ensayo]              # música (ElevenLabs Music)
node --env-file=<.env> scripts/sonidos.mjs [nombre…]                       # efectos
node scripts/fotos-nasa.mjs                       # fotos de dominio público de images.nasa.gov (v3)
node scripts/capturas.mjs                         # capturas de la web (necesita `cd web && npx vite --port 5179`)
```

- Texto, voz e interpretación de cada versión: `scripts/texto-voz.mjs`. Los apellidos se generan aparte con la
  misma voz (`language_code: "es"`, tildes para marcar el acento: Fachín, Péiren) y se empalman entre "We are" y
  "team Hubble 27". Los subtítulos usan la grafía real.
- Las escenas se enganchan a palabras de la voz (`palabra('sunlight')`). Cada versión tiene su línea de tiempo
  (`crearLinea` en `src/anim.ts`); las escenas compartidas la leen con `useLinea()` (`src/linea.tsx`).
- La duración se calcula desde la voz y nunca pasa de 29,6 s (límite de Space Apps: 30 s).
- Música bajo la voz: en v2 y v3 la voz queda ~18 dB por encima y la música sube en las pausas.
- Fotos de la v3: NASA (dominio público), créditos e IDs en `public/ensayo/fotos/creditos.json`.
- Colores y fuentes: v1 y v2 usan los de `web/src/styles/tokens.css` (`src/marca.ts`); v3 usa el estilo de ensayo
  (`src/ensayo/estilo.ts`).
