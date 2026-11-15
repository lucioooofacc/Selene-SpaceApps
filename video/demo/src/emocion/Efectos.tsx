import {AbsoluteFill, random} from 'remotion';
import {golpeDe, mezcla, tramo} from './util';
import {useLinea} from '../linea';

// Capas de emoción por encima de las escenas: franjas de cine que se abren con la revelación,
// destello blanco y chispas en "SELENE", luces cálidas que se mueven, viñeta.
const CHISPAS = Array.from({length: 70}, (_, i) => ({ang: random(`a${i}`) * Math.PI * 2, vel: 300 + random(`v${i}`) * 900, tam: 2 + random(`t${i}`) * 5, dorado: random(`d${i}`) > 0.4}));

export const Efectos = ({t}: {t: number}) => {
  const {palabra, CORTES: C} = useLinea();
  const s = palabra('selene') - 0.12;
  const franja = 130 * (1 - tramo(t, s - 0.1, s + 0.6)) + 70 * tramo(t, C.cierre, C.cierre + 1);
  const flash = golpeDe(t, s + 0.02, 0.7);
  const edad = t - s;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* Luces cálidas (light leaks) */}
      <AbsoluteFill style={{mixBlendMode: 'screen', opacity: 0.32 + 0.25 * golpeDe(t, s, 2.5) + 0.2 * tramo(t, C.futuro, C.cierre)}}>
        <div style={{position: 'absolute', width: 1400, height: 900, left: mezcla(Math.sin(t * 0.35), -500, -200), top: mezcla(Math.cos(t * 0.27), -400, -200), background: 'radial-gradient(ellipse, rgba(232,140,60,0.35) 0%, rgba(0,0,0,0) 60%)'}} />
        <div style={{position: 'absolute', width: 1200, height: 900, right: mezcla(Math.cos(t * 0.31), -500, -250), bottom: mezcla(Math.sin(t * 0.22), -450, -250), background: 'radial-gradient(ellipse, rgba(92,198,216,0.22) 0%, rgba(0,0,0,0) 60%)'}} />
      </AbsoluteFill>
      {/* Chispas */}
      {edad > 0 && edad < 2.2 && (
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          {CHISPAS.map((c, i) => {
            const d = c.vel * (1 - Math.exp(-edad * 2.2));
            return <circle key={i} cx={960 + Math.cos(c.ang) * d} cy={260 + Math.sin(c.ang) * d * 0.8} r={c.tam * (1 - edad / 2.2)} fill={c.dorado ? '#f3c983' : '#ffffff'} opacity={1 - edad / 2.2} />;
          })}
        </svg>
      )}
      <AbsoluteFill style={{background: '#fff8ea', opacity: flash * 0.85}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: franja, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: franja, background: '#000'}} />
    </AbsoluteFill>
  );
};
