/* ------------------------------------------------------------------
   Casa da Laxa · módulo «Dos siglos» (Fachada)
   La fachada de rg-02 dibujada en SVG (img/fachada/fachada.svg, generado por
   pruebas/fachada-dibujo.py) se levanta con el scroll: 1) los sillares caen y
   encajan de abajo arriba, 2) la columna y la losa, 3) la solaina tabla a tabla,
   4) las losas de pizarra del tejado, 5) la foto real se funde encima.

   Contrato: window.Laxa.fachada.montar(el, { movimiento, densidad }) → { destruir }.
   El HTML de `el` es el respaldo (foto + paradas): se oculta solo cuando el dibujo
   ya está montado, y vuelve con destruir() o si algo falla.

   Fijado: CSS sticky dentro de un bloque alto (sin pin-spacer). Si algún ancestro
   rompe el sticky (overflow hidden/auto), se fija con el pin de ScrollTrigger; si
   tampoco hay ScrollTrigger, se queda quieto y completo.
   Progreso: ScrollTrigger (el de la web, no se crea otro) o, sin él, el scroll.
   Sin requestAnimationFrame mientras no se mueve nada.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var guion = document.currentScript && document.currentScript.src;
  var base = function (ruta) {
    try { return guion ? new URL(ruta, guion).href : ruta.replace(/^\.\.\//, ''); } catch (e) { return ruta.replace(/^\.\.\//, ''); }
  };

  var VB = [0, 0, 1024, 704];             // viewBox del dibujo (coordenadas de la foto rg-02)
  var RECORTE = [0, 0, 1024, 768];        // qué trozo de rg-02 es la foto «fachada» de la web (entera)
  var FOTO_DE = 0.885, FOTO_A = 0.975;    // la foto se funde en este tramo del progreso
  var FASES = [
    { de: 0, txt: 'Piedra' }, { de: 0.5, txt: 'Columna y losa' }, { de: 0.6, txt: 'Solaina' },
    { de: 0.76, txt: 'Tejado' }, { de: FOTO_DE, txt: 'La foto' }];
  var PARADAS_DE = [0, 0.5, FOTO_DE];
  var PARADAS_DEF = [
    { ano: 'Hacia 1800', txt: 'Una casa de aldea de granito en Magros: sillares grandes en la esquina, piedra menuda entre ellos y una losa de piedra bajo la solaina. «Laxa» es losa en gallego.' },
    { ano: '1999', txt: 'Restaurada entera. Por fuera, la solaina de madera rojiza y el tejado de losa de pizarra; por dentro, piedra vista y vigas de madera.' },
    { ano: 'Hoy', txt: 'Se alquila entera: seis personas, tres dormitorios con baño y el jardín en la orilla del río.' }];
  var DUR = { c: 0.03, l: 0.026, y: 0.022, x: 0.02, b: 0.014, a: 0.012, p: 0.014, d: 0.032, f: 0.02, o: 0.03 };

  var cacheSvg = {};
  var pedirSvg = function (url) {
    if (!cacheSvg[url]) {
      cacheSvg[url] = fetch(url, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('fachada.svg ' + r.status);
        return r.text();
      });
      cacheSvg[url].catch(function () { delete cacheSvg[url]; });
    }
    return cacheSvg[url];
  };

  var lim = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var salir = function (t) { return 1 - Math.pow(1 - t, 3); };
  var vaiven = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  // cae y asienta: llega un pelo más abajo de su sitio y vuelve (el «asiento» del sillar)
  var asiento = function (t) { var c1 = 1.35, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  var leerParadas = function (el, opc) {
    if (opc.paradas && opc.paradas.length === 3) return opc.paradas;
    var lis = el.querySelectorAll('ol li');
    if (lis.length === 3) {
      var r = [];
      for (var i = 0; i < 3; i++) {
        var b = lis[i].querySelector('b, strong, h3'); var p = lis[i].querySelector('p');
        r.push({ ano: b ? b.textContent.trim() : PARADAS_DEF[i].ano, txt: p ? p.textContent.trim() : PARADAS_DEF[i].txt });
      }
      return r;
    }
    return PARADAS_DEF;
  };

  var leerFoto = function (el, opc) {
    if (opc.foto) return opc.foto;
    var img = el.querySelector('img');
    if (img && (img.currentSrc || img.getAttribute('src'))) return img.currentSrc || img.src;
    var nombre = (img && img.dataset.foto) || 'fachada';
    return base('../img/fotos/' + nombre + '-1024.jpg');
  };

  var stickyRoto = function (el) {
    var htmlVisible = getComputedStyle(document.documentElement).overflowY === 'visible';
    for (var n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      // el overflow del <body> pasa a la ventana si <html> no tiene el suyo: ahí no rompe el sticky
      if (n === document.body && htmlVisible) continue;
      var cs = getComputedStyle(n);
      if (/(hidden|auto|scroll)/.test(cs.overflowX + ' ' + cs.overflowY)) return true;
    }
    return false;
  };

  function montar(el, opciones) {
    var opc = opciones || {};
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raiz = document.documentElement;
    var vivo = true;
    var limpiar = [];
    var nodo = null, respaldo = [];
    var st = null, pinST = null, raf = 0;
    var piezas = [], foto = null, fotoCaja = null, barra = null, fasesLi = [], paradasLi = [], boceto = null;
    var p = 0, objetivo = 0, ultimo = 0, paradaAct = -1, faseAct = -1;
    var modo = '';

    var quieto = function () {
      var dens = opc.densidad || (raiz.classList.contains('densidad-sobria') ? 'sobria' : 'rio');
      if (raiz.classList.contains('densidad-sobria')) dens = 'sobria';
      return opc.movimiento === false || reduce || dens === 'sobria';
    };

    // ---------- dibujar un estado (p de 0 a 1)
    var pintar = function (v) {
      for (var i = 0; i < piezas.length; i++) {
        var q = piezas[i];
        var lt = (v - q.t) / q.dur;
        var est = lt <= 0 ? 0 : lt >= 1 ? 2 : 1;
        if (est === q.est && est !== 1) continue;
        q.est = est;
        var e = q.el, s = e.style;
        if (est === 0) {
          if (q.m === 'd') { s.strokeDashoffset = '1'; s.opacity = ''; }
          else s.opacity = '0';
          if (q.tr) { e.removeAttribute('transform'); q.tr = false; }
          continue;
        }
        if (est === 2) {
          if (q.m === 'd') s.strokeDashoffset = '0';
          s.opacity = q.m === 'o' ? '0' : '';
          if (q.tr) { e.removeAttribute('transform'); q.tr = false; }
          continue;
        }
        var cx = q.cx, cy = q.cy, tr = '', op = 1, k;
        switch (q.m) {
          case 'c':
            k = asiento(lt);
            tr = 'translate(0 ' + (-q.dist * (1 - k)).toFixed(2) + ') rotate(' + (q.giro * (1 - salir(lt))).toFixed(2) + ' ' + cx + ' ' + cy + ')';
            op = lim(lt * 4);
            break;
          case 'l': // la losa: cae con peso y rebota poco
            k = lt < 0.72 ? 1 - Math.pow(lt / 0.72, 2) : -Math.sin((lt - 0.72) / 0.28 * Math.PI) * 0.03;
            tr = 'translate(0 ' + (-q.dist * 1.6 * k).toFixed(2) + ')';
            op = lim(lt * 5);
            break;
          case 'y':
            k = Math.max(0.001, salir(lt));
            tr = 'translate(0 ' + cy + ') scale(1 ' + k.toFixed(4) + ') translate(0 ' + (-cy) + ')';
            break;
          case 'x':
            k = Math.max(0.001, salir(lt));
            tr = 'translate(' + cx + ' 0) scale(' + k.toFixed(4) + ' 1) translate(' + (-cx) + ' 0)';
            break;
          case 'b': // hoja que gira en su bisagra
            k = 0.04 + 0.96 * salir(lt);
            tr = 'translate(' + q.h + ' 0) scale(' + k.toFixed(4) + ' 1) translate(' + (-q.h) + ' 0)';
            op = lim(lt * 3);
            break;
          case 'a':
            k = 0.94 + 0.06 * salir(lt);
            tr = 'translate(' + cx + ' ' + cy + ') scale(' + k.toFixed(4) + ') translate(' + (-cx) + ' ' + (-cy) + ')';
            op = salir(lt);
            break;
          case 'p': // losa de pizarra: baja un poco, girada, y se posa
            k = salir(lt);
            tr = 'translate(0 ' + (-12 * (1 - k)).toFixed(2) + ') rotate(' + (q.giro * 2 * (1 - k)).toFixed(2) + ' ' + cx + ' ' + cy + ')';
            op = lim(lt * 3);
            break;
          case 'd':
            s.strokeDashoffset = (1 - vaiven(lt)).toFixed(4);
            break;
          case 'f':
            op = lt;
            break;
          case 'o': // polvo al asentarse la losa
            k = 0.5 + lt * 1.6;
            tr = 'translate(' + cx + ' ' + (cy - lt * 7).toFixed(2) + ') scale(' + k.toFixed(3) + ') translate(' + (-cx) + ' ' + (-cy) + ')';
            op = 0.75 * (1 - lt) * lim(lt * 6);
            break;
        }
        if (tr) { e.setAttribute('transform', tr); q.tr = true; }
        s.opacity = op >= 1 ? '' : op.toFixed(3);
      }
      if (fotoCaja) fotoCaja.style.opacity = lim((v - FOTO_DE) / (FOTO_A - FOTO_DE)).toFixed(3);
      if (boceto) boceto.style.opacity = v > FOTO_DE ? (1 - lim((v - FOTO_DE) / 0.05)).toFixed(3) : '';
      if (barra) barra.style.transform = 'scaleX(' + v.toFixed(4) + ')';
      // contenido (paradas y fases): sigue al progreso también sin animación
      var pa = v >= PARADAS_DE[2] ? 2 : v >= PARADAS_DE[1] ? 1 : 0;
      if (pa !== paradaAct) {
        paradaAct = pa;
        paradasLi.forEach(function (li, i) { li.classList.toggle('es-activa', i === pa); li.classList.toggle('es-pasada', i < pa); });
        nodo.dataset.parada = String(pa);
      }
      var fa = 0;
      for (var j = 0; j < FASES.length; j++) if (v >= FASES[j].de) fa = j;
      if (fa !== faseAct) {
        faseAct = fa;
        fasesLi.forEach(function (li, i) { li.classList.toggle('es-hecha', i <= fa); });
        nodo.dataset.fase = String(fa);
      }
      nodo.dataset.progreso = v.toFixed(3);
    };

    // ---------- bucle solo mientras el dibujo va detrás del scroll
    var paso = function (ahora) {
      raf = 0;
      if (!vivo) return;
      var dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000) || 1 / 60;
      ultimo = ahora;
      var dif = objetivo - p;
      p = Math.abs(dif) < 0.0004 ? objetivo : p + dif * (1 - Math.exp(-dt / 0.085));
      pintar(p);
      if (p !== objetivo) raf = requestAnimationFrame(paso); else ultimo = 0;
    };
    var pedir = function (v) {
      objetivo = lim(v);
      if (!raf) { ultimo = 0; raf = requestAnimationFrame(paso); }
    };
    var medir = function () {
      var r = nodo.getBoundingClientRect();
      var esc = nodo.querySelector('.fx-escena');
      var rec = nodo.offsetHeight - esc.offsetHeight;
      return rec > 0 ? -r.top / rec : (r.top < 0 ? 1 : 0);
    };

    // ---------- modos: con movimiento (fijado y por scroll) o quieto y completo
    var quitarScroll = function () {
      if (st) { st.kill(); st = null; }
      if (pinST) { pinST.kill(true); pinST = null; }
      window.removeEventListener('scroll', alScroll);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    var alScroll = function () { pedir(medir()); };
    var ponerModo = function () {
      var nuevo = quieto() ? 'quieto' : 'mov';
      if (nuevo === modo) return;
      modo = nuevo;
      quitarScroll();
      var STr = window.ScrollTrigger;
      var roto = nuevo === 'mov' && stickyRoto(nodo);
      if (nuevo === 'mov' && roto && !STr) nuevo = modo = 'quieto';
      nodo.classList.toggle('fx--mov', nuevo === 'mov');
      nodo.classList.toggle('fx--quieto', nuevo === 'quieto');
      nodo.classList.toggle('fx--pin', nuevo === 'mov' && roto);
      if (nuevo === 'quieto') {
        p = objetivo = 1;
        pintar(1);
        if (STr) { try { STr.refresh(); } catch (e) {} }
      } else {
        var esc = nodo.querySelector('.fx-escena');
        if (STr) {
          if (roto) {
            pinST = STr.create({ trigger: nodo, start: 'top top', end: function () { return '+=' + Math.max(1, nodo.offsetHeight - esc.offsetHeight); }, pin: esc, pinSpacing: false });
          }
          st = STr.create({
            trigger: nodo, start: 'top top',
            end: function () { return '+=' + Math.max(1, nodo.offsetHeight - esc.offsetHeight); },
            onUpdate: function (self) { pedir(self.progress); },
            onRefresh: function (self) { pedir(self.progress); }
          });
          try { STr.refresh(); } catch (e) {}
          p = objetivo = lim(st.progress);
        } else {
          window.addEventListener('scroll', alScroll, { passive: true });
          p = objetivo = lim(medir());
        }
        for (var i = 0; i < piezas.length; i++) piezas[i].est = -1;
        pintar(p);
      }
    };

    // ---------- construir
    var construir = function (texto) {
      if (!vivo) return;
      var paradas = leerParadas(el, opc);
      var recorte = opc.recorte || RECORTE;
      nodo = document.createElement('div');
      nodo.className = 'fx';
      var html = '';
      html += '<div class="fx-escena"><div class="fx-obra">';
      html += '<div class="fx-lienzo">' + texto.replace(/^[\s\S]*?(<svg)/, '$1') +
        '<div class="fx-foto-caja"><img class="fx-foto" alt="" decoding="async"></div></div>';
      html += '<div class="fx-fases" aria-hidden="true"><span class="fx-fases__linea"><i></i></span><ol>' +
        FASES.map(function (f) { return '<li>' + f.txt + '</li>'; }).join('') + '</ol></div>';
      html += '<p class="fx-pie">Dibujo hecho sobre la foto de la fachada.</p></div>';
      html += '<div class="fx-lado"><ol class="fx-paradas">';
      paradas.forEach(function (pa, i) {
        html += '<li class="fx-parada"><span class="fx-parada__ano">' + escapar(pa.ano) + '</span><p>' + escapar(pa.txt) + '</p>' +
          (i === 2 ? '<a class="fx-boton" href="#reservar">Ver fechas</a>' : '') + '</li>';
      });
      html += '</ol></div></div>';
      nodo.innerHTML = html;
      var svg = nodo.querySelector('svg');
      if (!svg) throw new Error('fachada.svg sin <svg>');
      svg.setAttribute('focusable', 'false');
      foto = nodo.querySelector('.fx-foto');
      fotoCaja = nodo.querySelector('.fx-foto-caja');
      var vw = VB[2], vh = VB[3];
      foto.style.left = ((recorte[0] - VB[0]) / vw * 100) + '%';
      foto.style.top = ((recorte[1] - VB[1]) / vh * 100) + '%';
      foto.style.width = (recorte[2] / vw * 100) + '%';
      foto.style.height = (recorte[3] / vh * 100) + '%';
      foto.src = leerFoto(el, opc);
      barra = nodo.querySelector('.fx-fases__linea i');
      fasesLi = Array.prototype.slice.call(nodo.querySelectorAll('.fx-fases li'));
      paradasLi = Array.prototype.slice.call(nodo.querySelectorAll('.fx-parada'));
      boceto = svg.querySelector('.fx-boceto');
      var els = svg.querySelectorAll('[data-t]');
      for (var i = 0; i < els.length; i++) {
        var e = els[i], m = e.getAttribute('data-m') || 'f';
        var c = (e.getAttribute('data-c') || '0 0').split(' ');
        piezas.push({
          el: e, t: +e.getAttribute('data-t'), m: m, dur: DUR[m] || 0.02,
          cx: +c[0], cy: +c[1], h: +(e.getAttribute('data-h') || c[0]),
          dist: 30 + (i * 37 % 23), giro: (i * 53 % 9) - 4, est: -1, tr: false
        });
      }
      var boton = nodo.querySelector('.fx-boton');
      var alBoton = function (ev) {
        var L = window.Laxa;
        if (L && typeof L.reservar === 'function') { ev.preventDefault(); L.reservar(); }
      };
      boton.addEventListener('click', alBoton);

      // respaldo fuera (se guarda para destruir)
      respaldo = Array.prototype.slice.call(el.children).map(function (n) { var h = n.hidden; n.hidden = true; return { n: n, h: h }; });
      el.appendChild(nodo);
      el.dataset.montado = '1';

      ponerModo();
      // el mando de densidades (?revision) cambia la clase de <html>: se sigue en vivo
      var mo = new MutationObserver(ponerModo);
      mo.observe(raiz, { attributes: true, attributeFilter: ['class'] });
      limpiar.push(function () { mo.disconnect(); });
      var mq = matchMedia('(prefers-reduced-motion: reduce)');
      var alMq = function () { reduce = mq.matches; ponerModo(); };
      if (mq.addEventListener) { mq.addEventListener('change', alMq); limpiar.push(function () { mq.removeEventListener('change', alMq); }); }
    };

    var escapar = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    var url = opc.svg || base('../img/fachada/fachada.svg');
    pedirSvg(url).then(construir).catch(function (err) {
      // sin dibujo: se queda el respaldo tal cual
      if (nodo && nodo.parentNode) nodo.parentNode.removeChild(nodo);
      respaldo.forEach(function (r) { r.n.hidden = r.h; });
      if (window.console) console.warn('[fachada] se queda el respaldo:', err && err.message);
    });

    return {
      destruir: function () {
        vivo = false;
        quitarScroll();
        limpiar.forEach(function (f) { try { f(); } catch (e) {} });
        if (nodo && nodo.parentNode) nodo.parentNode.removeChild(nodo);
        respaldo.forEach(function (r) { r.n.hidden = r.h; });
        delete el.dataset.montado;
        piezas = [];
        if (window.ScrollTrigger) { try { window.ScrollTrigger.refresh(); } catch (e) {} }
      }
    };
  }

  window.Laxa = window.Laxa || {};
  window.Laxa.fachada = { montar: montar };
})();
