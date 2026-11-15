import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Luna} from '../comp/Luna';
import {CORTES as C, DURACION, mezcla, palabra, resorte, tramo, ventana} from '../anim';
import {color, fuente} from '../marca';

// 0:22 — Mirando al futuro: la pregunta de Space Apps en pantalla (pedido del guion), beneficios y cierre.
export const E5Futuro = ({t}: {t: number}) => {
  const op = ventana(t, C.futuro, DURACION + 1);
  if (op <= 0) return null;
  const a = C.futuro;
  const cierre = tramo(t, C.cierre - 0.1, C.cierre + 0.6);
  const beneficio = (texto: string, clave: string, n = 1) => {
    const s = palabra(clave, n) - 0.1;
    const p = resorte(t, s, 13);
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity: tramo(t, s, s + 0.2), transform: `translateX(${(1 - p) * 50}px)`}}>
        <div style={{width: 14, height: 14, borderRadius: '50%', background: color.sol, boxShadow: `0 0 18px ${color.sol}`}} />
        <div style={{fontFamily: fuente.titulo, fontWeight: 700, fontSize: 60, color: color.texto}}>{texto}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{opacity: op}}>
      {/* Pregunta de Space Apps */}
      <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: fuente.titulo, fontStyle: 'italic', fontWeight: 500, fontSize: 40, color: color.oro, opacity: tramo(t, a, a + 0.4) * (1 - cierre)}}>
        What can SELENE do for people, the world, and beyond?
      </div>
      {/* Luna y beneficios */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - cierre, transform: `scale(${mezcla(cierre, 1, 0.92)})`}}>
        <div style={{position: 'absolute', left: 120, top: 190, transform: `scale(${mezcla(tramo(t, a, a + 6, (x) => x), 0.95, 1.08)})`}}>
          <Luna t={t} diametro={640} giro={10} />
        </div>
        <div style={{position: 'absolute', left: 900, top: 320, display: 'flex', flexDirection: 'column', gap: 50}}>
          {beneficio('Faster mission planning', 'shortens')}
          {beneficio('New answers to the unknown', 'answers')}
        </div>
      </div>
      {/* Cierre */}
      {cierre > 0 && (
        <AbsoluteFill style={{alignItems: 'center', opacity: cierre}}>
          <div style={{position: 'absolute', top: 120, width: 300, height: 300, borderRadius: '50%', overflow: 'hidden', transform: `scale(${resorte(t, C.cierre - 0.1, 13)})`, boxShadow: '0 0 80px rgba(232,173,91,0.22)'}}>
            <Img src={staticFile('img/logo.jpg')} style={{width: 300 / 0.885, height: 300 / 0.885, marginLeft: -(300 / 0.885 - 300) / 2, marginTop: -(300 / 0.885 - 300) / 2}} />
          </div>
          <div style={{position: 'absolute', top: 450, fontFamily: fuente.titulo, fontStyle: 'italic', fontWeight: 800, fontSize: 120, letterSpacing: 5, color: color.texto}}>SELENE</div>
          <div style={{position: 'absolute', top: 610, fontFamily: fuente.titulo, fontWeight: 500, fontSize: 40, color: color.texto}}>
            Precision starts with the <span style={{color: color.oro}}>right location.</span>
          </div>
          <div style={{position: 'absolute', top: 700, fontFamily: fuente.mono, fontSize: 22, letterSpacing: 5, color: color.apagado2, opacity: tramo(t, C.cierre + 0.4, C.cierre + 0.9)}}>
            TEAM HUBBLE 27 · NASA SPACE APPS CHALLENGE 2026 · URUGUAY
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
