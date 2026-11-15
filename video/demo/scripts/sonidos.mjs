// Efectos de sonido cortos (ElevenLabs Sound Effects).
// Uso: node --env-file=<ruta al .env con ELEVENLABS_API_KEY> scripts/sonidos.mjs [nombre…]
import {writeFileSync} from 'node:fs';

const EFECTOS = {
  whoosh: ['soft airy cinematic whoosh transition, clean, no rumble', 1.2],
  impacto: ['deep cinematic boom impact with long shimmering reverb tail, epic logo reveal', 3],
  blip: ['subtle futuristic UI interface blip, soft and clean, single tone', 0.5],
  sello: ['heavy rubber stamp slammed on paper on a wooden desk, single hit', 0.6],
  tipeo: ['fast typing on a laptop keyboard, short burst, clean', 1.6],
  obturador: ['vintage camera shutter click with film advance, single', 0.5],
  riser: ['cinematic tension riser building up, rising whoosh into a hit, no hit at end', 2.2],
  papel: ['quick paper sheet slide swipe, crisp', 0.5],
  destello: ['bright cinematic shimmer flash, magical sparkle burst', 1.5],
};
const pedidos = process.argv.slice(2);
for (const [nombre, [text, duration_seconds]] of Object.entries(EFECTOS)) {
  if (pedidos.length && !pedidos.includes(nombre)) continue;
  let res;
  for (let intento = 1; intento <= 6; intento++) {
    res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({text, duration_seconds, prompt_influence: 0.6}),
    });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 10000 * intento));
  }
  if (!res.ok) { console.log('ERROR', nombre, res.status, (await res.text()).slice(0, 300)); continue; }
  writeFileSync(`public/sfx/${nombre}.mp3`, Buffer.from(await res.arrayBuffer()));
  console.log('ok', nombre);
}
