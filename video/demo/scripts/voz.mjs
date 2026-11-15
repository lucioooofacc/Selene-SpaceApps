// Genera la voz en off con ElevenLabs y los tiempos de cada palabra (para subtítulos y animaciones).
// Uso: node --env-file=<ruta al .env con ELEVENLABS_API_KEY> scripts/voz.mjs [v1|emocion|ensayo] [--solo-alinear]
//   1. Toma en inglés (<prefijo>-cruda.mp3) y apellidos en español (<prefijo>-nombres.mp3), misma voz.
//   2. Se cortan "We are", "and" y "team Hubble 27…" de la toma en inglés (alineación forzada) y se
//      intercalan los apellidos en español: We are + Barbato…Ligüera + and + Santana + team Hubble 27…
//   3. Los silencios entre frases se acortan (máx. ~0,2 s + 0,2 s de respiro) y se acelera un poco
//      sin cambiar el tono (`tempo`), para que el video entre en 30 s.
//   4. Alineación final → archivo de tiempos de la versión.
// --solo-alinear repite 2–4 sin volver a generar la voz; --solo-nombres regenera solo los apellidos en español.
// Versiones en scripts/texto-voz.mjs.
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {CORRECCIONES, NOMBRES_ES, SANTANA_ES, TEXTO_FINAL, VERSIONES} from './texto-voz.mjs';

const args = process.argv.slice(2);
const nombre = args.find((a) => !a.startsWith('--')) ?? 'v1';
const V = VERSIONES[nombre];
if (!V) throw new Error(`Versión desconocida: ${nombre}`);
const KEY = process.env.ELEVENLABS_API_KEY;
const CRUDA = `${V.dir}/${V.prefijo}-cruda.mp3`;
const NOMBRES = `${V.dir}/${V.prefijo}-nombres.mp3`;
const SANTANA = `${V.dir}/${V.prefijo}-santana.mp3`;
const SALIDA = `${V.dir}/${V.prefijo}.mp3`;
mkdirSync(V.dir, {recursive: true});
mkdirSync(dirname(V.tiempos), {recursive: true});
const ffmpeg = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);

const tts = async (text, salida, extra) => {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${V.voz}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {'xi-api-key': KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({text, model_id: 'eleven_v4', ...extra}),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  writeFileSync(salida, Buffer.from(await res.arrayBuffer()));
};

const alinear = async (archivo, texto) => {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(archivo)], {type: 'audio/mpeg'}), 'voz.mp3');
  form.append('text', texto);
  const al = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {method: 'POST', headers: {'xi-api-key': KEY}, body: form});
  if (!al.ok) throw new Error(`alineación ${al.status} ${await al.text()}`);
  return (await al.json()).words.filter((w) => w.text.trim());
};

if (!args.includes('--solo-alinear')) {
  if (!args.includes('--solo-nombres')) await tts(V.texto, CRUDA, {voice_settings: {...V.ajustes, speed: V.velocidad}});
  await tts(NOMBRES_ES, NOMBRES, {language_code: 'es', voice_settings: {...V.ajustes, speed: V.velocidadEs}});
  await tts(SANTANA_ES, SANTANA, {language_code: 'es', voice_settings: {...V.ajustes, speed: V.velocidadEs}});
}

// 2. Empalme
const crudas = await alinear(CRUDA, V.texto.replace(/\[[^\]]*\]\s*/g, ''));
const finAre = crudas.find((w) => /^are$/i.test(w.text.trim())).end;
const and = crudas.find((w) => /^and$/i.test(w.text.trim())); // "…Leegwera and Santana"
const inicioTeam = crudas.find((w) => /^team$/i.test(w.text.trim())).start;
const tmp = mkdtempSync(join(tmpdir(), 'voz-'));
ffmpeg('-i', CRUDA, '-t', String(finAre + 0.04), '-ar', '44100', '-ac', '1', join(tmp, 'a.wav'));
// En los apellidos las pausas de las comas se dejan en ~0,12 s; se recortan los silencios de los bordes
const recorte = 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.15:stop_silence=0.12:stop_threshold=-35dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
ffmpeg('-i', NOMBRES, '-af', recorte, '-ar', '44100', '-ac', '1', join(tmp, 'b.wav'));
ffmpeg('-ss', String(and.start - 0.03), '-t', String(and.end - and.start + 0.06), '-i', CRUDA, '-af', 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.02,areverse', '-ar', '44100', '-ac', '1', join(tmp, 'and.wav'));
ffmpeg('-i', SANTANA, '-af', recorte, '-ar', '44100', '-ac', '1', join(tmp, 'santana.wav'));
ffmpeg('-ss', String(Math.max(0, inicioTeam - 0.04)), '-i', CRUDA, '-ar', '44100', '-ac', '1', join(tmp, 'c.wav'));
ffmpeg('-i', join(tmp, 'a.wav'), '-i', join(tmp, 'b.wav'), '-i', join(tmp, 'and.wav'), '-i', join(tmp, 'santana.wav'), '-i', join(tmp, 'c.wav'), '-filter_complex',
  'aevalsrc=0:d=0.10:s=44100[s1];aevalsrc=0:d=0.12:s=44100[s2];aevalsrc=0:d=0.04:s=44100[s3];aevalsrc=0:d=0.22:s=44100[s4];[0][s1][1][s2][2][s3][3][s4][4]concat=n=9:v=0:a=1', join(tmp, 'empalme.wav'));

// 3. Silencios y tempo
ffmpeg('-i', join(tmp, 'empalme.wav'), '-af',
  `silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.3:stop_silence=0.2:stop_threshold=-32dB,atempo=${V.tempo},adelay=150|150`,
  '-c:a', 'libmp3lame', '-b:a', '192k', SALIDA);

// 4. Tiempos de cada palabra
const palabras = (await alinear(SALIDA, TEXTO_FINAL)).map((w) => {
  const texto = w.text.trim();
  const limpia = texto.replace(/[^\p{L}\d]/gu, '');
  return {texto: CORRECCIONES[limpia] ? texto.replace(limpia, CORRECCIONES[limpia]) : texto, desde: w.start, hasta: w.end};
});
writeFileSync(V.tiempos, JSON.stringify(palabras, null, 1));
console.log(`${nombre}: ${palabras.length} palabras, ${palabras.at(-1).hasta.toFixed(2)} s`);
