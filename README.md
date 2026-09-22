# Invitación de boda — Juan Pablo & Juliana

Invitación web de una sola página, en español, que se abre como una carta.
No usa frameworks ni build: se publica subiendo la carpeta tal cual.

## Estructura

```
index.html          Todo el contenido (8 secciones + sobre de apertura)
css/styles.css      Diseño y animaciones
js/main.js          Apertura del sobre, cuenta regresiva y apariciones al hacer scroll
assets/             Imágenes originales
assets/opt/         Versiones optimizadas (.webp) que usa la página
```

## Cómo verla

Abrir `index.html` en el navegador, o servirla:

```
python -m http.server 8000
```

## Qué se cambia con más frecuencia

| Dato | Dónde |
| --- | --- |
| Fecha y hora del conteo | `js/main.js`, variable `objetivo` (hora de Colombia, UTC−5) |
| Horas del itinerario | `index.html`, sección `<ol class="timeline">` |
| Enlace de WhatsApp | `index.html`, botón *Confirmar asistencia* (`https://wa.link/dgonhr`) |
| Enlace de Google Maps | `index.html`, botón *Ver ubicación* |
| Fecha límite para confirmar | `index.html`, párrafo `.rsvp__text` |
| Colores | `css/styles.css`, bloque `:root` |

## Optimizar imágenes nuevas

Las fotos y florales se reducen a `assets/opt/*.webp` con Pillow
(`pip install Pillow`); los florales conservan transparencia y las fotos
se guardan a calidad 82. Si se reemplaza una imagen, hay que regenerar su
`.webp` y mantener el mismo nombre.

## Notas

- Diseñada mobile-first (probada a 375 px) y verificada en escritorio.
- Respeta `prefers-reduced-motion`: sin animaciones para quien las desactiva.
- Los botones abren Maps y WhatsApp en pestaña nueva.
- Los iconos (`favicon.*`, `apple-touch-icon.png`, `icon-192/512.png`) se regeneran
  con `python scripts/favicon.py` desde la raíz del repo; `favicon.svg` se edita a mano.
- La vista previa al compartir el enlace (WhatsApp, Facebook, iMessage) usa
  `assets/opt/og-cover.jpg` (1200x630, recorte de `assets/us.jpeg`). Las etiquetas
  `og:`/`twitter:` del `<head>` la apuntan con URL absoluta; si cambia el dominio hay
  que actualizar `og:url`, `canonical` y las URLs de imagen.
