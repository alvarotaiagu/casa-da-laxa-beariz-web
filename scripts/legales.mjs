/* Genera los *.src.html de las páginas legales y el 404 con una plantilla común.
   Uso: node scripts/legales.mjs  (después, node construir.mjs)
   El titular, su NIF y un correo no se publican en ninguna fuente que tengamos: van como PENDIENTE visible. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TITULAR = `<p class="aviso">PENDIENTE: nombre o razón social del titular y NIF/CIF.</p>
<dl>
  <dt>Nombre comercial</dt><dd>Casa da Laxa</dd>
  <dt>Dirección</dt><dd>Rúa Loureiro, 25 · Magros · 32525 Beariz (Ourense)</dd>
  <dt>Teléfono</dt><dd><a href="tel:+34688955700">688 95 57 00</a></dd>
  <dt>Correo</dt><dd><span class="aviso-corto">PENDIENTE</span></dd>
  <dt>Registro de turismo</dt><dd>TR-OR-000039 (Registro de Empresas y Actividades Turísticas de Galicia)</dd>
</dl>`;

const paginas = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    cuerpo: `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos son los datos del titular de esta web:</p>
${TITULAR}
<h2>Uso de la web</h2>
<p>Esta web informa sobre la casa rural Casa da Laxa, en Magros (Beariz). Los precios y las condiciones pueden cambiar: los que valen son los que se confirman al reservar.</p>
<p>Por ahora, la reserva de esta web es una demostración: la ocupación es de ejemplo, los precios son supuestos y no se envía, se guarda ni se cobra nada.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos y las fotografías son del titular o se usan con su permiso. La letra Gloock se usa con su licencia libre (SIL Open Font License). No se pueden reproducir sin autorización.</p>
<p class="aviso">PENDIENTE: confirmar que todas las fotos son de la casa y se pueden usar (vienen de sus fichas en Ruralgest y casasrurales.net).</p>
<h2>Responsabilidad</h2>
<p>Los enlaces a otras webs (Google Maps, casasrurales.net) llevan a servicios de terceros con sus propias condiciones.</p>
<h2>Ley aplicable</h2>
<p>Estas condiciones se rigen por la ley española. Para cualquier reclamación, llámanos: buscaremos siempre una solución amistosa.</p>`,
  },
  privacidad: {
    titulo: 'Política de privacidad',
    cuerpo: `
<h2>Responsable</h2>
${TITULAR}
<h2>Qué datos tratamos y para qué</h2>
<p>Los que nos das al reservar o al llamarnos: nombre, teléfono, correo, las fechas, cuántos venís y lo que quieras contarnos. Los usamos para gestionar tu reserva y atenderte.</p>
<p>Al alojarte, la ley obliga a registrar los datos de los viajeros y comunicarlos a las autoridades (Real Decreto 933/2021).</p>
<p>La reserva de esta web es, por ahora, una demostración: lo que escribas en ella no sale de tu navegador ni se guarda.</p>
<h2>Base legal y plazos</h2>
<p>La base es tu consentimiento al reservar, la ejecución de la reserva y, para el registro de viajeros, una obligación legal. Los datos se conservan mientras dura la relación y, después, el tiempo que exige la ley.</p>
<h2>Con quién se comparten</h2>
<p>Con nadie, salvo obligación legal (el registro de viajeros) y siempre con lo imprescindible.</p>
<h2>Tus derechos</h2>
<p>Puedes pedir el acceso, la rectificación, la supresión, la oposición, la limitación o la portabilidad de tus datos llamando al <a href="tel:+34688955700">688 95 57 00</a>. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).</p>
<h2>Lo que guarda esta web en tu navegador</h2>
<p>Una sola cosa: <code>casadalaxa-cookies</code> en el almacenamiento local, para recordar que ya has visto el aviso de cookies. Más detalles en <a href="cookies.html">cookies</a>.</p>`,
  },
  cookies: {
    titulo: 'Política de cookies',
    cuerpo: `
<p>Esta web no usa cookies propias de análisis ni de publicidad.</p>
<h2>Lo que se guarda en tu navegador</h2>
<ul>
  <li><b>casadalaxa-cookies</b> (almacenamiento local): recuerda que has visto el aviso, para no enseñártelo en cada visita. Es técnica y no caduca sola; puedes borrarla desde tu navegador.</li>
</ul>
<h2>Servicios de terceros</h2>
<ul>
  <li><b>Google Fonts</b>: las letras de la web (Gloock, Hanken Grotesk e IBM Plex Mono) se cargan desde los servidores de Google, que reciben tu dirección IP.</li>
  <li><b>Google Maps</b>: el mapa de «Cómo llegar» solo se carga si pulsas «Ver el mapa». A partir de ese momento, Google puede instalar sus cookies.</li>
  <li><b>jsDelivr</b>: las librerías que suavizan el desplazamiento y mueven las animaciones (Lenis y GSAP) se descargan de jsDelivr, que recibe tu dirección IP. No instalan cookies.</li>
</ul>
<p>El sonido del río («Oír el río») se genera en tu navegador: no se descarga ni se guarda nada.</p>
<p>Puedes volver a ver el aviso desde «Preferencias de cookies», en el pie de la página.</p>`,
  },
  accesibilidad: {
    titulo: 'Declaración de accesibilidad',
    cuerpo: `
<p>El titular se compromete a que esta web sea accesible conforme a la norma UNE-EN 301 549 (nivel AA de las WCAG 2.1).</p>
<h2>Situación de cumplimiento</h2>
<p class="aviso">PENDIENTE: completar tras la revisión de accesibilidad previa a la publicación.</p>
<p>La web se ha construido para poder usarse entera con el teclado y con lector de pantalla: contrastes de al menos 4,5:1, foco visible, textos alternativos en las fotos, formularios con etiquetas y animaciones que se desactivan si tu sistema pide reducir el movimiento. El agua que se mueve en las fotos y el sonido del río son un adorno: la información está también en el texto, y el sonido empieza apagado.</p>
<h2>La casa</h2>
<p class="aviso">PENDIENTE: confirmar si hay dormitorio o baño accesible, escalones en la entrada (la casa tiene escaleras de piedra por fuera y una escalera de caracol dentro) y el acceso al jardín.</p>
<h2>Contacto</h2>
<p>Si encuentras una barrera, llama al <a href="tel:+34688955700">688 95 57 00</a>. Te responderemos y te daremos la información en un formato accesible.</p>`,
  },
};

const cabeza = (titulo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Casa da Laxa</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gloock&family=Hanken+Grotesk:wght@400;600&family=IBM+Plex+Mono&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<link rel="stylesheet" href="css/legal.css">
<link rel="icon" href="marca/favicon.svg" type="image/svg+xml">
<link rel="icon" href="marca/favicon-32.png" sizes="32x32" type="image/png">
</head>`;

const MARCA = `<a class="marca" href="./" aria-label="Casa da Laxa, a la portada"><span class="marca__nombre" aria-hidden="true">Casa da Laxa</span><span class="marca__lugar" aria-hidden="true">Magros · Beariz</span></a>`;

for (const [nombre, p] of Object.entries(paginas)) {
  const html = `${cabeza(p.titulo)}
<body>
<header class="legal-cab">
  <div class="env">
    ${MARCA}
    <a class="volver" href="./">Volver a la portada</a>
  </div>
</header>
<main class="legal">
  <div class="env">
    <h1>${p.titulo}</h1>
${p.cuerpo}
  </div>
</main>
<footer class="legal-pie">
  <div class="env">
    <a href="aviso-legal.html">Aviso legal</a>
    <a href="privacidad.html">Privacidad</a>
    <a href="cookies.html">Cookies</a>
    <a href="accesibilidad.html">Accesibilidad</a>
  </div>
</footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, `${nombre}.src.html`), html);
  console.log(`${nombre}.src.html`);
}

fs.writeFileSync(path.join(RAIZ, '404.src.html'), `${cabeza('Página no encontrada')}
<body class="no-hay">
<style>
  .no-hay { background: var(--rio-hondo); color: var(--cal); min-height: 100svh; display: grid; place-items: center; text-align: center; padding: 24px; --foco: var(--espuma); --foco-hueco: var(--rio-hondo); }
  .no { display: grid; gap: 22px; justify-items: center; max-width: 32em; }
  .no img { width: min(30vw, 120px); height: auto; }
  .no h1 { font: 400 clamp(2.4rem, 7vw, 3.6rem)/1.02 var(--f-tit); }
  .no p { color: var(--niebla); }
  .no a:not(.btn) { color: var(--cal); }
</style>
  <main class="no">
    <img src="marca/apple-touch-icon.png" alt="" width="120" height="120">
    <h1>Esta piedra no está en el camino</h1>
    <p>La página que buscas no existe o ha cambiado de sitio. La casa sigue donde estaba: a la orilla del río de Magros.</p>
    <a class="btn btn--solaina" href="./#reservar">Ver fechas</a>
    <a href="./">Volver a la portada</a>
  </main>
</body>
</html>
`);
console.log('404.src.html');
