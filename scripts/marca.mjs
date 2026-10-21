/* La marca de Casa da Laxa: no tienen logo y NO se inventa uno. Lo que hace de marca es el nombre
   en Gloock tallado en granito; para los iconos, la «L» tallada sobre la losa.
   Los contornos de Gloock (OFL) están en marca/gloock-glifos.json (sacados de la fuente con fontTools).
   Uso: node scripts/marca.mjs  → marca/favicon.svg, favicon-32.png, apple-touch-icon.png,
   icono-512.png e img/og.jpg (1200×630). Necesita antes img/granito.jpg (scripts/granito.mjs)
   e img/fotos/ (scripts/fotos.mjs). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = JSON.parse(fs.readFileSync(path.join(RAIZ, 'marca/gloock-glifos.json'), 'utf8'));
const GRANITO = '#C9C2B2', RIO_HONDO = '#1E2F2B', CAL = '#F1EDE5';
const granitoB64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(RAIZ, 'img/granito.jpg')).toString('base64');

// tallado sin filtros: luz dentro abajo a la derecha, sombra dentro arriba a la izquierda, hueco en medio
function tallado(id, d, tr, k) {
  return `<defs><clipPath id="${id}a"><path transform="${tr}" d="${d}"/></clipPath>`
    + `<clipPath id="${id}b"><path transform="translate(${-k} ${-k}) ${tr}" d="${d}"/></clipPath></defs>`
    + `<g clip-path="url(#${id}a)"><rect x="-9999" y="-9999" width="19999" height="19999" fill="#EFE8DA"/>`
    + `<path transform="translate(${-k} ${-k}) ${tr}" d="${d}" fill="#2E2822"/>`
    + `<g clip-path="url(#${id}b)"><path transform="translate(${k * .9} ${k * .9}) ${tr}" d="${d}" fill="#6A6056"/></g></g>`;
}
const losa = ({ tam, fondo = true, radio = 0, granito = true }) => {
  const s = tam * .74 / G.upm;                 // la L ocupa ~74 % del alto
  const w = G.L.w * s, x = (tam - w) / 2 + tam * .02, y = tam * .1;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">`
    + (fondo ? `<rect width="${tam}" height="${tam}" rx="${radio}" fill="${GRANITO}"/>` : '')
    + (granito ? `<image href="${granitoB64}" x="0" y="0" width="${Math.max(tam, 512)}" height="${Math.max(tam, 512)}" opacity=".95"/>` : '')
    + tallado('l', G.L.d, `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})`, Math.max(1.2, tam * .022))
    + `</svg>`;
};

fs.mkdirSync(path.join(RAIZ, 'marca'), { recursive: true });
// el favicon SVG, sin la textura (ligero): granito liso y la L tallada
fs.writeFileSync(path.join(RAIZ, 'marca/favicon.svg'), losa({ tam: 64, radio: 10, granito: false }));
await sharp(Buffer.from(losa({ tam: 64, radio: 10, granito: false }))).resize(32, 32).png().toFile(path.join(RAIZ, 'marca/favicon-32.png'));
await sharp(Buffer.from(losa({ tam: 512 }))).resize(180, 180).png().toFile(path.join(RAIZ, 'marca/apple-touch-icon.png'));
await sharp(Buffer.from(losa({ tam: 512 }))).png().toFile(path.join(RAIZ, 'marca/icono-512.png'));

// og:image 1200×630: la losa con el nombre tallado a la izquierda y el río desde la ventana a la derecha
const s = 520 / G.nombre.w;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${RIO_HONDO}"/>
  <image href="${granitoB64}" x="0" y="0" width="512" height="512"/><image href="${granitoB64}" x="0" y="512" width="512" height="512"/>
  <image href="${granitoB64}" x="512" y="0" width="512" height="512"/><image href="${granitoB64}" x="512" y="512" width="512" height="512"/>
  ${tallado('n', G.nombre.d, `translate(60 220) scale(${s.toFixed(4)})`, 2.4)}
  <text x="62" y="380" font-family="Consolas, monospace" font-size="21" letter-spacing="6" fill="#4A423A">MAGROS · BEARIZ · OURENSE</text>
  <text x="62" y="420" font-family="Arial, sans-serif" font-size="22" fill="#3E4143">Casa de piedra de hacia 1800, entera para seis,</text>
  <text x="62" y="450" font-family="Arial, sans-serif" font-size="22" fill="#3E4143">con el jardín en la orilla del río.</text>
</svg>`;
const foto = await sharp(path.join(RAIZ, 'img/fotos/rio-ventana-hero-640.jpg')).resize(470, 630, { fit: 'cover', position: 'centre' }).toBuffer();
// el borde izquierdo de la foto, con la grieta
const grieta = [[0, 0], [-0.85, 3.12], [-1.88, 6.48], [-1.05, 8.95], [-1.37, 13.92], [-1.58, 19.69], [-2.39, 25.48], [-1.69, 29.48], [-2.91, 33.33], [-2.81, 37.58], [-3.56, 41.37], [-3.6, 44.24], [-2.41, 47.35], [-2.33, 49.35], [-1.7, 51.33], [-0.89, 55.15], [-0.14, 58.95], [0.44, 62.18], [1.66, 66.67], [2.7, 70.15], [3.47, 72.35], [3.6, 74.4], [1.94, 76.14], [0.74, 78.63], [0.06, 82.68], [-0.32, 85.54], [-3.17, 90.89], [0.37, 95.21], [1.33, 100]];
const poli = grieta.map(([dx, y]) => `${(26 + dx * 5).toFixed(1)},${(y * 6.3).toFixed(1)}`).join(' ') + ' 470,630 470,0';
const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="470" height="630"><polygon points="${poli}" fill="#fff"/></svg>`);
const fotoRecortada = await sharp(foto).ensureAlpha().composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
await sharp(Buffer.from(og)).composite([{ input: fotoRecortada, left: 730, top: 0 }]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(RAIZ, 'img/og.jpg'));
console.log('marca/ e img/og.jpg listos');
