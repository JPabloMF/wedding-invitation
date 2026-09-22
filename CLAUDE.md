# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Invitación de boda de una sola página (Juan Pablo & Juliana, 21 nov 2026, Rooftop Qantic, Medellín).
HTML/CSS/JS plano — sin framework, sin bundler, sin dependencias de runtime. Todo el texto de cara al
invitado va en español; el código y los comentarios también están en español.

## Comandos

```bash
python -m http.server 8000        # servir la página (o abrir index.html directo)
```

El cliente trabaja con Live Server de VS Code en
`http://127.0.0.1:5500/Invitacion%20Boda/index.html`; si está levantado, revisar contra esa URL.

No hay build, lint ni suite de pruebas. La verificación es visual, con Playwright (Python):

```python
# instalar una vez: python -m pip install playwright && python -m playwright install chromium
from playwright.sync_api import sync_playwright
import pathlib
url = pathlib.Path('index.html').resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':375,'height':812})   # móvil de referencia
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.click('#envelope'); pg.wait_for_timeout(2600)       # hay que abrir el sobre para ver nada
    pg.screenshot(path='shot.png')
```

Dos trampas al capturar pantallas:
- `full_page=True` no dispara las imágenes con `loading="lazy"`; salen en blanco. Capturar por
  secciones desplazando con `window.scrollTo`.
- Las clases `.reveal` solo se activan al hacer scroll; para una captura completa, forzarlas:
  `pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible'))")`.

## Arquitectura

**Máquina de estados por clases en `<body>`.** `is-sealed` (inicial, bloquea el scroll) →
click en `#envelope` → `is-playing` (el video corre) → evento `ended` → `is-open`. Todo lo demás
cuelga de esas clases en CSS; `js/main.js` solo las alterna, oculta la escena y arranca las
apariciones.

**El cierre de la escena está repartido entre CSS y JS y hay que moverlo junto:**

| Paso | Dónde |
| --- | --- |
| Desvanecido de la escena | `transition` de `.envelope-scene` (1 s, sin retardo) |
| Aparición de la invitación | `transition` de `.invitation` (retardo 0,35 s) |
| `display:none` de la escena + descarga del video + inicio del IntersectionObserver | `setTimeout` de 1100 ms en `js/main.js` |

El `setTimeout` tiene que seguir siendo mayor que la transición de `.envelope-scene`, o la escena
se corta a media salida.

**Video de apertura.** `.envelope-scene` es una capa fija con `<video id="envelope-video">` a
pantalla completa. El original es vertical (1080×1920, 5 s) y al desplegarse el sobre llega al borde
lateral del encuadre: con `cover` se pierden las solapas incluso en un móvil de 390 px, y con
`contain` quedan bandas arriba y abajo. La salida está en **9:20 (1080×2400)**: al recomprimir se le
añaden 240 px de lienzo arriba y abajo estirando la fila del borde (ver el comando en «Imágenes»).
El fondo del video es papel crema liso, así que ese estirado no se nota, y al ser parte del video
acompaña al fundido a blanco del final —un relleno fijo en CSS se delataría justo ahí—.

Con esa reserva, `object-fit: cover` hasta 9:16 (`@media (max-aspect-ratio: 9/16)`) llena la pantalla
del móvil sin bandas y sin deformar: lo único que se recorta es el lienzo añadido. En el caso más
ancho de ese tramo se pierde el 10% de arriba y de abajo, y el sobre desplegado ocupa del 22% al 79%.
Por encima de 9:16 vuelve a `contain`, porque ahí `cover` sí se comería el sobre; las bandas
laterales se funden con el fondo de `.envelope-scene`, un degradado vertical muestreado del borde del
video (arriba #F2EEE8, medio #EBE7DF, abajo #E2DCD3) que coincide con él dentro de ~3 por canal. Al
reemplazar el video hay que rehacer el lienzo, volver a muestrear esos bordes y reajustar el
degradado. El `<video>` no es interactivo: encima va `.envelope-open`, un `<button>` a pantalla
completa que recibe el click y sostiene el aviso «Toca para abrir».

El `poster` (`assets/opt/intro-poster.webp`, el primer fotograma del video ya con lienzo, a
720×1600) **no es opcional**: los
navegadores móviles ignoran `preload` para ahorrar datos, así que el video no se descarga hasta que
se toca y sin póster la primera pantalla sale en blanco. Si se reemplaza el video hay que regenerar
el póster del nuevo primer fotograma, o al tocar se ve un salto.

Va `muted` + `playsinline` a propósito: sin eso iOS lo abre en pantalla completa y Chrome bloquea
`play()`. Al terminar (`ended`) se libera el `src` para no dejar 12 MB en memoria. Si el video
falla, no existe, o hay movimiento reducido, `abrir()` salta directo a la invitación — nunca hay
una pantalla de la que no se pueda salir.

**Lluvia de pétalos.** `.petals` es una capa fija (`z-index: 50`, por debajo de la escena del
sobre) que `lluviaDePetalos()` llena al abrir la invitación, junto con `revelar()`. Cada pétalo son
tres elementos anidados porque las tres animaciones se pisarían si compartieran `transform`:
`.petal` cae (linear — un pétalo real cae a velocidad terminal constante), `.petal__sway` hace el
vaivén horizontal (ease-in-out, `alternate`) y `.petal__img` voltea en 3D. Las tres duraciones se
sortean en rangos que no son múltiplos entre sí (caída 13-26 s, vaivén 3-6 s, volteo 4-9 s), así la
combinación no se repite a la vista. Todo lo que varía por pétalo viaja en custom properties inline.

Los tres niveles van en `overflow: visible`: la imagen se sale de su caja al voltear y cualquier recorte intermedio corta el pétalo. El único recorte que toca es el de `.petals`, en el borde de la pantalla.

El ángulo inicial va en la propiedad individual `rotate`, no en `transform`: así se **compone** con
la animación de volteo en lugar de sustituirla. El eje de `rotate3d` va sesgado hacia Z (`--az`
0,8-1 contra 0,1-0,38 en X/Y); con X/Y dominantes el pétalo pasa demasiado tiempo de canto y ahí se
lee como una astilla blanca, no como un pétalo. Los retardos son negativos y escalonados para que al
abrir el sobre la pantalla ya esté poblada. Un cuarto de los pétalos lleva `.petal--far`: más
pequeños, borrosos y pálidos, para dar profundidad y no competir con el texto. Con `prefers-reduced-motion`
la capa va `display: none` — la regla global deja las animaciones en .001 ms, que los congelaría a
media caída— y `lluviaDePetalos()` ni siquiera crea los nodos.

**Cuenta regresiva.** Anclada a `2026-11-21T16:00:00-05:00` en `js/main.js` (hora de Colombia fija,
para que el conteo sea igual en cualquier huso). El aviso para lectores de pantalla se emite una vez
por minuto, no cada segundo. Al llegar a cero se detiene el intervalo y cambia el título de la sección.

**Apariciones al hacer scroll.** Un solo IntersectionObserver sobre `.reveal`, creado dentro de
`revelar()` — que solo se llama después de abrir el sobre. Cada elemento se deja de observar al
aparecer.

**Flotación de los florales.** `float-a`/`float-b` animan la propiedad `translate`, no `transform`,
porque varios adornos llevan su propio `transform` estático (`rotate`, `scaleX(-1)`). Si la
animación vuelve a usar `transform`, los elementos sin transform propio heredan el del keyframe y
aparecen espejados o inclinados.

**Movimiento reducido.** El bloque `@media (prefers-reduced-motion: reduce)` anula duración *y
retardo* de animaciones y transiciones. Si se agrega un `transition-delay` nuevo, hay que confirmar
que ese bloque lo neutraliza; de lo contrario el contenido se queda invisible.

## `overflow-x` nunca en el selector universal

`overflow-x: hidden` va en `html` y `body`, y en ningún caso en `*`. Por especificación,
`overflow-x: hidden` junto a `overflow-y: visible` obliga a `overflow-y` a calcularse como
`auto`: con la regla en el selector universal, **todo** elemento cuyo contenido sobresalga un
píxel de su caja se vuelve un contenedor con scroll y pinta su barra al lado. Pasaba con
`.hero__title`, `.hero__names`, cada `.section__title` y las cifras de `.clock__num` —su
`line-height` es más apretado que el alto real de los glifos de Merriweather— y con los pétalos,
que se salen de su caja al voltear.

Las secciones que necesitan recorte ya lo piden ellas (`.section`, `.hero`, `.closing`); las que
quieren que los adornos sangren lo anulan con `overflow: initial`. La contención horizontal de la
página la hace el `overflow-x: hidden` de `html`/`body`, que es donde corresponde.

## Costuras entre secciones

Las bandas no tienen bordes: cada sección **entra con el color con el que sale la anterior**, así
que los fondos son degradados verticales encadenados y el color final de una sección es un contrato
con la siguiente. La cadena, de arriba abajo:

`#E9F0DA` (portada) → `#FBF8F2` → `#F7F2E9` (versículo y Ubicación) → `#F5F6EC` → `#F2F3E7` →
`#F7F0E3` → `#F1E7D6` → `--sage-mist`

Si se cambia el fondo de una sección hay que ajustar también el primer stop de la siguiente.

Para verificar una costura, muestrear píxeles arriba y abajo del borde con Playwright + Pillow; un
salto mayor a ~3 por canal se nota a simple vista. El overlay `.rsvp::after` tiene que repetir los
mismos colores de borde que `.rsvp`, o vuelve a endurecer la costura.

La sección 3 es solo el versículo sobre crema, sin foto: el resplandor cálido de `.verse-section`
es un radial que muere antes de los bordes, así que no participa en la cadena.

## Imágenes

`assets/` guarda los originales (JPEG/PNG pesados, hasta 2 MB). La página **solo** referencia
`assets/opt/*.webp`. Al reemplazar una imagen hay que regenerar su `.webp` con Pillow manteniendo el
nombre: florales a 640–760 px de ancho (600 px las velas) conservando transparencia, fotos a calidad 82.
El divisor del cierre va recortado a su bbox de alfa (`getchannel('A').getbbox()`) y a 920 px —el doble
de su ancho máximo en CSS— con `quality=95, alpha_quality=100`; el PNG original trae dos tercios de
lienzo vacío que descuadran los márgenes si no se recorta. `assets/opt/pareja.jpg` se conserva aparte porque es el `og:image` para compartir.

`assets/intro2.mp4` es el original vigente del video de apertura (`assets/intro.mp4` es el de la
versión anterior, ya sin uso). La página carga `assets/opt/intro.mp4`, que es ese original
recomprimido con ffmpeg y con el lienzo extendido a 1080×2400 — 7,5 MB (12 Mbps, imposible desde
datos móviles) bajan a 2,2 MB (~3,5 Mbps):

```bash
ffmpeg -i assets/intro2.mp4 -filter_complex "
  [0:v]crop=1080:4:0:0,scale=1080:240:flags=bilinear,setsar=1[top];
  [0:v]crop=1080:4:0:1916,scale=1080:240:flags=bilinear,setsar=1[bot];
  [0:v]setsar=1[mid];
  [top][mid][bot]vstack=inputs=3,format=yuv420p[v]" -map "[v]"   -an -c:v libx264 -preset slow -crf 20 -profile:v high -movflags +faststart   assets/opt/intro.mp4
```

Los `setsar=1` no son opcionales: sin ellos el `crop` de 4 px deja un SAR de 60:1 y el archivo sale
con una relación de aspecto declarada de 27:1.
El `+faststart` deja el box `moov` delante de `mdat` y descarta el `uuid` de relleno del exportador;
sin eso el navegador tiene que descargar el archivo entero antes de pintar un fotograma. El `-an`
quita la pista de audio: el `<video>` va `muted`, así que no se oye nunca. Si no hay ffmpeg a mano,
`python -m pip install imageio-ffmpeg` trae el binario (`imageio_ffmpeg.get_ffmpeg_exe()`).

`assets/petals/petal1-6.png` son los originales de la lluvia de pétalos; la página carga
`assets/opt/petal*.webp`, recortados a su bbox de alfa y reducidos a 200 px de lado mayor
(`quality=88, alpha_quality=100`) — se pintan entre 22 y 52 px, así que 200 px cubre pantallas
3x de sobra y los seis juntos pesan ~50 KB.

`assets/dresscode.png` es una lámina ya compuesta (títulos, listas y figuras) y **va tal cual**: el
cliente pidió expresamente no recortarla ni retocarla. `dresscode.webp` es esa misma imagen a su
tamaño original, solo cambiada de contenedor (`quality=92`). Cuando el cliente la reemplace hay que
regenerar el `.webp`, **actualizar los atributos `width`/`height` del `<img>`** —cambia de
dimensiones entre versiones— y revisar que el `alt` siga describiendo las listas que viven dentro de
la imagen, porque es el único acceso a ese contenido para lectores de pantalla.

`vestido.webp` y `traje.webp` son recortes de una versión anterior de la lámina y ya no se usan.

Los florales venían de PNG con transparencia; cuantizarlos con paleta dejaba un rectángulo visible
alrededor de las flores — por eso WebP y no PNG reducido.

## Adornos florales

Los `.deco--*` son ~16 imágenes decorativas repartidas por los bordes de todas las secciones
(`position: absolute`, `aria-hidden`, `pointer-events: none`). Solo hay cinco archivos detrás: se
repiten con `scaleX(-1)`, rotaciones y escalas distintas, de modo que un adorno nuevo no cuesta
descarga si reutiliza un archivo ya presente. Antes de añadir un `.webp` nuevo, comprobar si alguno
de los existentes sirve volteado.

Sangran fuera del encuadre y los recorta el `overflow: hidden` de la sección. Las velas van completas
dentro del área visible —una vela cortada se lee como error—; las gypsophilas y el follaje sí pueden
salirse. Opacidades entre 0,4 y 0,9 según cuánto compitan con el texto.

`candle2.webp` trae su propio resplandor pintado. No añadirle `filter: drop-shadow(...)`: la sombra
sigue el borde del lienzo y aparece un rectángulo pálido alrededor.

## Datos que cambian con frecuencia

Los enumera `README.md` en una tabla: fecha del conteo, horas del itinerario (`<ol class="timeline">`),
enlace de WhatsApp (`wa.link/dgonhr`), enlace de Maps, fecha límite en `.rsvp__text`, y los tokens de
color en `:root`.

## Pendientes conocidos

Medidos en el navegador, sin corregir todavía:

- **Sin JavaScript la invitación es inalcanzable.** El sobre queda sellado y no hay forma de ver el
  contenido. Se resuelve con un `<noscript>` que anule `body.is-sealed` y la opacidad de
  `.invitation`.
- **Contraste bajo.** Texto blanco sobre el caramelo del botón: 2,25:1. Las etiquetas doradas
  pequeñas (`--tan-deep` #A5813F): 3,2–3,4:1. Alternativas verificadas: tinta #4A4034 sobre el
  caramelo actual da 4,51:1; `--tan-deep` en #836327 sube las etiquetas a 5,2:1 sobre crema.
- **`og:image` apunta a `pareja.jpg`**, la foto que se quitó de la página, así que sigue apareciendo
  al compartir el enlace. `assets/opt/pareja.webp` quedó sin uso.

## Diseño

`skills/frontend-design/` es un plugin de skill instalado en el repo, no código del sitio. Sus reglas
guiaron el diseño y siguen aplicando: elegir tipografía y paleta a propósito, evitar los tics de página
generada (eyebrow en mayúsculas sobre cada título, tarjetas idénticas, flecha «→» en los botones),
y gastar la audacia en un solo lugar — aquí, el sobre que se abre.

## Tipografía

Las fuentes se sirven desde `fonts/` (no hay peticiones a Google Fonts) y se declaran con
`@font-face` al principio de `css/styles.css`:

- **Merriweather** (`fonts/Merriweather.woff2`) es variable: ejes `wght` 300-900, `wdth` 87-112,
  `opsz` 18-144. Un solo archivo cubre todos los pesos, así que pedir un peso nuevo no cuesta
  descarga. Cubre los tres papeles de texto: `--serif` (titulares y cuerpo) y `--sans` (etiquetas
  pequeñas con tracking) apuntan al mismo archivo.
- **Pinyon Script** (`fonts/PinyonScript.woff2`) es `--script`: los nombres del cierre y el «&» de
  la portada. Dibuja muy pequeño dentro de su em — hace falta ~2× el tamaño del texto vecino para
  que pese lo mismo.

Ambas van con `<link rel="preload" … crossorigin>` en el `<head>`; el `crossorigin` no es opcional
aunque el archivo sea local, o el navegador descarga la fuente dos veces.

**Merriweather no trae cursiva ni versalitas reales.** La cursiva se sintetiza y se ve sucia, así
que el versículo y `.hero__names` van en redonda y el «&» se resuelve con Pinyon. Si se añade un
`font-style: italic` nuevo hay que comprobar cómo queda, o traer el archivo de la itálica.

**Su altura de x es 0,555 em**, contra ~0,36 de la Cormorant Garamond que había antes: rinde
bastante más grande al mismo tamaño en px. Por eso los titulares **bajaron** de px al cambiar de
fuente mientras las etiquetas pequeñas **subieron**; los trackings de las mayúsculas también se
recortaron (de .34/.26 em a .3/.2), porque Merriweather ya es ancha de por sí. Al tocar un
`font-size` conviene medirlo contra un viewport de 375 px: `.btn`, `.section__title` y `.clock`
son los que primero se desbordan.

El `font-variant-numeric: lining-nums` del `body` ya no hace falta para Merriweather (sus cifras
por defecto son de caja alta), pero se conserva para las fuentes de reserva. `font-optical-sizing:
auto` sí importa: es lo que hace que los titulares grandes usen un dibujo más apretado.
