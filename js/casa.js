/* Casa da Laxa · módulo Casa · «La casa por dentro»
   La casa en corte, en axonometría, como una casa de muñecas abierta.
   SVG 2D, sin WebGL ni librerías. Un modelo en metros (cajas y planos) se
   proyecta con dos ángulos; cada cara es un <rect> con su propia matriz, de
   modo que los sillares, la tarima y la pizarra van pegados a su muro y no
   resbalan cuando la casa gira.
   Con el scroll (pista con sticky): la casa gira un poco, se levanta el tejado,
   los muros se cortan a 1 m y se separa la planta de arriba.
   Con movimiento:false o densidad sobria: abierta y quieta, igual de usable.
   DIBUJO ORIENTATIVO: no conocemos el plano. Las estancias son las de los
   datos (ref/DATOS-CASA-DA-LAXA.md); dónde está cada una es una suposición.

   Contrato: window.Laxa.casa.montar(el, { movimiento, densidad, base, respaldoFotos })
   → { destruir() }. El HTML de `el` es el respaldo: se guarda y vuelve al destruir. */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const K = 10;                          // unidades SVG por metro
  const FI = 32 * Math.PI / 180;         // elevación de la vista
  const TH0 = 19, TH1 = 33;              // giro (grados): cerrada → abierta
  const SUBE_TEJADO = 5.5, SUBE_ALTA = 5.2;
  let cuenta = 0;

  /* ================= Estancias: SOLO lo que dicen los datos ================= */
  // Fuentes: CR = casasrurales.net (texto suyo), SR = Sensación Rural, RG = Ruralgest.
  const ESTANCIAS = [
    { id: 'matrimonio', planta: 'alta', nombre: 'Dormitorio de matrimonio',
      datos: ['Cama de matrimonio', 'Baño privado completo'],
      foto: 'hab-matrimonio', alt: 'Dormitorio con cama de matrimonio, pared de piedra vista y una ventana con contraventanas de madera',
      ancla: [3.7, 4.4, 3.0] },
    { id: 'dobles-1', planta: 'alta', nombre: 'Dormitorio con dos camas',
      datos: ['Dos camas individuales', 'Baño privado completo'],
      foto: 'hab-dobles-1', alt: 'Dormitorio con dos camas individuales, paredes de piedra y vigas de madera',
      ancla: [7.9, 5.9, 3.0] },
    { id: 'dobles-2', planta: 'alta', nombre: 'Otro dormitorio con dos camas',
      datos: ['Dos camas individuales', 'Baño privado completo'],
      foto: 'hab-dobles-2', alt: 'Dormitorio con dos camas individuales junto a una ventana, entre muros de sillares de granito',
      ancla: [11.2, 4.6, 3.0] },
    { id: 'solaina', planta: 'alta', nombre: 'La solaina', sub: 'el balcón corrido',
      datos: ['De madera rojiza, en el primer piso', 'Debajo, una columna de granito'],
      foto: 'fachada', alt: 'La fachada de granito con la solaina de madera en el primer piso y la columna de piedra debajo',
      ancla: [5.3, -0.75, 2.95], siempre: true },
    { id: 'salon', planta: 'baja', nombre: 'Salón comedor',
      datos: ['«La piedra, la madera, le dan ese toque rústico»', 'Sillones, televisión y DVD', 'Calefacción'],
      foto: 'salon-comedor', foto2: 'salon', alt: 'Salón comedor con paredes de piedra, una mesa de madera con sillas, la televisión y un sillón',
      alt2: 'Sofá y sillones de flores azules junto a una pared de piedra',
      ancla: [4.4, 4.5, 0.08] },
    { id: 'lareira', planta: 'baja', nombre: 'La lareira', sub: 'la chimenea de piedra',
      datos: ['Chimenea de piedra con campana de pizarra', '«Calentará el alojamiento cuando haga mucho frío»', 'Leña, y además calefacción'],
      foto: 'lareira', alt: 'La lareira de piedra con campana de pizarra, frente a un sofá verde, con suelo de barro',
      ancla: [2.1, 7.2, 0.5] },
    { id: 'cocina', planta: 'baja', nombre: 'La cocina',
      datos: ['Totalmente equipada', 'Horno, microondas, lavadora y lavavajillas', 'Mesa y sillas'],
      foto: 'cocina', alt: 'Cocina de muebles de madera con microondas, fregadero, lavavajillas y una mesa',
      ancla: [10.6, 6.1, 0.08] },
    { id: 'escalera', planta: 'baja', nombre: 'La escalera de caracol',
      datos: ['De madera', 'Entre las dos plantas'],
      foto: 'escalera', alt: 'Escalera de madera junto a un aparador, con pared de piedra',
      ancla: [6.85, 2.25, 1.4] },
    { id: 'aseo', planta: 'baja', nombre: 'Aseo',
      datos: ['En la planta baja', 'Además de los tres baños de los dormitorios'],
      foto: null, ancla: [11.3, 1.5, 0.08] },
    { id: 'jardin', planta: 'fuera', nombre: 'El jardín',
      datos: ['«El maravilloso jardín en la orilla del río»', 'Césped, árboles y arbustos', 'Bancos con mesa, terraza y huerta'],
      foto: 'jardin', alt: 'Mesa de merendero de madera y piedra bajo un árbol, junto a la valla del río',
      ancla: [-3.2, 7.0, 0.8] },
    { id: 'barbacoa', planta: 'fuera', nombre: 'La barbacoa cubierta',
      datos: ['De piedra y cubierta', '«Para que podáis seguir haciendo barbacoas aunque el tiempo no acompañe»'],
      foto: 'barbacoa', alt: 'Barbacoa de piedra bajo un tejadillo, con el bosque detrás',
      ancla: [-2.9, 0.15, 2.45] },
    { id: 'rio', planta: 'fuera', nombre: 'El río de Magros',
      datos: ['Pasa junto al jardín', 'La piscina fluvial, a unos 500 m, en el Rego da Touza'],
      foto: 'rio-ventana', alt: 'El río con rápidos y un puente de madera, visto desde una ventana de la casa',
      ancla: [-7.4, 8.2, -0.42] },
  ];
  ESTANCIAS.forEach((e, i) => { e.n = i + 1; });
  const PLANTAS = { alta: 'Planta alta', baja: 'Planta baja', fuera: 'Fuera' };

  /* ================= Utilidades ================= */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const suave = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  const f3 = (n) => (Math.round(n * 1000) / 1000).toString();
  const nodo = (tag, at = {}) => { const n = document.createElementNS(NS, tag); for (const k in at) n.setAttribute(k, at[k]); return n; };
  const html = (tag, at = {}, txt) => { const n = document.createElement(tag); for (const k in at) n.setAttribute(k, at[k]); if (txt != null) n.textContent = txt; return n; };
  const azar = (semilla) => () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tono = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };

  /* ================= Proyección ================= */
  const V = { c: 1, s: 0, sf: Math.sin(FI), cf: Math.cos(FI) };
  const ponGiro = (g) => { const t = g * Math.PI / 180; V.c = Math.cos(t); V.s = Math.sin(t); };
  const P = (x, y, z) => [K * (x * V.c - y * V.s), -K * ((x * V.s + y * V.c) * V.sf + z * V.cf)];
  const matriz = (o, e1, e2) => {
    const a = P(e1[0], e1[1], e1[2]), b = P(e2[0], e2[1], e2[2]), t = P(o[0], o[1], o[2]);
    return `matrix(${f3(a[0])} ${f3(a[1])} ${f3(b[0])} ${f3(b[1])} ${f2(t[0])} ${f2(t[1])})`;
  };
  const X = [1, 0, 0], Y = [0, 1, 0], ZB = [0, 0, -1];

  /* ================= Materiales: arriba / frente / izquierda ================= */
  const MAT = {
    piedra:   { a: '#DCD4C3', f: 'P:piedra-f', i: 'P:piedra-i' },
    sillar:   { a: '#D9D1C0', f: '#ABA290', i: '#C3BBA9' },
    revoco:   { a: '#F4F0E8', f: '#D6CFC1', i: '#E5DFD3' },
    forjado:  { a: '#B98A5E', f: '#5B3925', i: '#6D452F' },
    madera:   { a: '#8B5A3C', f: '#5A3826', i: '#714832' },
    clara:    { a: '#C9965F', f: '#8F6438', i: '#A97946' },
    solaina:  { a: '#9C5034', f: '#6B321F', i: '#843F28' },
    ropa:     { a: '#EFE8DB', f: '#C9C0AF', i: '#DCD4C5' },
    almohada: { a: '#FBF8F2', f: '#D8D2C6', i: '#EAE5DA' },
    blanco:   { a: '#FBFBF9', f: '#CDD2D0', i: '#E4E8E6' },
    pizarra:  { a: '#4C555A', f: '#2D3337', i: '#3B4247' },
    verde:    { a: '#879670', f: '#5D6A4D', i: '#727F5E' },
    azul:     { a: '#B6C5D9', f: '#7F94AF', i: '#98AAC2' },
    encimera: { a: '#4A4D4E', f: '#9A6E40', i: '#B07F4C' },
    mueble:   { a: '#B5824E', f: '#8C5F35', i: '#A06D3F' },
    oscuro:   { a: '#3A3F42', f: '#24282B', i: '#2F3437' },
    metal:    { a: '#C9CDCF', f: '#9DA3A6', i: '#B4B9BC' },
    tierra:   { a: 'P:enlosado', f: 'P:tierra-f', i: 'P:tierra-i' },
    banco:    { a: 'P:cesped', f: 'P:tierra-f', i: 'P:tierra-i' },
    agua:     { a: 'P:agua', f: '#284039', i: '#2F4B45' },
    fondo:    { a: '#6E6457', f: 'P:tierra-f', i: 'P:tierra-i' },
    gris:     { a: '#A29C90', f: '#6F6A60', i: '#878276' },
    tronco:   { a: '#6B5844', f: '#4E3F31', i: '#5D4C3B' },
    lena:     { a: '#A0714A', f: '#6E4A2E', i: '#86593A' },
    tejado:   { a: 'P:pizarra-a', f: '#2D3337', i: '#3B4247' },
    terraza:  { a: 'P:enlosado', f: '#A39D91', i: '#B5AFA3' },
  };

  /* ================= Patrones (en metros, en el plano de cada cara) ================= */
  function patrones(pre) {
    const R = azar(1800);
    const r = (a, b) => a + (b - a) * R();
    const pat = (id, w, h, dentro) => `<pattern id="${pre}${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">${dentro}</pattern>`;
    const fila = (ancho, min, max) => { const l = []; let s = 0; while (s < ancho) { let x = r(min, max); if (ancho - s - x < min * 0.8) x = ancho - s; l.push(x); s += x; } return l; };
    let out = '';
    // Sillares de granito (como los de rg-02): hiladas de alto distinto, piedras de largo variable.
    const GR = ['#CDBFA3', '#C3B69B', '#D6CAB0', '#BCAF95', '#C8BB9F', '#D2C29F', '#B8AB90', '#C9B58E'];
    const hiladas = [0.5, 0.58, 0.44, 0.62, 0.52], PW = 6, PH = 2.66;
    const sillares = []; { let y = 0; hiladas.forEach((h) => { let x = -r(0, 0.7); fila(PW, 0.6, 1.5).forEach((l) => { sillares.push([x, y, l, h, GR[Math.floor(R() * GR.length)], r(0.93, 1.06)]); x += l; }); y += h; }); }
    const piedra = (k) => { let s = `<rect width="${PW}" height="${PH}" fill="${tono('#9F9682', k)}"/>`; sillares.forEach(([x, y, l, h, c, v]) => { [x, x + PW].forEach((xx, j) => { if (j && xx >= PW) return; if (j && x >= 0) return; s += `<rect x="${f3(xx + 0.035)}" y="${f3(y + 0.035)}" width="${f3(l - 0.07)}" height="${f3(h - 0.07)}" rx="0.09" fill="${tono(c, k * v)}"/><path d="M${f3(xx + 0.12)} ${f3(y + h - 0.06)}h${f3(Math.max(0.1, l - 0.24))}" stroke="${tono(c, k * 0.76)}" stroke-width="0.035" fill="none"/>`; }); }); return s; };
    out += pat('piedra-f', PW, PH, piedra(0.84)) + pat('piedra-i', PW, PH, piedra(0.96));
    // Tarima oscura de los dormitorios (rg-04, rg-09, rg-13), tablas a lo largo de x.
    const tablas = (cols, k) => { let s = `<rect width="3" height="0.96" fill="${tono('#4A2A1C', k)}"/>`; for (let i = 0; i < 6; i++) { let x = -r(0, 1); fila(4, 0.8, 1.6).forEach((l) => { const c = tono(cols[Math.floor(R() * cols.length)], k * r(0.95, 1.05)); s += `<rect x="${f3(x + 0.01)}" y="${f3(i * 0.16 + 0.006)}" width="${f3(l - 0.02)}" height="0.148" fill="${c}"/>`; x += l; }); } return s; };
    out += pat('tarima', 3, 0.96, tablas(['#7B4632', '#864F38', '#713F2C', '#8E573C', '#7F4A33'], 1));
    out += pat('tarima-s', 3, 0.96, tablas(['#9A5236', '#8C4A30', '#A45C3E', '#93503A'], 1));
    // Losa de pizarra del salón (rg-05, rg-15), baldosa de barro junto a la lareira (rg-10), baños.
    const cuadros = (w, n, cols, junta, g) => { let s = `<rect width="${w}" height="${w}" fill="${junta}"/>`; const l = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += `<rect x="${f3(i * l + g)}" y="${f3(j * l + g)}" width="${f3(l - 2 * g)}" height="${f3(l - 2 * g)}" fill="${cols[Math.floor(R() * cols.length)]}"/>`; return s; };
    out += pat('losa', 2, 2, cuadros(2, 4, ['#8A9396', '#7D878B', '#959C9D', '#848B8B', '#9AA09C'], '#BDB5A5', 0.014));
    out += pat('barro', 1.32, 1.32, cuadros(1.32, 4, ['#A65B40', '#9A5039', '#AF6649', '#9F553D'], '#6F3E2D', 0.012));
    out += pat('baldosa', 0.6, 0.6, cuadros(0.6, 2, ['#E3E6E2', '#D7DCD9'], '#B9C0BD', 0.008));
    // Enlosado de granito de la calle y la terraza (rg-02, rg-08).
    { let s = '<rect width="3.6" height="3.6" fill="#8C867B"/>'; const corta = (x, y, w, h, d) => { if (d > 3 || (w < 1.1 && h < 1.1)) { s += `<rect x="${f3(x + 0.025)}" y="${f3(y + 0.025)}" width="${f3(w - 0.05)}" height="${f3(h - 0.05)}" rx="0.05" fill="${['#B9B3A7', '#ADA79B', '#C3BDB1', '#A6A094', '#B4AEA1'][Math.floor(R() * 5)]}"/>`; return; } if (w > h) { const c = w * r(0.35, 0.65); corta(x, y, c, h, d + 1); corta(x + c, y, w - c, h, d + 1); } else { const c = h * r(0.35, 0.65); corta(x, y, w, c, d + 1); corta(x, y + c, w, h - c, d + 1); } }; corta(0, 0, 1.8, 1.8, 0); corta(1.8, 0, 1.8, 1.8, 0); corta(0, 1.8, 1.8, 1.8, 0); corta(1.8, 1.8, 1.8, 1.8, 0); out += pat('enlosado', 3.6, 3.6, s); }
    // Césped.
    { let s = '<rect width="1.5" height="1.5" fill="#7E9061"/>'; for (let i = 0; i < 16; i++) s += `<ellipse cx="${f3(r(0, 1.5))}" cy="${f3(r(0, 1.5))}" rx="${f3(r(0.05, 0.1))}" ry="${f3(r(0.02, 0.04))}" fill="${['#6D8052', '#91A270', '#748859', '#869866'][i % 4]}"/>`; out += pat('cesped', 1.5, 1.5, s); }
    // Pizarra del tejado: hiladas de losas, a lo largo del alero.
    const losas = (k) => { let s = `<rect width="2.4" height="0.8" fill="${tono('#262B2F', k)}"/>`; for (let i = 0; i < 4; i++) { let x = i % 2 ? -0.18 : 0; fila(2.4, 0.28, 0.44).forEach((l) => { const c = tono(['#434B50', '#4E575C', '#3A4146', '#565F63', '#474F53'][Math.floor(R() * 5)], k); s += `<rect x="${f3(x + 0.012)}" y="${f3(i * 0.2)}" width="${f3(l - 0.024)}" height="0.19" rx="0.035" fill="${c}"/>`; if (x < 0) s += `<rect x="${f3(x + 2.412)}" y="${f3(i * 0.2)}" width="${f3(l - 0.024)}" height="0.19" rx="0.035" fill="${c}"/>`; x += l; }); } return s; };
    out += pat('pizarra-a', 2.4, 0.8, losas(1)) + pat('pizarra-b', 2.4, 0.8, losas(1.16));
    // Agua (corre a lo largo de y): vetas y un poco de espuma.
    { let s = '<rect width="1.2" height="2.4" fill="#36564E"/>'; for (let i = 0; i < 4; i++) { const x = 0.15 + i * 0.3; s += `<path d="M${f3(x)} 0q0.12 0.6 0 1.2t0 1.2" stroke="#4C6F65" stroke-width="0.05" fill="none"/>`; } s += '<path d="M0.3 0.5q0.08 0.2 0 0.4M0.85 1.5q0.08 0.2 0 0.4" stroke="#E6EEEA" stroke-opacity="0.4" stroke-width="0.04" fill="none"/>'; out += pat('agua', 1.2, 2.4, s); }
    // Tierra en el corte de la base: capa de tierra arriba y granito con piedras abajo.
    const tierra = (k) => { let s = `<rect width="3" height="1.4" fill="${tono('#7A6D5D', k)}"/><rect width="3" height="0.2" fill="${tono('#56463A', k)}"/>`; for (let i = 0; i < 9; i++) s += `<ellipse cx="${f3(r(0, 3))}" cy="${f3(r(0.4, 1.3))}" rx="${f3(r(0.1, 0.3))}" ry="${f3(r(0.06, 0.13))}" fill="${tono(['#8D8374', '#6A6053', '#998F80'][i % 3], k)}"/>`; return s; };
    out += pat('tierra-f', 3, 1.4, tierra(0.86)) + pat('tierra-i', 3, 1.4, tierra(1));
    // Luces: la de la estancia elegida y la de las lamparitas.
    out += `<radialGradient id="${pre}luz"><stop offset="0" stop-color="#FFE2AE" stop-opacity="0.9"/><stop offset="0.55" stop-color="#F6BF7A" stop-opacity="0.45"/><stop offset="1" stop-color="#F2A65A" stop-opacity="0"/></radialGradient>`;
    out += `<radialGradient id="${pre}lampara"><stop offset="0" stop-color="#FFE4B0" stop-opacity="0.85"/><stop offset="1" stop-color="#FFC27A" stop-opacity="0"/></radialGradient>`;
    return out;
  }

  /* ================= El modelo (metros; x a lo largo de la fachada, y hacia atrás, z arriba) =================
     Orientativo. Huella: 13 × 9 m, con el cuerpo de la derecha adelantado 1,4 m (rg-02) y la solaina
     entre el pilar de la izquierda y ese cuerpo, sobre la losa de granito y su columna.
     Grupos (orden de pintado): base · detras · baja · alta · fuera · tejado. */
  function modelo() {
    const L = [];
    const caja = (g, x0, x1, y0, y1, z0, z1, m, o = {}) => L.push({ t: 'caja', g, x0, x1, y0, y1, z0, z1, m, capa: 1, ...o });
    const suelo = (g, x0, x1, y0, y1, z, fill, o = {}) => L.push({ t: 'suelo', g, x0, x1, y0, y1, z, fill, capa: 0, ...o });
    const plano = (g, o, e1, e2, d, fill, b, op = {}) => L.push({ t: 'plano', g, o, e1, e2, d, fill, b, capa: 1, ...op });
    const linea = (g, tramos, stroke, ancho, op = {}) => L.push({ t: 'linea', g, tramos, stroke, ancho, capa: 1, ...op });
    const poli = (g, pts, fill, op = {}) => L.push({ t: 'poli', g, pts, fill, capa: 1, ...op });
    const copa = (g, x, y, z, bolas, op = {}) => L.push({ t: 'copa', g, x, y, z, bolas, capa: 1, ...op });
    const luz = (g, x0, x1, y0, y1, z, e) => suelo(g, x0, x1, y0, y1, z + 0.004, 'P:luz', { e, cls: 'casa-luz', capa: 0.2 });
    // tabique partido en tramos cortos (así se ordena bien con los muebles)
    const tabique = (g, x0, x1, y0, y1, z0, z1, corte) => {
      const largoX = x1 - x0 > y1 - y0; const a = largoX ? x0 : y0, b = largoX ? x1 : y1;
      const n = Math.max(1, Math.ceil((b - a) / 1.6));
      for (let i = 0; i < n; i++) { const p = a + (b - a) * i / n, q = a + (b - a) * (i + 1) / n; largoX ? caja(g, p, q, y0, y1, z0, z1, 'revoco', { corte }) : caja(g, x0, x1, p, q, z0, z1, 'revoco', { corte }); }
    };
    const ventana = (cara, u0, u1, v0, v1) => ({ cara, t: 'ventana', u0, u1, v0, v1 });
    const puerta = (cara, u0, u1, v0, v1) => ({ cara, t: 'puerta', u0, u1, v0, v1 });
    const cama = (g, e, x0, x1, y0, y1, z, cabecero) => {          // cabecero: 'y1' (contra el fondo) o 'x1' (contra la derecha)
      caja(g, x0, x1, y0, y1, z, z + 0.42, 'madera', { e });
      if (cabecero === 'y1') {
        caja(g, x0 + 0.02, x1 - 0.02, y0 - 0.05, y1 - 0.08, z + 0.42, z + 0.6, 'ropa', { e });
        const w = (x1 - x0 - 0.12) / (x1 - x0 > 1.2 ? 2 : 1);
        for (let x = x0 + 0.08; x < x1 - 0.1; x += w + 0.04) caja(g, x, x + w - 0.04, y1 - 0.5, y1 - 0.12, z + 0.6, z + 0.72, 'almohada', { e });
        caja(g, x0 - 0.04, x1 + 0.04, y1 - 0.06, y1 + 0.04, z, z + 0.95, 'madera', { e, deco: [{ cara: 'f', t: 'arco', u0: x0 - 0.04, u1: x1 + 0.04, v0: z + 0.95, alto: 0.22, fill: MAT.madera.f }] });
      } else {
        caja(g, x0 - 0.05, x1 - 0.08, y0 + 0.02, y1 - 0.02, z + 0.42, z + 0.6, 'ropa', { e });
        caja(g, x1 - 0.5, x1 - 0.12, y0 + 0.08, y1 - 0.08, z + 0.6, z + 0.72, 'almohada', { e });
        caja(g, x1 - 0.06, x1 + 0.04, y0 - 0.04, y1 + 0.04, z, z + 0.95, 'madera', { e, deco: [{ cara: 'i', t: 'arco', u0: y0 - 0.04, u1: y1 + 0.04, v0: z + 0.95, alto: 0.22, fill: MAT.madera.i }] });
      }
    };
    const mesilla = (g, e, x0, x1, y0, y1, z) => {
      caja(g, x0, x1, y0, y1, z, z + 0.52, 'madera', { e });
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      caja(g, cx - 0.09, cx + 0.09, cy - 0.09, cy + 0.09, z + 0.52, z + 0.86, 'almohada', { e });
      copa(g, cx, cy, z + 0.82, [[0, 0, 0, 0.55, 'P:lampara']], { e, cls: 'casa-lampara', capa: 1.5 });
    };
    const silla = (g, e, x, y, z, respaldo, m = 'clara') => {      // respaldo: 'y0' | 'y1'
      caja(g, x, x + 0.42, y, y + 0.4, z, z + 0.45, m, { e });
      if (respaldo === 'y0') caja(g, x, x + 0.42, y, y + 0.05, z + 0.45, z + 0.95, m, { e });
      else caja(g, x, x + 0.42, y + 0.35, y + 0.4, z + 0.45, z + 0.95, m, { e });
    };
    const mesa = (g, e, x0, x1, y0, y1, z, alto, m = 'clara') => {
      const p = 0.07, d = 0.06;
      [[x0 + d, y0 + d], [x1 - d - p, y0 + d], [x0 + d, y1 - d - p], [x1 - d - p, y1 - d - p]].forEach(([x, y]) => caja(g, x, x + p, y, y + p, z, z + alto - 0.05, m, { e }));
      caja(g, x0, x1, y0, y1, z + alto - 0.05, z + alto, m, { e });
    };

    /* ---------- base: la maqueta sobre su losa de tierra, el jardín y el río ---------- */
    caja('base', -6.2, 14.2, -3.2, 11.2, -1.4, 0, 'tierra', { capa: 0 });
    suelo('base', -6.2, 0, -3.2, 11.2, 0.003, 'P:cesped', { e: 'jardin', capa: 0.1 });
    luz('base', -6.2, 0, -3.2, 11.2, 0.003, 'jardin');
    caja('base', -8.6, -6.2, -3.2, 11.2, -1.4, -0.95, 'fondo', { vis: 'f', capa: 0.4 });
    caja('base', -8.6, -6.2, -3.2, 11.2, -0.95, -0.42, 'agua', { vis: 'af', e: 'rio', capa: 0.5 });
    luz('base', -8.6, -6.2, -3.2, 11.2, -0.42, 'rio');
    // piedras y espuma en el río
    plano('base', [0, 0, -0.415], X, Y,
      'M-7.6 0.9a0.32 0.24 0 1 0 0.01 0zM-6.9 5.2a0.28 0.2 0 1 0 0.01 0zM-8.0 7.6a0.36 0.26 0 1 0 0.01 0zM-7.1 9.8a0.22 0.17 0 1 0 0.01 0zM-7.9 -1.8a0.25 0.2 0 1 0 0.01 0z',
      '#8F887A', [-8.6, -6.2, -3.2, 11.2, -0.42, -0.4], { e: 'rio', capa: 0.6 });
    linea('base', [[[-7.95, 1.2, -0.41], [-7.6, 1.5, -0.41], [-7.25, 1.25, -0.41]], [[-7.2, 5.5, -0.41], [-6.9, 5.8, -0.41], [-6.6, 5.55, -0.41]], [[-8.3, 7.95, -0.41], [-7.95, 8.3, -0.41], [-7.6, 8.0, -0.41]], [[-8.1, -1.5, -0.41], [-7.85, -1.25, -0.41], [-7.6, -1.45, -0.41]]], '#E6EEEA', 1.1, { capa: 0.65, cls: 'casa-espuma' });
    caja('base', -9.6, -8.6, -3.2, 11.2, -1.4, 0, 'banco', { capa: 0.7, e: 'rio' });

    /* ---------- detrás: un árbol al fondo, detrás de la casa ---------- */
    caja('detras', 13.35, 13.6, 10.25, 10.5, 0, 2.6, 'tronco');
    copa('detras', 13.5, 10.4, 3.7, [[0, 0, 0, 1.45, '#5E7A4A'], [-0.7, 0.3, -0.3, 1.0, '#6C8957'], [0.5, -0.4, 0.5, 0.95, '#7A9662']]);

    /* ---------- planta baja (z 0,08 → 2,8) ---------- */
    const B = 'baja', Z0 = 0.08, HB = 2.8, CB = 1.15;
    caja(B, 0, 13, -1.45, 9, 0, Z0, 'sillar', { vis: 'fi', capa: 0 });
    suelo(B, 0.5, 7.94, 0.5, 8.5, Z0, 'P:losa', { e: 'salon' });
    suelo(B, 0.5, 4.0, 6.0, 8.5, Z0 + 0.002, 'P:barro', { e: 'lareira', capa: 0.05 });
    suelo(B, 8.06, 9.98, 0.5, 3.94, Z0, 'P:losa');
    suelo(B, 8.06, 12.5, 4.06, 8.5, Z0, 'P:losa', { e: 'cocina' });
    suelo(B, 10.1, 12.5, -0.9, 3.94, Z0, 'P:baldosa', { e: 'aseo' });
    suelo(B, 1.0, 9.6, -1.45, 0, Z0, 'P:enlosado');
    luz(B, 0.5, 7.94, 0.5, 8.5, Z0, 'salon');
    luz(B, 0.5, 4.0, 5.6, 8.5, Z0, 'lareira');
    luz(B, 5.6, 8.1, 1.0, 3.5, Z0, 'escalera');
    luz(B, 8.06, 12.5, 4.06, 8.5, Z0, 'cocina');
    luz(B, 10.1, 12.5, -0.9, 3.94, Z0, 'aseo');
    // muros del fondo y de la derecha: enteros siempre (se ven por dentro)
    caja(B, 0, 13, 8.5, 9, Z0, HB, 'piedra', { capa: 0.5, deco: [ventana('f', 5.0, 5.7, 1.2, 2.25), ventana('f', 10.4, 11.1, 1.25, 2.15)] });
    caja(B, 12.5, 13, -1.45, 8.5, Z0, HB, 'piedra', { capa: 0.5, deco: [ventana('i', 5.4, 6.1, 1.25, 2.15)] });
    // muros de delante y de la izquierda: se cortan al abrir
    const cB = { corte: 'B', zc: CB, capa: 2 };
    caja(B, 0, 0.5, 0, 9, Z0, HB, 'piedra', { ...cB, deco: [ventana('i', 3.0, 3.7, 1.05, 2.1), ventana('i', 6.6, 7.2, 1.2, 2.0)] });
    caja(B, 0.5, 9.6, 0, 0.5, Z0, HB, 'piedra', { ...cB, deco: [ventana('f', 2.6, 3.5, 0.95, 2.05), puerta('f', 8.4, 9.4, Z0, 2.25)] });
    caja(B, 0, 1.0, -1.45, 0, Z0, 2.62, 'piedra', cB);                                  // pilar de la solaina
    caja(B, 9.6, 10.1, -1.45, 0.5, Z0, HB, 'piedra', cB);                               // vuelta del cuerpo de la derecha
    caja(B, 10.1, 12.5, -1.45, -0.9, Z0, HB, 'piedra', { ...cB, deco: [ventana('f', 11.0, 11.6, 0.95, 1.75)] });
    caja(B, 4.95, 5.35, -1.35, -0.95, Z0, 2.62, 'sillar', { capa: 2, e: 'solaina' });   // la columna de granito
    // tabiques
    tabique(B, 7.94, 8.06, 0.5, 1.4, Z0, HB, 'B'); tabique(B, 7.94, 8.06, 2.3, 6.2, Z0, HB, 'B'); tabique(B, 7.94, 8.06, 7.1, 8.5, Z0, HB, 'B');
    tabique(B, 8.06, 9.0, 3.94, 4.06, Z0, HB, 'B'); tabique(B, 9.9, 12.5, 3.94, 4.06, Z0, HB, 'B');
    tabique(B, 9.98, 10.1, 0.5, 1.2, Z0, HB, 'B'); tabique(B, 9.98, 10.1, 2.0, 3.94, Z0, HB, 'B');
    // salón comedor
    poli(B, [[3.2, 1.7, Z0 + 0.006], [6.0, 1.7, Z0 + 0.006], [6.0, 3.5, Z0 + 0.006], [3.2, 3.5, Z0 + 0.006]], '#B9C3CF', { e: 'salon', capa: 0.3 });
    linea(B, [0, 1, 2, 3, 4, 5, 6].map((i) => [[3.25 + i * 0.4, 1.72, Z0 + 0.007], [3.25 + i * 0.4, 3.48, Z0 + 0.007]]), '#C98F96', 1.4, { capa: 0.31, cls: 'casa-alfombra' });
    mesa(B, 'salon', 3.6, 5.6, 2.15, 3.05, Z0, 0.78, 'madera');
    [3.75, 4.4, 5.05].forEach((x) => { silla(B, 'salon', x, 1.6, Z0, 'y0', 'madera'); silla(B, 'salon', x, 3.2, Z0, 'y1', 'madera'); });
    caja(B, 4.7, 6.4, 8.05, 8.5, Z0, 1.0, 'madera', { e: 'salon' });                        // aparador (rg-15)
    caja(B, 4.8, 6.3, 8.22, 8.5, 1.0, 2.0, 'madera', { e: 'salon', deco: [{ cara: 'f', t: 'rect', u0: 4.95, u1: 5.45, v0: 1.15, v1: 1.85, fill: '#8F7B62' }, { cara: 'f', t: 'rect', u0: 5.65, u1: 6.15, v0: 1.15, v1: 1.85, fill: '#8F7B62' }] });
    caja(B, 6.65, 7.65, 8.15, 8.5, Z0, 0.55, 'madera', { e: 'salon' });                      // mueble de la tele
    caja(B, 6.75, 7.55, 8.3, 8.38, 0.6, 1.12, 'oscuro', { e: 'salon' });
    caja(B, 0.6, 1.45, 1.0, 3.2, Z0, 0.45, 'azul', { e: 'salon' });                           // sofá de flores (rg-07)
    caja(B, 0.6, 0.85, 1.0, 3.2, 0.45, 0.92, 'azul', { e: 'salon' });
    caja(B, 0.6, 1.45, 1.0, 1.2, 0.45, 0.66, 'azul', { e: 'salon' }); caja(B, 0.6, 1.45, 3.0, 3.2, 0.45, 0.66, 'azul', { e: 'salon' });
    // la lareira (rg-10): banco de piedra, hogar, repisa y campana de pizarra
    caja(B, 1.1, 3.3, 7.85, 8.5, Z0, 0.38, 'sillar', { e: 'lareira' });
    caja(B, 1.45, 2.95, 8.1, 8.5, 0.38, 1.55, 'piedra', { e: 'lareira', deco: [{ cara: 'f', t: 'hogar', u0: 1.72, u1: 2.68, v0: 0.42, v1: 1.3 }] });
    caja(B, 0.95, 3.45, 7.6, 8.5, 1.62, 1.78, 'pizarra', { e: 'lareira' });
    caja(B, 1.3, 3.1, 7.95, 8.5, 1.78, HB, 'pizarra', { e: 'lareira' });
    caja(B, 3.4, 3.85, 7.95, 8.4, Z0, 0.4, 'lena', { e: 'lareira', deco: [{ cara: 'f', t: 'lineas', u0: 3.46, u1: 3.8, paso: 0.08, v0: 0.12, v1: 0.36, stroke: '#4A2F1C' }] });
    caja(B, 1.1, 3.2, 5.3, 6.1, Z0, 0.45, 'verde', { e: 'salon' });                          // sofá verde frente a la lareira
    caja(B, 1.1, 3.2, 5.3, 5.55, 0.45, 0.9, 'verde', { e: 'salon' });
    caja(B, 1.1, 1.3, 5.3, 6.1, 0.45, 0.65, 'verde', { e: 'salon' }); caja(B, 3.0, 3.2, 5.3, 6.1, 0.45, 0.65, 'verde', { e: 'salon' });
    caja(B, 1.6, 2.7, 6.5, 7.15, Z0, 0.42, 'madera', { e: 'lareira' });
    // la escalera de caracol: peldaños en abanico alrededor de un poste
    { const cx = 6.85, cy = 2.25, ri = 0.08, re = 0.92, n = 14, sube = (3.0 - Z0) / 15, a0 = 205, paso = 24;
      const sector = (a, b, z) => { const pts = []; for (let t = 0; t <= 4; t++) { const ang = (a + (b - a) * t / 4) * Math.PI / 180; pts.push([cx + re * Math.cos(ang), cy + re * Math.sin(ang), z]); } const m = ((a + b) / 2) * Math.PI / 180; pts.push([cx + ri * Math.cos(m), cy + ri * Math.sin(m), z]); return pts; };
      const borde = (a, b, z) => { const pts = []; for (let t = 0; t <= 4; t++) { const ang = (a + (b - a) * t / 4) * Math.PI / 180; pts.push([cx + re * Math.cos(ang), cy + re * Math.sin(ang), z]); } for (let t = 4; t >= 0; t--) { const ang = (a + (b - a) * t / 4) * Math.PI / 180; pts.push([cx + re * Math.cos(ang), cy + re * Math.sin(ang), z - 0.06]); } return pts; };
      const barandilla = [], barrotes = [];
      for (let i = 0; i < n; i++) {
        const z = Z0 + sube * (i + 1), a = a0 + i * paso, b = a + paso + 2;
        const m = ((a + b) / 2) * Math.PI / 180, ccx = cx + 0.5 * Math.cos(m), ccy = cy + 0.5 * Math.sin(m);
        const bx = [ccx - 0.5, ccx + 0.5, ccy - 0.5, ccy + 0.5];
        poli(B, borde(a, b, z), MAT.clara.f, { e: 'escalera', capa: 1, b: [...bx, z - 0.2, z - 0.1] });
        poli(B, sector(a, b, z), i % 2 ? MAT.clara.a : tono(MAT.clara.a, 0.94), { e: 'escalera', capa: 1, b: [...bx, z - 0.1, z] });
        const ang = a * Math.PI / 180, p = [cx + re * Math.cos(ang), cy + re * Math.sin(ang)];
        barandilla.push([p[0], p[1], z + 0.88]); barrotes.push([[p[0], p[1], z], [p[0], p[1], z + 0.88]]);
      }
      caja(B, cx - 0.06, cx + 0.06, cy - 0.06, cy + 0.06, Z0, HB + 0.15, 'madera', { e: 'escalera', capa: 1.2 });
      linea(B, [barandilla, ...barrotes], MAT.madera.f, 1.3, { e: 'escalera', capa: 1.3, b: [cx - 1, cx + 1, cy - 1, cy + 1, 1, 2] });
    }
    // cocina (rg-06): bancos de madera con encimera, armarios altos, horno, microondas, lavadora y lavavajillas
    caja(B, 8.5, 12.5, 7.9, 8.5, Z0, 0.9, 'encimera', { e: 'cocina', deco: [{ cara: 'f', t: 'rect', u0: 8.62, u1: 9.2, v0: 0.12, v1: 0.84, fill: '#24282B' }, { cara: 'f', t: 'rect', u0: 10.95, u1: 11.55, v0: 0.2, v1: 0.74, fill: '#2B2F32' }, { cara: 'f', t: 'lineas', u0: 9.8, u1: 10.9, paso: 0.55, v0: 0.12, v1: 0.84, stroke: '#6E4A2A' }] });
    caja(B, 9.8, 10.45, 8.0, 8.4, 0.9, 0.915, 'metal', { e: 'cocina' });
    caja(B, 11.9, 12.5, 5.2, 7.9, Z0, 0.9, 'encimera', { e: 'cocina', deco: [{ cara: 'i', t: 'aro', u: 6.1, v: 0.45, r: 0.2 }] });
    caja(B, 8.5, 11.0, 8.15, 8.5, 1.5, 2.3, 'mueble', { e: 'cocina', deco: [{ cara: 'f', t: 'rect', u0: 9.0, u1: 9.6, v0: 1.6, v1: 1.95, fill: '#2B2F32' }, { cara: 'f', t: 'lineas', u0: 9.9, u1: 10.95, paso: 0.52, v0: 1.55, v1: 2.25, stroke: '#6E4A2A' }] });
    mesa(B, 'cocina', 8.7, 9.75, 5.0, 5.8, Z0, 0.76);
    silla(B, 'cocina', 8.85, 4.5, Z0, 'y0'); silla(B, 'cocina', 9.3, 6.1, Z0, 'y1');
    // aseo
    caja(B, 11.95, 12.45, 0.2, 0.62, Z0, 0.42, 'blanco', { e: 'aseo' });
    caja(B, 12.27, 12.47, 0.2, 0.62, 0.42, 0.82, 'blanco', { e: 'aseo' });
    caja(B, 12.05, 12.5, 1.45, 1.95, Z0, 0.78, 'mueble', { e: 'aseo' });
    caja(B, 12.0, 12.5, 1.4, 2.0, 0.78, 0.88, 'blanco', { e: 'aseo' });

    /* ---------- planta alta (z 3,0 → 5,6) ---------- */
    const A = 'alta', ZA = 3.0, HA = 5.6, CA = 4.15;
    caja(A, 0, 13, 0, 9, 2.8, ZA, 'forjado', { vis: 'fi', capa: 0 });
    caja(A, 9.6, 13, -1.45, 0, 2.8, ZA, 'forjado', { vis: 'fi', capa: 0 });
    caja(A, 1.0, 9.6, -1.5, 0, 2.62, 2.92, 'sillar', { vis: 'fi', capa: 0.05, e: 'solaina' });   // la losa de la solaina
    suelo(A, 1.0, 9.6, -1.5, 0, 2.92, 'P:tarima-s', { e: 'solaina', capa: 0.1 });
    luz(A, 1.0, 9.6, -1.5, 0, 2.92, 'solaina');
    suelo(A, 0.5, 5.14, 0.5, 8.5, ZA, 'P:tarima', { e: 'matrimonio' });
    suelo(A, 0.5, 2.42, 6.6, 8.5, ZA + 0.002, 'P:baldosa', { e: 'matrimonio', capa: 0.05 });
    suelo(A, 5.26, 9.98, 0.5, 3.6, ZA, 'P:tarima');
    suelo(A, 5.26, 9.98, 3.6, 8.5, ZA, 'P:tarima', { e: 'dobles-1' });
    suelo(A, 5.26, 6.9, 3.66, 5.3, ZA + 0.002, 'P:baldosa', { e: 'dobles-1', capa: 0.05 });
    suelo(A, 10.1, 12.5, -0.9, 8.5, ZA, 'P:tarima', { e: 'dobles-2' });
    suelo(A, 10.1, 12.5, 6.6, 8.5, ZA + 0.002, 'P:baldosa', { e: 'dobles-2', capa: 0.05 });
    luz(A, 0.5, 5.14, 0.5, 8.5, ZA, 'matrimonio');
    luz(A, 5.26, 9.98, 3.6, 8.5, ZA, 'dobles-1');
    luz(A, 10.1, 12.5, -0.9, 8.5, ZA, 'dobles-2');
    // hueco de la escalera, con su barandilla
    plano(A, [0, 0, ZA + 0.003], X, Y, 'M5.92 2.25a0.93 0.93 0 1 0 1.86 0a0.93 0.93 0 1 0 -1.86 0z', '#2E2723', [5.9, 7.8, 1.3, 3.2, ZA, ZA], { capa: 0.25, e: 'escalera' });
    { const aro = [], barr = []; for (let a = 110; a <= 400; a += 10) { const t = a * Math.PI / 180; aro.push([6.85 + 0.98 * Math.cos(t), 2.25 + 0.98 * Math.sin(t), ZA + 0.9]); } for (let a = 110; a <= 400; a += 29) { const t = a * Math.PI / 180, x = 6.85 + 0.98 * Math.cos(t), y = 2.25 + 0.98 * Math.sin(t); barr.push([[x, y, ZA], [x, y, ZA + 0.9]]); }
      linea(A, [aro, ...barr], MAT.madera.f, 1.3, { e: 'escalera', capa: 1, b: [5.9, 7.8, 1.3, 3.2, ZA, ZA + 0.9] }); }
    caja(A, 6.79, 6.91, 2.19, 2.31, ZA, ZA + 0.95, 'madera', { e: 'escalera' });
    // muros del fondo y de la derecha
    caja(A, 0, 13, 8.5, 9, ZA, HA, 'piedra', { capa: 0.5, deco: [ventana('f', 3.25, 3.95, 3.95, 5.0), ventana('f', 7.25, 7.85, 4.0, 4.95), ventana('f', 10.9, 11.5, 4.0, 4.95)] });
    caja(A, 12.5, 13, -1.45, 8.5, ZA, HA, 'piedra', { capa: 0.5, deco: [ventana('i', 1.45, 2.25, 4.0, 5.0)] });
    // muros de delante y de la izquierda (se cortan) y el pilar
    const cA = { corte: 'A', zc: CA, capa: 2 };
    caja(A, 0, 0.5, 0, 9, ZA, HA, 'piedra', { ...cA, deco: [ventana('i', 4.1, 4.9, 3.95, 5.0)] });
    caja(A, 0.5, 9.6, 0, 0.5, ZA, HA, 'piedra', { ...cA, deco: [puerta('f', 2.3, 3.1, ZA, 5.15), ventana('f', 3.9, 4.6, 3.95, 5.0), puerta('f', 6.25, 7.05, ZA, 5.15)] });
    caja(A, 0, 1.0, -1.5, 0, 2.62, 5.35, 'piedra', cA);
    caja(A, 9.6, 10.1, -1.45, 0.5, ZA, HA, 'piedra', cA);
    caja(A, 10.1, 12.5, -1.45, -0.9, ZA, HA, 'piedra', { ...cA, deco: [ventana('f', 11.0, 11.65, 3.95, 4.9)] });
    // tabiques
    tabique(A, 5.14, 5.26, 0.5, 2.0, ZA, HA, 'A'); tabique(A, 5.14, 5.26, 2.8, 8.5, ZA, HA, 'A');
    tabique(A, 5.26, 7.6, 3.54, 3.66, ZA, HA, 'A'); tabique(A, 8.4, 9.98, 3.54, 3.66, ZA, HA, 'A');
    tabique(A, 9.98, 10.1, 0.5, 1.4, ZA, HA, 'A'); tabique(A, 9.98, 10.1, 2.2, 8.5, ZA, HA, 'A');
    tabique(A, 0.5, 2.42, 6.54, 6.66, ZA, HA, 'A'); tabique(A, 2.36, 2.48, 6.66, 7.2, ZA, HA, 'A'); tabique(A, 2.36, 2.48, 7.9, 8.5, ZA, HA, 'A');
    tabique(A, 6.84, 6.96, 3.66, 5.36, ZA, HA, 'A'); tabique(A, 5.26, 5.8, 5.24, 5.36, ZA, HA, 'A'); tabique(A, 6.5, 6.84, 5.24, 5.36, ZA, HA, 'A');
    tabique(A, 10.1, 10.5, 6.54, 6.66, ZA, HA, 'A'); tabique(A, 11.2, 12.5, 6.54, 6.66, ZA, HA, 'A');
    // dormitorio de matrimonio y su baño
    cama(A, 'matrimonio', 3.0, 4.55, 6.45, 8.42, ZA, 'y1');
    mesilla(A, 'matrimonio', 2.55, 2.95, 8.0, 8.42, ZA); mesilla(A, 'matrimonio', 4.6, 5.0, 8.0, 8.42, ZA);
    caja(A, 0.6, 1.5, 7.6, 8.45, ZA, ZA + 0.06, 'blanco', { e: 'matrimonio' });
    caja(A, 1.85, 2.28, 7.98, 8.42, ZA, ZA + 0.42, 'blanco', { e: 'matrimonio' });
    caja(A, 0.55, 0.95, 6.75, 7.3, ZA + 0.78, ZA + 0.88, 'blanco', { e: 'matrimonio' });
    // dormitorio con dos camas (1) y su baño
    cama(A, 'dobles-1', 6.1, 7.0, 6.5, 8.42, ZA, 'y1'); cama(A, 'dobles-1', 8.3, 9.2, 6.5, 8.42, ZA, 'y1');
    mesilla(A, 'dobles-1', 7.45, 7.85, 8.0, 8.42, ZA);
    caja(A, 5.35, 6.1, 3.75, 4.5, ZA, ZA + 0.06, 'blanco', { e: 'dobles-1' });
    caja(A, 6.35, 6.78, 4.75, 5.18, ZA, ZA + 0.42, 'blanco', { e: 'dobles-1' });
    caja(A, 5.32, 5.72, 4.65, 5.15, ZA + 0.78, ZA + 0.88, 'blanco', { e: 'dobles-1' });
    // el otro dormitorio con dos camas (2) y su baño
    cama(A, 'dobles-2', 10.55, 12.42, 0.05, 0.95, ZA, 'x1'); cama(A, 'dobles-2', 10.55, 12.42, 2.75, 3.65, ZA, 'x1');
    mesilla(A, 'dobles-2', 11.98, 12.42, 1.6, 2.05, ZA);
    caja(A, 11.6, 12.45, 7.6, 8.45, ZA, ZA + 0.06, 'blanco', { e: 'dobles-2' });
    caja(A, 10.25, 10.68, 7.98, 8.42, ZA, ZA + 0.42, 'blanco', { e: 'dobles-2' });
    caja(A, 10.95, 11.45, 8.08, 8.45, ZA + 0.78, ZA + 0.88, 'blanco', { e: 'dobles-2' });
    // la solaina: pies derechos, pasamanos y barrotes de madera rojiza (rg-02)
    const postes = [1.08, 3.85, 6.6, 9.38];
    postes.forEach((x) => caja(A, x, x + 0.14, -1.46, -1.32, 2.92, 5.42, 'solaina', { corte: 'A', zc: 3.98, capa: 2, e: 'solaina' }));
    for (let i = 0; i < postes.length - 1; i++) caja(A, postes[i] + 0.14, postes[i + 1], -1.45, -1.33, 3.86, 3.96, 'solaina', { capa: 2, e: 'solaina' });
    { const d = []; for (let x = 1.32; x < 9.36; x += 0.135) { if (postes.some((p) => x > p - 0.04 && x < p + 0.18)) continue; d.push(`M${f3(x)} -3.86V-2.94`); }
      plano(A, [0, -1.39, 0], X, ZB, d.join(''), 'none', [1.0, 9.6, -1.45, -1.33, 2.92, 3.86], { stroke: MAT.solaina.f, ancho: 1.2, capa: 2, e: 'solaina' }); }
    caja(A, 1.0, 9.6, -1.5, -1.28, 5.28, 5.42, 'solaina', { capa: 2, cerrada: true });   // viga del alero

    /* ---------- fuera: barbacoa, merendero, árboles, arbustos, valla y el puente de madera ---------- */
    const F = 'fuera';
    caja(F, -4.9, -1.0, -1.6, 1.9, 0, 0.1, 'terraza', { capa: 0.5, e: 'barbacoa' });
    luz(F, -4.9, -1.0, -1.6, 1.9, 0.1, 'barbacoa');
    caja(F, -4.6, -2.5, 1.15, 1.85, 0.1, 0.95, 'piedra', { e: 'barbacoa', deco: [{ cara: 'f', t: 'rect', u0: -4.3, u1: -2.8, v0: 0.5, v1: 0.88, fill: '#26201C' }, { cara: 'f', t: 'lineas', u0: -4.25, u1: -2.85, paso: 0.12, v0: 0.84, v1: 0.88, stroke: '#7A746C' }] });
    caja(F, -4.1, -3.0, 1.35, 1.85, 0.95, 2.3, 'piedra', { e: 'barbacoa' });
    [[-4.78, -1.48], [-1.45, -1.48], [-1.45, 1.6]].forEach(([x, y]) => caja(F, x, x + 0.25, y, y + 0.25, 0.1, 2.3, 'sillar', { e: 'barbacoa' }));
    caja(F, -5.0, -0.9, -1.7, 2.0, 2.3, 2.45, 'tejado', { e: 'barbacoa', capa: 1.6 });
    caja(F, -4.1, -3.0, 1.35, 1.85, 2.45, 2.8, 'piedra', { e: 'barbacoa', capa: 1.7 });
    // merendero (rg-11)
    caja(F, -3.9, -2.5, 6.65, 7.35, 0.7, 0.77, 'gris', { e: 'jardin' });
    caja(F, -3.7, -3.45, 6.85, 7.15, 0, 0.7, 'sillar', { e: 'jardin' }); caja(F, -2.95, -2.7, 6.85, 7.15, 0, 0.7, 'sillar', { e: 'jardin' });
    caja(F, -3.9, -2.5, 6.15, 6.42, 0.42, 0.48, 'gris', { e: 'jardin' }); caja(F, -3.9, -2.5, 7.58, 7.85, 0.42, 0.48, 'gris', { e: 'jardin' });
    [6.2, 7.63].forEach((y) => { caja(F, -3.65, -3.45, y, y + 0.17, 0, 0.42, 'sillar', { e: 'jardin' }); caja(F, -2.95, -2.75, y, y + 0.17, 0, 0.42, 'sillar', { e: 'jardin' }); });
    // árboles y arbustos
    caja(F, -3.35, -3.05, 9.15, 9.45, 0, 3.1, 'tronco', { e: 'jardin' });
    copa(F, -3.2, 9.3, 4.5, [[0.3, 0.4, -0.2, 1.5, '#58744A'], [0, 0, 0, 1.55, '#5E7A4A'], [-0.9, 0.3, -0.4, 1.05, '#6C8957'], [0.85, -0.5, -0.3, 1.1, '#647F51'], [0.2, -0.3, 0.75, 1.0, '#7A9662'], [-0.35, -0.7, 0.3, 0.75, '#86A26C']], { e: 'jardin' });
    caja(F, -5.4, -5.2, 10.3, 10.5, 0, 2.2, 'tronco', { e: 'jardin' });
    copa(F, -5.3, 10.4, 3.0, [[0, 0, 0, 1.0, '#5E7A4A'], [0.5, -0.3, 0.4, 0.7, '#7A9662'], [-0.45, 0.2, -0.2, 0.65, '#6C8957']], { e: 'jardin' });
    [[-0.85, 6.6, 0.38, 0.5], [-5.4, 9.0, 0.42, 0.58], [-1.1, 3.6, 0.32, 0.42], [-5.5, -2.4, 0.36, 0.5]].forEach(([x, y, z, rr]) => copa(F, x, y, z, [[0, 0, 0, rr, '#6C8957'], [rr * 0.35, -rr * 0.3, rr * 0.35, rr * 0.6, '#86A26C']], { e: 'jardin' }));
    // valla de madera junto al río
    [[-3.0, -1.2, 0.6, 2.3], [3.9, 5.7, 7.5, 9.3, 11.0]].forEach((tramo) => {
      tramo.forEach((y) => caja(F, -6.1, -5.95, y, y + 0.14, 0, 1.0, 'gris', { e: 'jardin' }));
      for (let i = 0; i < tramo.length - 1; i++) { caja(F, -6.08, -5.97, tramo[i] + 0.14, tramo[i + 1], 0.8, 0.88, 'gris', { e: 'jardin' }); caja(F, -6.08, -5.97, tramo[i] + 0.14, tramo[i + 1], 0.42, 0.5, 'gris', { e: 'jardin' }); }
    });
    // el puente de madera (está en las fotos; no decimos de quién es)
    caja(F, -9.5, -5.6, 2.65, 2.75, 0.12, 0.32, 'madera'); caja(F, -9.5, -5.6, 3.45, 3.55, 0.12, 0.32, 'madera');
    caja(F, -9.5, -5.6, 2.6, 3.6, 0.32, 0.42, 'madera', { capa: 1.1 });
    [-9.4, -7.55, -5.72].forEach((x) => { caja(F, x, x + 0.12, 2.6, 2.72, 0.42, 1.32, 'madera', { capa: 1.2 }); caja(F, x, x + 0.12, 3.48, 3.6, 0.42, 1.32, 'madera', { capa: 1.2 }); });
    caja(F, -9.5, -5.6, 2.6, 2.7, 1.24, 1.32, 'madera', { capa: 1.25 }); caja(F, -9.5, -5.6, 3.5, 3.6, 1.24, 1.32, 'madera', { capa: 1.25 });

    /* ---------- tejado: dos aguas de losa de pizarra, con su hastial de piedra ---------- */
    const T = 'tejado', yr = 3.85, zr = 8.0, La = Math.hypot(5.45, 2.5);
    const atras = [0, 5.45 / La, -2.5 / La], alante = [0, -5.45 / La, -2.5 / La];
    plano(T, [-0.3, yr, zr], X, atras, `M0 0H13.6V${f3(La)}H0Z`, 'P:pizarra-b', [-0.3, 13.3, yr, 9.3, 5.5, 8], { capa: 0 });
    plano(T, [0, 0, 0], Y, ZB, 'M0 -5.6V-6.03L3.85 -7.8L8.65 -5.6Z', 'P:piedra-i', [0, 0, 0, 9, 5.6, 7.8], { capa: 1 });
    plano(T, [-0.3, yr, zr], X, alante, `M0 0H13.6V${f3(La)}H0Z`, 'P:pizarra-a', [-0.3, 13.3, -1.6, yr, 5.5, 8], { capa: 2 });
    plano(T, [-0.3, 0, 0], Y, ZB, `M-1.6 -5.5L${yr} -8L9.3 -5.5V-5.3L${yr} -7.8L-1.6 -5.3Z`, '#2D3337', [-0.3, -0.3, -1.6, 9.3, 5.3, 8], { capa: 3 });
    caja(T, -0.3, 13.3, -1.68, -1.6, 5.3, 5.5, 'solaina', { vis: 'f', capa: 3 });
    caja(T, -0.35, 13.35, yr - 0.1, yr + 0.1, zr - 0.04, zr + 0.08, 'pizarra', { capa: 2.5 });
    return L;
  }

  /* ================= Montaje ================= */
  function montar(el, op = {}) {
    if (!el || el.dataset.montado === '1') return { destruir() {} };
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quieto = op.movimiento === false || op.densidad === 'sobria' || (op.movimiento == null && reduce);
    const base = op.base || 'img/fotos/';
    const respaldoFotos = op.respaldoFotos || {};
    const pre = `cs${++cuenta}-`;
    const reservar = () => (window.Laxa && typeof window.Laxa.reservar === 'function' ? window.Laxa.reservar() : (location.hash = '#reservar'));

    // guarda el respaldo para devolverlo al destruir
    const respaldo = document.createDocumentFragment();
    while (el.firstChild) respaldo.appendChild(el.firstChild);
    el.classList.add('casa');
    el.dataset.quieto = quieto ? '1' : '0';
    el.dataset.fondo = fondoOscuro(el) ? 'oscuro' : 'claro';

    /* ---- esqueleto ---- */
    const mod = html('div', { class: 'casa-mod' });
    const cabeza = html('div', { class: 'casa-cabeza' });
    const cifras = html('ul', { class: 'casa-cifras', 'aria-label': 'La casa en cifras' });
    [['6', 'personas'], ['3', 'dormitorios'], ['3', 'baños + aseo'], ['5', 'camas'], ['+', 'cuna']].forEach(([n, t]) => {
      const li = html('li'); const b = html('b', {}, n); if (n === '+') b.setAttribute('aria-hidden', 'true'), b.className = 'casa-cuna';
      li.append(b, ' ', html('span', {}, t)); cifras.append(li);
    });
    const fechas = html('a', { class: 'casa-fechas', href: '#reservar' }, 'Ver fechas');
    cabeza.append(cifras, fechas);

    const pista = html('div', { class: 'casa-pista' });
    const escena = html('div', { class: 'casa-escena' });
    const pasos = html('ol', { class: 'casa-pasos', 'aria-hidden': 'true' });
    ['La casa', 'Planta alta', 'Planta baja'].forEach((t, i) => pasos.append(html('li', { 'data-paso': String(i) }, t)));
    const aviso = html('p', { class: 'casa-baja', 'aria-hidden': 'true' }, 'Baja y la casa se abre');
    const lienzo = html('div', { class: 'casa-lienzo' });
    const svg = nodo('svg', { class: 'casa-svg', role: 'img', 'aria-label': 'Dibujo orientativo de la casa en corte: abajo la cocina, el salón comedor con la lareira, el aseo y la escalera de caracol; arriba los tres dormitorios con su baño y la solaina; fuera, el jardín, la barbacoa cubierta y el río. No es el plano.', preserveAspectRatio: 'xMidYMid meet' });
    const defs = nodo('defs'); defs.innerHTML = patrones(pre); svg.append(defs);
    const capas = {}; ['base', 'detras', 'baja', 'alta', 'fuera', 'tejado'].forEach((g) => { capas[g] = nodo('g', { class: 'casa-g-' + g }); svg.append(capas[g]); });
    const pines = html('div', { class: 'casa-pines', 'aria-hidden': 'true' });
    lienzo.append(svg, pines);
    const nota = html('p', { class: 'casa-nota' });
    nota.innerHTML = '<b>Dibujo orientativo, no es el plano.</b> Las estancias son las que tiene la casa; dónde está cada una es una suposición.';
    escena.append(pasos, aviso, lienzo, nota);
    pista.append(escena);

    const panel = html('div', { class: 'casa-panel' });
    const lista = html('div', { class: 'casa-lista', role: 'group', 'aria-label': 'Estancias de la casa' });
    const ayuda = html('p', { class: 'casa-ayuda', id: pre + 'ayuda' }, 'Pasa el ratón o toca una estancia del dibujo, o recórrelas aquí con las flechas.');
    lista.append(ayuda);
    const fichas = html('div', { class: 'casa-fichas' });
    const vacia = html('div', { class: 'casa-ficha casa-ficha--vacia es-visible' });
    vacia.innerHTML = '<p class="casa-ficha-planta">La casa por dentro</p><p class="casa-ficha-nombre">Elige una estancia</p><p class="casa-ficha-texto">Cada ficha dice lo que tiene esa estancia según sus fichas en los portales, y nada más.</p>';
    fichas.append(vacia);
    const fuente = html('p', { class: 'casa-fuente' }, 'Datos: sus fichas en casasrurales.net, Sensación Rural y Ruralgest.');
    panel.append(lista, fichas, fuente);
    mod.append(cabeza, pista, panel);
    el.append(mod);

    /* ---- botones de estancia, fichas y pines ---- */
    const botones = [], porId = {};
    ['alta', 'baja', 'fuera'].forEach((pl) => {
      const grupo = html('div', { class: 'casa-grupo', role: 'group', 'aria-labelledby': pre + 'g-' + pl });
      grupo.append(html('p', { class: 'casa-grupo-t', id: pre + 'g-' + pl }, PLANTAS[pl]));
      const ul = html('ul');
      ESTANCIAS.filter((e) => e.planta === pl).forEach((e) => {
        const idF = pre + 'ficha-' + e.id;
        const li = html('li');
        const b = html('button', { type: 'button', class: 'casa-chip', 'data-estancia': e.id, 'aria-expanded': 'false', 'aria-controls': idF, 'aria-describedby': idF, tabindex: '-1' });
        b.append(html('span', { class: 'casa-chip-n', 'aria-hidden': 'true' }, String(e.n)), document.createTextNode(e.nombre));
        li.append(b); ul.append(li); botones.push(b);
        // ficha
        const f = html('div', { class: 'casa-ficha', id: idF, 'data-estancia': e.id });
        const cab = html('div', { class: 'casa-ficha-cab' });
        cab.append(html('p', { class: 'casa-ficha-planta' }, `${PLANTAS[e.planta]} · ${String(e.n).padStart(2, '0')}`));
        const h = html('h3', { class: 'casa-ficha-nombre' }, e.nombre);
        if (e.sub) h.append(html('small', {}, e.sub));
        cab.append(h);
        const fig = html('div', { class: 'casa-ficha-fotos' });
        if (e.foto) {
          const conVisor = !!document.getElementById('visor');
          const f1 = html(conVisor ? 'button' : 'span', conVisor ? { type: 'button', class: 'casa-foto1', 'data-visor': e.foto, 'aria-label': 'Ver más grande: ' + e.nombre.toLowerCase() } : { class: 'casa-foto1' });
          f1.append(foto(e.foto, e.alt)); fig.append(f1);
          if (e.foto2) { const f2b = html('span', { class: 'casa-foto2' }); f2b.append(foto(e.foto2, e.alt2, true)); fig.append(f2b); }
        } else fig.append(html('p', { class: 'casa-sinfoto' }, 'No hay foto del aseo'));
        const ul2 = html('ul', { class: 'casa-ficha-datos' });
        e.datos.forEach((d) => ul2.append(html('li', {}, d)));
        f.append(cab, fig, ul2);
        fichas.append(f);
        // pin
        const pin = html('span', { class: 'casa-pin', 'data-estancia': e.id, 'data-nombre': e.nombre }, String(e.n));
        pines.append(pin);
        porId[e.id] = { e, b, f, pin, cargada: false };
      });
      grupo.append(ul); lista.append(grupo);
    });
    botones[0].tabIndex = 0;
    lista.setAttribute('aria-describedby', ayuda.id);

    function foto(nombre, alt, segunda) {
      const pic = html('picture');
      const sizes = segunda ? '(min-width: 960px) 120px, 15vw' : '(min-width: 960px) 360px, 42vw';
      const set = (ext) => `${base}${nombre}-480.${ext} 480w, ${base}${nombre}-800.${ext} 800w, ${base}${nombre}-1024.${ext} 1024w`;
      pic.append(html('source', { type: 'image/avif', 'data-srcset': set('avif'), sizes }), html('source', { type: 'image/webp', 'data-srcset': set('webp'), sizes }));
      const img = html('img', { alt, width: '1024', height: '768', decoding: 'async', 'data-src': `${base}${nombre}-480.jpg`, 'data-srcset': set('jpg'), sizes });
      img.addEventListener('error', () => {
        const r = respaldoFotos[nombre]; if (!r || img.dataset.respaldo) return;
        img.dataset.respaldo = '1'; pic.querySelectorAll('source').forEach((s) => s.remove()); img.removeAttribute('srcset'); img.src = r;
      });
      pic.append(img); return pic;
    }
    const cargar = (x) => {
      if (x.cargada) return; x.cargada = true;
      x.f.querySelectorAll('[data-srcset]').forEach((s) => { s.setAttribute('srcset', s.dataset.srcset); s.removeAttribute('data-srcset'); });
      x.f.querySelectorAll('img[data-src]').forEach((i) => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
    };

    /* ---- dibujo ---- */
    const items = modelo();
    const url = (f) => (f && f.startsWith('P:') ? `url(#${pre}${f.slice(2)})` : f);
    const porE = {};
    // orden de pintado: por grupo, por capa y, dentro, de lo más lejano a lo más cercano
    ponGiro((TH0 + TH1) / 2);
    const caja3 = (it) => (it.t === 'caja' ? [it.x0, it.x1, it.y0, it.y1, it.z0, it.z1] : it.t === 'suelo' ? [it.x0, it.x1, it.y0, it.y1, it.z, it.z] : it.t === 'copa' ? [it.x - 1, it.x + 1, it.y - 1, it.y + 1, it.z - 1, it.z + 1] : it.b || bbox(it.t === 'poli' ? it.pts : it.tramos.flat()));
    const hondo = (b) => { const x = (b[0] + b[1]) / 2, y = (b[2] + b[3]) / 2, z = (b[4] + b[5]) / 2; return (x * V.s + y * V.c) * V.cf - z * V.sf; };
    items.forEach((it, i) => { it.i = i; it.h = hondo(caja3(it)); });
    const ORDEN = ['base', 'detras', 'baja', 'alta', 'fuera', 'tejado'];
    items.sort((a, b) => (ORDEN.indexOf(a.g) - ORDEN.indexOf(b.g)) || (a.capa - b.capa) || (b.h - a.h) || (a.i - b.i));
    items.forEach((it) => {
      crear(it, capas[it.g]);
      if (it.e) (porE[it.e] = porE[it.e] || []).push(it.nodo);
    });

    function crear(it, padre) {
      if (it.t === 'caja') {
        const g = nodo('g'); const m = MAT[it.m];
        it.caras = [];
        for (const k of it.vis || 'afi') {
          const cg = nodo('g'); const r = nodo('rect', { fill: url(m[k]) }); cg.append(r); g.append(cg);
          const deco = (it.deco || []).filter((d) => d.cara === k).map((d) => crearDeco(d, cg));
          it.caras.push({ k, cg, r, deco });
        }
        it.nodo = g;
      } else if (it.t === 'suelo') {
        it.nodo = nodo('rect', { x: f3(it.x0), y: f3(it.y0), width: f3(it.x1 - it.x0), height: f3(it.y1 - it.y0), fill: url(it.fill) });
      } else if (it.t === 'plano') {
        it.nodo = nodo('path', { d: it.d, fill: url(it.fill) });
        if (it.stroke) { it.nodo.setAttribute('stroke', it.stroke); it.nodo.setAttribute('stroke-width', it.ancho); it.nodo.classList.add('casa-trazo'); }
      } else if (it.t === 'poli') {
        it.nodo = nodo('polygon', { fill: url(it.fill) });
      } else if (it.t === 'linea') {
        it.nodo = nodo('path', { fill: 'none', stroke: it.stroke, 'stroke-width': it.ancho, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'casa-trazo' });
      } else if (it.t === 'copa') {
        it.nodo = nodo('g');
        it.circ = it.bolas.map(([, , , rr, fill]) => { const c = nodo('circle', { r: f2(rr * K), fill: url(fill) }); it.nodo.append(c); return c; });
      }
      if (it.cls) it.cls.split(' ').forEach((c) => it.nodo.classList.add(c));
      if (it.e) it.nodo.setAttribute('data-e', it.e);
      padre.append(it.nodo);
    }
    function crearDeco(d, cg) {
      const ry = (v0, v1) => [-v1, v1 - v0];
      if (d.t === 'ventana' || d.t === 'puerta') {
        const marco = nodo('rect', { fill: d.t === 'puerta' ? '#6E3F26' : '#6B3A22', class: 'casa-deco' });
        const vidrio = nodo('rect', { fill: '#2E363A', class: 'casa-deco' });
        const parte = nodo('path', { stroke: '#6B3A22', 'stroke-width': 1, fill: 'none', class: 'casa-deco casa-trazo' });
        cg.append(marco, vidrio, parte);
        return { d, pintar(z1) {
          const top = Math.min(d.v1, z1), alto = top - d.v0;
          const ver = alto > 0.08; [marco, vidrio, parte].forEach((n) => n.style.display = ver ? '' : 'none'); if (!ver) return;
          marco.setAttribute('x', f3(d.u0)); marco.setAttribute('y', f3(-top)); marco.setAttribute('width', f3(d.u1 - d.u0)); marco.setAttribute('height', f3(alto));
          const m = 0.07, vb = d.t === 'puerta' ? d.v0 + (d.v1 - d.v0) * 0.45 : d.v0 + m, vt = Math.min(d.v1 - m, z1);
          if (vt - vb > 0.05) { vidrio.style.display = ''; vidrio.setAttribute('x', f3(d.u0 + m)); vidrio.setAttribute('y', f3(-vt)); vidrio.setAttribute('width', f3(d.u1 - d.u0 - 2 * m)); vidrio.setAttribute('height', f3(vt - vb)); }
          else vidrio.style.display = 'none';
          const mu = (d.u0 + d.u1) / 2; parte.setAttribute('d', vt - vb > 0.05 ? `M${f3(mu)} ${f3(-vt)}V${f3(-vb)}` : '');
        } };
      }
      if (d.t === 'rect') { const n = nodo('rect', { fill: d.fill, class: 'casa-deco' }); cg.append(n); return { d, pintar(z1) { const top = Math.min(d.v1, z1); const ver = top - d.v0 > 0.03; n.style.display = ver ? '' : 'none'; if (!ver) return; const [y, h] = ry(d.v0, top); n.setAttribute('x', f3(d.u0)); n.setAttribute('y', f3(y)); n.setAttribute('width', f3(d.u1 - d.u0)); n.setAttribute('height', f3(h)); } }; }
      if (d.t === 'hogar') {
        const boca = nodo('rect', { fill: '#1F1A17', rx: 0.05, class: 'casa-deco' });
        const brasa = nodo('ellipse', { fill: '#E8893A', opacity: 0.75, class: 'casa-deco casa-brasa' });
        cg.append(boca, brasa);
        return { d, pintar(z1) { const top = Math.min(d.v1, z1); boca.setAttribute('x', f3(d.u0)); boca.setAttribute('y', f3(-top)); boca.setAttribute('width', f3(d.u1 - d.u0)); boca.setAttribute('height', f3(Math.max(0, top - d.v0))); brasa.setAttribute('cx', f3((d.u0 + d.u1) / 2)); brasa.setAttribute('cy', f3(-(d.v0 + 0.1))); brasa.setAttribute('rx', f3((d.u1 - d.u0) * 0.32)); brasa.setAttribute('ry', '0.08'); } };
      }
      if (d.t === 'lineas') {
        const n = nodo('path', { stroke: d.stroke, 'stroke-width': 1, fill: 'none', class: 'casa-deco casa-trazo' }); cg.append(n);
        return { d, pintar() { let s = ''; for (let u = d.u0; u <= d.u1 + 1e-6; u += d.paso) s += `M${f3(u)} ${f3(-d.v1)}V${f3(-d.v0)}`; n.setAttribute('d', s); } };
      }
      if (d.t === 'aro') {
        const n = nodo('circle', { cx: f3(d.u), cy: f3(-d.v), r: f3(d.r), fill: '#D7DBDC', stroke: '#5C6164', 'stroke-width': 1, class: 'casa-deco casa-trazo' }); cg.append(n);
        return { d, pintar() {} };
      }
      if (d.t === 'arco') {
        const n = nodo('path', { fill: d.fill, class: 'casa-deco' }); cg.append(n);
        const w = d.u1 - d.u0;
        n.setAttribute('d', `M${f3(d.u0)} ${f3(-d.v0)}C${f3(d.u0)} ${f3(-d.v0 - d.alto * 0.9)} ${f3(d.u0 + w * 0.25)} ${f3(-d.v0 - d.alto)} ${f3(d.u0 + w / 2)} ${f3(-d.v0 - d.alto)}S${f3(d.u1)} ${f3(-d.v0 - d.alto * 0.9)} ${f3(d.u1)} ${f3(-d.v0)}Z`);
        return { d, pintar() {} };
      }
      return { d, pintar() {} };
    }

    function bbox(pts) { const b = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]; pts.forEach(([x, y, z]) => { b[0] = Math.min(b[0], x); b[1] = Math.max(b[1], x); b[2] = Math.min(b[2], y); b[3] = Math.max(b[3], y); b[4] = Math.min(b[4], z); b[5] = Math.max(b[5], z); }); return b; }

    /* ---- estado según el avance p (0 cerrada → 1 abierta) ---- */
    const estado = (p) => ({
      th: lerp(TH0, TH1, suave(0, 0.72, p)),
      lT: SUBE_TEJADO * suave(0.06, 0.34, p),
      oT: 1 - suave(0.14, 0.32, p),
      A: suave(0.12, 0.34, p),
      lA: SUBE_ALTA * suave(0.4, 0.68, p),
      B: suave(0.42, 0.64, p),
    });
    const z1De = (it, E) => (it.corte ? lerp(it.z1, it.zc != null ? it.zc : it.z0 + 1.07, E[it.corte]) : it.z1);
    let ultimo = null;

    function pintar(E, todo) {
      const gira = todo || !ultimo || ultimo.th !== E.th;
      const cortaA = todo || !ultimo || ultimo.A !== E.A, cortaB = todo || !ultimo || ultimo.B !== E.B;
      ponGiro(E.th);
      for (const it of items) {
        const corta = it.corte === 'A' ? cortaA : it.corte === 'B' ? cortaB : false;
        if (!gira && !corta) continue;
        if (it.t === 'caja') {
          const z1 = z1De(it, E);
          const ver = z1 - it.z0 > 0.004;
          it.nodo.style.display = ver ? '' : 'none';
          if (!ver) continue;
          for (const c of it.caras) {
            if (c.k === 'a') {
              c.cg.setAttribute('transform', matriz([0, 0, z1], X, Y));
              if (todo || !c.hecho) { c.r.setAttribute('x', f3(it.x0)); c.r.setAttribute('y', f3(it.y0)); c.r.setAttribute('width', f3(it.x1 - it.x0)); c.r.setAttribute('height', f3(it.y1 - it.y0)); c.hecho = true; }
            } else {
              if (gira) c.cg.setAttribute('transform', c.k === 'f' ? matriz([0, it.y0, 0], X, ZB) : matriz([it.x0, 0, 0], Y, ZB));
              if (todo || corta || !c.hecho) {
                c.r.setAttribute('x', f3(c.k === 'f' ? it.x0 : it.y0)); c.r.setAttribute('y', f3(-z1));
                c.r.setAttribute('width', f3(c.k === 'f' ? it.x1 - it.x0 : it.y1 - it.y0)); c.r.setAttribute('height', f3(z1 - it.z0));
                c.deco.forEach((d) => d.pintar(z1)); c.hecho = true;
              }
            }
          }
        } else if (it.t === 'suelo') {
          it.nodo.setAttribute('transform', matriz([0, 0, it.z], X, Y));
        } else if (it.t === 'plano') {
          it.nodo.setAttribute('transform', matriz(it.o, it.e1, it.e2));
        } else if (it.t === 'poli') {
          it.nodo.setAttribute('points', it.pts.map(([x, y, z]) => P(x, y, z).map(f2).join(',')).join(' '));
        } else if (it.t === 'linea') {
          it.nodo.setAttribute('d', it.tramos.map((t) => t.map(([x, y, z], j) => (j ? 'L' : 'M') + P(x, y, z).map(f2).join(' ')).join('')).join(''));
        } else if (it.t === 'copa') {
          it.bolas.forEach(([dx, dy, dz], j) => { const [x, y] = P(it.x + dx, it.y + dy, it.z + dz); it.circ[j].setAttribute('cx', f2(x)); it.circ[j].setAttribute('cy', f2(y)); });
        }
        if (it.cerrada) it.nodo.style.opacity = f3(1 - E.A);
      }
      capas.alta.setAttribute('transform', `translate(0 ${f2(-E.lA * V.cf * K)})`);
      capas.tejado.setAttribute('transform', `translate(0 ${f2(-E.lT * V.cf * K)})`);
      capas.tejado.style.opacity = f3(E.oT);
      capas.tejado.style.display = E.oT < 0.01 ? 'none' : '';
      // pines
      for (const id in porId) {
        const x = porId[id], [ax, ay, az] = x.e.ancla;
        const [sx, sy0] = P(ax, ay, az);
        const sy = sy0 - (x.e.planta === 'alta' ? E.lA * V.cf * K : 0);
        x.pin.style.left = f2((sx - vb.x) / vb.w * 100) + '%';
        x.pin.style.top = f2((sy - vb.y) / vb.h * 100) + '%';
        const visible = x.e.siempre || x.e.planta === 'fuera' || (x.e.planta === 'alta' ? E.A > 0.7 : E.B > 0.7 && E.lA > SUBE_ALTA * 0.7);
        x.pin.classList.toggle('es-oculto', !visible);
        x.pin.classList.toggle('a-la-izq', (sx - vb.x) / vb.w > 0.58);
      }
      ultimo = E;
    }

    /* ---- caja de la vista: lo que ocupa el dibujo en todos los estados por los que pasa ---- */
    function limites(estados) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      const mete = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
      estados.forEach((E) => {
        ponGiro(E.th);
        items.forEach((it) => {
          if (it.g === 'tejado' && E.oT < 0.5) return;
          if (it.cerrada && E.A > 0.5) return;
          const b = caja3(it); const sube = it.g === 'alta' ? E.lA : it.g === 'tejado' ? E.lT : 0;
          const z1 = it.t === 'caja' ? z1De(it, E) : b[5];
          for (const x of [b[0], b[1]]) for (const y of [b[2], b[3]]) for (const z of [b[4], z1]) { const [sx, sy] = P(x, y, z + sube); mete(sx, sy); }
          if (it.t === 'copa') it.bolas.forEach(([dx, dy, dz, rr]) => { const [sx, sy] = P(it.x + dx, it.y + dy, it.z + dz); mete(sx - rr * K, sy - rr * K); mete(sx + rr * K, sy + rr * K); });
        });
      });
      const m = 6;
      return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
    }
    const muestras = quieto ? [estado(1)] : [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1].map(estado);
    const vb = limites(muestras);
    svg.setAttribute('viewBox', `${f2(vb.x)} ${f2(vb.y)} ${f2(vb.w)} ${f2(vb.h)}`);
    el.style.setProperty('--casa-ar', f3(vb.w / vb.h));

    /* ---- avance con el scroll ---- */
    let p = quieto ? 1 : 0, recorrido = 0, arriba = 0, pedido = false, cerca = true;
    const medir = () => { recorrido = pista.offsetHeight - escena.offsetHeight; arriba = parseFloat(getComputedStyle(escena).top) || 0; };
    const leer = () => (recorrido < 24 ? 1 : clamp((arriba - pista.getBoundingClientRect().top) / recorrido));
    const fase = (q) => (q < 0.06 ? 'cerrada' : q < 0.38 ? 'alta' : q < 0.7 ? 'baja' : 'abierta');
    const ponFase = () => {
      const f = quieto ? 'abierta' : fase(p);
      if (el.dataset.fase !== f) {
        el.dataset.fase = f;
        const i = { cerrada: 0, alta: 1, baja: 2, abierta: 2 }[f];
        pasos.querySelectorAll('li').forEach((li, j) => { li.classList.toggle('es-actual', j === i); li.classList.toggle('es-hecho', j < i || f === 'abierta'); });
      }
      el.dataset.p = f3(p);
    };
    const cuadro = () => { pedido = false; const q = leer(); if (Math.abs(q - p) < 0.0004 && ultimo) return; p = q; pintar(estado(p)); ponFase(); };
    const alScroll = () => { if (!pedido && cerca) { pedido = true; requestAnimationFrame(cuadro); } };
    const alResize = () => { medir(); alScroll(); };

    let io = null;
    if (quieto) { pista.classList.add('es-quieta'); pintar(estado(1), true); ponFase(); }
    else {
      medir(); p = leer(); pintar(estado(p), true); ponFase();
      addEventListener('scroll', alScroll, { passive: true });
      addEventListener('resize', alResize);
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver((es) => es.forEach((e) => { cerca = e.isIntersecting; if (cerca) { medir(); alScroll(); } }), { rootMargin: '200px 0px' });
        io.observe(pista);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medir(); alScroll(); });
    }

    /* ---- elegir estancia: ratón, toque y teclado ---- */
    let activa = null;
    const marcadas = [];
    function activar(id) {
      if (id === activa) return;
      marcadas.splice(0).forEach((n) => n.classList.remove('es-activa'));
      if (activa && porId[activa]) { const x = porId[activa]; x.b.setAttribute('aria-expanded', 'false'); x.b.classList.remove('es-activa'); x.f.classList.remove('es-visible'); x.pin.classList.remove('es-activa'); }
      activa = id;
      vacia.classList.toggle('es-visible', !id);
      if (!id) { delete el.dataset.activa; return; }
      const x = porId[id]; cargar(x);
      x.b.setAttribute('aria-expanded', 'true'); x.b.classList.add('es-activa'); x.f.classList.add('es-visible'); x.pin.classList.add('es-activa');
      (porE[id] || []).forEach((n) => { n.classList.add('es-activa'); marcadas.push(n); });
      botones.forEach((b) => { b.tabIndex = b === x.b ? 0 : -1; });
      el.dataset.activa = id;
    }
    const deEvento = (t) => { const n = t && t.closest && t.closest('[data-e], .casa-pin'); return n ? (n.dataset.e || n.dataset.estancia) : null; };
    const alPasar = (ev) => { if (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen') return; const id = deEvento(ev.target); if (id) activar(id); };
    const alTocar = (ev) => { const id = deEvento(ev.target); if (id) activar(id); };
    svg.addEventListener('pointerover', alPasar); pines.addEventListener('pointerover', alPasar);
    svg.addEventListener('click', alTocar); pines.addEventListener('click', alTocar);
    lista.addEventListener('click', (ev) => { const b = ev.target.closest('.casa-chip'); if (b) activar(b.dataset.estancia); });
    lista.addEventListener('focusin', (ev) => { const b = ev.target.closest('.casa-chip'); if (b) activar(b.dataset.estancia); });
    lista.addEventListener('keydown', (ev) => {
      const b = ev.target.closest('.casa-chip'); if (!b) return;
      const i = botones.indexOf(b); let j = null;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') j = (i + 1) % botones.length;
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') j = (i - 1 + botones.length) % botones.length;
      else if (ev.key === 'Home') j = 0;
      else if (ev.key === 'End') j = botones.length - 1;
      else if (ev.key === 'Escape') { activar(null); return; }
      if (j == null) return;
      ev.preventDefault(); botones.forEach((x) => { x.tabIndex = -1; }); botones[j].tabIndex = 0; botones[j].focus();
    });
    fechas.addEventListener('click', (ev) => { if (window.Laxa && typeof window.Laxa.reservar === 'function') { ev.preventDefault(); window.Laxa.reservar(); } });

    el.dataset.montado = '1';
    return {
      destruir() {
        removeEventListener('scroll', alScroll); removeEventListener('resize', alResize);
        if (io) io.disconnect();
        el.textContent = ''; el.append(respaldo);
        el.classList.remove('casa'); el.style.removeProperty('--casa-ar');
        ['montado', 'quieto', 'fondo', 'fase', 'p', 'activa'].forEach((k) => delete el.dataset[k]);
      },
      activar, get p() { return p; }, reservar,
    };
  }

  // ¿el fondo sobre el que va el módulo es oscuro? (busca el primer fondo no transparente)
  function fondoOscuro(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor; const m = c && c.match(/[\d.]+/g);
      if (m && m.length >= 3 && (m.length < 4 || +m[3] > 0.5)) { const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45; }
    }
    return false;
  }

  window.Laxa = window.Laxa || {};
  window.Laxa.casa = { montar, ESTANCIAS };
})();
