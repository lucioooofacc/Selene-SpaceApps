import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Estrellas} from './comp/Estrellas';
import {Subtitulos} from './comp/Subtitulos';
import {E1Equipo} from './escenas/E1Equipo';
import {E2Desafio} from './escenas/E2Desafio';
import {E3Selene} from './escenas/E3Selene';
import {E4Web} from './escenas/E4Web';
import {E5Futuro} from './escenas/E5Futuro';
import {color, fuente} from './marca';
import {Sonido} from './Sonido';

// Demo de SELENE para la entrega de Space Apps 2026 (≤ 30 s, en inglés, con subtítulos).
// Todo usa segundos absolutos de la voz (src/voz-tiempos.json).
export const DemoSelene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: color.fondo}}>
      <Estrellas t={t} />
      <E1Equipo t={t} />
      <E2Desafio t={t} />
      <E3Selene t={t} />
      <E4Web t={t} />
      <E5Futuro t={t} />
      <Subtitulos t={t} />
      <div style={{position: 'absolute', right: 28, bottom: 18, fontFamily: fuente.mono, fontSize: 15, letterSpacing: 2, color: color.apagado2, opacity: 0.85}}>
        AI-GENERATED VOICE · ELEVENLABS
      </div>
      <Sonido />
    </AbsoluteFill>
  );
};
