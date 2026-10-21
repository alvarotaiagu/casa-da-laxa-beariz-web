/* Casa da Laxa · módulo Río: en la foto real solo se mueve el agua.
   WebGL 1, un <canvas> por instancia encima del <img> del respaldo (mismo tamaño, object-fit
   replicado en el shader). El agua se deforma solo dentro de img/mascaras/<mascara>.png: ruido
   que viaja con la corriente, la foto que avanza río abajo en dos fases cruzadas, espuma que brilla
   un poco, y anillos al arrastrar. Fuera de la máscara el píxel es el de la foto, sin tocar.
   «Oír el río»: ruido rosa filtrado y burbujas, todo sintetizado con Web Audio.

   Contrato (ENCARGO.md): Laxa.rio.montar(el, { movimiento, densidad }) → { destruir() }
   - el: <div data-modulo="rio" data-foto="…" data-mascara="…"> con el respaldo dentro (<picture>).
   - Opciones extra: base ('img/'), gl (false = solo la foto), sonido (false = sin botón).
   - Sin WebGL, sin máscara, con movimiento:false o densidad sobria: se queda la foto y nada más.
   - El botón de sonido va en [data-rio-sonido] de la misma sección; si no hay, se crea dentro de el.
     Todas las instancias comparten el sonido: suena mientras alguna se ve en pantalla. */
(function () {
  'use strict';
  const Laxa = (window.Laxa = window.Laxa || {});
  if (Laxa.rio && Laxa.rio.montar) return;

  // ---- El agua de cada foto (coordenadas de la foto recortada, 0..1) ----
  // flujo: dirección de la corriente en px de la foto, a la izquierda (A) y a la derecha (B) de «corte»
  const AGUAS = {
    // portada (foto de casasrurales 640x520, nítida, entera con los marcos): los rápidos salen de debajo
    // del puente y bajan de derecha a izquierda hacia el marco; poca deformación (que corra, que no se derrita)
    'rio-ventana-hero': { flujo: [-0.76, 0.65, -0.93, 0.37], corte: [0.3, 0.56], vel: 1.1, recorrido: 4.5, turb: 1.5, brillo: 1.3, onda: 2.6, sonido: { nivel: 0.5, tono: 1 } },
    // rg-01: los rápidos de abajo a la derecha, de cerca
    puente: { flujo: [-0.88, 0.47, -0.88, 0.47], corte: [0, 1], vel: 1.3, recorrido: 10, turb: 3.4, brillo: 1.25, onda: 3.6, sonido: { nivel: 0.68, tono: 1.3 } },
  };
  const AGUA_POR_DEFECTO = { flujo: [-1, 0, -1, 0], corte: [0, 1], vel: 1, recorrido: 6, turb: 2.4, brillo: 1, onda: 3, sonido: { nivel: 0.55, tono: 1 } };
  const MAX_ONDAS = 8, VIDA_ONDA = 1.25, DPR_MAX = 1.5;

  const reducido = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const domSobria = () => {
    const h = document.documentElement;
    return h.classList.contains('densidad-sobria') || h.dataset.densidad === 'sobria';
  };

  // =====================================================================================
  // Sonido compartido: un solo AudioContext para toda la página
  // =====================================================================================
  const Sonido = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx = null, master = null, filtro = null, on = false, tBurbuja = 0, tSuspender = 0;
    const visibles = new Map();   // instancia → { nivel, tono }
    const botones = new Set();
    const audible = () => on && visibles.size > 0 && !document.hidden;
    const pintar = () => botones.forEach((b) => b.setAttribute('aria-pressed', on ? 'true' : 'false'));

    function ruidoRosa(buf) {
      // Paul Kellet: ruido blanco filtrado a −3 dB/octava; cada canal con su propia semilla
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
        // el lazo sin chasquido: los últimos 20 ms se funden con el principio
        const f = Math.floor(buf.sampleRate * 0.02);
        for (let i = 0; i < f; i++) { const k = i / f; d[d.length - f + i] = d[d.length - f + i] * (1 - k) + d[i] * k; }
      }
    }

    function crear() {
      ctx = new AC({ latencyHint: 'playback' });
      const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 6), ctx.sampleRate);
      ruidoRosa(buf);
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
      master.connect(comp); comp.connect(ctx.destination);
      const capa = (tipo, f, q, g) => {
        const bq = ctx.createBiquadFilter(); bq.type = tipo; bq.frequency.value = f; bq.Q.value = q;
        const ga = ctx.createGain(); ga.gain.value = g;
        src.connect(bq); bq.connect(ga); ga.connect(master);
        return { bq, ga };
      };
      const cuerpo = capa('lowpass', 460, 0.6, 0.85);      // el fondo grave del agua que corre
      const chapoteo = capa('bandpass', 1150, 1.1, 0.55);  // el borboteo, que respira
      const siseo = capa('highpass', 4200, 0.5, 0.07);     // la espuma
      const lfo = (f, prof, destino) => {
        const o = ctx.createOscillator(); o.frequency.value = f;
        const g = ctx.createGain(); g.gain.value = prof;
        o.connect(g); g.connect(destino); o.start();
      };
      // frecuencias que no casan entre sí: el agua nunca repite el mismo compás
      lfo(0.071, 0.2, cuerpo.ga.gain);
      lfo(0.173, 330, chapoteo.bq.frequency);
      lfo(0.291, 150, chapoteo.bq.frequency);
      lfo(0.413, 0.17, chapoteo.ga.gain);
      lfo(0.937, 0.025, siseo.ga.gain);
      src.start();
      filtro = chapoteo.bq;
    }

    // burbujas: un seno que sube de tono y se apaga en unas centésimas, como el agua entre piedras
    function burbuja() {
      tBurbuja = 0;
      if (!ctx || !audible()) return;
      const t = ctx.currentTime, f0 = 360 + Math.random() * 900, d = 0.035 + Math.random() * 0.07;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + Math.random() * 0.9), t + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.045, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.05);
      o.connect(g);
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8; g.connect(p); p.connect(master); }
      else g.connect(master);
      o.start(t); o.stop(t + d + 0.08);
      tBurbuja = setTimeout(burbuja, 80 + Math.random() * Math.random() * 900);
    }

    function actualizar() {
      if (!ctx) return;
      clearTimeout(tSuspender);
      const t = ctx.currentTime, g = master.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      if (audible()) {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        let nivel = 0, tono = 1;
        visibles.forEach((v) => { if (v.nivel > nivel) { nivel = v.nivel; tono = v.tono; } });
        g.setTargetAtTime(nivel, t, 0.45);                       // fundido de entrada (~1,5 s)
        filtro.frequency.setTargetAtTime(1150 * tono, t, 0.8);
        if (!tBurbuja) tBurbuja = setTimeout(burbuja, 400);
      } else {
        g.setTargetAtTime(0, t, 0.16);                           // fundido de salida (~0,6 s)
        clearTimeout(tBurbuja); tBurbuja = 0;
        tSuspender = setTimeout(() => { if (ctx && !audible() && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 1100);
      }
    }

    function alternar() {
      if (!on && !ctx) { try { crear(); } catch (_) { ctx = null; return; } }
      on = !on; pintar(); actualizar();
    }

    document.addEventListener('visibilitychange', actualizar);

    return {
      disponible: !!AC,
      boton(b) { botones.add(b); pintar(); },
      soltarBoton(b) { botones.delete(b); },
      visible(inst, si, cfg) { if (si) visibles.set(inst, cfg); else visibles.delete(inst); actualizar(); },
      alternar,
      apagar() { if (on) alternar(); },
      cerrar() {
        if (botones.size) return;
        on = false; visibles.clear(); clearTimeout(tBurbuja); tBurbuja = 0; clearTimeout(tSuspender);
        if (ctx) { ctx.close().catch(() => {}); ctx = null; master = null; filtro = null; }
      },
      estado: () => ({ on, audible: audible(), contexto: ctx ? ctx.state : 'ninguno', visibles: visibles.size }),
    };
  })();

  // =====================================================================================
  // Shaders
  // =====================================================================================
  const VS = `attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = vec2(aPos.x * .5 + .5, .5 - aPos.y * .5); gl_Position = vec4(aPos, 0., 1.); }`;

  const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFoto, uMasc;
uniform vec4 uCaja;      // dónde cae la foto en el lienzo (object-fit): xy origen, zw tamaño, en 0..1
uniform vec2 uTam;       // tamaño de la foto en px
uniform float uT, uFuerza, uVel, uRecorrido, uBrillo, uTurb, uOnda;
uniform vec4 uFlujo;     // dirección de la corriente a la izquierda (xy) y a la derecha (zw)
uniform vec2 uCorte;
uniform vec4 uOndas[${MAX_ONDAS}]; // x, y (px de la foto), edad (s), fuerza

float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + 1.), f.x), f.y);
}

void main(){
  vec2 uv = (vUv - uCaja.xy) / uCaja.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) { gl_FragColor = vec4(0.); return; }
  vec3 base = texture2D(uFoto, uv).rgb;
  float m = texture2D(uMasc, uv).r;
  // fuera del agua, el píxel de la foto tal cual: el bosque y el puente no se mueven nada
  if (m < .004 || uFuerza < .001) { gl_FragColor = vec4(base, 1.); return; }

  vec2 px = uv * uTam;
  vec2 dir = normalize(mix(uFlujo.xy, uFlujo.zw, smoothstep(uCorte.x, uCorte.y, uv.x)));
  vec2 nor = vec2(-dir.y, dir.x);
  vec2 q = vec2(dot(px, dir), dot(px, nor));       // a lo largo y a lo ancho de la corriente
  float t = uT * uVel;
  float k = m * uFuerza;

  // 1) remolinos: ruido estirado en la dirección del agua que viaja río abajo
  vec2 qn = vec2(q.x / 24. - t * 1.15, q.y / 8.5);
  vec2 turb = vec2(vn(qn), vn(qn * 1.9 + vec2(7.3, 3.1) - vec2(t * .7, 0.))) - .5;

  // 2) la foto avanza con la corriente en dos fases cruzadas (sin saltos al reiniciar)
  float fase = fract(t * .55 + vn(px / 36.));
  float fase2 = fract(fase + .5);
  float w0 = 1. - abs(2. * fase - 1.);
  vec2 d0 = dir * (fase - .5) * uRecorrido + turb * uTurb;
  vec2 d1 = dir * (fase2 - .5) * uRecorrido + turb * uTurb;

  // 3) anillos al arrastrar: solo sobre el agua
  vec2 dOnda = vec2(0.); float luzOnda = 0.;
  for (int i = 0; i < ${MAX_ONDAS}; i++) {
    vec4 o = uOndas[i];
    if (o.w <= 0.) continue;
    vec2 v = px - o.xy; float d = length(v) + .001;
    float x = d - o.z * 92.;
    float vida = 1. - o.z / ${VIDA_ONDA.toFixed(2)};
    float env = exp(-x * x / 260.) * o.w * vida * vida;
    float s = sin(x * .42) * env;
    dOnda += v / d * s * uOnda; luzOnda += s;
  }

  vec2 e = 1. / uTam;
  vec2 u0 = uv - (d0 * k + dOnda * m) * e;
  vec2 u1 = uv - (d1 * k + dOnda * m) * e;
  // si el desplazamiento cae fuera del agua (orilla, tronco, valla), se queda el píxel propio
  float m0 = smoothstep(.12, .55, texture2D(uMasc, u0).r);
  float m1 = smoothstep(.12, .55, texture2D(uMasc, u1).r);
  vec3 c = mix(base, texture2D(uFoto, u0).rgb, m0) * w0 + mix(base, texture2D(uFoto, u1).rgb, m1) * (1. - w0);

  // 4) la espuma brilla un poco: chispas alargadas que corren sobre lo claro
  float l = dot(c, vec3(.299, .587, .114));
  float chispa = smoothstep(.64, .96, vn(vec2(q.x / 6.5 - t * 3.3, q.y / 2.6)));
  c += vec3(.9, .95, .93) * chispa * smoothstep(.42, .85, l) * .15 * uBrillo * k;
  c += vec3(.86, .93, .91) * luzOnda * .085 * m;

  gl_FragColor = vec4(mix(base, c, smoothstep(0., .3, m)), 1.);
}`;

  // =====================================================================================
  // Utilidades
  // =====================================================================================
  function compilar(gl, tipo, src) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('rio: shader ' + e); }
    return s;
  }
  function textura(gl, unidad, fuente) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fuente);   // lanza si la foto no es del mismo origen
    return t;
  }
  const cargarImagen = (src) => new Promise((ok, mal) => {
    const i = new Image(); i.decoding = 'async';
    i.onload = () => ok(i); i.onerror = () => mal(new Error('rio: no carga ' + src)); i.src = src;
  });
  const fotoLista = (img) => (img.complete && img.naturalWidth
    ? (img.decode ? img.decode().catch(() => {}) : Promise.resolve())
    : new Promise((ok, mal) => { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', mal, { once: true }); }));
  // object-position computado: «50% 50%», «30% 0px»…
  const posicion = (v, libre) => {
    const n = parseFloat(v);
    if (!isFinite(n)) return libre * 0.5;
    return /%$/.test(v.trim()) ? (libre * n) / 100 : n;
  };

  // Si la web no dejó respaldo, uno mínimo por nombre (img/fotos/<foto>-480.jpg)
  function respaldoMinimo(el, op) {
    const n = el.dataset.foto; if (!n) return null;
    const base = op.base == null ? 'img/' : op.base;
    const img = document.createElement('img');
    img.src = `${base}fotos/${n}-480.jpg`; img.alt = ''; img.decoding = 'async';
    img.className = 'rio-respaldo';
    el.appendChild(img);
    if (window.fetch) {
      fetch(base + 'fotos/fotos.json').then((r) => (r.ok ? r.json() : [])).then((lista) => {
        const f = (Array.isArray(lista) ? lista : []).find((x) => x.nombre === n);
        if (f && f.anchos) { img.srcset = f.anchos.map((w) => `${base}fotos/${n}-${w}.jpg ${w}w`).join(', '); img.sizes = '100vw'; }
      }).catch(() => {});
    }
    return img;
  }

  // =====================================================================================
  // montar
  // =====================================================================================
  const instancias = new WeakMap();

  function montar(el, opciones) {
    if (!el) return { destruir() {} };
    if (instancias.has(el)) return instancias.get(el);
    const op = Object.assign({ movimiento: !reducido() }, opciones || {});
    const nombre = el.dataset.mascara || el.dataset.foto || '';
    const agua = AGUAS[nombre] || AGUA_POR_DEFECTO;
    const params = new URLSearchParams(location.search);
    const usarGL = op.gl !== false && !params.has('sin-gl');
    let densidad = op.densidad || (domSobria() ? 'sobria' : 'rio');
    let rm = reducido();
    const mueve = () => op.movimiento !== false && !rm && densidad !== 'sobria';

    const limpiar = [];   // funciones que deshacen lo hecho, para destruir()
    const on = (obj, ev, fn, o) => { obj.addEventListener(ev, fn, o); limpiar.push(() => obj.removeEventListener(ev, fn, o)); };
    const inst = { destruir };
    instancias.set(el, inst);

    let img = el.querySelector('img');
    if (!img) img = respaldoMinimo(el, op);
    if (getComputedStyle(el).position === 'static') { el.style.position = 'relative'; limpiar.push(() => { el.style.position = ''; }); }

    // ---------------- sonido ----------------
    let boton = null;
    if (op.sonido !== false && el.dataset.sonido !== 'no' && Sonido.disponible) {
      const seccion = el.closest('section') || el.parentElement || el;
      const hueco = seccion.querySelector('[data-rio-sonido]:not([data-rio-listo])');
      const contenido = '<span class="rio-sonido__ondas" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="rio-sonido__txt">Oír el río</span>';
      if (hueco && hueco.tagName === 'BUTTON') {
        boton = hueco;
        const antes = { html: hueco.innerHTML, hidden: hueco.hidden, tipo: hueco.getAttribute('type') };
        if (!hueco.textContent.trim()) hueco.innerHTML = contenido;
        hueco.setAttribute('type', 'button'); hueco.classList.add('rio-sonido');
        limpiar.push(() => {
          hueco.innerHTML = antes.html; hueco.hidden = antes.hidden; hueco.classList.remove('rio-sonido');
          hueco.removeAttribute('aria-pressed'); if (antes.tipo == null) hueco.removeAttribute('type');
        });
      } else {
        boton = document.createElement('button');
        boton.type = 'button'; boton.className = 'rio-sonido' + (hueco ? '' : ' rio-sonido--foto');
        boton.innerHTML = contenido;
        (hueco || el).appendChild(boton);
        limpiar.push(() => boton.remove());
      }
      if (hueco) {
        const oculto = hueco.hidden; hueco.hidden = false; hueco.dataset.rioListo = '1';
        limpiar.push(() => { hueco.hidden = oculto; delete hueco.dataset.rioListo; });
      }
      Sonido.boton(boton);
      on(boton, 'click', Sonido.alternar);
      limpiar.push(() => Sonido.soltarBoton(boton));
    }

    // ---------------- visibilidad (sonido y pausa del dibujo) ----------------
    let enVista = false;
    const io = new IntersectionObserver((es) => {
      enVista = es[es.length - 1].isIntersecting;
      Sonido.visible(inst, enVista, agua.sonido);
      seguir();
    }, { rootMargin: '40px' });
    io.observe(el);
    limpiar.push(() => { io.disconnect(); Sonido.visible(inst, false); });
    on(document, 'visibilitychange', () => seguir());

    // ---------------- WebGL ----------------
    let cv = null, gl = null, prog = null, U = null, mascara = null, mW = 0, mH = 0;
    let raf = 0, t0 = 0, ultimo = 0, fuerza = 0, listo = false, perdido = false;
    let escala = 1, ema = 0, nCuadros = 0, rebajas = 0;
    let caja = [0, 0, 1, 1], fuenteFoto = '';
    const ondas = [];
    const ondasU = new Float32Array(MAX_ONDAS * 4);

    function medir() {
      if (!cv || !img || !img.naturalWidth) return;
      // la caja del <img> dentro de el (sin transformaciones: esas se copian aparte)
      let x = 0, y = 0, n = img;
      while (n && n !== el && el.contains(n)) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      if (n !== el) { const a = img.getBoundingClientRect(), b = el.getBoundingClientRect(); x = a.left - b.left - el.clientLeft; y = a.top - b.top - el.clientTop; }
      const w = img.offsetWidth || img.clientWidth, h = img.offsetHeight || img.clientHeight;
      if (!w || !h) return;
      const s = cv.style;
      s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = h + 'px';
      // lo que la web haga al <img> lo hace también el lienzo: recorte, esquinas, filtro, máscara
      const cs = getComputedStyle(img);
      s.clipPath = cs.clipPath; s.borderRadius = cs.borderRadius; s.filter = cs.filter;
      s.webkitMaskImage = cs.webkitMaskImage || ''; s.maskImage = cs.maskImage || '';
      s.transform = cs.transform; s.transformOrigin = cs.transformOrigin;
      // object-fit
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const ajuste = cs.objectFit;
      let dw = w, dh = h;
      if (ajuste === 'cover' || ajuste === 'contain' || ajuste === 'scale-down' || ajuste === 'none') {
        const k = ajuste === 'cover' ? Math.max(w / iw, h / ih) : ajuste === 'none' ? 1 : Math.min(w / iw, h / ih, ajuste === 'scale-down' ? 1 : Infinity);
        dw = iw * k; dh = ih * k;
      }
      const pos = (cs.objectPosition || '50% 50%').split(/\s+/);
      const ox = posicion(pos[0] || '50%', w - dw), oy = posicion(pos[1] || '50%', h - dh);
      caja = [ox / w, oy / h, dw / w, dh / h];
      // resolución: tope de DPR 1,5, nunca más de 1,5 píxeles de lienzo por píxel de la foto, y la rebaja si va lento
      let r = Math.min(DPR_MAX, window.devicePixelRatio || 1);
      r = Math.min(r, (1.5 * iw) / dw);
      r = Math.max(0.5, r) * escala;
      const W = Math.max(1, Math.round(w * r)), H = Math.max(1, Math.round(h * r));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      if (gl) gl.viewport(0, 0, W, H);
      // si el navegador cambió de ancho de foto (srcset), se vuelve a subir
      if (gl && img.currentSrc && img.currentSrc !== fuenteFoto) subirFoto();
    }

    function subirFoto() {
      fuenteFoto = img.currentSrc || img.src;
      fotoLista(img).then(() => {
        if (!gl || gl.isContextLost()) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        if (!raf) dibujar(ultimo);
      }).catch(() => {});
    }

    function iniciarGL(mImg) {
      cv = document.createElement('canvas');
      cv.className = 'rio-lienzo'; cv.setAttribute('aria-hidden', 'true');
      gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true })
        || cv.getContext('experimental-webgl', { alpha: true, antialias: false, depth: false, stencil: false, failIfMajorPerformanceCaveat: true });
      if (!gl) { cv = null; return false; }
      try {
        prog = gl.createProgram();
        gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('rio: ' + gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const a = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        U = {};
        ['uFoto', 'uMasc', 'uCaja', 'uTam', 'uT', 'uFuerza', 'uVel', 'uRecorrido', 'uBrillo', 'uTurb', 'uOnda', 'uFlujo', 'uCorte', 'uOndas[0]']
          .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
        textura(gl, 1, mImg);
        textura(gl, 0, img);          // la foto, en la unidad 0 (subirFoto la reutiliza)
        fuenteFoto = img.currentSrc || img.src;
        gl.uniform1i(U.uFoto, 0); gl.uniform1i(U.uMasc, 1);
        gl.uniform2f(U.uTam, img.naturalWidth, img.naturalHeight);
        gl.uniform1f(U.uVel, agua.vel); gl.uniform1f(U.uRecorrido, agua.recorrido); gl.uniform1f(U.uBrillo, agua.brillo);
        gl.uniform1f(U.uTurb, agua.turb); gl.uniform1f(U.uOnda, agua.onda);
        gl.uniform4fv(U.uFlujo, agua.flujo); gl.uniform2fv(U.uCorte, agua.corte);
        gl.uniform4fv(U['uOndas[0]'], ondasU);
      } catch (e) {
        // foto de otro origen (file://), shader que no compila…: se queda la foto
        const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
        gl = null; cv = null;
        return false;
      }
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdido = true; parar(); cv.classList.remove('rio-listo'); });
      cv.addEventListener('webglcontextrestored', () => {
        // se rehace desde cero con la misma máscara
        const viejo = cv; viejo.remove(); perdido = false; listo = false;
        if (iniciarGL(mImg)) { colocar(); medir(); seguir(); }
      });
      // la máscara también en la CPU: para saber si el dedo está sobre el agua
      try {
        const c2 = document.createElement('canvas');
        mW = c2.width = Math.min(256, mImg.naturalWidth); mH = c2.height = Math.round((mW * mImg.naturalHeight) / mImg.naturalWidth);
        const x2 = c2.getContext('2d'); x2.drawImage(mImg, 0, 0, mW, mH);
        const d = x2.getImageData(0, 0, mW, mH).data; mascara = new Uint8Array(mW * mH);
        for (let i = 0; i < mascara.length; i++) mascara[i] = d[i * 4];
      } catch (_) { mascara = null; }
      return true;
    }

    function colocar() {
      let rama = img;
      while (rama.parentNode && rama.parentNode !== el) rama = rama.parentNode;
      if (rama.parentNode === el) el.insertBefore(cv, rama.nextSibling); else el.appendChild(cv);
    }

    function dibujar(ts) {
      if (!gl || perdido) return;
      const t = ((ts - t0) / 1000) % 1800;
      gl.uniform4f(U.uCaja, caja[0], caja[1], caja[2], caja[3]);
      gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uFuerza, fuerza);
      // las ondas: edad y fuerza; las muertas, a 0
      ondasU.fill(0);
      for (let i = ondas.length - 1; i >= 0; i--) if ((ts - ondas[i].t) / 1000 >= VIDA_ONDA) ondas.splice(i, 1);
      ondas.forEach((o, i) => { ondasU[i * 4] = o.x; ondasU[i * 4 + 1] = o.y; ondasU[i * 4 + 2] = (ts - o.t) / 1000; ondasU[i * 4 + 3] = o.f; });
      gl.uniform4fv(U['uOndas[0]'], ondasU);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!listo) { listo = true; requestAnimationFrame(() => cv && cv.classList.add('rio-listo')); }
    }

    let transAnt = '';
    function cuadro(ts) {
      raf = 0;
      if (!t0) t0 = ts;
      const dt = ultimo ? ts - ultimo : 16.7; ultimo = ts;
      // el agua cobra vida poco a poco (sobre todo al abrirse la cortina)
      fuerza = Math.min(1, fuerza + dt / 1600);
      // si la web mueve el <img> con estilo en línea (GSAP), el lienzo lo sigue
      const tr = img.style.transform;
      if (tr !== transAnt) { transAnt = tr; cv.style.transform = getComputedStyle(img).transform; }
      // presupuesto: si los fotogramas pasan de ~26 ms de media, la resolución baja sola (hasta la mitad)
      if (dt < 250) { ema = ema ? ema * 0.94 + dt * 0.06 : dt; nCuadros++; }
      if (nCuadros > 50 && ema > 26 && rebajas < 2) { rebajas++; escala = rebajas === 1 ? 0.72 : 0.5; nCuadros = 0; ema = 0; medir(); }
      dibujar(ts);
      if (activo()) raf = requestAnimationFrame(cuadro);
    }

    const activo = () => !!gl && !perdido && mueve() && enVista && !document.hidden;
    function seguir() {
      if (!gl) { if (mueve()) arrancar(); return; }
      if (!mueve()) { quieto(); return; }
      cv.classList.remove('rio-quieto');
      el.dataset.rioGesto = '1';
      if (activo() && !raf) { ultimo = 0; raf = requestAnimationFrame(cuadro); }
      if (!activo()) parar();
    }
    function parar() { if (raf) cancelAnimationFrame(raf); raf = 0; ultimo = 0; }
    // sin movimiento: el lienzo se aparta y queda la foto, quieta y nítida
    function quieto() {
      parar(); fuerza = 0; ondas.length = 0;
      if (cv) cv.classList.add('rio-quieto');
      delete el.dataset.rioGesto;
    }

    // ---------------- ondas al arrastrar ----------------
    function aFoto(cx, cy) {
      if (!cv || !img.naturalWidth) return null;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const u = ((cx - r.left) / r.width - caja[0]) / caja[2], v = ((cy - r.top) / r.height - caja[1]) / caja[3];
      if (u < 0 || v < 0 || u > 1 || v > 1) return null;
      if (mascara) { const i = Math.min(mH - 1, Math.floor(v * mH)) * mW + Math.min(mW - 1, Math.floor(u * mW)); if (mascara[i] < 50) return null; }
      return { x: u * img.naturalWidth, y: v * img.naturalHeight };
    }
    let ultOnda = null;
    function onda(cx, cy, f, sep, ms) {
      if (!activo()) return;
      const p = aFoto(cx, cy); if (!p) return;
      const ahora = performance.now();
      if (ultOnda && ahora - ultOnda.t < ms && Math.hypot(p.x - ultOnda.x, p.y - ultOnda.y) < sep) return;
      ultOnda = { x: p.x, y: p.y, t: ahora };
      if (ondas.length >= MAX_ONDAS) ondas.shift();
      ondas.push({ x: p.x, y: p.y, t: ultimo || ahora, f });
    }
    const fuera = (e) => e.target && e.target.closest && e.target.closest('.rio-sonido');
    let toque = null;
    on(el, 'pointerdown', (e) => {
      if (fuera(e)) return;
      if (e.pointerType === 'mouse') { onda(e.clientX, e.clientY, 1, 0, 0); return; }
      // con el dedo: tocar o dejarlo quieto un instante hace la onda; deslizar en vertical sigue siendo scroll
      const t = { x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now(), quieto: true, sujeto: false };
      t.timer = setTimeout(() => { if (toque === t && t.quieto) { t.sujeto = true; onda(t.x, t.y, 1, 0, 0); } }, 170);
      toque = t;
    }, { passive: true });
    on(el, 'pointermove', (e) => {
      if (fuera(e)) return;
      if (e.pointerType === 'mouse') {
        if (e.buttons) onda(e.clientX, e.clientY, 0.85, 14, 45);
        else onda(e.clientX, e.clientY, 0.42, 26, 95);
        return;
      }
      const t = toque; if (!t || t.id !== e.pointerId) return;
      const dx = e.clientX - t.x, dy = e.clientY - t.y;
      if (t.quieto && Math.hypot(dx, dy) > 8) t.quieto = false;
      // en horizontal (touch-action: pan-y deja este gesto a la página) o tras sujetar
      if (t.sujeto || Math.abs(dx) > Math.abs(dy) * 1.2) onda(e.clientX, e.clientY, 0.85, 14, 45);
    }, { passive: true });
    const soltar = (e) => {
      const t = toque; if (!t || t.id !== e.pointerId) return;
      clearTimeout(t.timer); toque = null;
      if (e.type === 'pointerup' && t.quieto && !t.sujeto && performance.now() - t.t < 300) onda(t.x, t.y, 0.8, 0, 0);
    };
    on(el, 'pointerup', soltar); on(el, 'pointercancel', soltar);

    // ---------------- cambios en caliente: densidad, movimiento reducido, tamaño ----------------
    // solo si la web marca la densidad en <html> (clase densidad-sobria o data-densidad); otras clases no cuentan
    const h = document.documentElement;
    let hayMarca = domSobria() || h.hasAttribute('data-densidad');
    const mo = new MutationObserver(() => {
      if (!hayMarca && !domSobria() && !h.hasAttribute('data-densidad')) return;
      hayMarca = true;
      const d = domSobria() ? 'sobria' : 'rio';
      if (d !== densidad) { densidad = d; seguir(); }
    });
    mo.observe(h, { attributes: true, attributeFilter: ['class', 'data-densidad'] });
    limpiar.push(() => mo.disconnect());
    // o el aviso del mando de densidades, si la web lo lanza
    on(window, 'laxa:densidad', (e) => { const d = e.detail === 'sobria' ? 'sobria' : 'rio'; if (d !== densidad) { densidad = d; seguir(); } });
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      const cambio = () => { rm = mq.matches; seguir(); };
      if (mq.addEventListener) { mq.addEventListener('change', cambio); limpiar.push(() => mq.removeEventListener('change', cambio)); }
    }
    // la barra del móvil cambia solo el alto de la ventana: entonces solo se reajusta el lienzo, sin rehacer nada
    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { if (!gl) return; medir(); if (!raf && listo) dibujar(ultimo || performance.now()); });
      limpiar.push(() => ro.disconnect());
    }

    // ---------------- arranque ----------------
    // el WebGL y la máscara solo se piden cuando el agua se va a mover (con «Sobria» o sin movimiento, nunca)
    let vivo = true, arrancado = false;
    function arrancar() {
      if (arrancado || !vivo || !usarGL || !img || !window.WebGLRenderingContext) return;
      arrancado = true;
      const base = op.base == null ? 'img/' : op.base;
      const urlMasc = op.mascara || `${base}mascaras/${nombre}.png`;
      Promise.all([fotoLista(img), nombre ? cargarImagen(urlMasc) : Promise.reject(new Error('rio: sin máscara'))])
        .then(([, mImg]) => {
          if (!vivo || !iniciarGL(mImg)) return;
          colocar();
          medir();
          if (ro) ro.observe(img);
          el.dataset.rioGl = '1';
          seguir();
        })
        .catch(() => { /* sin foto o sin máscara: se queda la foto */ });
    }
    if (mueve()) arrancar();

    function destruir() {
      vivo = false;
      parar();
      limpiar.splice(0).reverse().forEach((f) => { try { f(); } catch (_) { /* nada */ } });
      if (gl) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
      if (cv) cv.remove();
      gl = null; cv = null; mascara = null; ondas.length = 0;
      delete el.dataset.montado; delete el.dataset.rioGl; delete el.dataset.rioGesto;
      instancias.delete(el);
      Sonido.cerrar();
    }
    inst.estado = () => ({ gl: !!gl, animando: !!raf, escala, msCuadro: Math.round(ema * 10) / 10, ondas: ondas.length, enVista, mueve: mueve() });

    el.dataset.montado = '1';
    return inst;
  }

  Laxa.rio = { montar, sonido: { estado: Sonido.estado, alternar: Sonido.alternar, apagar: Sonido.apagar }, _shaders: { VS, FS } };
})();
