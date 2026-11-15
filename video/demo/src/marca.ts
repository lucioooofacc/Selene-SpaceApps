import {loadFont as arimo} from '@remotion/google-fonts/Arimo';
import {loadFont as inter} from '@remotion/google-fonts/Inter';
import {loadFont as jetbrains} from '@remotion/google-fonts/JetBrainsMono';

// Mismos tokens que web/src/styles/tokens.css (Figma SELENE, DEC-014).
export const color = {
  fondo: '#04060b',
  panel: 'rgba(9, 12, 18, 0.74)',
  panelSolido: '#090c12',
  borde: '#2c3137',
  texto: '#f1ede4',
  apagado: '#585e69',
  apagado2: '#7c828d',
  oro: '#bfa780',
  verde: '#78b08b',
  sol: '#e8ad5b',
  tierra: '#5cc6d8',
};

inter('italic', {weights: ['800'], subsets: ['latin']});
export const fuente = {
  titulo: inter('normal', {weights: ['500', '600', '700', '800'], subsets: ['latin']}).fontFamily,
  cuerpo: arimo('normal', {weights: ['400', '700'], subsets: ['latin', 'latin-ext']}).fontFamily,
  mono: jetbrains('normal', {weights: ['400', '500'], subsets: ['latin']}).fontFamily,
};
