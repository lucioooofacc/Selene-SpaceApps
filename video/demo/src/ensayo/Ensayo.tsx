import {Audio} from '@remotion/media';
import {AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, enSilencio, mezcla} from '../anim';
import {CADENCIA_FUTURO, CLAVES_APELLIDOS, FOTOS_FUTURO, S1Equipo, S2Desafio, S3Selene, S4Buscador, S4Datos, S4Muro, S5Futuro, S6Creditos, T} from './Escenas';
import {fE} from './estilo';
import {LINEA_ENSAYO as L} from './linea';
import {SubtitulosEnsayo} from './Subtitulos';

// Versión 3 · Ensayo: estilo video-ensayo (como "One minute for change"), horizontal para YouTube.
const Sonido = () => {
  const {fps} = useVideoConfig();
  const {palabra, CORTES: C, DURACION, tiempos, finVoz} = L;
  const efectos: [string, number, number][] = [
    ...CLAVES_APELLIDOS.map((k): [string, number, number] => ['obturador', palabra(k) - 0.06, 0.35]),
    ['sello', T.team, 0.55],
    ['papel', C.desafio - 0.05, 0.5], ['sello', palabra('complexity') - 0.04, 0.6],
    ['impacto', palabra('selene') - 0.1, 0.45],
    ['tipeo', T.buscador + 0.1, 0.35],
    ['whoosh', T.muro - 0.15, 0.35],
    ['blip', palabra('sunlight') - 0.08, 0.25], ['blip', palabra('communication') - 0.08, 0.25], ['blip', palabra('best') - 0.08, 0.25],
    ['papel', T.datos - 0.05, 0.5],
    ...FOTOS_FUTURO.map((_, i): [string, number, number] => ['obturador', C.futuro + 0.15 + i * CADENCIA_FUTURO, 0.2]),
    ['whoosh', C.cierre - 0.2, 0.3],
  ];
  const fin = DURACION * fps;
  return (
    <>
      <Audio src={staticFile('ensayo/voz.mp3')} />
      <Audio
        src={staticFile('ensayo/musica.mp3')}
        volume={(f) => {
          const seg = f / fps;
          // Voz siempre por encima de la música: ~0,045 bajo la voz (~18 dB), sube en las pausas y al final
          const base = mezcla(enSilencio(tiempos, seg), 0.045, 0.2) * interpolate(seg, [0, 0.6], [0.3, 1], clamp);
          const final = interpolate(seg, [finVoz, finVoz + 0.3], [1, 1.6], clamp);
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

export const DemoEnsayo = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <S1Equipo t={t} />
      <S2Desafio t={t} />
      <S3Selene t={t} />
      <S4Buscador t={t} />
      <S4Muro t={t} />
      <S4Datos t={t} />
      <S5Futuro t={t} />
      <S6Creditos t={t} />
      <SubtitulosEnsayo t={t} />
      <div style={{position: 'absolute', right: 26, top: 18, fontFamily: fE.sans, fontWeight: 600, fontSize: 15, letterSpacing: 2, color: 'rgba(128,128,128,0.9)'}}>AI-GENERATED VOICE</div>
      <Sonido />
    </AbsoluteFill>
  );
};
