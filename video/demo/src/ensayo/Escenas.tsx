import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Antena, Sol} from '../comp/Iconos';
import {mezcla, resorte, tramo} from '../anim';
import {Desenfoque, FotoRafaga, Placa, Resaltado, Sello} from './comp';
import {E, fE} from './estilo';
import {LINEA_ENSAYO as L} from './linea';

const {palabra, CORTES: C, DURACION} = L;
export const FOTOS_EQUIPO = ['aldrin', 'artemis', 'control', 'huella', 'earthrise', 'polo'];
export const CLAVES_APELLIDOS = ['barbato', 'duarte', 'facchin', 'peiren', 'liguera', 'santana'];
export const FOTOS_FUTURO = ['artemis', 'orion', 'earthrise', 'tierra', 'aldrin', 'huella', 'polo', 'control'];
export const CADENCIA_FUTURO = 0.42;

// Tramos de cada escena
export const T = {
  team: palabra('team') - 0.06,
  buscador: C.web,
  muro: palabra('sunlight') - 0.2,
  datos: palabra('nasa') - 0.15,
};

// 1 · Equipo: una foto de archivo de la NASA (blanco y negro) por cada apellido; "Team Hubble 27" en placa roja.
export const S1Equipo = ({t}: {t: number}) => {
  if (t > C.desafio + 0.05) return null;
  const empuje = mezcla(tramo(t, 0, T.team, (x) => x), 1, 1.06);
  return (
    <AbsoluteFill>
      <Placa fondo={E.tinta} />
      <AbsoluteFill style={{transform: `scale(${empuje})`}}>
        {FOTOS_EQUIPO.map((f, i) => <FotoRafaga key={f} t={t} a={palabra(CLAVES_APELLIDOS[i]) - 0.06} src={f} i={i} gris semilla="eq" />)}
      </AbsoluteFill>
      <Desenfoque t={t} a={0.05} style={{position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: E.tinta, padding: '10px 22px', fontFamily: fE.sans, fontWeight: 700, fontSize: 24, letterSpacing: 6, color: '#fff'}}>NASA SPACE APPS CHALLENGE 2026 · SALTO / PAYSANDÚ · URUGUAY</div>
      </Desenfoque>
      <AbsoluteFill style={{background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.85))'}} />
      {t >= T.team && (
        <Placa fondo={E.rojo} style={{alignItems: 'center', justifyContent: 'center', opacity: tramo(t, T.team, T.team + 0.08), transform: `scale(${mezcla(resorte(t, T.team, 14), 1.12, 1)})`}}>
          <div style={{fontFamily: fE.sans, fontWeight: 900, fontSize: 46, letterSpacing: 18, color: '#fff'}}>TEAM</div>
          <div style={{fontFamily: fE.serif, fontSize: 330, lineHeight: 0.95, color: '#fff', letterSpacing: -6}}>
            Hubble <span style={{fontStyle: 'italic', color: E.oro}}>27</span>
          </div>
        </Placa>
      )}
    </AbsoluteFill>
  );
};

// 2 · Desafío en placa de papel, con sello rojo en "complexity" y resaltador en "innovation".
export const S2Desafio = ({t}: {t: number}) => {
  if (t < C.desafio - 0.05 || t > C.selene + 0.05) return null;
  const a = C.desafio;
  return (
    <Placa fondo={E.papel}>
      <Desenfoque t={t} a={a} style={{position: 'absolute', left: 150, top: 150, fontFamily: fE.sans, fontWeight: 800, fontSize: 28, letterSpacing: 8, color: E.rojo}}>NASA SPACE APPS 2026</Desenfoque>
      <Desenfoque t={t} a={a + 0.05} style={{position: 'absolute', left: 140, top: 200, fontFamily: fE.serif, fontSize: 250, lineHeight: 1, color: E.tinta, letterSpacing: -6}}>
        Challenge <span style={{fontStyle: 'italic'}}>04</span>
      </Desenfoque>
      <Desenfoque t={t} a={a + 0.3} style={{position: 'absolute', left: 156, top: 470, fontFamily: fE.sans, fontWeight: 600, fontSize: 52, color: E.tinta}}>
        Create a Lunar Mission Explorer
      </Desenfoque>
      <Sello t={t} a={palabra('complexity') - 0.04} texto="COMPLEX" style={{left: 1150, top: 520}} rot={-9} />
      {t >= palabra('innovation') - 0.1 && (
        <Desenfoque t={t} a={palabra('innovation') - 0.1} style={{position: 'absolute', left: 156, top: 590, fontFamily: fE.serif, fontStyle: 'italic', fontSize: 120, color: E.tinta}}>
          <Resaltado t={t} a={palabra('innovation')}>innovation</Resaltado>
        </Desenfoque>
      )}
    </Placa>
  );
};

// 3 · SELENE: foto de Orion junto a la Luna (Artemis I) en blanco y negro; el color vuelve con el nombre.
export const S3Selene = ({t}: {t: number}) => {
  if (t < C.selene - 0.05 || t > C.web + 0.05) return null;
  const s = palabra('selene') - 0.1;
  const color = tramo(t, s, s + 0.7);
  const plato = tramo(t, s + 0.05, s + 0.5);
  const D = 300;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Img src={staticFile('ensayo/fotos/orion.jpg')} style={{position: 'absolute', width: 1920, height: 1440, top: -180, objectFit: 'cover', filter: `grayscale(${1 - color}) contrast(${mezcla(color, 1.2, 1)})`, transform: `scale(${mezcla(tramo(t, C.selene, C.web, (x) => x), 1.02, 1.14)})`}} />
      <AbsoluteFill style={{background: `rgba(0,0,0,${0.15 + 0.55 * plato})`}} />
      {t >= s && (
        <AbsoluteFill style={{alignItems: 'center'}}>
          <Desenfoque t={t} a={s} style={{position: 'absolute', top: 70}}>
            <div style={{width: D, height: D, borderRadius: '50%', overflow: 'hidden', border: '8px solid #fff', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', transform: `scale(${mezcla(resorte(t, s, 11), 0.6, 1)})`}}>
              <Img src={staticFile('img/logo.jpg')} style={{width: D / 0.885, height: D / 0.885, marginLeft: -(D / 0.885 - D) / 2, marginTop: -(D / 0.885 - D) / 2}} />
            </div>
          </Desenfoque>
          <Desenfoque t={t} a={s + 0.12} style={{position: 'absolute', top: 400, fontFamily: fE.serif, fontSize: 230, lineHeight: 1, color: '#fff', letterSpacing: 4}}>SELENE</Desenfoque>
          <div style={{position: 'absolute', top: 650, display: 'flex', gap: 22, fontFamily: fE.serif, fontSize: 84, color: '#fff'}}>
            {['Precision', 'starts', 'with', 'the', 'right', 'location.'].map((w, i) => {
              const a = palabra(w) - 0.05;
              const em = i >= 4;
              return <span key={w} style={{fontStyle: em ? 'italic' : 'normal', color: em ? E.oro : '#fff', opacity: tramo(t, a, a + 0.15), filter: `blur(${(1 - tramo(t, a, a + 0.2)) * 14}px)`}}>{w}</span>;
            })}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// 4a · Buscador que se tipea (interfaz limpia sobre blanco)
const PREGUNTA = 'where should we land on the Moon?';
export const S4Buscador = ({t}: {t: number}) => {
  if (t < T.buscador - 0.05 || t > T.muro + 0.05) return null;
  const a = T.buscador;
  const n = Math.round(PREGUNTA.length * tramo(t, a + 0.1, T.muro - 0.15, (x) => x));
  const p = resorte(t, a, 15);
  return (
    <Placa fondo="#ffffff" style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 1180, height: 120, borderRadius: 60, background: '#fff', boxShadow: '0 20px 70px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 28, padding: '0 44px', transform: `translateY(${(1 - p) * 40}px) scale(${mezcla(p, 0.95, 1)})`, opacity: tramo(t, a, a + 0.15), marginBottom: 160}}>
        <div style={{width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flex: 'none'}}>
          <Img src={staticFile('img/logo.jpg')} style={{width: 64 / 0.885, height: 64 / 0.885, marginLeft: -(64 / 0.885 - 64) / 2, marginTop: -(64 / 0.885 - 64) / 2}} />
        </div>
        <div style={{fontFamily: fE.sans, fontWeight: 500, fontSize: 50, color: E.tinta}}>
          {PREGUNTA.slice(0, n)}<span style={{opacity: Math.floor(t * 4) % 2 ? 1 : 0, color: E.rojo}}>|</span>
        </div>
      </div>
    </Placa>
  );
};

// 4b · Muro curvo con capturas reales de la web; tarjetas con datos reales de Shackleton (14–27/11/2026).
const Tarjeta = ({t, a, icono, titulo, valor, style}: {t: number; a: number; icono: React.ReactNode; titulo: string; valor: string; style: React.CSSProperties}) => {
  if (t < a) return null;
  const p = resorte(t, a, 12, 0.6);
  return (
    <div style={{position: 'absolute', ...style, background: 'rgba(250,250,252,0.96)', borderRadius: 28, padding: '22px 30px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 24px 70px rgba(0,0,0,0.45)', transform: `translateY(${(1 - p) * 40}px) scale(${mezcla(p, 0.85, 1)})`, opacity: tramo(t, a, a + 0.12), filter: `blur(${(1 - tramo(t, a, a + 0.18)) * 12}px)`}}>
      {icono}
      <div>
        <div style={{fontFamily: fE.sans, fontWeight: 600, fontSize: 26, color: '#6b6b73'}}>{titulo}</div>
        <div style={{fontFamily: fE.sans, fontWeight: 800, fontSize: 46, color: E.tinta}}>{valor}</div>
      </div>
    </div>
  );
};
export const S4Muro = ({t}: {t: number}) => {
  if (t < T.muro - 0.05 || t > T.datos + 0.05) return null;
  const comparing = palabra('comparing');
  const giro = mezcla(tramo(t, T.muro, comparing - 0.2, (x) => x), 14, 0) + mezcla(tramo(t, comparing - 0.2, comparing + 0.6), 0, -30);
  const paneles = ['img/mapa-heat.png', 'img/mapa-sol-tierra.png', 'img/comparar.png'];
  return (
    <Placa fondo={E.tinta}>
      <AbsoluteFill style={{perspective: 1700, opacity: tramo(t, T.muro, T.muro + 0.2)}}>
        <AbsoluteFill style={{transformStyle: 'preserve-3d', transform: `translateZ(-520px) rotateY(${giro}deg)`}}>
          {paneles.map((src, i) => {
            const ang = (i - 1) * 34;
            return (
              <Img key={src} src={staticFile(src)} style={{position: 'absolute', left: 960 - 520, top: 540 - 300 - 10, width: 1040, height: 585, borderRadius: 18, border: '6px solid #fff', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', transform: `rotateY(${ang}deg) translateZ(900px)`, backfaceVisibility: 'hidden'}} />
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>
      <Desenfoque t={t} a={T.muro + 0.1} style={{position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', fontFamily: fE.sans, fontWeight: 700, fontSize: 24, letterSpacing: 6, color: '#fff', opacity: 0.85}}>
        SELENE · SHACKLETON · NOV 14–27, 2026
      </Desenfoque>
      <Tarjeta t={t} a={palabra('sunlight') - 0.08} icono={<Sol c={'#e8ad5b'} s={52} />} titulo="Accumulated sunlight" valor="336 h" style={{left: 110, top: 150}} />
      <Tarjeta t={t} a={palabra('communication') - 0.08} icono={<Antena c={'#2a9db0'} s={52} />} titulo="Earth in view" valor="73%" style={{right: 110, top: 150}} />
      <Tarjeta t={t} a={palabra('best') - 0.08} icono={<span style={{fontFamily: fE.serif, fontSize: 60, color: E.rojo, lineHeight: 1}}>#1</span>} titulo="Best sites, ranked" valor="Shackleton" style={{left: 110, top: 600}} />
    </Placa>
  );
};

// 4c · Datos de la NASA en placa de papel, con resaltador
export const S4Datos = ({t}: {t: number}) => {
  if (t < T.datos - 0.05 || t > C.futuro + 0.05) return null;
  const jpl = palabra('jpl') - 0.06;
  const lola = palabra('lola') - 0.06;
  return (
    <Placa fondo={E.papel}>
      <Desenfoque t={t} a={T.datos} style={{position: 'absolute', left: 150, top: 150, fontFamily: fE.sans, fontWeight: 800, fontSize: 30, letterSpacing: 8, color: E.rojo}}>NASA OPEN DATA</Desenfoque>
      {t >= jpl && (
        <Desenfoque t={t} a={jpl} style={{position: 'absolute', left: 140, top: 210}}>
          <div style={{fontFamily: fE.serif, fontSize: 190, lineHeight: 1, color: E.tinta}}><Resaltado t={t} a={jpl + 0.1}>JPL Horizons</Resaltado></div>
          <div style={{fontFamily: fE.sans, fontWeight: 600, fontSize: 40, color: '#55555c', marginTop: 10, marginLeft: 10}}>Where the Sun and the Earth are, hour by hour</div>
        </Desenfoque>
      )}
      {t >= lola && (
        <Desenfoque t={t} a={lola} style={{position: 'absolute', left: 140, top: 520}}>
          <div style={{fontFamily: fE.serif, fontStyle: 'italic', fontSize: 190, lineHeight: 1, color: E.tinta}}><Resaltado t={t} a={lola + 0.1}>LOLA</Resaltado></div>
          <div style={{fontFamily: fE.sans, fontWeight: 600, fontSize: 40, color: '#55555c', marginTop: 10, marginLeft: 10}}>The real shape of the lunar terrain</div>
        </Desenfoque>
      )}
    </Placa>
  );
};

// 5 · Futuro: la pregunta de Space Apps y una ráfaga de fotos a color (Apollo y Artemis).
export const S5Futuro = ({t}: {t: number}) => {
  if (t < C.futuro - 0.05 || t > C.cierre + 0.05) return null;
  const a = C.futuro;
  return (
    <Placa fondo={E.tinta}>
      <AbsoluteFill style={{transform: `scale(${mezcla(tramo(t, a, C.cierre, (x) => x), 1, 1.07)})`}}>
        {FOTOS_FUTURO.map((f, i) => <FotoRafaga key={f + i} t={t} a={a + 0.15 + i * CADENCIA_FUTURO} src={f} i={i} gris={false} semilla="fu" />)}
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.85))'}} />
      <Desenfoque t={t} a={a} style={{position: 'absolute', top: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
        <div style={{background: E.rojo, color: '#fff', fontFamily: fE.sans, fontWeight: 800, fontSize: 30, letterSpacing: 3, padding: '12px 26px'}}>
          WHAT CAN SELENE DO FOR PEOPLE, THE WORLD, AND BEYOND?
        </div>
      </Desenfoque>
    </Placa>
  );
};

// 6 · Cierre con título y créditos
export const S6Creditos = ({t}: {t: number}) => {
  if (t < C.cierre - 0.05) return null;
  const a = C.cierre;
  const D = 190;
  const linea = (texto: string, i: number) => (
    <Desenfoque key={i} t={t} a={a + 0.5 + i * 0.12} style={{fontFamily: fE.sans, fontWeight: 500, fontSize: 25, color: '#a7a7ad', letterSpacing: 0.5}}>{texto}</Desenfoque>
  );
  return (
    <Placa fondo={E.tinta} style={{alignItems: 'center', opacity: tramo(t, a, a + 0.25)}}>
      <Desenfoque t={t} a={a} style={{position: 'absolute', top: 60}}>
        <div style={{width: D, height: D, borderRadius: '50%', overflow: 'hidden', border: '6px solid #fff'}}>
          <Img src={staticFile('img/logo.jpg')} style={{width: D / 0.885, height: D / 0.885, marginLeft: -(D / 0.885 - D) / 2, marginTop: -(D / 0.885 - D) / 2}} />
        </div>
      </Desenfoque>
      <Desenfoque t={t} a={a + 0.1} style={{position: 'absolute', top: 260, fontFamily: fE.serif, fontSize: 170, lineHeight: 1, color: '#fff', letterSpacing: 3}}>SELENE</Desenfoque>
      <Desenfoque t={t} a={a + 0.25} style={{position: 'absolute', top: 445, fontFamily: fE.serif, fontStyle: 'italic', fontSize: 56, color: E.oro}}>Precision starts with the right location.</Desenfoque>
      <div style={{position: 'absolute', top: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        {[
          'Team Hubble 27 — Barbato · Duarte · Facchin · Peirén · Ligüera · Santana',
          'NASA Space Apps Challenge 2026 · Salto / Paysandú, Uruguay',
          'Data: NASA/JPL Horizons · LRO LOLA · LROC (NASA SVS CGI Moon Kit)',
          'Photos: NASA (public domain) · Voice and music: AI-generated with ElevenLabs',
        ].map(linea)}
      </div>
    </Placa>
  );
};

export {DURACION};
