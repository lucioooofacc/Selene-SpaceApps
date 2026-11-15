import {AbsoluteFill, random} from 'remotion';
import {color} from '../marca';

// Campo de estrellas fijo (semilla) con titileo suave y deriva lenta.
const ESTRELLAS = Array.from({length: 260}, (_, i) => ({
  x: random(`x${i}`) * 100,
  y: random(`y${i}`) * 100,
  r: 0.6 + random(`r${i}`) ** 3 * 2.2,
  fase: random(`f${i}`) * Math.PI * 2,
  vel: 0.6 + random(`v${i}`) * 1.6,
  capa: random(`c${i}`),
}));

export const Estrellas = ({t, deriva = 1}: {t: number; deriva?: number}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 120%, #0b1220 0%, ${color.fondo} 60%)`}}>
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{position: 'absolute'}}>
      {ESTRELLAS.map((e, i) => {
        const x = ((e.x * 19.2 - t * deriva * (4 + e.capa * 14)) % 1920 + 1920) % 1920;
        const brillo = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * e.vel + e.fase));
        return <circle key={i} cx={x} cy={e.y * 10.8} r={e.r} fill={color.texto} opacity={brillo * (0.3 + e.capa * 0.7)} />;
      })}
    </svg>
  </AbsoluteFill>
);
