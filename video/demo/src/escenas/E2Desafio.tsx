import {AbsoluteFill} from 'remotion';
import {Luna} from '../comp/Luna';
import {mezcla, resorte, tramo, ventana} from '../anim';
import {useLinea} from '../linea';
import {color, fuente} from '../marca';

// 0:06 — Desafío 4 de Space Apps 2026 y por qué lo elegimos (complejidad e innovación).
export const E2Desafio = ({t}: {t: number}) => {
  const {palabra, CORTES: C} = useLinea();
  const op = ventana(t, C.desafio, C.selene);
  if (op <= 0) return null;
  const a = C.desafio;
  const pNum = resorte(t, palabra('four') - 0.1, 12);
  const chip = (texto: string, clave: string, c: string) => {
    const s = palabra(clave) - 0.05;
    const p = resorte(t, s, 13);
    return (
      <div style={{fontFamily: fuente.titulo, fontWeight: 600, fontSize: 40, color: c, border: `1.5px solid ${c}`, borderRadius: 999, padding: '12px 34px', opacity: tramo(t, s, s + 0.2), transform: `translateY(${(1 - p) * 30}px) scale(${mezcla(p, 0.9, 1)})`, background: 'rgba(9,12,18,0.6)'}}>
        {texto}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{opacity: op}}>
      <div style={{position: 'absolute', right: -260, top: 40, opacity: 0.55 * tramo(t, a, a + 1)}}>
        <Luna t={t} diametro={1000} giro={4} />
      </div>
      <div style={{position: 'absolute', left: 150, top: 200, display: 'flex', alignItems: 'center', gap: 60}}>
        <div style={{fontFamily: fuente.titulo, fontWeight: 800, fontSize: 420, lineHeight: 1, color: 'transparent', WebkitTextStroke: `3px ${color.oro}`, opacity: tramo(t, a, a + 0.4), transform: `scale(${mezcla(pNum, 0.8, 1)})`}}>
          04
        </div>
        <div style={{transform: `translateX(${(1 - tramo(t, a + 0.1, a + 0.7)) * 40}px)`, opacity: tramo(t, a + 0.1, a + 0.6)}}>
          <div style={{fontFamily: fuente.mono, fontSize: 28, letterSpacing: 8, color: color.oro}}>CHALLENGE</div>
          <div style={{fontFamily: fuente.titulo, fontWeight: 700, fontSize: 74, lineHeight: 1.08, color: color.texto, marginTop: 14, maxWidth: 760}}>
            Create a Lunar Mission Explorer
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 170, top: 700, display: 'flex', gap: 26}}>
        {chip('Complexity', 'complexity', color.sol)}
        {chip('Innovation', 'innovation', color.tierra)}
      </div>
    </AbsoluteFill>
  );
};
