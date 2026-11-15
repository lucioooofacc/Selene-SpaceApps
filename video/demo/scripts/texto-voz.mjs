// Texto de la voz en off (basado en video/script.md), igual en las tres versiones; cambia la interpretación.
// Las indicaciones entre corchetes las interpreta eleven_v4 y no las lee.
// La toma en inglés se genera entera y después se reemplazan los apellidos por una toma en español
// (misma voz, language_code "es") para que se pronuncien bien: Fa-CHÍN, PÉI-ren, Li-GÜE-ra.
const FRASES = [
  'We are Barbato, Duarte, Fakeen, Peiren, Leegwera and Santana: team Hubble 27.',
  'We chose Challenge Four for its complexity and potential for innovation.',
  'Our project: SELENE. Precision starts with the right location.',
  'Our website evaluates sunlight and communication with Earth to find the best lunar landing sites, comparing them with NASA data like JPL Horizons and LOLA.',
  'Comparing sites quickly shortens mission planning, helping us find new answers to the unknown, and making life easier for all of us.',
];
const conTags = (tags) => FRASES.map((f, i) => `${tags[i]} ${f}`).join(' ');

// Apellidos en español; las tildes marcan dónde va el acento al pronunciar.
export const NOMBRES_ES = 'Barbato, Duarte, Fachín, Péiren, Ligüera y Santana.';

// Texto final (inglés + apellidos en español), sin indicaciones, para la alineación
export const TEXTO_FINAL = FRASES.join(' ').replace(/Barbato.*?Santana:/, NOMBRES_ES);

// Palabra dicha → cómo se escribe en los subtítulos
export const CORRECCIONES = {Fachín: 'Facchin', Péiren: 'Peiren', y: 'and'};

const LIAM = 'TX3LPaxmHKxFdv7VOQHJ'; // joven, inglés americano (multilingüe)

// Las voces de narrador probadas para el ensayo (George, Brian, Matilda) no entraban en 30 s.
// Cada versión: voz, interpretación, velocidad y archivos. `tempo` acelera sin cambiar el tono para entrar en 30 s.
export const VERSIONES = {
  v1: {
    voz: LIAM, ajustes: {stability: 0.45, similarity_boost: 0.8, style: 0.45}, velocidad: 1.18, velocidadEs: 1.2, tempo: 1.04,
    texto: conTags(['[confident]', '', '[excited]', '[informative]', '[inspired]']),
    dir: 'public/voz', prefijo: 'voz', tiempos: 'src/voz-tiempos.json',
  },
  emocion: {
    voz: LIAM, ajustes: {stability: 0.3, similarity_boost: 0.8, style: 0.75}, velocidad: 1.15, velocidadEs: 1.2, tempo: 1.11,
    texto: conTags(['[proudly]', '[determined]', '[in awe]', '[passionate]', '[emotional, building]']),
    dir: 'public/emocion', prefijo: 'voz', tiempos: 'src/emocion/voz-tiempos.json',
  },
  ensayo: {
    voz: LIAM, ajustes: {stability: 0.6, similarity_boost: 0.8, style: 0.3}, velocidad: 1.18, velocidadEs: 1.2, tempo: 1.1,
    texto: conTags(['[calm]', '[thoughtful]', '[softly]', '[clear]', '[reflective, hopeful]']),
    dir: 'public/ensayo', prefijo: 'voz', tiempos: 'src/ensayo/voz-tiempos.json',
  },
};
