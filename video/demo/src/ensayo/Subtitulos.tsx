import {mezcla, resorte, type Palabra} from '../anim';
import {E, fE} from './estilo';
import {LINEA_ENSAYO as L} from './linea';
import {T} from './Escenas';

// Subtítulos del ensayo: hasta 3 palabras, serif grande, palabra por palabra, itálica dorada en las clave.
// Se ocultan cuando la pantalla ya muestra ese mismo texto.
const CLAVE = new Set(['hubble', 'selene', 'location', 'sunlight', 'earth', 'horizons', 'lola', 'unknown', 'easier']);
const limpia = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const trozos: Palabra[][] = [];
let actual: Palabra[] = [];
for (const w of L.tiempos) {
  actual.push(w);
  if (actual.length === 3 || /[,.:?]$/.test(w.texto)) { trozos.push(actual); actual = []; }
}
if (actual.length) trozos.push(actual);

const { palabra, CORTES: C } = L;
const ocultos: [number, number][] = [
  [T.team, C.desafio],
  [palabra('selene') - 0.1, C.web],
  [palabra('jpl') - 0.1, C.futuro],
];
// Escenas con fondo claro: subtítulo en tinta
const claros: [number, number][] = [[C.desafio, C.selene], [T.buscador, T.muro], [T.datos, C.futuro]];
const dentro = (t: number, r: [number, number][]) => r.some(([a, b]) => t >= a && t < b);

export const SubtitulosEnsayo = ({t}: {t: number}) => {
  const i = trozos.findIndex((c, k) => t >= c[0].desde - 0.05 && (k === trozos.length - 1 ? t < c[c.length - 1].hasta + 0.8 : t < trozos[k + 1][0].desde - 0.05));
  if (i < 0 || dentro(t, ocultos)) return null;
  const c = trozos[i];
  const p = resorte(t, c[0].desde - 0.05, 18);
  const claro = dentro(t, claros);
  return (
    <div style={{position: 'absolute', left: 80, right: 80, bottom: 70, textAlign: 'center', fontFamily: fE.serif, fontSize: 100, lineHeight: 1, letterSpacing: -1, color: claro ? E.tinta : '#fff', textShadow: claro ? 'none' : '0 4px 30px rgba(0,0,0,0.8)', transform: `translateY(${(1 - p) * 24}px) scale(${mezcla(p, 0.96, 1)})`, opacity: p}}>
      {c.map((w, k) => {
        const dicha = t >= w.desde - 0.03;
        const em = CLAVE.has(limpia(w.texto));
        return (
          <span key={k} style={{opacity: dicha ? 1 : 0.4, fontStyle: em ? 'italic' : 'normal', color: em && dicha ? (claro ? E.rojo : E.oro) : undefined, marginRight: 26, display: 'inline-block'}}>
            {w.texto}
          </span>
        );
      })}
    </div>
  );
};
