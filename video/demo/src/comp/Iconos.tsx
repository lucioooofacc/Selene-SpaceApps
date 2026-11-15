// Íconos simples en línea (sol, Tierra/antena, datos), en el estilo de los del Figma.
export const Sol = ({c, s = 34}: {c: string; s?: number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
    <circle cx="12" cy="12" r="4.2" fill={c} />
    {Array.from({length: 8}, (_, i) => {
      const a = (i * Math.PI) / 4;
      return <line key={i} x1={12 + Math.cos(a) * 7} y1={12 + Math.sin(a) * 7} x2={12 + Math.cos(a) * 10} y2={12 + Math.sin(a) * 10} />;
    })}
  </svg>
);
export const Antena = ({c, s = 34}: {c: string; s?: number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
    <circle cx="12" cy="12" r="2" fill={c} />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
  </svg>
);
export const Datos = ({c, s = 30}: {c: string; s?: number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12" />
  </svg>
);
