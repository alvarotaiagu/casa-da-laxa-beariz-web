/* La laxa: textura de granito claro GENERADA (nada de foto), en tesela que casa por los bordes.
   Uso: node scripts/granito.mjs  → img/granito.webp, img/granito.jpg (512×512) e img/grano.png
   - Ruido de baja frecuencia (dos octavas que dan la vuelta) para las nubes del granito.
   - Grano fino por píxel.
   - Motas: biotita (negras, pequeñas), feldespato (blanco roto y algo rosado, más grandes),
     cuarzo (gris translúcido) y mica (puntos que brillan, muy pocos).
   - Semilla fija: siempre sale la misma losa.
   img/grano.png es el grano suelto (gris con alfa) que va encima de las fotos («Río»). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = 512;

function azar(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = azar(1800);

// ruido de valor que da la vuelta (periodo p celdas sobre N px)
function capa(p) {
  const g = Array.from({ length: p * p }, () => r());
  const v = (i, j) => g[((j + p) % p) * p + ((i + p) % p)];
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / N * p, fy = y / N * p, i = Math.floor(fx), j = Math.floor(fy), u = s(fx - i), w = s(fy - j);
    return (v(i, j) * (1 - u) + v(i + 1, j) * u) * (1 - w) + (v(i, j + 1) * (1 - u) + v(i + 1, j + 1) * u) * w;
  };
}
const n1 = capa(4), n2 = capa(9), n3 = capa(23);
const BASE = [201, 194, 178]; // --granito #C9C2B2
const px = new Float32Array(N * N * 3);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const nube = (n1(x, y) - .5) * 18 + (n2(x, y) - .5) * 11 + (n3(x, y) - .5) * 7;
  const fino = (r() - .5) * 13;
  const i = (y * N + x) * 3;
  px[i] = BASE[0] + nube + fino; px[i + 1] = BASE[1] + nube + fino; px[i + 2] = BASE[2] + nube * .9 + fino;
}
// una mota: mancha irregular de radio rad, mezclada con su color
function mota(cx, cy, rad, color, alfa) {
  const R = Math.ceil(rad + 1.5);
  const giro = r() * Math.PI, alarg = .5 + r() * .6;
  // cristal anguloso: el radio cambia con el ángulo (5 lóbulos al azar), no un círculo
  const lob = Array.from({ length: 5 }, () => .62 + r() * .55);
  const R2 = Math.ceil(R * 1.25);
  for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) {
    const ca = Math.cos(giro), sa = Math.sin(giro);
    const u = (dx * ca + dy * sa), v = (-dx * sa + dy * ca) / alarg;
    const ang = (Math.atan2(v, u) + Math.PI) / (2 * Math.PI) * 5, a0 = Math.floor(ang) % 5, f = ang - Math.floor(ang);
    const radA = rad * (lob[a0] * (1 - f) + lob[(a0 + 1) % 5] * f);
    const d = Math.hypot(u, v) + (r() - .5) * .7;
    if (d > radA) continue;
    const k = alfa * Math.min(1, (radA - d) / .9 + .2);
    const x = (cx + dx + N) % N, y = (cy + dy + N) % N, i = (y * N + x) * 3;
    for (let c = 0; c < 3; c++) px[i + c] = px[i + c] * (1 - k) + color[c] * k;
  }
}
const lanza = (n, f) => { for (let k = 0; k < n; k++) f(Math.floor(r() * N), Math.floor(r() * N)); };
// cuarzo: gris translúcido, manchas medianas
lanza(420, (x, y) => mota(x, y, 2.5 + r() * 5, [170, 166, 158], .28 + r() * .2));
// feldespato: blanco roto, alguno rosado
lanza(380, (x, y) => mota(x, y, 2 + r() * 5, r() < .3 ? [224, 204, 190] : [229, 223, 211], .3 + r() * .3));
// biotita: negras, pequeñas y abundantes, a veces en grupos
lanza(900, (x, y) => { mota(x, y, .7 + r() * 1.7, [52, 47, 42], .7 + r() * .3); if (r() < .25) mota(x + 2, y + 1, .8 + r(), [62, 56, 50], .6); });
// mica: puntos que brillan
lanza(140, (x, y) => mota(x, y, .45 + r() * .5, [255, 252, 244], .85));

const buf = Buffer.alloc(N * N * 3);
for (let i = 0; i < px.length; i++) buf[i] = Math.max(0, Math.min(255, Math.round(px[i])));
const img = sharp(buf, { raw: { width: N, height: N, channels: 3 } });
fs.mkdirSync(path.join(RAIZ, 'img'), { recursive: true });
await img.clone().webp({ quality: 72 }).toFile(path.join(RAIZ, 'img/granito.webp'));
await img.clone().jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(RAIZ, 'img/granito.jpg'));

// grano suelto para las fotos: 256×256, gris medio con alfa aleatoria
const G = 160, gb = Buffer.alloc(G * G * 2);
for (let i = 0; i < G * G; i++) { const v = r(); gb[i * 2] = v > .5 ? 255 : 0; gb[i * 2 + 1] = Math.round(Math.abs(v - .5) * 2 * 5) * 9; }
await sharp(gb, { raw: { width: G, height: G, channels: 2 } }).png({ compressionLevel: 9 }).toFile(path.join(RAIZ, 'img/grano.png'));
for (const f of ['img/granito.webp', 'img/granito.jpg', 'img/grano.png']) console.log(f, (fs.statSync(path.join(RAIZ, f)).size / 1024).toFixed(1) + ' KB');
