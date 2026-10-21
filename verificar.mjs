/* Verificación de la web de Casa da Laxa (Playwright, un solo navegador, ventanas pequeñas, escala 1).
   Uso: node verificar.mjs   (puerto 8831). Sin capturas: lo que hay que mirar a ojo va en el README.
   El WebGL del río NO se pinta: el navegador arranca con --disable-3d-apis (sin swiftshader); se
   comprueba solo que el módulo monta o deja su respaldo. Todas las pruebas con movimiento reducido
   salvo las de movimiento (corriente, puente, pie y cortina), que van una vez y al final. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8831;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
servidor.on('error', (e) => { console.error(`El puerto ${PUERTO} está ocupado (¿otra sesión?): ${e.message}`); process.exit(2); });
await new Promise((r) => servidor.listen(PUERTO, r));
const BASE = `http://localhost:${PUERTO}/`;

const fallos = [];
let nOk = 0;
const comprobar = (cond, m, detalle) => { if (cond) { nOk++; console.log('  ok     ' + m); } else { fallos.push(m); console.log('  FALLO  ' + m + (detalle !== undefined ? ' → ' + JSON.stringify(detalle) : '')); } };
const LLAVE = 'casadalaxa-cookies';
const sinCookies = `try { localStorage.setItem('${LLAVE}', 'si'); } catch (e) {}`;

/* librerías desde una copia local: la prueba no depende del CDN ese día */
const CDN = {
  'lenis.min.js': 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js',
  'gsap.min.js': 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
  'ScrollTrigger.min.js': 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js',
};
const CACHE = path.join(os.tmpdir(), 'laxa-cdn');
fs.mkdirSync(CACHE, { recursive: true });
for (const [n, u] of Object.entries(CDN)) {
  const f = path.join(CACHE, n);
  if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from(await (await fetch(u)).arrayBuffer()));
}
const RE_CDN = /cdn\.jsdelivr\.net\/npm\/.*\/(lenis|gsap|ScrollTrigger)\.min\.js$/;
const local = (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(CACHE, r.request().url().split('/').pop())) });

/* ================= 0. archivos (sin navegador) ================= */
console.log('\n0. Archivos');
const htmls = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html') && !f.endsWith('.src.html'));
for (const f of htmls) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  comprobar(/^<!DOCTYPE html>\s*<html lang="es">\s*<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, ?nofollow">/.test(s), `${f}: charset lo primero y noindex justo detrás`);
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const rep = ids.filter((x, i) => ids.indexOf(x) !== i);
  comprobar(rep.length === 0, `${f}: ningún id repetido`, [...new Set(rep)]);
  comprobar(!/<!-- falta /.test(s) && !/<!--parte:/.test(s), `${f}: todas sus partes incluidas`);
}
comprobar(['.nojekyll', '404.html', 'manifest.json', 'img/og.jpg', 'img/granito.webp', 'img/grano.png', 'marca/favicon.svg', 'marca/favicon-32.png', 'marca/apple-touch-icon.png', 'marca/icono-512.png'].every((f) => fs.existsSync(path.join(RAIZ, f))), '.nojekyll, 404, manifest, og:image, granito y favicons');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
{
  const rutas = new Set();
  for (const m of html.matchAll(/(src|srcset|href|imagesrcset)="([^"]+)"/g)) for (const parte of (/srcset/.test(m[1]) ? m[2].split(',') : [m[2]])) {
    const r = parte.trim().split(/\s+/)[0].split('?')[0];
    if (r && r !== './' && !/^(https?:|mailto:|tel:|#|data:)/.test(r)) rutas.add(r);
  }
  const faltan = [...rutas].filter((r) => !fs.existsSync(path.join(RAIZ, r)));
  comprobar(faltan.length === 0, `index.html: existen los ${rutas.size} archivos que enlaza`, faltan);
  comprobar(/rel="preload" as="image" type="image\/avif" imagesrcset="img\/fotos\/rio-ventana-hero-480\.avif/.test(html), 'la foto de la portada va precargada (la misma que pinta el <picture>)');
  const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<blockquote[\s\S]*?<\/blockquote>/g, '').replace(/<[^>]+>/g, ' ');
  comprobar(!/\b(1|una|2|dos)( sola| única)? (reseña|opinion|opinión|opiniones|reseñas)\b/i.test(texto) && !/la (primera|segunda) (reseña|opinión)/i.test(texto), 'sin recuento de opiniones (ni «2 opiniones» ni «una reseña»)');
  comprobar(!/el mejor|los mejores|la mejor|clientes satisfechos|cientos de|miles de|sin permanencia|garantizad/i.test(texto), 'sin superlativos propios ni prueba social inventada (las citas, aparte)');
  comprobar(!/whatsapp|wa\.me|617 ?32/i.test(html), 'sin WhatsApp ni el segundo teléfono (no constan)');
  comprobar(!/fervenza|sr-fachada|sensacionrural/i.test(html) && !/sr-fachada/.test(fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8')), 'ni «fervenza», ni la foto de Sensación Rural');
  comprobar(!/mitad de (la )?semana/i.test(texto) && !/nuestro puente|su puente/i.test(texto), 'no promete la limpieza de mitad de semana ni dice que el puente es suyo');
  comprobar(/TR-OR-000039/.test(html) && /688 95 57 00/.test(html) && /Rúa Loureiro, 25/.test(html), 'registro, teléfono y dirección reales');
  comprobar(/10 sobre 10/.test(texto) && /casasrurales\.net\/casas-rurales\/casa-da-laxa--c1183/.test(html), '«10 sobre 10 en casasrurales.net» con su enlace');
  comprobar(!/lang="gl"|\/es\/|hreflang/.test(html), 'solo castellano: ni versión gallega ni /es/');
  comprobar([...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt="/.test(m[0])), 'todas las imágenes llevan alt');
  comprobar((() => { try { JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]); return true; } catch (e) { return false; } })() && !/aggregateRating|reviewCount/.test(html), 'el JSON-LD se lee y no lleva recuento de reseñas');
  const orden = ['js/rio.js', 'js/fachada.js', 'js/casa.js', 'js/main.js'].map((s) => html.indexOf(s));
  comprobar(orden.every((x) => x > 0) && orden[0] < orden[3] && orden[1] < orden[3] && orden[2] < orden[3] && /<script src="js\/rio\.js[^"]*" defer>/.test(html), 'los JS de los módulos, con defer y antes de main.js');
  comprobar(['css/rio.css', 'css/fachada.css', 'css/casa.css'].every((c) => html.indexOf(c) > 0 && html.indexOf(c) < html.indexOf('</head>')), 'los CSS de los módulos, en el <head>');
  comprobar(/<section id="siglos" class="sec siglos" aria-labelledby="t-siglos">/.test(html) && /<section id="dentro" class="sec dentro" aria-labelledby="t-dentro">/.test(html) && /data-modulo="rio" data-foto="rio-ventana-hero" data-mascara="rio-ventana-hero"/.test(html) && /data-modulo="rio" data-foto="puente" data-mascara="puente"/.test(html), 'los cuatro sitios de los módulos, como dice el contrato');
}
const css = fs.readFileSync(path.join(RAIZ, 'css/estilos.css'), 'utf8') + fs.readFileSync(path.join(RAIZ, 'css/cortina.css'), 'utf8');
comprobar(/\.cookies:not\(\[hidden\]\)\s*\{[^}]*display:\s*flex/.test(css) && !/\.cookies\s*\{[^}]*display:/.test(css), 'cookies: display solo en :not([hidden])');
comprobar(/\.mando:not\(\[hidden\]\)/.test(css) && !/\.mando\s*\{[^}]*display:/.test(css), 'mando: display solo en :not([hidden])');
comprobar(/\.menu-movil\s*\{[^}]*height:\s*100dvh/.test(css) && !/\.menu-movil\s*\{[^}]*inset:\s*0/.test(css), 'menú móvil: altura 100dvh, nunca inset:0 (la cabecera lleva backdrop-filter)');
comprobar(!/\ddvh/.test(css.replace(/\.menu-movil\s*\{[^}]*\}/, '')), 'fuera del menú fijo, ningún dvh (la barra del móvil no mueve nada)');
comprobar(/html\.cortina-fuera \.cortina\s*\{\s*display:\s*none/.test(css) && /prefers-reduced-motion: reduce\)\s*\{\s*\.cortina\s*\{\s*display:\s*none/.test(css) && /\.cortina\[hidden\]\s*\{\s*display:\s*none/.test(css), 'cortina: se oculta al salir, con [hidden] y con movimiento reducido');
comprobar(!/cursor:\s*none/.test(css), 'sin cursor propio');
const mainJs = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
comprobar(/const motion = !quieto;\s*if \(motion\) raiz\.classList\.add\('con-movimiento'\)/.test(mainJs), '«con-movimiento» solo sin movimiento reducido');
comprobar(/if \(esBarra\(\)\) return;/.test(mainJs) && !/addEventListener\('resize'[^;]*innerHeight/.test(mainJs), 'el resize de la barra del móvil no rehace nada');
comprobar(/finally \{\s*W\.retirarCortina\(\)/.test(fs.readFileSync(path.join(RAIZ, 'js/cortina.js'), 'utf8')), 'la cortina se retira siempre (finally)');
comprobar(/window\.__redCortina = setTimeout/.test(html) && /<noscript><style>\.cortina\{display:none!important\}<\/style><\/noscript>/.test(html), 'red de seguridad inline y <noscript> para la cortina');

/* ================= navegador: uno solo, sin WebGL ================= */
const browser = await chromium.launch({ headless: true, args: ['--disable-3d-apis'] });
try {
  async function nueva(op = {}, { cdn = 'local', script, abortar } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...op });
    if (cdn === 'local') await ctx.route(RE_CDN, local);
    if (cdn === 'caido') await ctx.route(RE_CDN, (r) => r.abort());
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(/google\.com\/maps/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
    if (abortar) await ctx.route(abortar, (r) => r.abort());
    if (script) await ctx.addInitScript(script);
    const page = await ctx.newPage();
    page._errores = [];
    page.on('pageerror', (e) => page._errores.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|WebGL|webgl/.test(m.text())) page._errores.push('consola: ' + m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) page._errores.push(r.status() + ' ' + r.url()); });
    return { ctx, page };
  }
  const fuera = (page) => page.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera'), null, { timeout: 12000 });
  // contraste de las parejas de texto (componiendo el alfa sobre el fondo)
  const contrastes = (page, sel) => page.evaluate((sel) => {
    const lz = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const rgba = (c) => { lz.clearRect(0, 0, 1, 1); lz.fillStyle = '#000'; lz.fillStyle = c; lz.fillRect(0, 0, 1, 1); return [...lz.getImageData(0, 0, 1, 1).data]; };
    const L = (m) => { m = m.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
    const fondo = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b) && !/[, /] ?0\)$/.test(b)) return rgba(b).slice(0, 3); el = el.parentElement; } return rgba('rgb(241, 237, 229)').slice(0, 3); };
    return sel.map((s) => {
      const el = document.querySelector(s); if (!el) return [s, 'falta'];
      const f = fondo(el), c = rgba(getComputedStyle(el).color), a = c[3] / 255;
      const t = [0, 1, 2].map((i) => c[i] * a + f[i] * (1 - a));
      const x = L(t), y = L(f); return [s, Math.round(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)) * 100) / 100];
    });
  }, sel);

  /* ---------- 1. portada y página, escritorio, movimiento reducido ---------- */
  console.log('\n1. Portada (escritorio, movimiento reducido)');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(BASE + 'index.html');
    await fuera(page);
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && !document.documentElement.classList.contains('con-movimiento')), 'con movimiento reducido no hay cortina ni «con-movimiento»');
    comprobar(await page.evaluate(() => getComputedStyle(document.body).cursor !== 'none' && !document.querySelector('.cursor, [class*="cursor-"]')), 'sin cursor propio (nunca dos cursores)');
    const p = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const img = document.querySelector('.portada__foto img');
      const t = R('.portada__txt'), l = R('.portada__losa');
      return { carga: img.complete && img.naturalWidth > 0, cur: img.currentSrc.split('/').pop(), ancho: l.width, solapa: !(t.right <= l.left || l.right <= t.left || t.bottom <= l.top || l.bottom <= t.top), cab: document.getElementById('cab').getBoundingClientRect().bottom <= t.top, abierta: document.getElementById('portada').classList.contains('abierta'), titulo: getComputedStyle(document.querySelector('.portada__tit .ln > span')).transform };
    });
    comprobar(p.carga && /rio-ventana-hero-(480|622)\.(avif|webp|jpg)/.test(p.cur), 'la foto del río (sin marcos) carga en la portada', p);
    comprobar(p.ancho <= 622 * 1.3 && !p.solapa && p.cab, 'en escritorio la foto va en su losa, a ≤ 1,3× su tamaño, sin pisar el titular ni la cabecera', p);
    comprobar(p.abierta && p.titulo === 'none', 'sin cortina, la portada ya está abierta y el titular entero', p);
    comprobar(await page.evaluate(() => { const el = document.querySelector('#portada [data-modulo="rio"]'); return !!el.querySelector('img') && (el.dataset.montado === '1' || !window.Laxa.rio); }), 'portada: el módulo Río monta sin WebGL y deja la foto (no se pinta el agua en la prueba)');
    comprobar(await page.evaluate(() => !!document.querySelector('#portada [data-rio-sonido]')), 'portada: el hueco del botón «Oír el río»');
    comprobar(await page.evaluate(() => getComputedStyle(document.querySelector('.portada__pista')).opacity === '0'), 'sin WebGL no se enseña «Arrastra sobre el agua»');
    // la corriente: entera y quieta, por el margen y pasando por las paradas
    const c = await page.evaluate(() => {
      const svg = document.getElementById('corriente'), ps = svg.querySelectorAll('path');
      const p = ps[0], Lt = p.getTotalLength(), main = document.querySelector('main').getBoundingClientRect();
      const alr = document.getElementById('alrededor'), a0 = alr.getBoundingClientRect().top - main.top, a1 = a0 + alr.offsetHeight;
      const pts = []; for (let i = 0; i <= 1200; i++) pts.push(p.getPointAtLength(Lt * i / 1200));
      const env = document.querySelector('#cifras .env'); const borde = env.getBoundingClientRect().left + parseFloat(getComputedStyle(env).paddingLeft);
      const xmax = Math.max(...pts.filter((q) => q.y < a0 || q.y > a1).map((q) => q.x));
      const lejos = [...document.querySelectorAll('[data-corriente-paso]')].map((e) => { const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2 - main.left, cy = r.top + r.height / 2 - main.top; return Math.round(Math.min(...pts.map((q) => Math.hypot(q.x - cx, q.y - cy)))); });
      return { n: ps.length, clips: [...ps].map((x) => x.getAttribute('clip-path')), off: getComputedStyle(p).strokeDashoffset, xmax: Math.round(xmax), borde: Math.round(borde), lejos, remolinos: document.querySelectorAll('[data-remolino]').length };
    });
    comprobar(c.n === 2 && c.clips.includes('url(#c-osc)') && c.clips.includes('url(#c-cla)'), 'la corriente: dos tramos, espuma sobre oscuro y río sobre claro', c);
    comprobar(parseFloat(c.off) === 0, 'con movimiento reducido la corriente está entera', c.off);
    comprobar(c.xmax < c.borde - 4, 'la corriente va por el margen: nunca encima del texto', c);
    comprobar(c.lejos.length >= 8 && c.lejos.every((d) => d <= 6), 'en «Alrededor» la corriente pasa por cada parada río abajo', c.lejos);
    // cifras, fuera, nieve y noche, opiniones
    comprobar(await page.evaluate(() => document.querySelectorAll('.cifras__lista li').length === 5 && /1800/.test(document.querySelector('.cifras__lista').textContent) && /1999/.test(document.querySelector('.cifras__lista').textContent)), 'la casa en cifras: hacia 1800, 1999, 6, 3 y el jardín en la orilla');
    comprobar(await page.evaluate(() => { const n = document.querySelector('.marco--nieve img'), o = document.querySelector('.marco--noche img'); return n.getBoundingClientRect().width <= 640 && o.getBoundingClientRect().width <= 640; }), 'la nieve y la noche (640 px) nunca se estiran');
    comprobar(await page.evaluate(() => { const t = document.getElementById('opiniones').textContent; return /Juan Pablo/.test(t) && /Julio de 2024/.test(t) && /Mónica/.test(t) && /Marzo de 2023/.test(t) && /vosotros sois de 10/.test(t); }), 'las dos opiniones con nombre de pila, mes y año, y la respuesta de Pilar');
    comprobar(await page.evaluate(() => { const m = document.getElementById('mando'); return m.hidden && getComputedStyle(m).display === 'none'; }), 'sin ?revision el mando no se ve');
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('vistazo')).display === 'none'), 'la tabla «de un vistazo» solo sale en la sobria');
    // el foco tallado: doble línea con sombra dentro
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const foco = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { el: e.className || e.tagName, outline: s.outlineStyle, sombra: s.boxShadow }; });
    comprobar(foco.outline === 'solid' && (foco.sombra.match(/rgb/g) || []).length >= 3 && /inset/.test(foco.sombra), 'el foco del teclado: doble línea con sombra dentro (borde de losa tallada)', foco);
    // mapa solo al pedirlo
    comprobar(await page.evaluate(() => !document.querySelector('#mapa iframe')), 'el mapa de Google no se carga solo');
    await page.locator('#mapa-btn').click();
    comprobar(await page.evaluate(() => /google\.com\/maps\?q=Casa%20da%20Laxa/.test(document.querySelector('#mapa iframe')?.src || '')), 'el mapa se carga al pulsar, con la consulta «Casa da Laxa, Rúa Loureiro 25, Beariz»');
    const cs = await contrastes(page, ['.portada__baj', '.portada__pie', '#cifras .eyebrow', '.cifras__lista span', '.cifras__voz footer', '#siglos .eyebrow', '#siglos .sec-cab__txt', '.siglos__paradas p', '#dentro .sec-cab__txt', '.estancia p', '.dentro__nota', '.fuera__f figcaption', '.marco figcaption', '.marco figcaption .mono', '#estaciones .eyebrow', '.cita figcaption .mono', '.opiniones__remate .mono', '#opiniones .enlace', '#alrededor .sec-cab__txt', '.rioabajo__d', '.rioabajo p', '.ciudades .mono', '.demo', '.motor__fino', '.dsem', '.mes__tit', '.motor__pasos li', '.motor__ley', '.saber__lista dt', '.saber__pasos b', '.saber__fuente', '.llegar__baj', '.contacto span', '.pie__cols p', '.pie__legal', '.btn--solaina', '.sup']);
    const malos = cs.filter(([, v]) => v === 'falta' || v < 4.5);
    comprobar(malos.length === 0, `contraste ≥ 4,5:1 en ${cs.length} parejas de texto`, malos);
    comprobar(page._errores.length === 0, 'portada: sin errores de consola ni 404', page._errores.slice(0, 5));
    await ctx.close();
  }

  /* ---------- 2. módulos: montan al acercarse ---------- */
  console.log('\n2. Módulos');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(BASE + 'index.html');
    await fuera(page);
    comprobar(await page.evaluate(() => ['fachada', 'casa'].every((m) => document.querySelector(`[data-modulo="${m}"]`).dataset.montado !== '1') && document.querySelector('#puente [data-modulo]').dataset.montado !== '1'), 'Fachada, Casa y el río del puente no se montan al arrancar');
    for (const [sel, nombre] of [['#siglos', 'Fachada'], ['#dentro', 'Casa'], ['#puente', 'Río del puente']]) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      const ok = await page.waitForFunction((s) => document.querySelector(s + ' [data-modulo]').dataset.montado === '1', sel, { timeout: 6000 }).then(() => true, () => false);
      comprobar(ok, `${nombre} monta al acercarse`);
    }
    comprobar(await page.evaluate(() => !!document.querySelector('#puente [data-modulo] img')), 'el río del puente deja su foto (sin WebGL)');
    // las fichas de la casa abren el visor de la web por nombre
    const fichas = await page.evaluate(() => [...document.querySelectorAll('[data-modulo="casa"] [data-visor]')].filter((b) => b.getBoundingClientRect().width > 0).length);
    if (fichas) {
      await page.locator('#dentro').scrollIntoViewIfNeeded();
      const nombre = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-modulo="casa"] [data-visor]')].pop(); b.click(); return b.dataset.visor; });
      comprobar(await page.evaluate((n) => document.getElementById('visor').open && document.getElementById('visor-img').dataset.nombre === n, nombre), 'la foto de una ficha de «La casa por dentro» abre SU foto en el visor', nombre);
      await page.keyboard.press('Escape');
    }
    comprobar(await page.evaluate(() => { const n = document.querySelector('.dentro__nota'); return n && n.getBoundingClientRect().height > 0 && !n.closest('[data-modulo]'); }), 'la nota del aseo, la cuna y lo incluido se queda fuera del módulo, a la vista');
    comprobar(page._errores.length === 0, 'módulos montados sin errores', page._errores.slice(0, 5));
    await ctx.close();
  }
  {
    const { ctx, page } = await nueva({}, { script: sinCookies, abortar: /js\/(rio|fachada|casa)\.js/ });
    await page.goto(BASE + 'index.html');
    await fuera(page);
    for (const sel of ['#siglos', '#dentro', '#puente']) { await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(250); }
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-modulo]')].map((el) => ({ m: el.dataset.modulo, montado: el.dataset.montado || '', alto: Math.round(el.getBoundingClientRect().height), fotos: el.querySelectorAll('img').length })));
    comprobar(r.every((x) => !x.montado && x.alto > 150 && x.fotos >= 1), 'sin los JS de los módulos se queda cada respaldo, con su foto', r);
    comprobar(page._errores.filter((e) => !/rio|fachada|casa/.test(e)).length === 0, 'y la página no da errores', page._errores);
    await ctx.close();
  }

  /* ---------- 3. reservar, de punta a punta ---------- */
  console.log('\n3. Reservar');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies });
    await page.goto(BASE + 'index.html#reservar');
    await fuera(page);
    const m = await page.evaluate(() => { const M = window.__motor; const y = new Date().getFullYear() + 1; return { verano: M.esAlta(`${y}-07-20`), noviembre: M.esAlta(`${y}-11-18`), ss: M.esAlta(M.pascua(y)), precios: M.PRECIO, min: M.MIN_NOCHES, max: M.MAX_PERS, ocupados: document.querySelectorAll('#motor .dia.ocupado[aria-disabled="true"]').length }; });
    comprobar(m.verano && !m.noviembre && m.ss && m.precios.baja === 25 && m.precios.alta === 32 && m.min === 2 && m.max === 6, 'temporada alta (verano y Semana Santa), 25 € y 32 € por persona y noche, mínimo 2 noches, hasta 6', m);
    comprobar(m.ocupados > 0, 'hay noches ocupadas de ejemplo y no se pueden elegir');
    comprobar(await page.evaluate(() => /Demostración/.test(document.querySelector('.demo').textContent) && /supuesto/.test(document.getElementById('motor').textContent)), 'el motor dice que es una demostración y marca los supuestos');
    // limpiar y elegir: llegada y la misma noche → mínimo
    await page.evaluate(() => { const st = window.__motor.st; st.ini = st.fin = null; });
    await page.locator('#motor [data-acc="next"]').click();
    const libres = () => page.evaluate(() => [...document.querySelectorAll('#motor .dia:not([aria-disabled="true"])')].map((b) => b.dataset.k));
    let L = await libres();
    // dos noches libres seguidas
    const par = await page.evaluate((L) => { const M = window.__motor; for (const k of L) { const d = new Date(k); const k1 = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), k2 = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2); const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; if (!M.ocupada(k) && !M.ocupada(f(k1)) && L.includes(f(k2))) return [k, f(k1), f(k2)]; } return null; }, L);
    await page.locator(`#motor [data-k="${par[0]}"]`).click();
    await page.locator(`#motor [data-k="${par[1]}"]`).click();
    comprobar(/mínima es de 2 noches/.test(await page.textContent('#motor .motor__msg')), 'una sola noche no vale: mínimo 2 (supuesto)');
    await page.locator(`#motor [data-k="${par[2]}"]`).click();
    comprobar(await page.evaluate(() => /\d/.test(document.querySelector('#desglose [data-total]')?.textContent || '')), 'llegada y salida → total estimado');
    await page.locator('#motor [data-acc="seguir"]').click();
    comprobar(await page.evaluate(() => /¿Cuántos venís\?/.test(document.getElementById('motor-tit-paso').textContent)), 'paso 2: personas');
    for (let i = 0; i < 4; i++) await page.locator('#motor [data-acc="mas"]').click().catch(() => {});
    comprobar(await page.evaluate(() => document.getElementById('motor-pers').textContent === '6' && document.querySelector('#motor [data-acc="mas"]').disabled), 'seis es el máximo (el botón + se apaga)');
    await page.check('#m-cuna');
    const cuenta = await page.evaluate(() => { const M = window.__motor, c = M.cuenta(); const n = (s) => parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')); return { c, total: n(document.querySelector('#desglose [data-total]').textContent), senal: n(document.querySelector('#desglose [data-senal]').textContent), cuna: /Cuna/.test(document.getElementById('desglose').textContent), esperado: (c.alta * M.PRECIO.alta + c.baja * M.PRECIO.baja) * 6 }; });
    comprobar(cuenta.total === cuenta.esperado && Math.abs(cuenta.senal - cuenta.total * .2) < .01 && cuenta.cuna, 'total = noches × personas × precio, señal del 20 % y la cuna en el resumen', cuenta);
    await page.locator('#motor [data-acc="a-datos"]').click();
    await page.locator('#motor-form button[type="submit"]').click();
    comprobar((await page.textContent('#m-error')).includes('Falta'), 'el formulario valida los datos');
    comprobar(await page.evaluate(() => { const b = document.querySelector('#motor-form button[type="submit"]'); const n = b.nextElementSibling; return n && /no se envía, no se guarda ni se cobra nada/.test(n.textContent); }), 'junto al botón dice que no envía, guarda ni cobra nada');
    await page.fill('#m-nombre', 'Ana Prueba'); await page.fill('#m-correo', 'ana@ejemplo.es'); await page.fill('#m-tel', '600 11 22 33'); await page.check('#m-ok');
    await page.locator('#motor-form button[type="submit"]').click();
    const loc = await page.textContent('#motor-loc');
    comprobar(new RegExp('^LAX-' + par[0].slice(2).replace(/-/g, '') + '-\\d{3}$').test(loc) && /no se ha enviado, guardado ni cobrado nada/.test(await page.textContent('#motor-demo-hecho')), 'confirmación con localizador LAX-AAMMDD-NNN y el aviso de demostración', loc);
    comprobar(page._errores.length === 0, 'reservar: sin errores', page._errores.slice(0, 5));
    await ctx.close();
  }

  /* ---------- 4. el visor se abre por NOMBRE (cada miniatura, ratón) ---------- */
  console.log('\n4. Visor');
  {
    const { ctx, page } = await nueva({}, { script: sinCookies, abortar: /js\/(fachada|casa)\.js/ });
    await page.goto(BASE + 'index.html');
    await fuera(page);
    const n = await page.locator('[data-visor]').count();
    let malos = [];
    for (let i = 0; i < n; i++) {
      const b = page.locator('[data-visor]').nth(i);
      const nombre = await b.getAttribute('data-visor');
      await b.scrollIntoViewIfNeeded();
      await b.click();
      const v = await page.evaluate(() => ({ open: document.getElementById('visor').open, n: document.getElementById('visor-img').dataset.nombre, src: document.getElementById('visor-img').getAttribute('src') }));
      if (!(v.open && v.n === nombre && v.src.includes(nombre))) malos.push([nombre, v]);
      await page.keyboard.press('Escape');
    }
    comprobar(n >= 15 && malos.length === 0, `cada una de las ${n} miniaturas abre SU foto en el visor`, malos);
    await page.locator('[data-visor="jardin"]').click();
    await page.keyboard.press('ArrowRight');
    const sig = await page.evaluate(() => document.getElementById('visor-img').dataset.nombre);
    comprobar(sig === 'barbacoa', 'con la flecha pasa a la siguiente de la serie (jardín → barbacoa)', sig);
    await page.keyboard.press('Escape');
    comprobar(await page.evaluate(() => !document.getElementById('visor').open && document.activeElement?.dataset.visor === 'jardin'), 'Escape cierra el visor y el foco vuelve a la miniatura');
    await ctx.close();
  }

  /* ---------- 5. cookies en cuatro pasos y mando con ?revision ---------- */
  console.log('\n5. Cookies y mando');
  {
    const { ctx, page } = await nueva();
    await page.goto(BASE + 'index.html');
    await fuera(page);
    await page.waitForSelector('#cookies:not([hidden])', { timeout: 4000 }).catch(() => {});
    comprobar(await page.isVisible('#cookies'), 'cookies: se ven en la primera visita');
    await page.click('#ck-si');
    comprobar(!(await page.isVisible('#cookies')) && (await page.evaluate((k) => localStorage.getItem(k), LLAVE)) === 'si', 'cookies: «Entendido» las cierra y guarda la marca');
    await page.reload(); await fuera(page);
    comprobar(!(await page.isVisible('#cookies')), 'cookies: al recargar no vuelven');
    await page.evaluate((k) => localStorage.removeItem(k), LLAVE);
    await page.reload(); await fuera(page);
    await page.waitForSelector('#cookies:not([hidden])', { timeout: 4000 }).catch(() => {});
    comprobar(await page.isVisible('#cookies'), 'cookies: sin la marca vuelven a salir');
    await page.click('#ck-no');
    comprobar(/Google Fonts/.test(fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8')) && /Google Maps/.test(fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8')), 'la página de cookies cita Google Fonts y el mapa de Google');
    await ctx.close();
  }
  {
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { script: sinCookies });
    await page.goto(BASE + 'index.html?revision&densidad=sobria'); await fuera(page);
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => {
      const p = document.querySelector('#corriente path'), L = p.getTotalLength(); const xs = []; for (let i = 0; i <= 300; i++) xs.push(p.getPointAtLength(L * i / 300).x);
      return { mando: !document.getElementById('mando').hidden, sobria: document.documentElement.classList.contains('densidad-sobria'), vistazo: getComputedStyle(document.getElementById('vistazo')).display, k: getComputedStyle(document.getElementById('pie')).getPropertyValue('--k').trim(), off: parseFloat(getComputedStyle(p).strokeDashoffset), recta: Math.round(Math.max(...xs) - Math.min(...xs)), grano: getComputedStyle(document.querySelector('.portada__foto'), '::after').display };
    });
    comprobar(s.mando && s.sobria && s.vistazo === 'block', 'con ?revision el mando se ve y la sobria añade «Casa da Laxa, de un vistazo»', s);
    comprobar(s.k === '1' && s.off === 0 && s.recta <= 2 && s.grano === 'none', 'sobria: la losa del pie entera, la corriente recta y ya dibujada, sin grano', s);
    await page.click('#mando [data-densidad="rio"]');
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => { const p = document.querySelector('#corriente path'), L = p.getTotalLength(); const xs = []; for (let i = 0; i <= 300; i++) xs.push(p.getPointAtLength(L * i / 300).x); return { sobria: document.documentElement.classList.contains('densidad-sobria'), vistazo: getComputedStyle(document.getElementById('vistazo')).display, url: location.search, ancho: Math.round(Math.max(...xs) - Math.min(...xs)), mods: [...document.querySelectorAll('[data-modulo]')].filter((m) => m.dataset.montado === '1').length }; });
    comprobar(!r.sobria && r.vistazo === 'none' && !r.url.includes('sobria') && r.ancho > 20, 'el mando vuelve a «Río»: la corriente con remolinos y meandros', r);
    comprobar(page._errores.length === 0, 'cambiar de densidad no da errores (los módulos se vuelven a montar)', page._errores.slice(0, 4));
    await ctx.close();
  }

  /* ---------- 6. móvil: anchos, portada sin solapes, menú y barra del navegador ---------- */
  console.log('\n6. Móvil');
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024]]) {
    const { ctx, page } = await nueva({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }, { script: sinCookies });
    await page.goto(BASE + 'index.html');
    await fuera(page);
    await page.waitForTimeout(300);
    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    comprobar(ancho[0] <= ancho[1], `${w}×${h}: sin scroll lateral`, ancho);
    const salen = await page.evaluate(() => [...document.querySelectorAll('main *, footer *')]
      .filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > innerWidth + 1 && !e.closest('[aria-hidden="true"], .vh, .puente__marco, .corriente'); })
      .slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')));
    comprobar(!salen.length, `${w}×${h}: nada se sale por la derecha`, salen);
    const r = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const t = R('.portada__txt'), cab = R('#cab'), pie = R('.portada__pie'), p = R('#portada'), f = R('.portada__losa');
      return { bajoCab: t.top >= cab.bottom, bajoPie: t.top >= pie.bottom - 1, dentro: t.bottom <= p.bottom, foto: Math.round(f.width) === innerWidth && f.height >= innerHeight - 1 };
    });
    comprobar(Object.values(r).every(Boolean), `${w}×${h}: la foto a pantalla completa y el texto abajo, sin pisar la cabecera ni el pie de foto`, r);
    if (w < 700) {
      const pd = await page.evaluate(() => { const env = document.querySelector('#alrededor .env'); const borde = env.getBoundingClientRect().left + parseFloat(getComputedStyle(env).paddingLeft); return [...document.querySelectorAll('.rioabajo__piedra')].every((e) => e.getBoundingClientRect().right <= borde + 2 && e.getBoundingClientRect().left >= 0); });
      comprobar(pd, `${w}×${h}: las paradas de «Alrededor» van en el borde izquierdo, donde baja la corriente`);
    }
    if (w === 390) {
      await page.evaluate(() => scrollTo(0, 1600));
      await page.waitForFunction(() => document.getElementById('cab').classList.contains('sc'));
      await page.click('#menu-btn');
      const m = await page.evaluate(() => { const r = document.getElementById('menu-movil').getBoundingClientRect(); return { top: r.top, alto: r.height, vista: innerHeight, vis: getComputedStyle(document.getElementById('menu-movil')).visibility }; });
      comprobar(m.top === 0 && Math.abs(m.alto - m.vista) < 2 && m.vis === 'visible', 'menú móvil a pantalla completa con la cabecera ya fija', m);
      await page.click('#menu-movil a[href="#reservar"]');
      comprobar(await page.waitForFunction(() => !document.body.classList.contains('menu'), null, { timeout: 3000 }).then(() => true, () => false), 'el menú se cierra al elegir');
      // visor con el dedo
      await page.locator('[data-visor="piscina"]').scrollIntoViewIfNeeded();
      await page.locator('[data-visor="piscina"]').tap();
      comprobar(await page.evaluate(() => document.getElementById('visor').open && document.getElementById('visor-img').dataset.nombre === 'piscina'), 'en el móvil, tocar una miniatura abre su foto');
      await page.click('#visor-cerrar');
      // la barra del navegador: 6 cambios de alto → ningún «laxa:resize» y nada se mueve
      await page.addStyleTag({ content: '.portada{min-height:844px!important} .con-movimiento .puente{height:1900px!important} .puente__escena{height:844px!important} .siglos__modulo.es-reservado:not([data-montado="1"]){min-height:3200px!important}' });
      // en Playwright los svh cambian con el alto (en un móvil de verdad no): se congelan los altos de las secciones
      await page.evaluate(() => document.querySelectorAll('main > section').forEach((s) => { s.style.height = s.offsetHeight + 'px'; }));
      const n = await page.evaluate(() => { window.__res = 0; addEventListener('laxa:resize', () => window.__res++); scrollTo(0, 5200); return document.getElementById('llegar').getBoundingClientRect().top + scrollY; });
      for (const alto of [788, 844, 788, 844, 800, 844]) { await page.setViewportSize({ width: 390, height: alto }); await page.waitForTimeout(260); }
      const d = await page.evaluate(() => ({ res: window.__res, top: document.getElementById('llegar').getBoundingClientRect().top + scrollY }));
      comprobar(d.res === 0 && Math.abs(d.top - n) < 1, 'barra del móvil: nada se rehace y la página no se mueve', { ...d, antes: n });
    }
    comprobar(page._errores.length === 0, `${w}×${h}: sin errores`, page._errores.slice(0, 3));
    await ctx.close();
  }

  /* ---------- 7. legales ---------- */
  console.log('\n7. Legales');
  {
    const { ctx, page } = await nueva();
    for (const f of ['aviso-legal', 'privacidad', 'cookies', 'accesibilidad', '404']) {
      page._errores.length = 0;
      await page.goto(BASE + f + '.html');
      comprobar((await page.locator('h1').count()) === 1 && page._errores.length === 0, `${f}.html se abre sin errores`, page._errores);
    }
    await ctx.close();
  }

  /* ---------- 8. con movimiento (una vez, al final): cortina, corriente, puente y pie ---------- */
  console.log('\n8. Con movimiento');
  {
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { script: sinCookies });
    await page.goto(BASE + 'index.html');
    comprobar(await page.evaluate(() => { const c = document.getElementById('cortina'); const r = c.getBoundingClientRect(); return getComputedStyle(c).display !== 'none' && r.width === innerWidth && r.height === innerHeight && /granito\.webp/.test(getComputedStyle(document.querySelector('.cortina__mitad')).backgroundImage); }), 'la losa de granito tapa la pantalla al cargar');
    await page.waitForFunction(() => { const rs = [...document.querySelectorAll('#cortina mask rect')]; return rs.length && rs.some((r) => +r.getAttribute('width') > 1) && rs.some((r) => +r.getAttribute('width') < 1); }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    const medio = await page.evaluate(() => { const rs = [...document.querySelectorAll('#cortina mask rect')]; return { talladas: rs.filter((r) => +r.getAttribute('width') > 1).length, total: rs.length, grieta: getComputedStyle(document.querySelector('.cortina__grieta')).clipPath, abierta: document.getElementById('portada').classList.contains('abierta') }; });
    comprobar(medio.total === 10 && medio.talladas > 0 && medio.talladas < 10 && /100%/.test(medio.grieta) && !medio.abierta, 'a medias: las letras tallándose una a una, y aún sin grieta ni portada', medio);
    await page.waitForFunction(() => { const c = getComputedStyle(document.querySelector('.cortina__grieta')).clipPath; return /inset\(0px 0px 0%\)|inset\(0px\)/.test(c); }, null, { timeout: 6000 }).catch(() => {});
    comprobar(await page.evaluate(() => [...document.querySelectorAll('#cortina mask rect')].every((r) => +r.getAttribute('width') > 1)), 'CASA DA LAXA tallado entero antes de partirse');
    await page.waitForFunction(() => document.getElementById('portada').classList.contains('abierta'), null, { timeout: 6000 }).catch(() => {});
    const ab = await page.evaluate(() => ({ abierta: document.getElementById('portada').classList.contains('abierta'), cortina: getComputedStyle(document.getElementById('cortina')).display, fondo: getComputedStyle(document.getElementById('cortina')).backgroundColor, rio: document.querySelector('#portada [data-modulo]').dataset.montado || '' }));
    comprobar(ab.abierta && ab.cortina !== 'none' && ab.fondo === 'rgba(0, 0, 0, 0)', 'la portada se abre cuando la losa EMPIEZA a partirse (y la losa ya no tapa con su fondo)', ab);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('cortina')).display === 'none', null, { timeout: 6000 }).catch(() => {});
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && document.documentElement.classList.contains('con-movimiento') && document.querySelector('#portada [data-modulo]').dataset.montado === '1'), 'la cortina se retira de verdad y el río de la portada ya está montado');
    // la corriente se dibuja con el scroll: valores intermedios, no un salto de 1 a 0
    const vals = [];
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(160); vals.push(+(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#corriente path')).strokeDashoffset))).toFixed(3)); }
    const intermedios = vals.filter((v) => v > .02 && v < .98);
    comprobar(intermedios.length >= 4 && vals[vals.length - 1] < vals[0], 'la corriente se dibuja poco a poco con el scroll (autoRound no la redondea)', vals);
    // el puente: la cámara avanza sin pasar de 1,25×
    // con Lenis, saltar con su scrollTo inmediato (un scrollTo nativo lo deshace la rueda siguiente)
    const ir = (y) => page.evaluate((y) => { const l = window.Laxa.web.lenis; if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }, y);
    await ir(await page.evaluate(() => document.getElementById('puente').getBoundingClientRect().top + scrollY - 10));
    await page.waitForTimeout(200);
    const ps = [];
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 320); await page.waitForTimeout(180); ps.push(await page.evaluate(() => { const p = +getComputedStyle(document.getElementById('puente')).getPropertyValue('--p'); const m = new DOMMatrix(getComputedStyle(document.querySelector('.puente__foto')).transform); return [+p.toFixed(3), +m.a.toFixed(3)]; })); }
    comprobar(ps.some(([p]) => p > .1 && p < .95) && ps.every(([, s]) => s >= 1 && s <= 1.2501) && ps[ps.length - 1][0] > ps[0][0], 'el puente: la cámara avanza con el scroll, hasta 1,25× como mucho, en la caja (no en el <img>)', ps);
    comprobar(await page.evaluate(() => getComputedStyle(document.querySelector('.puente__foto img')).transform === 'none'), 'el <img> del puente no lleva transformaciones de clase (el agua las copiaría solo al cambiar de tamaño)');
    // el pie: la losa se suelda y al llegar abajo está entera
    await ir(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - 500));
    await page.waitForTimeout(300);
    const k1 = await page.evaluate(() => +getComputedStyle(document.getElementById('pie')).getPropertyValue('--k'));
    await ir(await page.evaluate(() => document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const k2 = await page.evaluate(() => +getComputedStyle(document.getElementById('pie')).getPropertyValue('--k'));
    comprobar(k1 > 0 && k1 < 1 && k2 === 1, 'el pie: la grieta se va soldando y abajo del todo el nombre tallado está entero', [k1, k2]);
    comprobar(page._errores.length === 0, 'con movimiento: sin errores', page._errores.slice(0, 5));
    await ctx.close();
  }
  {
    // Lenis y GSAP caídos y con movimiento: la cortina se va igual
    const { ctx, page } = await nueva({ reducedMotion: 'no-preference' }, { cdn: 'caido', script: sinCookies });
    await page.goto(BASE + 'index.html');
    await fuera(page);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('cortina')).display === 'none', null, { timeout: 8000 }).catch(() => {});
    comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && document.getElementById('portada').classList.contains('abierta')), 'sin Lenis ni GSAP la cortina se retira y la portada se abre');
    comprobar(page._errores.length === 0, 'sin las librerías no hay errores', page._errores.slice(0, 3));
    await ctx.close();
  }
} finally {
  await browser.close();
  servidor.close();
}

console.log(`\n${nOk} ok, ${fallos.length} fallos`);
if (fallos.length) { console.log(fallos.map((f) => ' - ' + f).join('\n')); process.exitCode = 1; }
