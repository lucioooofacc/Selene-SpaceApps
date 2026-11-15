import {createContext, useContext} from 'react';
import {LINEA_V1, type Linea} from './anim';

// Las escenas compartidas leen la línea de tiempo de la versión que las usa.
export const LineaCtx = createContext<Linea>(LINEA_V1);
export const useLinea = () => useContext(LineaCtx);
