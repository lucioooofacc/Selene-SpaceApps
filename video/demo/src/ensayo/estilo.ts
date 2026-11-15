import {loadFont as serif} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as interTight} from '@remotion/google-fonts/InterTight';

// Estilo del video-ensayo (mismo lenguaje que "One minute for change"): serif grande con itálica dorada,
// placas de tinta, papel y rojo, fotos con borde blanco.
export const E = {rojo: '#e0152f', oro: '#f5c451', tinta: '#0b0b0c', papel: '#f6f4ef', resaltador: 'rgba(245,196,81,0.75)'};
serif('italic', {subsets: ['latin']});
export const fE = {
  serif: serif('normal', {subsets: ['latin', 'latin-ext']}).fontFamily,
  sans: interTight('normal', {weights: ['500', '600', '700', '800', '900'], subsets: ['latin', 'latin-ext']}).fontFamily,
};
