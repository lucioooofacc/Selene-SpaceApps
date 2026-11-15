import {Audio} from '@remotion/media';
import {AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, enSilencio, mezcla, tramo} from '../anim';
import {Estrellas} from '../comp/Estrellas';
import {Subtitulos} from '../comp/Subtitulos';
import {E2Desafio} from '../escenas/E2Desafio';
import {E3Selene} from '../escenas/E3Selene';
import {E4Web} from '../escenas/E4Web';
import {LineaCtx} from '../linea';
import {color, fuente} from '../marca';
import {E1Amanecer} from './E1Amanecer';
import {E5Tierra} from './E5Tierra';
import {Efectos} from './Efectos';
import {LINEA_EMOCION as L} from './linea';
import {temblor} from './util';

// Versión 2 · Emoción: misma historia, voz más actuada, música épica, amanecer y salida de la Tierra.
const Sonido = () => {
  const {fps} = useVideoConfig();
  const {palabra, CORTES: C, DURACION, tiempos, finVoz} = L;
  const s = palabra('selene') - 0.12;
  const efectos: [string, number, number][] = [
    ['whoosh', C.desafio - 0.25, 0.35],
    ['riser', s - 2.1, 0.4],
    ['impacto', s, 0.7], ['destello', s, 0.35],
    ['whoosh', C.web - 0.25, 0.35],
    ['blip', palabra('sunlight') - 0.1, 0.22], ['blip', palabra('communication') - 0.1, 0.22], ['blip', palabra('best') - 0.1, 0.22],
    ['blip', palabra('jpl') - 0.1, 0.22], ['blip', palabra('lola') - 0.1, 0.22],
    ['whoosh', C.futuro - 0.25, 0.35],
    ['destello', C.cierre - 0.1, 0.3],
  ];
  const fin = DURACION * fps;
  return (
    <>
      <Audio src={staticFile('emocion/voz.mp3')} />
      <Audio
        src={staticFile('emocion/musica.mp3')}
        volume={(f) => {
          const seg = f / fps;
          // ~0,075 bajo la voz (voz ~18 dB por encima), sube en las pausas y después de la última palabra
          const base = mezcla(enSilencio(tiempos, seg), 0.075, 0.28) * interpolate(seg, [0, 0.8], [0.3, 1], clamp);
          const final = interpolate(seg, [finVoz, finVoz + 0.3], [1, 1.5], clamp);
          return base * final * interpolate(f, [fin - 0.6 * fps, fin], [1, 0], clamp);
        }}
      />
      {efectos.map(([n, seg, vol], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(seg * fps))} name={`sfx ${n}`}>
          <Audio src={staticFile(`sfx/${n}.mp3`)} volume={vol} />
        </Sequence>
      ))}
    </>
  );
};

export const DemoEmocion = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const s = L.palabra('selene') - 0.12;
  const sh = temblor(t, s + 0.02, 16, 0.5);
  // La web entra con una leve inclinación 3D que se endereza
  const inclinacion = mezcla(tramo(t, L.CORTES.web, L.CORTES.web + 1.6), 9, 0) + Math.sin(t * 0.8) * 1.2;
  return (
    <LineaCtx.Provider value={L}>
      <AbsoluteFill style={{background: color.fondo}}>
        <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
          <Estrellas t={t} deriva={1.6} />
          <E1Amanecer t={t} />
          <E2Desafio t={t} />
          <E3Selene t={t} />
          <AbsoluteFill style={{perspective: 1800}}>
            <AbsoluteFill style={{transform: `rotateY(${-inclinacion}deg) rotateX(${inclinacion * 0.3}deg)`, transformOrigin: '40% 50%'}}>
              <E4Web t={t} />
            </AbsoluteFill>
          </AbsoluteFill>
          <E5Tierra t={t} />
        </AbsoluteFill>
        <Efectos t={t} />
        <Subtitulos t={t} />
        <div style={{position: 'absolute', right: 28, bottom: 18, fontFamily: fuente.mono, fontSize: 15, letterSpacing: 2, color: color.apagado2, opacity: 0.85}}>
          AI-GENERATED VOICE · ELEVENLABS
        </div>
        <Sonido />
      </AbsoluteFill>
    </LineaCtx.Provider>
  );
};
