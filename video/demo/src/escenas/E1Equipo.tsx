import {AbsoluteFill} from 'remotion';
import {CORTES as C, mezcla, palabra, resorte, tramo, ventana} from '../anim';
import {color, fuente} from '../marca';

// 0:00 — Presentación: los seis apellidos aparecen cuando la voz los dice, después "Team Hubble 27".
const APELLIDOS: [string, string][] = [
  ['Barbato', 'barbato'], ['Duarte', 'duarte'], ['Facchin', 'facchin'],
  ['Peiren', 'peiren'], ['Ligüera', 'liguera'], ['Santana', 'santana'],
];

export const E1Equipo = ({t}: {t: number}) => {
  const op = ventana(t, 0, C.desafio, 0.5);
  if (op <= 0) return null;
  const team = palabra('team');
  const pTeam = resorte(t, team - 0.05);
  const salida = tramo(t, C.desafio - 0.4, C.desafio + 0.3);
  return (
    <AbsoluteFill style={{opacity: op, alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + salida * 0.06})`, filter: `blur(${salida * 6}px)`}}>
      <div style={{fontFamily: fuente.mono, fontSize: 24, letterSpacing: 6, color: color.oro, opacity: tramo(t, 0.05, 0.6), marginBottom: 54, transform: `translateY(${(1 - tramo(t, 0.05, 0.6)) * 12}px)`}}>
        NASA SPACE APPS CHALLENGE 2026 · SALTO / PAYSANDÚ · URUGUAY
      </div>
      <div style={{display: 'flex', gap: 46, transform: `translateY(${mezcla(pTeam, 0, -30)}px) scale(${mezcla(pTeam, 1, 0.82)})`}}>
        {APELLIDOS.map(([nombre, clave]) => {
          const a = palabra(clave) - 0.08;
          const p = resorte(t, a, 15, 0.6);
          return (
            <div key={nombre} style={{fontFamily: fuente.titulo, fontWeight: 600, fontSize: 70, color: color.texto, opacity: tramo(t, a, a + 0.25), transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - tramo(t, a, a + 0.3)) * 8}px)`}}>
              {nombre}
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 36, display: 'flex', alignItems: 'center', gap: 28, opacity: tramo(t, team - 0.05, team + 0.25)}}>
        <div style={{height: 2, width: mezcla(tramo(t, team, team + 0.7), 0, 220), background: color.oro}} />
        <div style={{fontFamily: fuente.titulo, fontWeight: 800, fontSize: 116, color: color.oro, letterSpacing: 2, transform: `scale(${mezcla(pTeam, 0.85, 1)})`}}>
          Team Hubble 27
        </div>
        <div style={{height: 2, width: mezcla(tramo(t, team, team + 0.7), 0, 220), background: color.oro}} />
      </div>
    </AbsoluteFill>
  );
};
