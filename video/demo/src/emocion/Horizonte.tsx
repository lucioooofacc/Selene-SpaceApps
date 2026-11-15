import {Img, staticFile} from 'remotion';

// Horizonte lunar visto de cerca: un arco enorme de la Luna (textura LROC) asomando por abajo.
export const Horizonte = ({t, alto = 300, giro = 1.2}: {t: number; alto?: number; giro?: number}) => {
  const D = 5200;
  const ancho = D * 2;
  const x = -((t * giro * (ancho / 360)) % ancho);
  return (
    <div style={{position: 'absolute', left: 960 - D / 2, top: 1080 - alto, width: D, height: D, borderRadius: '50%', overflow: 'hidden'}}>
      {[0, 1].map((k) => (
        <Img key={k} src={staticFile('img/luna-lroc.jpg')} style={{position: 'absolute', top: 0, left: x + k * ancho, width: ancho, height: D, objectFit: 'cover', filter: 'grayscale(0.4) brightness(0.9)'}} />
      ))}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,214,150,0.22) 0%, rgba(0,0,0,0) 1.5%, rgba(0,0,0,0.55) 5%, rgba(0,0,0,0.9) 9%)'}} />
    </div>
  );
};
