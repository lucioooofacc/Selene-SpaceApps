// Música de fondo (ElevenLabs Music) con secciones que siguen las escenas de cada versión.
// Uso: node --env-file=<ruta al .env con ELEVENLABS_API_KEY> scripts/musica.mjs [v1|emocion|ensayo]
import {mkdirSync, writeFileSync} from 'node:fs';

const sec = (section_name, duration_ms, positive_local_styles, negative_local_styles = []) => ({section_name, duration_ms, positive_local_styles, negative_local_styles, lines: []});

const VERSIONES = {
  v1: {
    salida: 'public/musica/musica.mp3',
    base: ['cinematic space ambient', 'warm analog synth pads', 'soft pulsing arpeggio', 'hopeful and wondrous', 'major key', '96 bpm', 'instrumental'],
    negativos: ['vocals', 'lo-fi', 'dark', 'aggressive', 'distorted'],
    secciones: [
      sec('Equipo', 6000, ['soft evolving pad', 'twinkling high bells', 'gentle start'], ['drums']),
      sec('Desafio', 4500, ['arpeggio enters', 'light anticipation', 'subtle riser']),
      sec('Revelacion', 3500, ['deep impact hit at start', 'wide reverb', 'sense of awe']),
      sec('Demo', 8000, ['steady soft electronic pulse', 'light kick', 'leaves space for a voice', 'focused and modern']),
      sec('Futuro', 5000, ['uplifting string swell', 'building layers', 'inspiring', 'big emotional lift']),
      sec('Cierre', 3000, ['final warm chord', 'clean resolved ending'], ['fade in']),
    ],
  },
  emocion: {
    salida: 'public/emocion/musica.mp3',
    base: ['epic emotional cinematic score', 'hybrid orchestra', 'soaring strings', 'big taiko drums', 'felt piano', 'heroic and moving', 'space exploration', 'major key', '100 bpm', 'instrumental'],
    negativos: ['vocals', 'lo-fi', 'comedy', 'distorted guitars'],
    secciones: [
      sec('Amanecer', 6000, ['solo felt piano', 'soft sustained strings', 'intimate', 'sunrise feeling'], ['drums']),
      sec('Subida', 4000, ['strings rising', 'tension building', 'snare roll crescendo', 'big riser into a hit']),
      sec('Revelacion', 3500, ['massive orchestral impact at start', 'brass and choir pad', 'awe', 'goosebumps']),
      sec('Impulso', 8500, ['driving taiko and staccato strings', 'determined', 'momentum', 'leaves space for a voice']),
      sec('Climax', 5000, ['full orchestra climax', 'soaring melody', 'emotional peak', 'triumphant']),
      sec('Final', 3000, ['final huge chord', 'shimmering resolve', 'clean ending'], ['fade in']),
    ],
  },
  ensayo: {
    salida: 'public/ensayo/musica.mp3',
    base: ['video essay soundtrack', 'melancholic but hopeful', 'felt piano', 'soft lo-fi drums', 'warm tape texture', 'subtle synth bass', '88 bpm', 'instrumental'],
    negativos: ['vocals', 'epic', 'orchestral hits', 'aggressive'],
    secciones: [
      sec('Equipo', 6000, ['lonely felt piano motif', 'vinyl warmth', 'intimate start'], ['drums']),
      sec('Desafio', 4000, ['low tense pulse', 'serious', 'muted'], []),
      sec('Color', 4000, ['warm chords bloom', 'soft kick enters', 'hopeful turn']),
      sec('Explicacion', 8000, ['steady lo-fi groove', 'curious', 'clean', 'leaves space for a voice']),
      sec('Futuro', 5000, ['emotional lift', 'piano melody rises', 'soft strings', 'hopeful']),
      sec('Creditos', 3000, ['gentle final chord', 'resolved ending'], ['fade in']),
    ],
  },
};

const nombre = process.argv[2] ?? 'v1';
const V = VERSIONES[nombre];
if (!V) throw new Error(`Versión desconocida: ${nombre}`);
// Reintenta si el servicio está saturado (429)
let res;
for (let intento = 1; intento <= 8; intento++) {
  res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({composition_plan: {positive_global_styles: V.base, negative_global_styles: V.negativos, sections: V.secciones}}),
  });
  if (res.status !== 429) break;
  console.log(`saturado, reintento ${intento}…`);
  await new Promise((r) => setTimeout(r, 15000 * intento));
}
if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 500)}`);
mkdirSync(V.salida.replace(/\/[^/]+$/, ''), {recursive: true});
writeFileSync(V.salida, Buffer.from(await res.arrayBuffer()));
console.log('ok', nombre);
