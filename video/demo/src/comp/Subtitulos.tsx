import {tramo, type Palabra} from '../anim';
import {useLinea} from '../linea';
import {color, fuente} from '../marca';

// Subtítulos en inglés (obligatorios para Space Apps), por frases cortas, con la palabra actual resaltada.
const cache = new WeakMap<Palabra[], Palabra[][]>();
const armarLineas = (tiempos: Palabra[]) => {
  if (cache.has(tiempos)) return cache.get(tiempos)!;
  const lineas: Palabra[][] = [];
  let actual: Palabra[] = [];
  for (const w of tiempos) {
    actual.push(w);
    const fin = /[.:!?]$/.test(w.texto) || (/,$/.test(w.texto) && actual.length >= 3) || actual.length >= 7;
    if (fin) { lineas.push(actual); actual = []; }
  }
  if (actual.length) lineas.push(actual);
  cache.set(tiempos, lineas);
  return lineas;
};

export const Subtitulos = ({t}: {t: number}) => {
  const lineas = armarLineas(useLinea().tiempos);
  const i = lineas.findIndex((l, k) => t >= l[0].desde - 0.12 && (k === lineas.length - 1 || t < lineas[k + 1][0].desde - 0.12));
  if (i < 0) return null;
  const linea = lineas[i];
  const fin = linea[linea.length - 1].hasta;
  const op = tramo(t, linea[0].desde - 0.12, linea[0].desde) * (i === lineas.length - 1 ? 1 - tramo(t, fin + 0.6, fin + 0.9) : 1);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', opacity: op}}>
      <div style={{background: 'rgba(4,6,11,0.78)', border: `1px solid ${color.borde}`, borderRadius: 14, padding: '12px 26px', fontFamily: fuente.cuerpo, fontWeight: 700, fontSize: 42, letterSpacing: 0.2, color: color.texto, maxWidth: 1600, textAlign: 'center'}}>
        {linea.map((w, k) => {
          const dicha = t >= w.desde - 0.03;
          return (
            <span key={k} style={{color: dicha ? (t < w.hasta + 0.05 ? color.sol : color.texto) : 'rgba(241,237,228,0.45)'}}>
              {w.texto}{k < linea.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};
