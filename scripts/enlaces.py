# -*- coding: utf-8 -*-
"""Genera un enlace de invitación por pase.

Entrada: un CSV sin encabezado, una invitación por línea, con dos columnas —el nombre
del pase y cuántas personas cubre—:

    Familia Martínez,4
    Carolina,1
    Ana y David,2

La segunda columna es opcional: sin ella el enlace no afirma ningún tamaño de pase.

Salida: una línea por invitación, lista para pegar en WhatsApp.

    python scripts/enlaces.py invitados.csv
    python scripts/enlaces.py invitados.csv -o enlaces.txt

El CSV NO se versiona (está en .gitignore): el repo es público y la lista de invitados
no tiene por qué estarlo. Por eso mismo el sitio no lleva ninguna lista dentro: cada
enlace carga solo los datos de su pase.
"""

import argparse
import csv
import io
from datetime import datetime
import sys
from urllib.parse import quote

BASE = 'https://jpablomf.github.io/wedding-invitation/'

# Los mismos topes que aplica js/main.js al leer la URL.
MAX_NOMBRE = 60
MAX_PERSONAS = 30


def enlace(nombre, personas, base, fecha=None, telefono=None):
    url = base + '?g=' + quote(nombre, safe='')
    if personas:
        url += '&n=%d' % personas
    # `w` solo se escribe si se pide un número distinto del que trae js/main.js, igual
    # que `f` con el plazo: así el valor por defecto se puede cambiar después sin
    # reenviar los enlaces ya repartidos.
    if telefono:
        url += '&w=' + telefono
    if fecha:
        url += '&f=' + fecha
    return url


def leer(ruta):
    pases = []
    with open(ruta, newline='', encoding='utf-8-sig') as f:
        for linea, fila in enumerate(csv.reader(f), 1):
            celdas = [c.strip() for c in fila if c.strip()]
            if not celdas:
                continue

            nombre = celdas[0]
            if len(nombre) > MAX_NOMBRE:
                sys.stderr.write('Línea %d: el sitio recorta a %d caracteres: %s\n'
                                 % (linea, MAX_NOMBRE, nombre))

            personas = 0
            if len(celdas) > 1:
                if not celdas[1].isdigit() or not 1 <= int(celdas[1]) <= MAX_PERSONAS:
                    sys.stderr.write('Línea %d: «%s» no es un número de personas entre 1 y %d; '
                                     'el enlace saldrá sin tamaño de pase.\n'
                                     % (linea, celdas[1], MAX_PERSONAS))
                else:
                    personas = int(celdas[1])

            pases.append((nombre, personas))
    return pases


def main():
    p = argparse.ArgumentParser(description='Genera los enlaces personalizados de la invitación.')
    p.add_argument('csv', nargs='?', default='invitados.csv', help='CSV de invitados (por defecto invitados.csv)')
    p.add_argument('-o', '--salida', help='archivo donde escribir el resultado (por defecto, la consola)')
    p.add_argument('--base', default=BASE, help='URL del sitio (por defecto %s)' % BASE)
    p.add_argument('--fecha', help='fecha límite para confirmar, AAAA-MM-DD; sin esto se usa la que trae js/main.js')
    p.add_argument('--whatsapp', help='número de WhatsApp con indicativo y solo dígitos (por ejemplo 573235942476); '
                                      'sin esto se usa el que trae js/main.js')
    args = p.parse_args()

    base = args.base if args.base.endswith('/') else args.base + '/'

    if args.fecha:
        try:
            datetime.strptime(args.fecha, '%Y-%m-%d')
        except ValueError:
            sys.exit('--fecha tiene que ir como AAAA-MM-DD (por ejemplo 2026-10-15).')

    telefono = None
    if args.whatsapp:
        telefono = ''.join(c for c in args.whatsapp if c.isdigit())
        if not 8 <= len(telefono) <= 15:
            sys.exit('--whatsapp tiene que ser un número con indicativo, entre 8 y 15 dígitos '
                     '(por ejemplo 573235942476).')

    try:
        pases = leer(args.csv)
    except FileNotFoundError:
        sys.exit('No existe %s. Crea un CSV con una invitación por línea: nombre del pase y '
                 'cuántas personas cubre.' % args.csv)

    lineas = ['%s\t%s' % (nombre, enlace(nombre, personas, base, args.fecha, telefono))
              for nombre, personas in pases]

    if args.salida:
        with io.open(args.salida, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lineas) + '\n')
        print('%d enlaces en %s' % (len(lineas), args.salida))
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        print('\n'.join(lineas))


if __name__ == '__main__':
    main()
