import {AbsoluteFill} from 'remotion';
import {mezcla, resorte, tramo, ventana} from '../anim';
import {useLinea} from '../linea';
import {color, fuente} from '../marca';
import {Horizonte} from './Horizonte';

// 0:00 — Amanecer sobre el horizonte lunar; los apellidos aparecen con brillo cuando la voz los dice.
const APELLIDOS: [string, string][] = [
  ['Barbato', 'barbato'], ['Duarte', 'duarte'], ['Facchin', 'facchin'],
  ['Peiren', 'peiren'], ['Ligüera', 'liguera'], ['Santana', 'santana'],
];

export const E1Amanecer = ({t}: {t: number}) => {
  const {palabra, CORTES: C} = useLinea();
  const op = ventana(t, 0, C.desafio, 0.6);
  if (op <= 0) return null;
  const team = palabra('team');
  const pTeam = resorte(t, team - 0.05, 12);
  const sol = tramo(t, 0, C.desafio, (x) => x); // el sol sube durante toda la escena
  const salida = tramo(t, C.desafio - 0.35, C.desafio + 0.3);
  const brilloTeam = tramo(t, team, team + 1.4, (x) => x);
  return (
    <AbsoluteFill style={{opacity: op, transform: `scale(${mezcla(tramo(t, 0, C.desafio, (x) => x), 1, 1.07) + salida * 0.08})`, filter: `blur(${salida * 8}px)`}}>
      {/* Sol detrás del horizonte */}
      <div style={{position: 'absolute', left: 1180, top: mezcla(sol, 860, 740), width: 0, height: 0}}>
        <div style={{position: 'absolute', width: 1400, height: 1400, left: -700, top: -700, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,226,170,${0.55 * sol + 0.2}) 0%, rgba(232,173,91,${0.25 * sol + 0.05}) 18%, rgba(0,0,0,0) 55%)`}} />
        <div style={{position: 'absolute', width: 2600, height: 6, left: -1300, top: -3, background: 'linear-gradient(90deg, rgba(255,230,180,0), rgba(255,236,200,0.9), rgba(255,230,180,0))', opacity: 0.35 + 0.5 * sol, filter: 'blur(2px)'}} />
        <div style={{position: 'absolute', width: 90, height: 90, left: -45, top: -45, borderRadius: '50%', background: '#fff6e2', boxShadow: '0 0 60px 30px rgba(255,230,180,0.8)'}} />
      </div>
      <Horizonte t={t} alto={250} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 160}}>
        <div style={{fontFamily: fuente.mono, fontSize: 24, letterSpacing: mezcla(tramo(t, 0, 2.5), 2, 7), color: color.oro, opacity: tramo(t, 0.1, 0.9), marginBottom: 50}}>
          NASA SPACE APPS CHALLENGE 2026 · SALTO / PAYSANDÚ · URUGUAY
        </div>
        <div style={{display: 'flex', gap: 44, transform: `translateY(${mezcla(pTeam, 0, -24)}px) scale(${mezcla(pTeam, 1, 0.84)})`}}>
          {APELLIDOS.map(([nombre, clave]) => {
            const a = palabra(clave) - 0.08;
            const p = resorte(t, a, 15, 0.6);
            const brillo = 1 - tramo(t, a + 0.1, a + 0.9);
            return (
              <div key={nombre} style={{fontFamily: fuente.titulo, fontWeight: 600, fontSize: 70, color: color.texto, opacity: tramo(t, a, a + 0.25), transform: `translateY(${(1 - p) * 36}px) scale(${mezcla(p, 1.15, 1)})`, filter: `blur(${(1 - tramo(t, a, a + 0.3)) * 10}px)`, textShadow: `0 0 ${30 * brillo + 6}px rgba(255,214,150,${0.7 * brillo + 0.15})`}}>
                {nombre}
              </div>
            );
          })}
        </div>
        <div style={{marginTop: 34, position: 'relative', opacity: tramo(t, team - 0.05, team + 0.25), transform: `scale(${mezcla(pTeam, 0.8, 1)})`}}>
          <div style={{fontFamily: fuente.titulo, fontWeight: 800, fontSize: 124, letterSpacing: 2, color: 'transparent', backgroundImage: `linear-gradient(100deg, ${color.oro} 0%, ${color.oro} ${mezcla(brilloTeam, -20, 100) - 12}%, #fff3d6 ${mezcla(brilloTeam, -20, 100)}%, ${color.oro} ${mezcla(brilloTeam, -20, 100) + 12}%, ${color.oro} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', textShadow: '0 0 40px rgba(232,173,91,0.25)'}}>
            Team Hubble 27
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
