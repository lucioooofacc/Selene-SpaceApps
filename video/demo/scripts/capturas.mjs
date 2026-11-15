// Capturas reales de la web SELENE (en inglés) para usar en el video.
// Requiere la web corriendo: cd web && npx vite --port 5179
// Uso: node scripts/capturas.mjs
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? `${process.env.HOME}/Documentos/Cinniminies/videos/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell`;
const BASE = process.env.BASE ?? 'http://localhost:5179';
const OUT = 'public/img';

const browser = await puppeteer.launch({executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage();
await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1.5});
page.on('pageerror', (e) => console.log('pageerror', e.message));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(BASE + '/', {waitUntil: 'networkidle0'});
await page.evaluate(() => { localStorage.setItem('selene.lang', 'en'); localStorage.setItem('selene-tour-seen', '1'); });
await page.goto(BASE + '/index.html?site=shackleton&start=2026-11-14&days=14', {waitUntil: 'networkidle0'});
await espera(15000);
await page.screenshot({path: `${OUT}/inicio.png`});
await page.screenshot({path: `${OUT}/inicio-completa.png`, fullPage: true});

for (const vista of ['heat', 'polar']) {
  const b = await page.$(`[data-map-view="${vista}"]`);
  if (b) { await b.click(); await espera(8000); await page.screenshot({path: `${OUT}/mapa-${vista}.png`}); }
}

await page.goto(BASE + '/index.html?site=shackleton&start=2026-11-14&days=14&layer=both', {waitUntil: 'networkidle0'});
await espera(20000);
const calor = await page.$('[data-map-view="heat"]');
if (calor) { await calor.click(); await espera(8000); }
await page.screenshot({path: `${OUT}/mapa-sol-tierra.png`});

await page.goto(BASE + '/compare.html?a=shackleton&b=malapert&start=2026-11-14&days=14', {waitUntil: 'networkidle0'});
await espera(15000);
await page.screenshot({path: `${OUT}/comparar.png`});
await page.screenshot({path: `${OUT}/comparar-completa.png`, fullPage: true});
await browser.close();
console.log('listo');
