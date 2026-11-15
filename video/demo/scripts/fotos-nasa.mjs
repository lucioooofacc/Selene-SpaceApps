// Fotos de dominio público de la NASA Image and Video Library (images.nasa.gov) para el video ensayo.
// Guarda public/ensayo/fotos/<clave>.jpg y public/ensayo/fotos/creditos.json (id, título, centro).
// Uso: node scripts/fotos-nasa.mjs
import {writeFileSync} from 'node:fs';

// clave → búsqueda (se toma el primer resultado que sea imagen) o "id:<nasa_id>" para una foto puntual
const BUSQUEDAS = {
  earthrise: 'id:as08-14-2383',
  aldrin: 'id:as11-40-5903',
  huella: 'Apollo 11 bootprint',
  saturno: 'Apollo 11 launch Saturn V',
  control: 'Apollo mission control',
  artemis: 'Artemis I launch',
  orion: 'Orion Moon flyby Artemis I',
  polo: 'lunar south pole',
  shackleton: 'Shackleton crater LRO',
  lro: 'Lunar Reconnaissance Orbiter',
  tierra: 'id:as17-148-22727',
  rover: 'Apollo 15 lunar roving vehicle',
};

const creditos = {};
for (const [clave, q] of Object.entries(BUSQUEDAS)) {
  const consulta = q.startsWith('id:') ? `nasa_id=${encodeURIComponent(q.slice(3))}` : `q=${encodeURIComponent(q)}`;
  const r = await fetch(`https://images-api.nasa.gov/search?${consulta}&media_type=image`);
  const item = (await r.json()).collection.items[0];
  if (!item) { console.log('sin resultado', clave); continue; }
  const d = item.data[0];
  const asset = await (await fetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(d.nasa_id)}`)).json();
  const urls = asset.collection.items.map((i) => i.href);
  const url = urls.find((u) => /~medium\.jpg$/i.test(u)) ?? urls.find((u) => /~large\.jpg$/i.test(u)) ?? urls.find((u) => /~orig\.jpg$/i.test(u)) ?? urls.find((u) => /\.jpe?g$/i.test(u));
  if (!url) { console.log('sin jpg', clave); continue; }
  const img = await fetch(url.replace(/^http:/, 'https:'));
  writeFileSync(`public/ensayo/fotos/${clave}.jpg`, Buffer.from(await img.arrayBuffer()));
  creditos[clave] = {nasa_id: d.nasa_id, titulo: d.title, centro: d.center, url: `https://images.nasa.gov/details/${d.nasa_id}`};
  console.log('ok', clave, '·', d.nasa_id, '·', d.title.slice(0, 70));
}
writeFileSync('public/ensayo/fotos/creditos.json', JSON.stringify(creditos, null, 1));
