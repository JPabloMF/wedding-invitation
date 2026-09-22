# -*- coding: utf-8 -*-
"""Genera los iconos del sitio (ejecutar desde la raíz del repo).

El favicon: corazón crema sobre cuadrado redondeado sage.
Dibuja las curvas muestreando las bezier a mano y con supermuestreo x8,
para no depender de un rasterizador de SVG."""
from PIL import Image, ImageDraw

SAGE  = (124, 154,  94, 255)   # --sage-deep
CREAM = (251, 248, 242, 255)   # --cream

# Corazón en el sistema de coordenadas del SVG (viewBox 64x64).
# Cada tramo: (c1, c2, fin); el punto de partida es START.
START = (32.0, 52.0)
CURVES = [
    ((12.5, 38.5), (8.0, 27.5), (14.0, 20.5)),
    ((19.5, 14.2), (28.5, 15.8), (32.0, 23.0)),
    ((35.5, 15.8), (44.5, 14.2), (50.0, 20.5)),
    ((56.0, 27.5), (51.5, 38.5), (32.0, 52.0)),
]

def bezier(p0, c1, c2, p1, n=60):
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        yield (u*u*u*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p1[0],
               u*u*u*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p1[1])

def heart_points(scale):
    pts, cur = [(START[0]*scale, START[1]*scale)], START
    for c1, c2, end in CURVES:
        pts += [(x*scale, y*scale) for x, y in bezier(cur, c1, c2, end)]
        cur = end
    return pts

def icono(size, ss=8, radio=14/64):
    """Dibuja el icono a `size` px con supermuestreo para suavizar los bordes."""
    s = size * ss
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radio * s, fill=SAGE)
    d.polygon(heart_points(s / 64), fill=CREAM)
    return im.resize((size, size), Image.LANCZOS)

icono(180).convert('RGB').save('apple-touch-icon.png', optimize=True)
icono(512).save('icon-512.png', optimize=True)
icono(192).save('icon-192.png', optimize=True)
# .ico con los tres tamaños que piden los navegadores
icono(48).save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('png/ico listos')
