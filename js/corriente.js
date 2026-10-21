/* ------------------------------------------------------------------
   Casa da Laxa · la corriente
   Una línea de agua fina baja por la página siguiendo la corriente y une
   las secciones: nace en «La casa en cifras», hace un remolino junto a
   cada título, en «Alrededor» pasa por cada parada río abajo y muere en
   el puente, donde está el río de verdad. Va por el margen izquierdo
   (nunca encima del texto): --rio sobre claro y --espuma sobre oscuro.
   Se dibuja con el scroll (pathLength="1" + stroke-dashoffset escrito a
   mano, sin tween: no hay autoRound que lo redondee). En la sobria, recta
   y ya dibujada; con movimiento reducido, entera y quieta.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const W = window.Laxa && window.Laxa.web;
  const svg = document.getElementById('corriente');
  if (!W || !svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const main = svg.parentElement;
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const el = (t, a, padre) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (padre || svg).appendChild(e); return e; };

  let tabla = null, caminos = [], alto = 0;
  const visible = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';

  // Catmull-Rom → cúbicas de Bézier: una curva suave que pasa por todos los puntos
  // y a la vez la tabla longitud → altura, muestreando cada cúbica aquí mismo (getPointAtLength
  // sobre un trazo tan largo costaba 2,5 s en un móvil de gama media)
  function curva(P) {
    let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
    const lon = [0], alt = [P[0][1]];
    let acum = 0, px = P[0][0], py = P[0][1], ymax = P[0][1];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      for (let k = 1; k <= 6; k++) {
        const t = k / 6, u = 1 - t;
        const x = u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0];
        const y = u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1];
        acum += Math.hypot(x - px, y - py); px = x; py = y; ymax = Math.max(ymax, y);
        lon.push(acum); alt.push(ymax);
      }
    }
    return { d, lon: Float32Array.from(lon), alt: Float32Array.from(alt), L: acum };
  }

  function construir() {
    const ini = document.getElementById('cifras'), fin = document.getElementById('puente');
    if (!ini || !fin) return;
    const sobria = W.sobria();
    const top0 = main.getBoundingClientRect().top + scrollY;
    const y = (e) => e.getBoundingClientRect().top + scrollY - top0;
    alto = main.offsetHeight;
    const ancho = main.clientWidth;
    svg.setAttribute('width', ancho); svg.setAttribute('height', alto);
    svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
    svg.style.height = alto + 'px';
    const env = ini.querySelector('.env');
    const lado = parseFloat(getComputedStyle(env).paddingLeft) || 24;
    const x0 = env.getBoundingClientRect().left + lado * .5;
    const movil = innerWidth < 700;
    const R = Math.min(lado * .22, 20);
    const A = sobria ? 0 : Math.min(lado * .12, 12);
    const yIni = y(ini) + 40, yFin = y(fin) + 60;

    // los sucesos por el camino: remolinos junto a los títulos y paradas río abajo
    const suc = [];
    if (!sobria) {
      $$('[data-remolino]').forEach((h) => {
        if (!visible(h)) return;
        const yy = y(h) + Math.min(parseFloat(getComputedStyle(h).fontSize) || 40, 64) * .55;
        if (yy > yIni + 30 && yy < yFin - 30) suc.push({ t: 'r', y: yy });
      });
      $$('[data-corriente-paso]').forEach((p) => {
        if (!visible(p)) return;
        const r = p.getBoundingClientRect();
        suc.push({ t: 'p', y: r.top + scrollY - top0 + r.height / 2, x: r.left + r.width / 2 - main.getBoundingClientRect().left });
      });
    }
    suc.sort((a, b) => a.y - b.y);
    const pasos = suc.filter((s) => s.t === 'p');
    const zonaP = pasos.length ? [pasos[0].y - 190, pasos[pasos.length - 1].y + 150] : [Infinity, -Infinity];

    const P = [[x0, yIni]];
    const meandro = (yy) => x0 + A * Math.sin(yy / 170 + 1.3) * Math.sin(yy / 610);
    let yy = yIni, k = 0;
    while (yy < yFin) {
      const s = suc[k];
      const paso = 34;
      if (s && s.y <= yy + paso) {
        if (s.t === 'r') {
          // remolino: un giro y cuarto que se cierra, hacia fuera (a la izquierda, lejos del texto)
          const cx = x0 - R, vueltas = 1.25, n = 16;
          P.push([x0, s.y - R * 1.6]);
          for (let i = 0; i <= n; i++) {
            const t = i / n, th = t * Math.PI * 2 * vueltas, r = R * (1 - .38 * t);
            P.push([cx + r * Math.cos(th), s.y + r * Math.sin(th)]);
          }
          yy = s.y + R * 1.9;
          P.push([meandro(yy), yy]);
        } else {
          P.push([s.x, s.y]);
          yy = s.y + 20;
        }
        k++;
        continue;
      }
      yy += paso;
      if (yy > zonaP[0] && yy < zonaP[1]) continue;       // entre paradas manda la curva
      P.push([meandro(yy), Math.min(yy, yFin)]);
    }
    if (P[P.length - 1][1] < yFin) P.push([x0, yFin]);

    const C = curva(P), d = C.d;
    svg.textContent = '';
    // los tramos oscuros y claros, por secciones
    const oscuros = $$('[data-tono="oscuro"]', main).filter(visible).map((s) => [y(s), y(s) + s.offsetHeight]).sort((a, b) => a[0] - b[0]);
    const defs = el('defs', {});
    const cO = el('clipPath', { id: 'c-osc', clipPathUnits: 'userSpaceOnUse' }, defs);
    const cC = el('clipPath', { id: 'c-cla', clipPathUnits: 'userSpaceOnUse' }, defs);
    let ult = 0;
    oscuros.forEach(([a, b]) => { el('rect', { x: -50, y: a, width: ancho + 100, height: b - a }, cO); if (a > ult) el('rect', { x: -50, y: ult, width: ancho + 100, height: a - ult }, cC); ult = Math.max(ult, b); });
    el('rect', { x: -50, y: ult, width: ancho + 100, height: Math.max(0, alto - ult) }, cC);
    const grueso = movil ? 1.15 : 1.6;
    caminos = [
      el('path', { d, class: 'c-claro', 'clip-path': 'url(#c-cla)', pathLength: 1, 'stroke-width': grueso }),
      el('path', { d, class: 'c-oscuro', 'clip-path': 'url(#c-osc)', pathLength: 1, 'stroke-width': grueso }),
    ];
    el('circle', { cx: x0, cy: yIni, r: movil ? 2.6 : 3.4, class: 'c-fuente' });
    caminos.forEach((c) => { c.style.strokeDasharray = '1 1'; });

    // tabla longitud → altura más baja alcanzada (los remolinos suben un poco: se usa el máximo)
    tabla = { L: C.L, lon: C.lon, y: C.alt, top0 };
    dibujar();
  }

  let pend = 0;
  function dibujar() {
    pend = 0;
    if (!tabla) return;
    let p = 1;
    if (W.motion && !W.sobria()) {
      const meta = scrollY + W.altoVista * .66 - tabla.top0;
      const Y = tabla.y, N = Y.length - 1;
      if (meta <= Y[0]) p = 0;
      else if (meta >= Y[N]) p = 1;
      else { let a = 0, b = N; while (b - a > 1) { const c = (a + b) >> 1; if (Y[c] < meta) a = c; else b = c; } p = tabla.lon[b] / tabla.L; }
    }
    const off = (1 - p).toFixed(5);
    caminos.forEach((c) => { c.style.strokeDashoffset = off; });
    svg.dataset.dibujado = p.toFixed(3);
  }
  addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(dibujar); }, { passive: true });

  // se rehace solo si cambia el alto de la página de verdad (los módulos montan, el pin de la
  // fachada…) o el ancho; la barra del móvil no cambia nada de esto
  let tRe = 0, altoVisto = 0;
  const rehacer = () => { clearTimeout(tRe); tRe = setTimeout(construir, 220); };
  if ('ResizeObserver' in window) new ResizeObserver(() => { const h = main.offsetHeight; if (Math.abs(h - altoVisto) > 2) { altoVisto = h; rehacer(); } }).observe(main);
  addEventListener('laxa:resize', rehacer);
  addEventListener('laxa:densidad', rehacer);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rehacer);
  addEventListener('load', rehacer);
  construir();
  window.__laxaCorriente = { construir, get tabla() { return tabla; } };
})();
