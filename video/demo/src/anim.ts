import {Easing, interpolate, spring} from 'remotion';
import tiempos from './voz-tiempos.json';

export const FPS = 30;
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const suave = Easing.bezier(0.22, 1, 0.36, 1);

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export type Palabra = {texto: string; desde: number; hasta: number};

// Línea de tiempo de una voz (cada versión tiene la suya): palabras, cortes de escena y duración.
export const crearLinea = (tiempos: Palabra[], cola = 1.1) => {
  // Segundo en que la voz empieza a decir `texto` (la n-ésima vez). Si se regenera la voz, todo se reacomoda.
  const palabra = (texto: string, n = 1) => {
    const buscada = normalizar(texto);
    const encontradas = tiempos.filter((w) => normalizar(w.texto) === buscada);
    if (!encontradas[n - 1]) throw new Error(`La voz no dice "${texto}" ${n} vez/veces`);
    return encontradas[n - 1].desde;
  };
  const finVoz = tiempos[tiempos.length - 1].hasta;
  // Cortes de escena (segundos de la voz)
  const CORTES = {
    equipo: 0,
    desafio: palabra('we', 2) - 0.15,
    selene: palabra('our', 1) - 0.15,
    web: palabra('our', 2) - 0.15,
    futuro: palabra('comparing', 2) - 0.15,
    cierre: palabra('making') - 0.1,
  };
  // Duración total: la voz + un respiro para el cierre, siempre por debajo de 30 s (regla de Space Apps).
  const DURACION = Math.min(29.6, finVoz + cola);
  return {tiempos, palabra, finVoz, CORTES, DURACION};
};
export type Linea = ReturnType<typeof crearLinea>;

// Versión 1 (exportaciones directas, como antes)
export const LINEA_V1 = crearLinea(tiempos);
export const {palabra, finVoz, CORTES, DURACION} = LINEA_V1;

// 0 → 1 con resorte desde el segundo `a`
export const resorte = (t: number, a: number, damping = 14, mass = 0.8) =>
  spring({frame: Math.max(0, (t - a) * FPS), fps: FPS, config: {damping, mass, stiffness: 160}});

// 0 → 1 entre los segundos a y b
export const tramo = (t: number, a: number, b: number, easing = suave) => interpolate(t, [a, b], [0, 1], {...clamp, easing});

export const mezcla = (p: number, de: number, a: number) => de + (a - de) * p;

// Visibilidad de una escena: entra en `a`, sale en `b` (fundidos de `f` s)
export const ventana = (t: number, a: number, b: number, f = 0.4) => Math.min(tramo(t, a - 0.05, a + f), 1 - tramo(t, b - 0.1, b + f * 0.6));

// La música baja mientras habla la voz y sube en las pausas (0 = hablando, 1 = silencio)
export const enSilencio = (tiempos: Palabra[], s: number) => {
  const cerca = tiempos.reduce((m, w) => Math.min(m, s < w.desde ? w.desde - s : s > w.hasta ? s - w.hasta : 0), 99);
  return interpolate(cerca, [0.12, 0.5], [0, 1], clamp);
};
