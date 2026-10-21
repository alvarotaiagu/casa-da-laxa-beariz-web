/* ------------------------------------------------------------------
   Casa da Laxa · Magros, Beariz · «Á beira do río» · lo común de la página
   - Lenis suaviza el scroll (y mueve el ScrollTrigger de los módulos).
   - Monta los tres módulos (Río, Fachada, Casa) con su respaldo.
   - La cortina la anima js/cortina.js; aquí, su retirada y alAbrirse().
   - La corriente va en js/corriente.js; el motor, en js/reserva.js.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  const raiz = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // «con-movimiento» solo sin movimiento reducido: si no, los titulares partidos se quedarían escondidos
  const motion = !quieto;
  if (motion) raiz.classList.add('con-movimiento');
  const sobria = () => raiz.classList.contains('densidad-sobria');
  const params = new URLSearchParams(location.search);
  const sinGL = params.has('sin-gl');

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const Laxa = (window.Laxa = window.Laxa || {});
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // la grieta de la losa (semilla fija 1999): [desvío en % del ancho, altura en %]. La misma en la
  // cortina, en el borde de la foto de la portada y en el pie (ahí, ya escrita en el CSS).
  const GRIETA = [[0, 0], [-0.85, 3.12], [-1.88, 6.48], [-1.05, 8.95], [-1.37, 13.92], [-1.58, 19.69], [-2.39, 25.48], [-1.69, 29.48], [-2.91, 33.33], [-2.81, 37.58], [-3.56, 41.37], [-3.6, 44.24], [-2.41, 47.35], [-2.33, 49.35], [-1.7, 51.33], [-0.89, 55.15], [-0.14, 58.95], [0.44, 62.18], [1.66, 66.67], [2.7, 70.15], [3.47, 72.35], [3.6, 74.4], [1.94, 76.14], [0.74, 78.63], [0.06, 82.68], [-0.32, 85.54], [-3.17, 90.89], [0.37, 95.21], [1.33, 100]];

  // el resize de la barra del móvil (mismo ancho, poca altura) no rehace NADA
  let anchoVista = innerWidth, altoVista = innerHeight;
  const esBarra = () => innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160;

  /* ============ 1. titulares partidos y entradas ============ */
  function partir(h) {
    if (h.classList.contains('es-partido')) return;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    const envolver = (nodo) => {
      if (nodo.nodeType === 3) {
        const frag = document.createDocumentFragment();
        nodo.textContent.split(/([ \t\r\n]+)/).forEach((t) => {
          if (!t.trim()) { frag.appendChild(document.createTextNode(t)); return; }
          const pal = document.createElement('span');
          pal.className = 'pal';
          pal.setAttribute('aria-hidden', 'true');
          const i = document.createElement('i');
          i.textContent = t;
          i.style.setProperty('--n', n++);
          pal.appendChild(i);
          frag.appendChild(pal);
        });
        nodo.replaceWith(frag);
      } else if (nodo.nodeType === 1 && !nodo.classList.contains('talla')) Array.from(nodo.childNodes).forEach(envolver);
    };
    Array.from(h.childNodes).forEach(envolver);
    h.classList.add('es-partido');
  }
  const vistos = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('es-visto'); vistos.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  if (motion) {
    $$('[data-partir]').forEach((h) => { partir(h); vistos.observe(h); });
    $$('[data-revela]').forEach((el, i) => { el.style.setProperty('--d', i % 3); vistos.observe(el); });
  }

  /* ============ 2. Lenis (y el ScrollTrigger de los módulos) ============ */
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !quieto) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, lerp: 0.11 });
    if (G && ST) {
      lenis.on('scroll', ST.update);
      G.ticker.add((t) => lenis.raf(t * 1000));
    } else {
      const bucle = (t) => { lenis.raf(t); requestAnimationFrame(bucle); };
      requestAnimationFrame(bucle);
    }
  }
  const cabAlto = () => parseFloat(getComputedStyle(raiz).getPropertyValue('--cab')) || 72;
  const irA = (sel) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - cabAlto() - 8;
    if (lenis) lenis.scrollTo(y, { duration: 1.3 });
    else scrollTo({ top: y, behavior: quieto ? 'auto' : 'smooth' });
  };
  // los módulos llaman aquí para reservar: baja al simulador
  Laxa.reservar = () => irA('#reservar');

  /* ============ 3. módulos: Río (portada y puente), Fachada y Casa ============ */
  // se montan al acercarse; el de la portada, cuando la losa EMPIEZA a abrirse. Si su JS falla
  // o no está, se queda el respaldo del HTML. Se guarda el respaldo para volver a montar al
  // cambiar de densidad.
  const montados = new Map();     // el → { inst, respaldo }
  const opciones = (el) => {
    const op = { movimiento: motion, densidad: sobria() ? 'sobria' : 'rio' };
    if (el.dataset.modulo === 'rio' && sinGL) op.gl = false;
    return op;
  };
  function montarModulo(el) {
    if (montados.has(el)) return;
    const mod = Laxa[el.dataset.modulo];
    if (!mod || typeof mod.montar !== 'function') return;
    const respaldo = el.innerHTML;
    try {
      const inst = mod.montar(el, opciones(el));
      montados.set(el, { inst, respaldo });
    } catch (er) {
      console.warn('Módulo ' + el.dataset.modulo + ': se queda el respaldo', er);
    }
  }
  function remontarTodos() {
    // sobre una copia: montar otra vez mete la entrada de nuevo en el Map (y forEach la visitaría sin fin)
    [...montados].forEach(([el, { inst, respaldo }]) => {
      try { inst && inst.destruir && inst.destruir(); } catch (er) { console.warn(er); }
      el.innerHTML = respaldo;
      delete el.dataset.montado;
      montados.delete(el);
      montarModulo(el);
    });
    if (ST) ST.refresh();
  }
  // la fachada crece al montarse (sección fijada): se reserva su alto si va a moverse
  const reservarFachada = () => { const f = $('[data-modulo="fachada"]'); if (f) f.classList.toggle('es-reservado', !!(Laxa.fachada && motion && !sobria())); };
  reservarFachada();
  const portadaRio = $('#portada [data-modulo]');
  if ('IntersectionObserver' in window) {
    const ioMod = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { ioMod.unobserve(e.target); montarModulo(e.target); }
    }), { rootMargin: '900px 0px' });
    $$('[data-modulo]').forEach((el) => { if (el !== portadaRio) ioMod.observe(el); });
  } else $$('[data-modulo]').forEach((el) => { if (el !== portadaRio) montarModulo(el); });

  /* ============ 4. cortina: alAbrirse() y su retirada ============ */
  const cortina = $('#cortina');
  let fuera = false, abierta = false;
  const alAbrir = [];
  const alAbrirse = (fn) => { if (abierta) fn(); else alAbrir.push(fn); };
  function abrir() {
    if (abierta) return;
    abierta = true;
    alAbrir.splice(0).forEach((fn) => { try { fn(); } catch (er) { console.warn(er); } });
  }
  alAbrirse(() => {
    $('#portada').classList.add('abierta');
    if (portadaRio) montarModulo(portadaRio);
  });
  function retirarCortina() {
    if (fuera) return;
    fuera = true;
    clearTimeout(window.__redCortina);
    if (cortina) cortina.hidden = true;
    raiz.classList.remove('cortina-activa');
    raiz.classList.add('cortina-fuera');
    if (lenis) lenis.start();
    if (G) G.ticker.lagSmoothing(0);      // al retirar la cortina, nunca antes
    if (ST) ST.refresh();
    abrir();
    mostrarCookies();
  }

  /* ============ 5. cabecera, menú y anclas ============ */
  const cab = $('#cab');
  const btnMenu = $('#menu-btn'), menu = $('#menu-movil');
  const cerrarMenu = () => {
    document.body.classList.remove('menu');
    btnMenu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  };
  btnMenu.addEventListener('click', () => {
    const abierto = document.body.classList.toggle('menu');
    btnMenu.setAttribute('aria-expanded', String(abierto));
    menu.setAttribute('aria-hidden', String(!abierto));
    if (lenis) abierto ? lenis.stop() : lenis.start();
  });
  $$('a[href^="#"]').forEach((a) => {
    const destino = a.getAttribute('href');
    if (destino.length < 2) return;
    a.addEventListener('click', (e) => {
      if (!$(destino)) return;
      e.preventDefault();
      cerrarMenu();
      irA(destino);
      setTimeout(() => {
        const t = $(destino);
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
        t.focus({ preventScroll: true });
      }, 1000);
    });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu')) { cerrarMenu(); btnMenu.focus(); } });

  /* ============ 6. cookies (y el mando se aparta mientras están) ============ */
  const ck = $('#cookies');
  const LLAVE = 'casadalaxa-cookies';
  const leer = () => { try { return localStorage.getItem(LLAVE); } catch (e) { return null; } };
  const guardar = (v) => { try { localStorage.setItem(LLAVE, v); } catch (e) {} };
  const mando = $('#mando');
  const verMando = () => { if (mando && raiz.classList.contains('revision')) mando.hidden = !ck.hidden; };
  let cookiesPendientes = !leer();
  function mostrarCookies() {
    if (!cookiesPendientes) { verMando(); return; }
    cookiesPendientes = false;
    ck.hidden = false;
    verMando();
  }
  const cerrarCk = (v) => { guardar(v); ck.hidden = true; verMando(); };
  $('#ck-si').addEventListener('click', () => cerrarCk('si'));
  $('#ck-no').addEventListener('click', () => cerrarCk('no'));
  $('#abrir-cookies').addEventListener('click', () => { ck.hidden = false; verMando(); $('#ck-si').focus(); });
  // sin cortina o con movimiento reducido: fuera ya (cortina.js llamará a abrir())
  if (!cortina || !motion) retirarCortina();
  // red de seguridad propia por si cortina.js no llega o se atasca
  setTimeout(retirarCortina, 7000);

  /* ============ 7. mapa de Google solo al pedirlo ============ */
  $('#mapa-btn').addEventListener('click', () => {
    const marco = document.createElement('iframe');
    marco.src = 'https://www.google.com/maps?q=' + encodeURIComponent('Casa da Laxa, Rúa Loureiro 25, Beariz') + '&ll=42.46028,-8.2553&z=15&output=embed';
    marco.loading = 'lazy';
    marco.title = 'Mapa con Casa da Laxa en Magros, Beariz';
    marco.referrerPolicy = 'no-referrer-when-downgrade';
    $('#mapa').appendChild(marco);
    $('#mapa-consent').remove();
  });

  /* ============ 8. visor de fotos: se abre por el NOMBRE de la foto ============ */
  const visor = $('#visor');
  const vImg = $('#visor-img'), vPie = $('#visor-pie'), vN = $('#visor-n');
  // la serie se hace de la MISMA lista de miniaturas, sin repetir nombres
  function serie() {
    const vistas = new Map();
    $$('[data-visor]').forEach((b) => {
      const n = b.dataset.visor;
      if (vistas.has(n)) return;
      const img = b.querySelector('img');
      if (!img) return;
      const anchos = (img.getAttribute('srcset') || '').split(',').map((x) => parseInt(x.trim().split(/\s+/)[1], 10)).filter(Boolean).sort((a, z) => a - z);
      const pie = b.closest('figure, li')?.querySelector('figcaption, h3');
      vistas.set(n, { n, alt: img.alt, pie: pie ? pie.textContent.replace(/\s+/g, ' ').trim() : img.alt, anchos: anchos.length ? anchos : [800], ancho: +img.getAttribute('width') || 1024, alto: +img.getAttribute('height') || 768 });
    });
    return [...vistas.values()];
  }
  let lista = [], actual = 0, origen = null;
  function poner(i) {
    actual = (i + lista.length) % lista.length;
    const f = lista[actual];
    const peq = f.anchos.includes(800) ? 800 : f.anchos[0], gran = f.anchos[f.anchos.length - 1];
    // primero la de 800 (o la menor, ya en caché), y la grande al cargar
    vImg.src = `img/fotos/${f.n}-${peq}.jpg`;
    vImg.dataset.nombre = f.n;
    vImg.alt = f.alt;
    vImg.width = f.ancho; vImg.height = f.alto;
    vImg.style.setProperty('--nat', f.ancho + 'px');
    if (gran !== peq) {
      const grande = new Image();
      grande.onload = () => { if (vImg.dataset.nombre === f.n) vImg.src = grande.src; };
      grande.src = `img/fotos/${f.n}-${gran}.jpg`;
    }
    vPie.textContent = f.pie;
    vN.textContent = (actual + 1) + ' / ' + lista.length;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-visor]');
    if (!b || !visor || typeof visor.showModal !== 'function') return;
    lista = serie();
    const i = lista.findIndex((f) => f.n === b.dataset.visor);
    if (i < 0) return;
    origen = b;
    poner(i);
    visor.showModal();
    if (lenis) lenis.stop();
  });
  if (visor) {
    $('#visor-ant').addEventListener('click', () => poner(actual - 1));
    $('#visor-sig').addEventListener('click', () => poner(actual + 1));
    $('#visor-cerrar').addEventListener('click', () => visor.close());
    visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor__fig')) visor.close(); });
    visor.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') poner(actual - 1); else if (e.key === 'ArrowRight') poner(actual + 1); });
    visor.addEventListener('close', () => { if (lenis) lenis.start(); if (origen) origen.focus({ preventScroll: true }); });
  }

  /* ============ 9. con el scroll: cabecera, el puente que se cruza y la losa del pie ============ */
  const puente = $('#puente'), pie = $('#pie');
  let pend = 0;
  function alScroll() {
    pend = 0;
    cab.classList.toggle('sc', scrollY > 24);
    // el puente: la cámara avanza (escala ≤ 1,25×, en la caja, no en el <img>)
    if (puente && motion) {
      const r = puente.getBoundingClientRect(), recorrido = r.height - altoVista;
      const p = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0;
      puente.style.setProperty('--p', p.toFixed(4));
    }
    // el pie: la grieta se suelda con la lectura y al llegar abajo el nombre está entero
    if (pie && motion && !sobria()) {
      const max = document.documentElement.scrollHeight - altoVista;
      const tramo = Math.min(pie.offsetHeight, 900);
      const k = Math.min(1, Math.max(0, 1 - (max - scrollY) / tramo));
      pie.style.setProperty('--k', (max - scrollY < 2 ? 1 : Math.pow(k, 1.3)).toFixed(4));
    }
  }
  addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(alScroll); }, { passive: true });
  if (pie && (!motion || sobria())) pie.style.setProperty('--k', 1);
  alScroll();

  /* ============ 10. MANDO DE MAQUETA (no viaja al cliente) ============ */
  if (mando && raiz.classList.contains('revision')) {
    const botones = $$('button[data-densidad]', mando);
    const pintarMando = () => botones.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === sobria())));
    botones.forEach((b) => b.addEventListener('click', () => {
      const antes = sobria();
      raiz.classList.toggle('densidad-sobria', b.dataset.densidad === 'sobria');
      const u = new URL(location.href);
      if (b.dataset.densidad === 'sobria') u.searchParams.set('densidad', 'sobria'); else u.searchParams.delete('densidad');
      history.replaceState(null, '', u);
      pintarMando();
      if (antes === sobria()) return;
      pie.style.setProperty('--k', sobria() || !motion ? 1 : 0);
      alScroll();
      reservarFachada();
      remontarTodos();
      window.dispatchEvent(new CustomEvent('laxa:densidad', { detail: sobria() ? 'sobria' : 'rio' }));
    }));
    pintarMando();
    verMando();
  }
  /* fin del MANDO DE MAQUETA */

  /* ============ 11. resize de verdad (no el de la barra del móvil) ============ */
  let tRes = 0;
  addEventListener('resize', () => {
    if (esBarra()) return;
    clearTimeout(tRes);
    tRes = setTimeout(() => { anchoVista = innerWidth; altoVista = innerHeight; window.dispatchEvent(new CustomEvent('laxa:resize')); alScroll(); }, 200);
  });

  // lo que usan js/cortina.js y js/corriente.js
  Laxa.web = {
    motion, quieto, sobria, lenis, irA, GRIETA, alAbrirse, abrir, retirarCortina,
    get fuera() { return fuera; }, get altoVista() { return altoVista; }, montados,
  };
})();
