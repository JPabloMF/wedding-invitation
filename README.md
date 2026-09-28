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
| Número de WhatsApp | `&w=` en cada enlace; el respaldo es la constante `TELEFONO` en `js/main.js` |
| Enlace de Google Maps | `index.html`, botón *Ver ubicación* |
| Fecha límite para confirmar | `js/main.js`, constante `LIMITE` (el HTML solo es el respaldo) |
| Colores | `css/styles.css`, bloque `:root` |

## Enlaces personalizados de confirmación

Cada invitación lleva su propio enlace con el nombre del pase en `?g=`, cuántas personas
cubre en `&n=` y el WhatsApp al que se responde en `&w=`:

```
https://jpablomf.github.io/wedding-invitation/?g=Familia%20Mart%C3%ADnez&n=4&w=573235942476
```

Con esos parámetros la sección *Confirmar asistencia* saluda por el nombre del pase y muestra
«Invitación válida para 4 personas». Sin ellos la sección funciona igual, con el mensaje
genérico y el número de respaldo de `js/main.js`.

Hay dos botones: **Aceptar invitación** y **No podremos asistir**. Los dos abren WhatsApp con
el mensaje ya redactado; el de aceptar termina pidiendo por favor los nombres de quienes
asistirán, para que el invitado los escriba en el chat antes de enviar. El tamaño del pase lo
fija el enlace: no hay campo para sumar acompañantes.

La fecha límite para confirmar sale de la constante `LIMITE` en `js/main.js`; cambiarla ahí
actualiza todos los enlaces ya repartidos. Un enlace puede llevar su propio plazo con
`&f=AAAA-MM-DD`, por si a alguien se le invita tarde.

Para un enlace suelto está `generate.html`: se abre en el navegador, se llenan los cuatro
campos (`g`, `n`, `w`, `f`) y se copia el enlace ya armado. Valida lo mismo que la
invitación, así que no deja salir un enlace que el sitio fuera a ignorar.

Para un lote completo, los enlaces se generan desde un CSV —una invitación por línea:
nombre del pase y cuántas personas cubre—:

```
Familia Martínez,4
Carolina,1
Ana y David,2
```

```
python scripts/enlaces.py invitados.csv -o enlaces.txt
python scripts/enlaces.py invitados.csv --whatsapp 573235942476   # otro número para este lote
python scripts/enlaces.py invitados.csv --fecha 2026-10-15        # plazo distinto para este lote
```

`invitados.csv` y `enlaces.txt` están en `.gitignore`: el repo es público y la lista de
invitados no tiene por qué estarlo. Por lo mismo el sitio no lleva ninguna lista dentro;
cada enlace carga solo los datos de su pase.

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
