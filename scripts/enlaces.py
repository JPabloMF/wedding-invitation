# -*- coding: utf-8 -*-
"""Genera un enlace de invitación por pase, con los nombres en el parámetro `?g=`.

Entrada: un CSV sin encabezado, una invitación por línea y un nombre por columna.

    Ana,Sofía,Juan Pablo
    Familia Ramírez
    Carolina,David

Salida: una línea por invitación, lista para pegar en WhatsApp.

    python scripts/enlaces.py invitados.csv
    python scripts/enlaces.py invitados.csv -o enlaces.txt

El CSV NO se versiona (está en .gitignore): el repo es público y la lista de invitados
no tiene por qué estarlo. Por eso mismo el sitio no lleva ninguna lista dentro: cada
enlace carga solo los nombres de su pase.
"""

import argparse
import csv
import io
from datetime import datetime
import sys
from urllib.parse import quote

BASE = 'https://jpablomf.github.io/wedding-invitation/'

# Los mismos topes que aplica js/main.js al leer la URL.
MAX_PASE = 12
MAX_NOMBRE = 40


def enumerar(nombres):
    """«Ana», «Ana y Sofía», «Ana, Sofía y Juan Pablo» — solo para la columna legible."""
    if len(nombres) < 2:
        return ''.join(nombres)
    return ', '.join(nombres[:-1]) + ' y ' + nombres[-1]


def enlace(nombres, base, fecha=None):
    # La coma es legal sin codificar dentro de un valor de query y deja el enlace
    # bastante más legible; todo lo demás sí se codifica.
    url = base + '?g=' + ','.join(quote(n, safe='') for n in nombres)
    # `f` solo se escribe si se pide un plazo distinto del que trae js/main.js: así el
    # valor por defecto se puede cambiar después sin reenviar los enlaces ya repartidos.
    if fecha:
        url += '&f=' + fecha
    return url


def leer(ruta):
    pases = []
    with open(ruta, newline='', encoding='utf-8-sig') as f:
        for linea, fila in enumerate(csv.reader(f), 1):
            nombres = [c.strip() for c in fila if c.strip()]
            if not nombres:
                continue
            if len(nombres) > MAX_PASE:
                sys.stderr.write('Línea %d: %d nombres, el sitio solo lee los primeros %d.\n'
                                 % (linea, len(nombres), MAX_PASE))
            largos = [n for n in nombres if len(n) > MAX_NOMBRE]
            if largos:
                sys.stderr.write('Línea %d: el sitio recorta a %d caracteres: %s\n'
                                 % (linea, MAX_NOMBRE, ', '.join(largos)))
            pases.append(nombres)
    return pases


def main():
    p = argparse.ArgumentParser(description='Genera los enlaces personalizados de la invitación.')
    p.add_argument('csv', nargs='?', default='invitados.csv', help='CSV de invitados (por defecto invitados.csv)')
    p.add_argument('-o', '--salida', help='archivo donde escribir el resultado (por defecto, la consola)')
    p.add_argument('--base', default=BASE, help='URL del sitio (por defecto %s)' % BASE)
    p.add_argument('--fecha', help='fecha límite para confirmar, AAAA-MM-DD; sin esto se usa la que trae js/main.js')
    args = p.parse_args()

    base = args.base if args.base.endswith('/') else args.base + '/'

    if args.fecha:
        try:
            datetime.strptime(args.fecha, '%Y-%m-%d')
        except ValueError:
            sys.exit('--fecha tiene que ir como AAAA-MM-DD (por ejemplo 2026-10-15).')

    try:
        pases = leer(args.csv)
    except FileNotFoundError:
        sys.exit('No existe %s. Crea un CSV con una invitación por línea y un nombre por columna.' % args.csv)

    lineas = ['%s\t%s' % (enumerar(n), enlace(n, base, args.fecha)) for n in pases]

    if args.salida:
        with io.open(args.salida, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lineas) + '\n')
        print('%d enlaces en %s' % (len(lineas), args.salida))
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        print('\n'.join(lineas))


if __name__ == '__main__':
    main()
