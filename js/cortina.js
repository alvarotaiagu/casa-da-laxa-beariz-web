/* ------------------------------------------------------------------
   Casa da Laxa · cortina «La laxa»
   1. CASA DA LAXA se talla letra a letra (una máscara que avanza como un
      cincel, con su filo de luz y unas lascas que saltan).
   2. «Magros · Beariz» y la línea fina «hacia 1800».
   3. La losa se parte por la veta: la grieta (la misma de la portada y
      del pie, semilla fija) baja de arriba abajo.
   4. Las dos mitades se separan con expo.inOut (la izquierda gira un poco
      hacia fuera) y por la grieta aparece la portada, que ya se mueve:
      Laxa.web.abrir() dispara alAbrirse() justo cuando EMPIEZA a abrirse.
   Se salta si la página tardó más de 2 s; se retira SIEMPRE (finally).
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const W = window.Laxa && window.Laxa.web;
  const c = document.getElementById('cortina');
  if (!W) return;                                     // sin main.js: la red de seguridad del <head> la quita
  if (!c || W.fuera) { W.abrir(); return; }
  if (!W.motion || performance.now() > 2000 || document.hidden) { W.retirarCortina(); W.abrir(); return; }

  const NS = 'http://www.w3.org/2000/svg';
  const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));
  const EXPO_IO = 'cubic-bezier(.87,0,.13,1)', SALE = 'cubic-bezier(.16,1,.3,1)';
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const anima = (el, kf, op) => el.animate(kf, Object.assign({ fill: 'forwards', easing: SALE }, op));
  // un tween propio con rAF para atributos SVG (la máscara del cincel)
  const salida = (t) => 1 - Math.pow(1 - t, 3);
  function tween(ms, fn, ease) {
    return new Promise((res) => {
      let previo = performance.now(), hecho = 0;
      const paso = (ahora) => {
        // reloj que traga atascos: un salto de más de 100 ms cuenta como 1/30 s
        const dt = ahora - previo; previo = ahora;
        hecho += dt > 100 ? 33 : Math.max(0, dt);
        const t = Math.min(1, hecho / ms);
        fn((ease || salida)(t));
        if (t < 1) requestAnimationFrame(paso); else res();
      };
      requestAnimationFrame(paso);
    });
  }

  document.documentElement.classList.add('cortina-activa');
  W.lenis && W.lenis.stop();

  /* ---------- la grieta: donde se partirá la losa ---------- */
  // en escritorio, a la altura del borde izquierdo de la foto de la portada (por ahí aparece el río)
  const losaFoto = document.querySelector('.portada__losa');
  let cx = 50;
  if (losaFoto && innerWidth >= 1000) {
    const r = losaFoto.getBoundingClientRect();
    if (r.width > 0) cx = Math.min(70, Math.max(35, (r.left + r.width * .04) / innerWidth * 100));
  }
  const P = W.GRIETA.map(([dx, y]) => [cx + dx * (innerWidth < 700 ? 1.6 : 1), y]);
  const pct = (v) => v.toFixed(2) + '%';
  const izq = 'polygon(0 0, ' + P.map(([x, y]) => pct(x) + ' ' + pct(y)).join(', ') + ', 0 100%)';
  const der = 'polygon(100% 0, 100% 100%, ' + P.slice().reverse().map(([x, y]) => pct(x) + ' ' + pct(y)).join(', ') + ')';
  const mIzq = c.querySelector('.cortina__mitad--izq'), mDer = c.querySelector('.cortina__mitad--der');
  mIzq.style.clipPath = izq; mDer.style.clipPath = der;
  const d = 'M' + P.map(([x, y]) => x.toFixed(2) + ' ' + y.toFixed(2)).join(' L');
  $$('.cortina__grieta path', c).forEach((p) => p.setAttribute('d', d));
  const grieta = c.querySelector('.cortina__grieta');

  /* ---------- el cincel: una máscara por letra ---------- */
  const defs = c.querySelector('.cortina__defs defs');
  const variantes = ['ancho', 'alto'].map((v) => ({ v, svgs: $$('.cortina__nombre--' + v, c) }));
  let letras = [];      // [{ rects:[rect], filos:[rect], x, y, w, h, svg }]
  function prepararMascaras() {
    const visible = variantes.find((x) => x.svgs[0].getBoundingClientRect().width > 0) || variantes[0];
    const svg0 = visible.svgs[0];
    const g0 = svg0.querySelector('.cortina__letras');
    // ajustar el viewBox al nombre real (ya con Gloock): que llene su sitio
    const bb = g0.getBBox();
    const vb = [bb.x - 24, bb.y - 24, bb.width + 48, bb.height + 48].map((n) => n.toFixed(1)).join(' ');
    visible.svgs.forEach((s) => s.setAttribute('viewBox', vb));
    const m = document.createElementNS(NS, 'mask');
    m.id = 'cincel-' + visible.v;
    m.setAttribute('maskUnits', 'userSpaceOnUse');
    ['x', 'y'].forEach((k) => m.setAttribute(k, -5000));
    ['width', 'height'].forEach((k) => m.setAttribute(k, 10000));
    defs.appendChild(m);
    $$('text', g0).forEach((t) => {
      const n = t.getNumberOfChars();
      for (let i = 0; i < n; i++) {
        if (!t.textContent[i].trim()) continue;
        const e = t.getExtentOfChar(i);
        const L = { x: e.x - 6, y: e.y - 10, w: e.width + 12, h: e.height + 20, rects: [], filos: [] };
        const r = document.createElementNS(NS, 'rect');
        Object.entries({ x: L.x, y: L.y, width: 0, height: L.h, fill: '#fff' }).forEach(([k, v]) => r.setAttribute(k, v));
        m.appendChild(r);
        L.rects.push(r);
        letras.push(L);
      }
    });
    // el filo de luz del cincel, uno en cada mitad
    visible.svgs.forEach((s) => {
      s.querySelector('.cortina__letras').setAttribute('mask', 'url(#' + m.id + ')');
      letras.forEach((L) => {
        const f = document.createElementNS(NS, 'rect');
        Object.entries({ x: L.x, y: L.y + 8, width: 3.2, height: L.h - 16, fill: 'rgba(255,251,242,.95)', opacity: 0 }).forEach(([k, v]) => f.setAttribute(k, v));
        s.appendChild(f);
        L.filos.push(f);
      });
    });
    return svg0;
  }
  const lascas = c.querySelector('.cortina__lascas');
  function saltarLascas(svg0, L) {
    const ctm = svg0.getScreenCTM();
    if (!ctm) return;
    for (let k = 0; k < 4; k++) {
      const yy = L.y + L.h * (.25 + Math.random() * .5);
      const p = new DOMPoint(L.x + L.w, yy).matrixTransform(ctm);
      const i = document.createElement('i');
      i.style.left = p.x + 'px'; i.style.top = p.y + 'px';
      const s = .6 + Math.random() * .9;
      lascas.appendChild(i);
      const dx = 10 + Math.random() * 26, dy = -(8 + Math.random() * 18);
      i.animate([
        { transform: `translate(0,0) scale(${s}) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${90 + Math.random() * 120}deg)`, opacity: 1, offset: .45 },
        { transform: `translate(${dx * 1.5}px, ${dy + 46}px) scale(${s * .8}) rotate(240deg)`, opacity: 0 },
      ], { duration: 520 + Math.random() * 220, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).finished.then(() => i.remove(), () => {});
    }
  }

  (async function correr() {
    try {
      // la letra de verdad antes de medir (sin esperar de más: tope 700 ms)
      if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('168px Gloock'), espera(700)]);
      const svg0 = prepararMascaras();
      c.classList.add('es-preparada');
      await espera(120);

      // 1. el cincel, letra a letra
      const tallar = letras.map((L, i) => espera(i * 96).then(async () => {
        L.filos.forEach((f) => f.setAttribute('opacity', 1));
        let lanzadas = false;
        await tween(240, (k) => {
          const w = (L.w * k).toFixed(2);
          L.rects.forEach((r) => r.setAttribute('width', w));
          L.filos.forEach((f) => f.setAttribute('x', (L.x + L.w * k - 1.6).toFixed(2)));
          if (!lanzadas && k > .35) { lanzadas = true; saltarLascas(svg0, L); }
        }, (t) => t);
        L.filos.forEach((f) => f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }));
      }));
      // 2. el lugar y la fecha, cuando van por la mitad las letras
      await espera(Math.max(0, letras.length * 96 - 360));
      $$('.cortina__lugar', c).forEach((p) => anima(p, [{ opacity: 0, letterSpacing: '.62em' }, { opacity: 1, letterSpacing: '.34em' }], { duration: 760 }));
      $$('.cortina__fecha i', c).forEach((p) => anima(p, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 640, delay: 180, easing: 'cubic-bezier(.65,0,.35,1)' }));
      $$('.cortina__fecha span', c).forEach((p) => anima(p, [{ opacity: 0 }, { opacity: 1 }], { duration: 520, delay: 320 }));
      await Promise.all(tallar);
      await espera(200);

      // 3. la losa se parte por la veta, de arriba abajo
      await anima(grieta, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 480, easing: 'cubic-bezier(.55,0,.25,1)' }).finished;
      [mIzq, mDer].forEach((m, i) => m.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${i ? 2 : -2}px, 1px)` }, { transform: 'translate(0,0)' }], { duration: 200, easing: 'linear' }));
      await espera(160);

      // 4. se abre: la portada ya se mueve detrás
      c.classList.add('es-abriendo');
      W.abrir();
      const ancho = innerWidth, x0 = ancho * cx / 100;
      anima(grieta, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'linear' });
      anima(mIzq, [{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${-(x0 + ancho * .08).toFixed(0)}px, 2%) rotate(-7deg)` }], { duration: 1080, easing: EXPO_IO });
      await anima(mDer, [{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${(ancho - x0 + ancho * .08).toFixed(0)}px, 0) rotate(2.5deg)` }], { duration: 1080, easing: EXPO_IO }).finished;
    } catch (er) {
      console.warn('Cortina:', er);
    } finally {
      W.retirarCortina();
      W.abrir();
    }
  })();

  // para las pruebas: dónde se partió
  window.__laxaCortina = { cx };
})();
