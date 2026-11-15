import {Audio} from '@remotion/media';
import {interpolate, Sequence, staticFile, useVideoConfig} from 'remotion';
import {CORTES as C, DURACION, clamp, finVoz, palabra} from './anim';

// Voz (ElevenLabs), música (ElevenLabs Music) y efectos, enganchados a las mismas palabras que las escenas.
export const Sonido = () => {
  const {fps} = useVideoConfig();
  const efectos: [string, number, number][] = [
    ['whoosh', C.desafio - 0.25, 0.35],
    ['impacto', palabra('selene') - 0.12, 0.55],
    ['whoosh', C.web - 0.25, 0.35],
    ['blip', palabra('sunlight') - 0.1, 0.25], ['blip', palabra('communication') - 0.1, 0.25], ['blip', palabra('best') - 0.1, 0.25],
    ['blip', palabra('jpl') - 0.1, 0.25], ['blip', palabra('lola') - 0.1, 0.25],
    ['whoosh', C.futuro - 0.25, 0.35],
    ['whoosh', C.cierre - 0.3, 0.3],
  ];
  const fin = DURACION * fps;
  return (
    <>
      <Audio src={staticFile('voz/voz.mp3')} />
      <Audio
        src={staticFile('musica/musica.mp3')}
        volume={(f) => {
          const s = f / fps;
          const base = interpolate(s, [0, 0.6], [0, 0.2], clamp) * interpolate(s, [finVoz, finVoz + 0.3], [1, 1.6], clamp);
          return base * interpolate(f, [fin - 0.5 * fps, fin], [1, 0], clamp);
        }}
      />
      {efectos.map(([nombre, s, vol], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s * fps))} name={`sfx ${nombre}`}>
          <Audio src={staticFile(`sfx/${nombre}.mp3`)} volume={vol} />
        </Sequence>
      ))}
    </>
  );
};
