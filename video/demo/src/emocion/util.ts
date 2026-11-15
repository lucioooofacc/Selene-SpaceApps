export {mezcla, tramo} from '../anim';
// Golpe que decae: 1 en `a` y baja a 0 en `dur` segundos
export const golpeDe = (t: number, a: number, dur = 0.4) => (t < a || t > a + dur ? 0 : 1 - (t - a) / dur);
// Temblor de cámara determinista
export const temblor = (t: number, a: number, fuerza = 14, dur = 0.45) => {
  const g = golpeDe(t, a, dur) * fuerza;
  return {x: Math.sin(t * 91) * g, y: Math.cos(t * 77) * g};
};
