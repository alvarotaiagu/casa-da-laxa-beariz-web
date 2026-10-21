# Casa da Laxa · Magros, Beariz · «Á beira do río»

Web nueva para Casa da Laxa, una casa de aldea de granito de hacia 1800, restaurada entera en 1999, que se alquila **entera** (6 personas, 3 dormitorios con baño) con el jardín en la orilla del río de Magros (Rúa Loureiro, 25 · 32525 Beariz, Ourense). Hoy no tienen web: solo fichas en portales. Es una propuesta que Álvaro les enseñará: en local, con `noindex, nofollow` en todas las páginas, sin publicar y sin commits.

- **Datos y fuentes:** `ref/DATOS-CASA-DA-LAXA.md` (Ruralgest, casasrurales.net, Sensación Rural, Páxinas Galegas, OSM). Lo que no está ahí no se afirma: va a `PENDIENTES.md` o sale como «supuesto».
- **Encargo:** `ENCARGO.md` (aprobado en el chat: la losa solo como cortina, sin el valle en 3D, solo castellano).
- **Una sola página** (`index.html`) más legales y 404. Todo en castellano; los nombres de lugar como son (Casa da Laxa, Magros, Rego da Touza); «solaina» y «lareira» se explican la primera vez.

## Concepto

«Laxa» es losa en gallego, y la casa está **a la orilla del río**. Dos materiales hacen toda la web:

1. **La losa de granito** (textura generada, nada de foto: `scripts/granito.mjs`). Es la cortina, el borde de la foto de la portada y el pie. El nombre en Gloock **tallado** hace de marca (no tienen logo y no se inventa uno).
2. **El río.** En la portada y en el puente solo se mueve el agua de la foto real (módulo Río, WebGL). Y por la página baja **la corriente**: una línea de agua fina que une las secciones.

### La página, de arriba abajo

| # | Sección | Qué lleva |
|---|---|---|
| — | **Cortina «La laxa»** | Granito claro; CASA DA LAXA se talla letra a letra (una máscara que avanza como un cincel, con su filo de luz y lascas que saltan), «Magros · Beariz» y «hacia 1800». La losa se parte por la veta (grieta con semilla fija) y las dos mitades se separan con expo.inOut (la izquierda gira un poco hacia fuera); por la grieta aparece la portada, que ya se mueve. En escritorio la grieta es exactamente el borde izquierdo de la foto de la portada (mismo polígono) y sigue la veta por encima y por debajo. Unos 3 s; se salta si la página tardó más de 2 s. Piezas sueltas: `partes/cortina.html`, `css/cortina.css`, `js/cortina.js`. |
| 1 | **Portada** | La foto `rio-ventana-hero`: la vista desde la ventana de casasrurales.net (640×520, nítida, con sol), **entera, con los marcos de la ventana**. En escritorio, en una losa apaisada con el borde de la misma grieta (≤ 1,1× su tamaño, ~0,9–1,0×), con grano y velo frío, centrada en vertical con el titular a la izquierda. En el móvil, arriba a todo el ancho con su proporción (nunca a pantalla completa: habría que ampliarla 2×) y el texto debajo. «Ver fechas», llamar y el hueco de «Oír el río». (rg-12, un fotograma de vídeo, salió de la web: ampliado se veía en bloques.) |
| 2 | **La casa en cifras** | Sobre granito, las cifras talladas: hacia 1800 · 1999 · 6 · 3 · en la orilla, y su texto de casasrurales.net. |
| — | *De un vistazo* | Solo en la versión sobria: la tabla con capacidad, dormitorios, baños, entrada y salida, señal, distancias y registro. |
| 3 | **Dos siglos** | Módulo Fachada (`js/fachada.js`): la fachada que se levanta piedra a piedra. Respaldo: la foto y las tres paradas. |
| 4 | **La casa por dentro** | Módulo Casa (`js/casa.js`): la casa en corte. Respaldo: las estancias con sus fotos pequeñas. La nota del aseo, la cuna y lo incluido queda fuera del módulo. |
| 5 | **Fuera** | El jardín, la barbacoa (dos) y la piscina fluvial (Rego da Touza, ~500 m), en una rejilla editorial (la vista desde la ventana es ya la portada). |
| 6 | **Con nieve y de noche** | Las dos fotos de 640 px en su marco, nunca estiradas, una línea cada una. |
| 7 | **Lo que dicen** | Juan Pablo (julio de 2024) y Mónica (marzo de 2023), con […], «10 sobre 10 en casasrurales.net» con enlace, **sin recuento**, y la respuesta de Pilar. |
| 8 | **Alrededor** | «Río abajo»: la corriente pasa por cada parada (una piedra) de la piscina fluvial a Santiago, con las distancias de los datos. |
| 9 | **El puente** | rg-01 sin las bandas negras, con el agua de los rápidos (módulo Río). Con el scroll la cámara avanza hacia el puente (hasta 1,25×, en la caja `.puente__foto`, nunca en el `<img>`) y «Cruza el puente» da paso a reservar. |
| 10 | **Reservar** | El motor de casa entera (`js/reserva.js`), de DEMOSTRACIÓN. Debajo, lo que hay que saber y la cancelación de Ruralgest. |
| 11 | **Cómo llegar** | Dirección, teléfono y el mapa de Google solo al pedirlo. |
| 12 | **Pie** | **La losa se vuelve a cerrar**: la grieta se suelda con la lectura y abajo del todo el nombre tallado está entero. Registro TR-OR-000039 y legales. |

**§5 bis:** fuera la pila sticky de tarjetas y el marquee; la pieza propia es la corriente. Gesto táctil del hero: arrastrar sobre el agua hace ondas (módulo Río; la pista «Arrastra sobre el agua» solo sale si el módulo pone `data-rio-gesto="1"`). El objeto que se completa en el pie: la losa. Foco del teclado con forma propia: **un borde de losa tallada** (doble línea con sombra dentro). Rendimiento medido (abajo). Sin cursor propio.

### Paleta y letras

| Token | Color | Uso |
|---|---|---|
| `--granito` / `--granito-2` | `#C9C2B2` / `#B8AF9C` | la losa (textura `img/granito.webp`), cifras, opiniones, mapa |
| `--cal` / `--cal-2` / `--blanco` | `#F1EDE5` / `#E7E1D5` / `#FBF9F4` | fondos claros |
| `--pizarra` / `--pizarra-2` | `#23272A` / `#353B3F` | texto, «Con nieve y de noche», puente, pie |
| `--tinta-2` / `--tinta-granito` | `#4F5350` / `#3E4143` | texto secundario sobre cal / sobre granito |
| `--solaina` | `#7A3E28` | la madera rojiza de la solaina (medida en rg-02: mediana `#613F2E` en sombra, algo avivada): botones (texto cal, 7:1) y acento |
| `--solaina-texto` | `color-mix(solaina 84 %, pizarra)` | texto pequeño en acento sobre claro |
| `--solaina-claro` | `#E3AD92` | el acento sobre oscuro |
| `--rio` / `--rio-hondo` | `#2F4B45` / `#1E2F2B` | verde de río y musgo: portada, alrededor, la corriente sobre claro |
| `--espuma` / `--niebla` | `#E6EEEA` / `#B9C6C0` | la corriente y los brillos sobre oscuro / texto secundario sobre oscuro |

**Letras** (Google Fonts, `display=swap`): **Gloock** (titulares y lo tallado), **Hanken Grotesk** 400–600 (texto) e **IBM Plex Mono** (cifras, horas, distancias, rótulos). Sin cursivas (Gloock no tiene): el énfasis va en color.

## Cómo se trabaja

- **Edita siempre los `*.src.html` o las `partes/`** (cabeza, cabecera, cortina, reserva, llegar, pie y guiones). `node construir.mjs` incluye las partes (`<!--parte:…-->`), convierte `<img data-foto>` en `<picture>` AVIF/WebP/JPG, **quita los `<link>`/`<script>` de CSS/JS propios que aún no existan** (con aviso) y pone `?v=<huella>` (`versionar.mjs`). Recuerda «Ctrl+F5» si se publica.
- **Fotos:** `scripts/fotos-lista.json` + `node scripts/fotos.mjs` (lee de `ref/`, gradación común: menos saturación en verdes y naranjas, negros más suaves, un punto más fríos; las de dentro, además, medio balance de blancos; **nunca amplía**: 480, 800 y 1024 si caben, más el original).
- **Granito y grano:** `node scripts/granito.mjs` (semilla fija). **Marca:** `node scripts/marca.mjs` (favicons, icono y `img/og.jpg` con la «L» y el nombre tallados; los contornos de Gloock están en `marca/gloock-glifos.json`). **Legales y 404:** `node scripts/legales.mjs` y después `node construir.mjs`.
- **`node verificar.mjs`** (puerto 8831, una vez al terminar; sin capturas; navegador con `--disable-3d-apis`, así que el WebGL del río no se pinta): archivos, noindex, ids, textos prohibidos (recuento de opiniones, superlativos propios, WhatsApp, «fervenza», la foto de Sensación Rural, la limpieza de mitad de semana), CSS de cookies/mando/menú/dvh/cortina, contrastes (38 parejas), portada y losa ≤ 1,3×, corriente (dos tonos, por el margen, pasa por cada parada), módulos (montan al acercarse; sin sus JS queda el respaldo), motor de punta a punta, visor por nombre (cada miniatura, flechas, Escape, tocar en móvil), cookies en 4 pasos, mando y sobria, móvil a 360/375/390/768 (sin scroll lateral, foto a pantalla completa, piedras a la izquierda, menú con la cabecera fija, barra del navegador sin rehacer nada), legales y, al final y con movimiento, la cortina a medias y entera, la corriente dibujándose, el puente (≤ 1,25×) y el pie que se suelda; y sin Lenis ni GSAP. **Resultado: 142/142.**
- **`node scripts/rendimiento.mjs`** (puerto 8832): móvil de gama media (Pixel 7, 4G lento, CPU ×4), sin WebGL. Último (con la foto nueva de la portada): **LCP 1,70–2,11 s**; en dos de tres pasadas el LCP es la propia foto (`rio-ventana-hero-640.avif`) y en la otra el granito de la cortina; **la foto se pinta a los 1,70–1,88 s** (Element Timing); ~510 KB; tareas largas de ≤ 87 ms.
- **`node scripts/probar-borrado-mando.mjs`**: comprueba la receta de borrado del mando.
- **Para probar sin el agua del río**, `index.html?sin-gl` (monta el módulo Río con `gl: false`).

## Contrato con los módulos

`window.Laxa.<rio|fachada|casa>.montar(el, { movimiento, densidad: 'rio'|'sobria' })` → `{ destruir() }`. El HTML de `el` es el respaldo. `js/main.js` monta Fachada, Casa y el río del puente **al acercarse** (900 px de margen) y el río de la portada **en `alAbrirse`** de la cortina. Guarda el respaldo de cada uno: al cambiar de densidad con el mando, `destruir()`, devuelve el respaldo y vuelve a montar. Reserva el alto de la Fachada (380svh; 270svh en el móvil) mientras no monta, para que no salte lo de abajo. `Laxa.reservar()` baja al simulador. Lenis mueve el ScrollTrigger de la web (`lenis.on('scroll', ScrollTrigger.update)`); GSAP y ScrollTrigger se cargan para los módulos.

## Reservar (DEMOSTRACIÓN)

Pasos: fechas → personas (1 a 6, + cuna) → datos → confirmación con localizador `LAX-AAMMDD-NNN`. Calendario de 12 meses, dos a la vista. Resumen: noches, personas, total, **señal del 20 %** y el resto a la llegada. **No envía, guarda ni cobra nada, y lo dice** (encima del motor, junto al botón y en la confirmación). **Supuestos:** 25 € por persona y noche en temporada baja y 32 € en alta; temporada alta = la de su política de cancelación (Semana Santa de Domingo de Ramos a Pascua, puentes y festivos nacionales con el Viernes Santo, y del 15 de junio al 15 de septiembre); mínimo 2 noches; la cuna sin coste; ocupación inventada (siempre la misma por año). Entrada desde las 16:00, salida hasta las 12:00; «mascotas: preguntadnos».

## Mando de densidades (solo con `?revision`)

- **«Río»:** el agua se mueve, la corriente se dibuja con el scroll con remolinos y meandros, grano en las fotos, la losa del pie se suelda con la lectura.
- **«Sobria»:** el agua quieta, la corriente recta y ya dibujada, sin grano, la losa del pie ya entera; **añade** la tabla «Casa da Laxa, de un vistazo».

### Receta de borrado del mando

1. En `partes/cabeza.html`, en el script, el `try { … }` de `// MANDO DE MAQUETA`.
2. En `partes/pie.html`, el bloque `<!-- MANDO DE MAQUETA` … `<!-- fin del MANDO DE MAQUETA -->`.
3. En `js/main.js`, el bloque `10. MANDO DE MAQUETA` hasta `fin del MANDO DE MAQUETA`.
4. Opcional: `.mando` y `.vistazo` en `css/estilos.css` y la sección `#vistazo` de `index.src.html`.
5. `node construir.mjs`. (`node scripts/probar-borrado-mando.mjs` lo comprueba en memoria.)

## Recortes de las fotos del módulo Río

| Nombre | Origen | Recorte (sharp `extract`) | Tamaño | Anchos |
|---|---|---|---|---|
| `rio-ventana-hero` | `ref/fotos-cr/bVistas-al-jardin-desde-la-ventana.jpg` | ninguno: entera, con los marcos (gradación suave, `fuerza: 0.35`) | 640×520 | 480, 640 |
| `puente` | `ref/fotos/rg-01.jpg` | `left 42, top 0, width 940, height 768` (sin las bandas negras) | 940×768 | 480, 800, 940 |

Las máscaras `img/mascaras/*.png` salen con el mismo recorte (`python -I pruebas/rio-mascaras.py` lee `scripts/fotos-lista.json`). La foto `fachada` es rg-02 entera (1024×768), como espera el módulo Fachada.

## Qué mirar en Chrome

- **La cortina** entera (recarga): que el tallado se lea como bajorrelieve (sombra dentro arriba a la izquierda, luz abajo a la derecha), el cincel letra a letra, la grieta y cómo se abre la losa justo por el borde de la foto del río.
- **La portada:** el agua moviéndose solo dentro de la máscara, las ondas al arrastrar, «Oír el río», y que el borde con la grieta no se vea como un recorte.
- **La corriente** al bajar: los remolinos junto a los títulos, que nunca pise el texto, el cambio de color al entrar en lo oscuro, y en «Alrededor» cómo pasa por cada piedra.
- **El puente:** el avance de la cámara y el paso a «Reservar»; el agua de los rápidos.
- **La losa del pie** soldándose al llegar abajo.
- **El mando** con `?revision`: las dos versiones.
- Las fotos de dentro, pequeñas y corregidas de color: si alguna se ve rara.

## Para publicar

Repo propio y GitHub Pages sobre la rama real (como las anteriores). Antes, `PENDIENTES.md` (tarifas, cancelación, titular, el puente, el río) y la receta de borrado del mando si se entrega. Quitar el `noindex` solo si se vende.
