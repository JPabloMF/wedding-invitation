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
click en `#envelope` → `is-open`. Todo lo demás cuelga de esas dos clases en CSS; `js/main.js`
solo las alterna, oculta la escena y arranca las apariciones.

**Las duraciones de la apertura están repartidas entre CSS y JS y hay que moverlas juntas:**

| Paso | Dónde |
| --- | --- |
| Lacre, solapa, carta | `body.is-open .envelope__*` en `css/styles.css` |
| Desvanecido de la escena | `transition` de `.envelope-scene` (retardo 1,15 s) |
| Aparición de la invitación | `transition` de `.invitation` (retardo 1,3 s) |
| `display:none` de la escena + inicio del IntersectionObserver | `setTimeout` de 2200 ms en `js/main.js` |

Si se cambia un retardo del CSS, el `setTimeout` debe seguir siendo mayor que el total, o la
escena desaparece a mitad de la animación.

**Geometría del sobre.** `.envelope__letter` vive dentro de la caja del sobre (`top:7%; height:86%`)
con `z-index` por debajo de `.envelope__front`, así queda oculta cuando está cerrado; al abrir sube
con `translateY(-72%)`. El `padding-bottom: 44%` de `.envelope__letter-inner` es lo que mantiene el
monograma en la parte que sí queda visible. Los tres valores están acoplados.

**Cuenta regresiva.** Anclada a `2026-11-21T16:00:00-05:00` en `js/main.js` (hora de Colombia fija,
para que el conteo sea igual en cualquier huso). El aviso para lectores de pantalla se emite una vez
por minuto, no cada segundo. Al llegar a cero se detiene el intervalo y cambia el título de la sección.

**Apariciones al hacer scroll.** Un solo IntersectionObserver sobre `.reveal`, creado dentro de
`revelar()` — que solo se llama después de abrir el sobre. Cada elemento se deja de observar al
aparecer.

**Movimiento reducido.** El bloque `@media (prefers-reduced-motion: reduce)` anula duración *y
retardo* de animaciones y transiciones. Si se agrega un `transition-delay` nuevo, hay que confirmar
que ese bloque lo neutraliza; de lo contrario el contenido se queda invisible.

## Costuras entre secciones

Las bandas no tienen bordes: cada sección **entra con el color con el que sale la anterior**, así
que los fondos son degradados verticales encadenados y el color final de una sección es un contrato
con la siguiente. La cadena, de arriba abajo:

`#E9F0DA` (portada) → `#FBF8F2` → `#F7F2E9` (foto) → `#F5F6EC` → `#F2F3E7` → `#F7F0E3` → `#F1E7D6` → `--sage-mist`

Si se cambia el fondo de una sección hay que ajustar también el primer stop de la siguiente. Dos
casos especiales:

- `.photo__frame::before` difumina el borde superior de la foto contra la banda anterior.
- `.location::before` continúa la sombra oscura del pie de la foto durante ~110 px, para que el
  degradado del versículo no termine en un corte seco contra el crema.

Para verificar una costura, muestrear píxeles arriba y abajo del borde con Playwright + Pillow; un
salto mayor a ~3 por canal se nota a simple vista. El overlay `.rsvp::after` tiene que repetir los
mismos colores de borde que `.rsvp`, o vuelve a endurecer la costura.

## Imágenes

`assets/` guarda los originales (JPEG/PNG pesados, hasta 2 MB). La página **solo** referencia
`assets/opt/*.webp`. Al reemplazar una imagen hay que regenerar su `.webp` con Pillow manteniendo el
nombre: florales a 760 px de ancho (600 px las velas) conservando transparencia, fotos a calidad 82.
El divisor del cierre va recortado a su bbox de alfa (`getchannel('A').getbbox()`) y a 920 px —el doble
de su ancho máximo en CSS— con `quality=95, alpha_quality=100`; el PNG original trae dos tercios de
lienzo vacío que descuadran los márgenes si no se recorta. `assets/opt/pareja.jpg` se conserva aparte porque es el `og:image` para compartir.

`assets/dresscode.png` es una lámina de 3x2 prendas sobre transparencia; `vestido.webp` y
`traje.webp` salen de recortar dos celdas de esa lámina y ajustarlas a su bbox de alfa. Al ser color
plano comprimen mejor sin pérdida (10 y 22 KB), así que van con `lossless=True`.

Los florales venían de PNG con transparencia; cuantizarlos con paleta dejaba un rectángulo visible
alrededor de las flores — por eso WebP y no PNG reducido.

## Datos que cambian con frecuencia

Los enumera `README.md` en una tabla: fecha del conteo, horas del itinerario (`<ol class="timeline">`),
enlace de WhatsApp (`wa.link/dgonhr`), enlace de Maps, fecha límite en `.rsvp__text`, y los tokens de
color en `:root`.

## Diseño

`skills/frontend-design/` es un plugin de skill instalado en el repo, no código del sitio. Sus reglas
guiaron el diseño y siguen aplicando: elegir tipografía y paleta a propósito, evitar los tics de página
generada (eyebrow en mayúsculas sobre cada título, tarjetas idénticas, flecha «→» en los botones),
y gastar la audacia en un solo lugar — aquí, el sobre que se abre.

Cormorant Garamond trae cifras de estilo antiguo por defecto; el `font-variant-numeric: lining-nums`
del `body` es lo que hace que la cuenta regresiva y las fechas se lean bien. No quitarlo.
