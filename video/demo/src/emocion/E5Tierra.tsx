import {AbsoluteFill, Img, staticFile} from 'remotion';
import {mezcla, resorte, tramo, ventana} from '../anim';
import {useLinea} from '../linea';
import {color, fuente} from '../marca';
import {Horizonte} from './Horizonte';

// 0:22 — La Tierra sale sobre el horizonte lunar (foto Apollo 17, NASA) mientras aparecen los beneficios;
// cierre con el logo y el lema.
export const E5Tierra = ({t}: {t: number}) => {
  const {palabra, CORTES: C, DURACION} = useLinea();
  const op = ventana(t, C.futuro, DURACION + 1, 0.5);
  if (op <= 0) return null;
  const a = C.futuro;
  const sube = tramo(t, a, C.cierre + 0.8, (x) => x);
  const cierre = tramo(t, C.cierre - 0.1, C.cierre + 0.7);
  const beneficio = (texto: string, clave: string) => {
    const s = palabra(clave) - 0.1;
    const p = resorte(t, s, 13);
    const brillo = 1 - tramo(t, s + 0.1, s + 1);
    return (
      <div style={{fontFamily: fuente.titulo, fontWeight: 700, fontSize: 56, color: color.texto, opacity: tramo(t, s, s + 0.25), transform: `translateY(${(1 - p) * 30}px)`, filter: `blur(${(1 - tramo(t, s, s + 0.3)) * 8}px)`, textShadow: `0 0 ${36 * brillo + 8}px rgba(92,198,216,${0.6 * brillo + 0.15})`, textAlign: 'center'}}>
        {texto}
      </div>
    );
  };
  const D = 420;
  return (
    <AbsoluteFill style={{opacity: op}}>
      <div style={{position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center', fontFamily: fuente.titulo, fontStyle: 'italic', fontWeight: 500, fontSize: 40, color: color.oro, opacity: tramo(t, a, a + 0.5) * (1 - cierre)}}>
        What can SELENE do for people, the world, and beyond?
      </div>
      <AbsoluteFill style={{transform: `scale(${mezcla(sube, 1, 1.05)}) translateY(${cierre * 60}px)`, opacity: 1 - cierre * 0.95}}>
        {/* Tierra saliendo */}
        <div style={{position: 'absolute', left: 960 - D / 2, top: mezcla(sube, 900, 360), width: D, height: D, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 120px rgba(92,198,216,${0.25 + 0.3 * sube})`}}>
          {/* En la foto la Tierra ocupa ~2/3 del cuadro: se amplía para que llene el círculo */}
          <Img src={staticFile('ensayo/fotos/tierra.jpg')} style={{width: D * 1.52, height: D * 1.52, marginLeft: -D * 0.26, marginTop: -D * 0.26, objectFit: 'cover'}} />
          <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)'}} />
        </div>
        <Horizonte t={t} alto={260} giro={0.8} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 190, display: 'flex', justifyContent: 'center', gap: 90, opacity: 1 - cierre}}>
          {beneficio('Faster mission planning', 'shortens')}
          {beneficio('New answers to the unknown', 'answers')}
        </div>
      </AbsoluteFill>
      {cierre > 0 && (
        <AbsoluteFill style={{alignItems: 'center', opacity: cierre}}>
          <div style={{position: 'absolute', top: 110, width: 300, height: 300, borderRadius: '50%', overflow: 'hidden', transform: `scale(${resorte(t, C.cierre - 0.1, 12)})`, boxShadow: '0 0 110px rgba(232,173,91,0.35)'}}>
            <Img src={staticFile('img/logo.jpg')} style={{width: 300 / 0.885, height: 300 / 0.885, marginLeft: -(300 / 0.885 - 300) / 2, marginTop: -(300 / 0.885 - 300) / 2}} />
          </div>
          <div style={{position: 'absolute', top: 440, fontFamily: fuente.titulo, fontStyle: 'italic', fontWeight: 800, fontSize: 124, letterSpacing: mezcla(tramo(t, C.cierre, DURACION), 4, 12), color: color.texto, textShadow: '0 0 50px rgba(255,236,200,0.25)'}}>SELENE</div>
          <div style={{position: 'absolute', top: 605, fontFamily: fuente.titulo, fontWeight: 500, fontSize: 40, color: color.texto}}>
            Precision starts with the <span style={{color: color.oro}}>right location.</span>
          </div>
          <div style={{position: 'absolute', top: 690, fontFamily: fuente.mono, fontSize: 22, letterSpacing: 5, color: color.apagado2, opacity: tramo(t, C.cierre + 0.4, C.cierre + 0.9)}}>
            TEAM HUBBLE 27 · NASA SPACE APPS CHALLENGE 2026 · URUGUAY
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
