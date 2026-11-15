import {AbsoluteFill, Img, staticFile} from 'remotion';
import {mezcla, resorte, tramo, ventana} from '../anim';
import {useLinea} from '../linea';
import {color, fuente} from '../marca';

// 0:10 — Revelación: logo de SELENE, retícula que "fija" el sitio y el lema palabra por palabra.
const LEMA = ['Precision', 'starts', 'with', 'the', 'right', 'location.'];

export const E3Selene = ({t}: {t: number}) => {
  const {palabra, CORTES: C} = useLinea();
  const op = ventana(t, C.selene, C.web);
  if (op <= 0) return null;
  const s = palabra('selene') - 0.12;
  const pLogo = resorte(t, s, 11, 0.9);
  const lock = tramo(t, C.selene, s + 0.1);
  const D = 330;
  const reticula = mezcla(lock, 1.9, 1);
  return (
    <AbsoluteFill style={{opacity: op, alignItems: 'center'}}>
      <div style={{position: 'absolute', top: 50, width: D * 1.6, height: D * 1.6, left: 960 - D * 0.8}}>
        {/* Retícula de puntería */}
        <svg width={D * 1.6} height={D * 1.6} viewBox="-100 -100 200 200" style={{position: 'absolute', transform: `scale(${reticula}) rotate(${(1 - lock) * 90}deg)`, opacity: tramo(t, C.selene, C.selene + 0.3) * (0.4 + 0.6 * lock)}}>
          <circle r="92" fill="none" stroke={color.oro} strokeWidth="0.8" strokeDasharray="3 5" />
          {[0, 90, 180, 270].map((g) => (
            <line key={g} x1="0" y1="-99" x2="0" y2="-80" stroke={color.oro} strokeWidth="1.4" transform={`rotate(${g})`} />
          ))}
        </svg>
        {/* Onda del impacto */}
        <div style={{position: 'absolute', left: '50%', top: '50%', width: D, height: D, marginLeft: -D / 2, marginTop: -D / 2, borderRadius: '50%', border: `2px solid ${color.sol}`, opacity: (1 - tramo(t, s + 0.1, s + 1.1)) * (t > s + 0.1 ? 1 : 0), transform: `scale(${mezcla(tramo(t, s + 0.1, s + 1.1), 1, 1.9)})`}} />
        <div style={{position: 'absolute', left: '50%', top: '50%', width: D, height: D, marginLeft: -D / 2, marginTop: -D / 2, borderRadius: '50%', overflow: 'hidden', transform: `scale(${pLogo}) rotate(${(1 - pLogo) * -25}deg)`, boxShadow: '0 0 80px rgba(232,173,91,0.25)'}}>
          {/* El jpeg tiene fondo blanco: se recorta el círculo azul (≈ 88 % del ancho, centrado) */}
          <Img src={staticFile('img/logo.jpg')} style={{width: D / 0.885, height: D / 0.885, marginLeft: -(D / 0.885 - D) / 2, marginTop: -(D / 0.885 - D) / 2}} />
        </div>
      </div>
      <div style={{position: 'absolute', top: 600, fontFamily: fuente.titulo, fontStyle: 'italic', fontWeight: 800, fontSize: 150, letterSpacing: 6, color: color.texto, opacity: tramo(t, s + 0.15, s + 0.45), transform: `translateY(${(1 - resorte(t, s + 0.15)) * 30}px)`}}>
        SELENE
      </div>
      <div style={{position: 'absolute', top: 790, display: 'flex', gap: 16, fontFamily: fuente.titulo, fontWeight: 500, fontSize: 46}}>
        {LEMA.map((w, i) => {
          const a = palabra(w) - 0.05;
          const dest = i >= 4;
          return (
            <span key={w} style={{color: dest ? color.oro : color.texto, opacity: tramo(t, a, a + 0.2), transform: `translateY(${(1 - tramo(t, a, a + 0.3)) * 14}px)`, display: 'inline-block'}}>
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
