import {Img, staticFile} from 'remotion';

// Luna girando: textura equirrectangular de LROC (NASA SVS CGI Moon Kit) desplazada dentro de un círculo,
// con sombreado esférico. Es una ilustración, no una proyección exacta.
export const Luna = ({t, diametro, giro = 6, textura = 'img/luna-lroc.jpg', luz = 0.85}: {t: number; diametro: number; giro?: number; textura?: string; luz?: number}) => {
  const ancho = diametro * 2; // 360° de textura = 2 diámetros (se ve un hemisferio)
  const x = -((t * giro * (ancho / 360)) % ancho);
  return (
    <div style={{width: diametro, height: diametro, borderRadius: '50%', overflow: 'hidden', position: 'relative', boxShadow: `0 0 ${diametro * 0.18}px rgba(191,167,128,0.18)`}}>
      {[0, 1].map((k) => (
        <Img key={k} src={staticFile(textura)} style={{position: 'absolute', top: 0, left: x + k * ancho, width: ancho, height: diametro, objectFit: 'cover'}} />
      ))}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, rgba(255,240,215,${0.18 * luz}) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,${0.55 * luz}) 72%, rgba(0,0,0,0.92) 100%)`}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `inset ${-diametro * 0.08}px ${-diametro * 0.05}px ${diametro * 0.12}px rgba(0,0,0,0.85)`}} />
    </div>
  );
};
