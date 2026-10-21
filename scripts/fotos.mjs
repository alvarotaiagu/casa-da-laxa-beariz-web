/* Prepara las fotos de la web desde las de sus portales (ref/fotos: Ruralgest, 1024x768;
   ref/fotos-cr: casasrurales.net, 640 px). Uso: node scripts/fotos.mjs
   - Recortes declarados en scripts/fotos-lista.json. La geometría de `rio-ventana-hero` (la vista
     desde la ventana de casasrurales.net, entera, 640×520) y el recorte de `puente` (rg-01 sin las
     bandas negras) son los que usa el módulo Río para sus máscaras: si se cambian aquí, hay que
     rehacer img/mascaras/ (python -I pruebas/rio-mascaras.py).
   - `fuerza` (0–1) suaviza la gradación en las fotos que ya tienen buen color.
   - Gradación común para que parezcan de la misma sesión (son fotos viejas con tono HDR):
     menos saturación en los verdes y los naranjas, negros más suaves, un punto más fríos.
     Las de dentro, además, medio balance de blancos «mundo gris» (vienen amarillas).
   - NUNCA amplía: anchos 480, 800 y 1024 solo si caben, más el ancho original.
   - Escribe img/fotos/<nombre>-<ancho>.{avif,webp,jpg} e img/fotos/fotos.json. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(RAIZ, 'ref');
const SALIDA = path.join(RAIZ, 'img/fotos');
fs.mkdirSync(SALIDA, { recursive: true });

const FOTOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8'));
const ANCHOS = [480, 800, 1024];

// peso suave de un tono alrededor de un centro (grados), 1 en el centro y 0 fuera de ±ancho
function peso(h, centro, ancho) {
  let d = Math.abs(h - centro); if (d > 180) d = 360 - d;
  return d >= ancho ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d / ancho);
}

function gradar(data, canales, interior, fuerza = 1) {
  const n = data.length / canales;
  // medio «mundo gris» en las de dentro
  let gr = 1, gg = 1, gb = 1;
  if (interior) {
    let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < data.length; i += canales) { sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; }
    const mr = sr / n, mg = sg / n, mb = sb / n, mm = (mr + mg + mb) / 3;
    gr = 1 + 0.5 * (mm / mr - 1); gg = 1 + 0.5 * (mm / mg - 1); gb = 1 + 0.5 * (mm / mb - 1);
  }
  const LEVANTE = 0.05; // negros más suaves
  for (let i = 0; i < data.length; i += canales) {
    let r = Math.min(1, data[i] * gr / 255), g = Math.min(1, data[i + 1] * gg / 255), b = Math.min(1, data[i + 2] * gb / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    let h = 0;
    if (c > 0) {
      if (max === r) h = 60 * (((g - b) / c) % 6);
      else if (max === g) h = 60 * ((b - r) / c + 2);
      else h = 60 * ((r - g) / c + 4);
      if (h < 0) h += 360;
    }
    let s = max === 0 ? 0 : c / max;
    const v = max;
    // menos saturación general, y aún menos en naranjas (~30º) y verdes (~95º)
    const f = 0.9 * (1 - 0.24 * peso(h, 30, 28) - 0.2 * peso(h, 95, 55));
    s *= f;
    // de vuelta a RGB
    const cc = v * s, x = cc * (1 - Math.abs(((h / 60) % 2) - 1)), m0 = v - cc;
    let rr, gg2, bb;
    if (h < 60) [rr, gg2, bb] = [cc, x, 0];
    else if (h < 120) [rr, gg2, bb] = [x, cc, 0];
    else if (h < 180) [rr, gg2, bb] = [0, cc, x];
    else if (h < 240) [rr, gg2, bb] = [0, x, cc];
    else if (h < 300) [rr, gg2, bb] = [x, 0, cc];
    else [rr, gg2, bb] = [cc, 0, x];
    r = rr + m0; g = gg2 + m0; b = bb + m0;
    // negros suaves y luces un pelo comprimidas (quita el «HDR»)
    const curva = (t) => LEVANTE + (1 - LEVANTE - 0.02) * t;
    r = curva(r); g = curva(g); b = curva(b);
    // un punto más fríos
    r *= 0.982; b = Math.min(1, b * 1.018 + 0.006);
    const o0 = data[i], o1 = data[i + 1], o2 = data[i + 2];
    data[i] = Math.round(o0 + (r * 255 - o0) * fuerza); data[i + 1] = Math.round(o1 + (g * 255 - o1) * fuerza); data[i + 2] = Math.round(o2 + (b * 255 - o2) * fuerza);
  }
  return data;
}

const salida = [];
for (const f of FOTOS) {
  const fuente = path.join(REF, f.ruta);
  if (!fs.existsSync(fuente)) throw new Error(`Falta ${fuente} (${f.nombre})`);
  let base = sharp(fuente).rotate();
  if (f.recorte) base = base.extract(f.recorte);
  const { data, info } = await base.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  gradar(data, info.channels, !!f.interior, f.fuerza ?? 1);
  const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
  const W = info.width, H = info.height;
  const unicos = [...new Set([...ANCHOS.filter((w) => w < W - 30), W])];
  for (const w of unicos) {
    let p = sharp(buf).resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' });
    if (!f.suave) p = p.sharpen({ sigma: 0.5, m1: 0.5, m2: 1 });
    const dst = path.join(SALIDA, `${f.nombre}-${w}`);
    await p.clone().avif({ quality: f.aq ?? 50, effort: 6 }).toFile(dst + '.avif');
    await p.clone().webp({ quality: f.wq ?? 74 }).toFile(dst + '.webp');
    await p.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(dst + '.jpg');
  }
  const ancho = W;
  salida.push({ nombre: f.nombre, anchos: unicos, ancho, alto: H, origen: f.ruta, recorte: f.recorte || null });
  console.log(f.nombre.padEnd(17), unicos.join(','), `${W}x${H}`);
}
fs.writeFileSync(path.join(SALIDA, 'fotos.json'), JSON.stringify(salida, null, 1));
console.log(salida.length + ' fotos');
