import type {ReactNode} from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Antena, Datos, Sol} from '../comp/Iconos';
import {mezcla, resorte, tramo, ventana} from '../anim';
import {useLinea} from '../linea';
import {color, fuente} from '../marca';

// 0:14 — La web real (capturas en inglés de web/, ver scripts/capturas.mjs): mapa de calor Sol + Tierra,
// mejores sitios y comparación detallada. A la derecha, lo que evalúa y las fuentes de la NASA.
const AN = 1360; // ancho del contenido del navegador
const AL = 765;

// Cámara sobre una captura de 16:9: foco (fx, fy) en fracciones de la imagen y zoom.
const Toma = ({src, fx, fy, zoom, op}: {src: string; fx: number; fy: number; zoom: number; op: number}) => {
  const x = AN / 2 - fx * AN * zoom;
  const y = AL / 2 - fy * AL * zoom;
  const lx = Math.min(0, Math.max(AN - AN * zoom, x));
  const ly = Math.min(0, Math.max(AL - AL * zoom, y));
  return <Img src={staticFile(src)} style={{position: 'absolute', left: lx, top: ly, width: AN * zoom, height: AL * zoom, opacity: op}} />;
};

const Tarjeta = ({t, a, icono, titulo, sub, c}: {t: number; a: number; icono: ReactNode; titulo: string; sub: string; c: string}) => {
  const p = resorte(t, a, 13);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 18, background: color.panel, border: `1px solid ${color.borde}`, borderLeft: `3px solid ${c}`, borderRadius: 12, padding: '18px 22px', opacity: tramo(t, a, a + 0.2), transform: `translateX(${(1 - p) * 60}px)`}}>
      <div style={{flex: 'none'}}>{icono}</div>
      <div>
        <div style={{fontFamily: fuente.titulo, fontWeight: 700, fontSize: 30, color: color.texto}}>{titulo}</div>
        <div style={{fontFamily: fuente.mono, fontSize: 17, color: color.apagado2, marginTop: 4}}>{sub}</div>
      </div>
    </div>
  );
};

export const E4Web = ({t}: {t: number}) => {
  const {palabra, CORTES: C} = useLinea();
  const op = ventana(t, C.web, C.futuro);
  if (op <= 0) return null;
  const sunlight = palabra('sunlight');
  const comm = palabra('communication');
  const best = palabra('best');
  const comparing = palabra('comparing');
  const entrada = resorte(t, C.web, 16, 0.9);

  // Tomas: 1) panel completo  2) mapa de calor Sol + Tierra  3) mejores sitios  4) comparación
  const opA = 1 - tramo(t, sunlight - 0.3, sunlight + 0.2);
  const opC = tramo(t, comparing - 0.2, comparing + 0.3);
  const enGlobo = tramo(t, sunlight - 0.2, sunlight + 1.2);
  const aLista = tramo(t, best - 0.15, best + 0.9);
  const fx = mezcla(aLista, mezcla(enGlobo, 0.5, 0.525), 0.155);
  const fy = mezcla(aLista, mezcla(enGlobo, 0.5, 0.52), 0.42);
  const zoom = mezcla(aLista, mezcla(enGlobo, 1.02, 1.7), 1.95);
  // La comparación (captura de página completa) se recorre hacia abajo
  const altoComp = (AN * 4671) / 2880;
  const scroll = mezcla(tramo(t, comparing, C.futuro + 0.3, (x) => x), 0.15, 0.6) * altoComp;

  const url = t < comparing ? 'selene · mission' : 'selene · compare';
  return (
    <AbsoluteFill style={{opacity: op}}>
      <div style={{position: 'absolute', left: 110, top: 46, width: AN, transform: `translateY(${(1 - entrada) * 80}px) scale(${mezcla(entrada, 0.94, 1)})`, transformOrigin: '50% 0%', borderRadius: 16, overflow: 'hidden', border: `1px solid ${color.borde}`, boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(191,167,128,0.08)'}}>
        <div style={{height: 46, background: color.panelSolido, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', borderBottom: `1px solid ${color.borde}`}}>
          {['#c46b6d', '#e8ad5b', '#78b08b'].map((c) => <div key={c} style={{width: 13, height: 13, borderRadius: '50%', background: c, opacity: 0.8}} />)}
          <div style={{marginLeft: 22, flex: 1, maxWidth: 520, height: 28, borderRadius: 8, background: '#0c111a', border: `1px solid ${color.borde}`, fontFamily: fuente.mono, fontSize: 15, color: color.apagado2, display: 'flex', alignItems: 'center', padding: '0 14px'}}>{url}</div>
        </div>
        <div style={{position: 'relative', width: AN, height: AL, overflow: 'hidden', background: color.fondo}}>
          <Toma src="img/mapa-heat.png" fx={0.5} fy={0.5} zoom={mezcla(tramo(t, C.web, sunlight), 1, 1.04)} op={1} />
          <Toma src="img/mapa-sol-tierra.png" fx={fx} fy={fy} zoom={zoom} op={1 - opA} />
          {opC > 0 && <Img src={staticFile('img/comparar-completa.png')} style={{position: 'absolute', left: 0, top: -scroll, width: AN, height: altoComp, opacity: opC}} />}
        </div>
      </div>
      <div style={{position: 'absolute', left: 1510, top: 70, width: 360, display: 'flex', flexDirection: 'column', gap: 18}}>
        <Tarjeta t={t} a={sunlight - 0.1} icono={<Sol c={color.sol} />} titulo="Sunlight" sub="solar energy · hours" c={color.sol} />
        <Tarjeta t={t} a={comm - 0.1} icono={<Antena c={color.tierra} />} titulo="Earth link" sub="direct communication" c={color.tierra} />
        <Tarjeta t={t} a={best - 0.1} icono={<Datos c={color.verde} />} titulo="Best sites" sub="ranked by viability" c={color.verde} />
        <div style={{height: 10}} />
        <div style={{fontFamily: fuente.mono, fontSize: 18, letterSpacing: 4, color: color.oro, opacity: tramo(t, palabra('nasa') - 0.1, palabra('nasa') + 0.2)}}>NASA OPEN DATA</div>
        <Tarjeta t={t} a={palabra('jpl') - 0.1} icono={<Datos c={color.oro} />} titulo="JPL Horizons" sub="Sun & Earth positions" c={color.oro} />
        <Tarjeta t={t} a={palabra('lola') - 0.1} icono={<Datos c={color.oro} />} titulo="LOLA" sub="lunar terrain elevation" c={color.oro} />
      </div>
    </AbsoluteFill>
  );
};
