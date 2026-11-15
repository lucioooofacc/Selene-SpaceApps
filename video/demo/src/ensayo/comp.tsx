import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Img, random, staticFile} from 'remotion';
import {mezcla, resorte, tramo} from '../anim';
import {E, fE} from './estilo';

// Entrada con desenfoque
export const Desenfoque = ({t, a, children, d = 0.25, style}: {t: number; a: number; children: ReactNode; d?: number; style?: CSSProperties}) => (
  <div style={{...style, opacity: tramo(t, a, a + d), filter: `blur(${(1 - tramo(t, a, a + d)) * 24}px)`}}>{children}</div>
);

// Foto con borde blanco que entra con rebote y rotación, en una posición fija por semilla
export const FotoRafaga = ({t, a, src, i, gris, semilla}: {t: number; a: number; src: string; i: number; gris: boolean; semilla: string}) => {
  if (t < a) return null;
  const R = (k: string) => random(`${semilla}${k}${i}`);
  const lado = i % 2 ? 1 : -1;
  const x = 960 + lado * (120 + R('x') * 520);
  const y = 280 + ((i * 0.381 + R('y') * 0.3) % 1) * 500;
  const w = 420 + R('w') * 200;
  const rot = (R('r') - 0.5) * 22;
  const p = resorte(t, a, 11, 0.5);
  return (
    <Img src={staticFile(`ensayo/fotos/${src}.jpg`)} style={{position: 'absolute', left: x, top: y, width: w, border: '10px solid #fff', boxShadow: '0 22px 60px rgba(0,0,0,0.6)', filter: gris ? 'grayscale(1) contrast(1.15)' : 'saturate(1.1)', transform: `translate(-50%, -50%) rotate(${rot + (1 - p) * lado * 14}deg) scale(${mezcla(p, 1.5, 1)})`, opacity: tramo(t, a, a + 0.06)}} />
  );
};

// Sello rojo con temblor
export const Sello = ({t, a, texto, rot = -8, style}: {t: number; a: number; texto: string; rot?: number; style?: CSSProperties}) => {
  if (t < a) return null;
  const p = resorte(t, a, 10, 0.5);
  const g = Math.max(0, 1 - (t - a) / 0.3) * 10;
  return (
    <div style={{position: 'absolute', ...style, transform: `translate(${Math.sin(t * 90) * g}px, ${Math.cos(t * 70) * g}px) rotate(${rot}deg) scale(${mezcla(p, 1.8, 1)})`, opacity: tramo(t, a, a + 0.05), border: `8px solid ${E.rojo}`, color: E.rojo, padding: '6px 28px', fontFamily: fE.sans, fontWeight: 900, fontSize: 92, letterSpacing: 6, borderRadius: 10, mixBlendMode: 'multiply'}}>
      {texto}
    </div>
  );
};

// Palabra con resaltador que se pasa de izquierda a derecha
export const Resaltado = ({t, a, children, style}: {t: number; a: number; children: ReactNode; style?: CSSProperties}) => (
  <span style={{position: 'relative', display: 'inline-block', ...style}}>
    <span style={{position: 'absolute', left: -12, right: -12, top: '52%', height: '42%', background: E.resaltador, transformOrigin: '0 50%', transform: `scaleX(${tramo(t, a, a + 0.35)}) skewX(-8deg)`, borderRadius: 6}} />
    <span style={{position: 'relative'}}>{children}</span>
  </span>
);

export const Placa = ({fondo, children, style}: {fondo: string; children?: ReactNode; style?: CSSProperties}) => <AbsoluteFill style={{background: fondo, ...style}}>{children}</AbsoluteFill>;
