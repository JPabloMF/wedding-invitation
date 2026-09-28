/* Nuestra Boda — Juan Pablo & Juliana */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Apertura del sobre (video) ---------- */

  var body = document.body;
  var envelope = document.getElementById('envelope');
  var video = document.getElementById('envelope-video');
  var scene = document.getElementById('envelope-scene');
  var invitation = document.getElementById('invitation');
  var abierto = false;
  var reproduciendo = false;
  var vigilante = null;

  // Desvanece la escena y entrega la invitación. El retardo tiene que superar
  // la transición de .envelope-scene (1 s) o la escena se corta a media salida.
  function revelarInvitacion() {
    if (abierto) return;
    abierto = true;
    body.classList.add('is-open');
    body.classList.remove('is-sealed', 'is-playing');
    if (vigilante) window.clearTimeout(vigilante);

    window.setTimeout(function () {
      if (scene) scene.style.display = 'none';
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load(); // libera los 12 MB del buffer
      }
      window.scrollTo(0, 0);
      if (invitation) {
        invitation.setAttribute('tabindex', '-1');
        invitation.focus({ preventScroll: true });
      }
      revelar();
      lluviaDePetalos();
    }, reduced ? 60 : 1100);
  }

  // Red de seguridad: si el video no arranca o se queda colgado, la invitación
  // tiene que quedar accesible igual. Nunca puede haber una pantalla sin salida.
  var ESPERA_ARRANQUE = 6000;   // desde el click hasta que haya fotogramas
  var MARGEN_FINAL = 3000;      // por si nunca llega el evento `ended`

  function abrir() {
    if (abierto || reproduciendo) return;

    // Sin video, con movimiento reducido, o si el archivo ya falló antes del toque
    // (el evento `error` ya no volverá a dispararse), se pasa directo a la invitación.
    if (!video || reduced || video.error) {
      revelarInvitacion();
      return;
    }

    reproduciendo = true;
    body.classList.add('is-playing');

    vigilante = window.setTimeout(revelarInvitacion, ESPERA_ARRANQUE);

    video.addEventListener('error', revelarInvitacion, { once: true });
    video.addEventListener('ended', revelarInvitacion, { once: true });

    // En cuanto hay imagen se cambia el vigilante corto por uno del largo del video.
    video.addEventListener('playing', function () {
      window.clearTimeout(vigilante);
      var resto = (isFinite(video.duration) ? video.duration - video.currentTime : 10) * 1000;
      vigilante = window.setTimeout(revelarInvitacion, resto + MARGEN_FINAL);
    }, { once: true });

    var promesa = video.play();
    if (promesa && promesa.catch) {
      promesa.catch(function () { revelarInvitacion(); });
    }
  }

  if (envelope) {
    envelope.addEventListener('click', abrir);
  }

  /* ---------- 2. Cuenta regresiva ---------- */

  // 21 de noviembre de 2026, 4:00 p. m. hora de Colombia (UTC-5)
  var objetivo = new Date('2026-11-21T16:00:00-05:00').getTime();

  var campos = {};
  Array.prototype.forEach.call(document.querySelectorAll('.clock__num'), function (el) {
    campos[el.getAttribute('data-unit')] = el;
  });
  var lector = document.getElementById('clock-sr');
  var ultimoAviso = 0;

  function pad(n, largo) {
    var s = String(n);
    while (s.length < largo) s = '0' + s;
    return s;
  }

  function pintar(el, valor) {
    if (!el || el.textContent === valor) return;
    el.textContent = valor;
    if (reduced) return;
    el.classList.remove('tick');
    void el.offsetWidth; // reinicia la animación
    el.classList.add('tick');
  }

  function actualizar() {
    var restante = objetivo - Date.now();
    if (restante < 0) restante = 0;

    var segundosTotales = Math.floor(restante / 1000);
    var dias = Math.floor(segundosTotales / 86400);
    var horas = Math.floor((segundosTotales % 86400) / 3600);
    var minutos = Math.floor((segundosTotales % 3600) / 60);
    var segundos = segundosTotales % 60;

    pintar(campos.dias, pad(dias, 2));
    pintar(campos.horas, pad(horas, 2));
    pintar(campos.minutos, pad(minutos, 2));
    pintar(campos.segundos, pad(segundos, 2));

    // Aviso accesible una vez por minuto, sin ruido cada segundo.
    if (lector && Date.now() - ultimoAviso > 60000) {
      ultimoAviso = Date.now();
      lector.textContent = 'Faltan ' + dias + ' días, ' + horas + ' horas y ' + minutos + ' minutos.';
    }

    if (restante === 0) {
      window.clearInterval(temporizador);
      var titulo = document.getElementById('countdown-title');
      if (titulo) titulo.textContent = '¡Hoy nos casamos!';
    }
  }

  actualizar();
  var temporizador = window.setInterval(actualizar, 1000);

  /* ---------- 3. Aparición al hacer scroll ---------- */

  var pendientes = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function revelar() {
    if (reduced || !('IntersectionObserver' in window)) {
      pendientes.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-visible');
          observador.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    pendientes.forEach(function (el) { observador.observe(el); });
  }

  /* ---------- 4. Lluvia de petalos ---------- */

  // Seis archivos en assets/opt/petal*.webp. Se sortean tamano, opacidad, ritmo y eje
  // de volteo por petalo: repetir el mismo .webp no cuesta descarga y con parametros
  // distintos ninguno se lee como copia de otro. Ver el bloque "Lluvia de petalos" de
  // css/styles.css para como se reparten las tres animaciones entre los tres niveles.

  var PETALOS = 6;          // cuantos .webp distintos hay
  var capaPetalos = document.getElementById('petals');
  var petalosListos = false;

  function azar(min, max) { return min + Math.random() * (max - min); }

  function crearPetalo(i, total) {
    var lejos = i % 4 === 0;              // un cuarto al fondo: borroso y palido

    var caida = azar(13, 26);             // s; los lentos se leen como los de mas lejos
    var tam = lejos ? azar(22, 34) : azar(28, 52);
    var opacidad = lejos ? azar(0.28, 0.46) : azar(0.5, 0.82);

    var petalo = document.createElement('div');
    petalo.className = 'petal' + (lejos ? ' petal--far' : '');

    var est = petalo.style;
    est.setProperty('--x', azar(-6, 100).toFixed(2) + '%');
    est.setProperty('--size', tam.toFixed(1) + 'px');
    est.setProperty('--fall', caida.toFixed(2) + 's');
    // Retardo negativo escalonado: al abrir el sobre la pantalla ya esta poblada en
    // lugar de tardar media caida en llenarse.
    est.setProperty('--delay', (-(i / total) * caida - azar(0, 3)).toFixed(2) + 's');
    est.setProperty('--drift', azar(14, 52).toFixed(1) + 'px');
    est.setProperty('--sway', azar(3, 6).toFixed(2) + 's');
    est.setProperty('--sway-delay', (-azar(0, 6)).toFixed(2) + 's');
    est.setProperty('--spin', azar(4, 9).toFixed(2) + 's');
    est.setProperty('--spin-dir', Math.random() < 0.5 ? 'normal' : 'reverse');
    est.setProperty('--op', opacidad.toFixed(2));
    // Eje de volteo. Domina Z (giro en el propio plano) con algo de X/Y para que el
    // petalo se ladee: con X/Y dominantes pasa demasiado tiempo de canto y ahi se ve
    // como una astilla blanca, no como un petalo.
    est.setProperty('--ax', azar(0.1, 0.38).toFixed(2));
    est.setProperty('--ay', azar(0.1, 0.38).toFixed(2));
    est.setProperty('--az', azar(0.8, 1).toFixed(2));
    est.setProperty('--r0', azar(0, 360).toFixed(0) + 'deg');

    var vaiven = document.createElement('div');
    vaiven.className = 'petal__sway';

    var img = document.createElement('img');
    img.className = 'petal__img';
    img.src = 'assets/opt/petal' + (1 + (i % PETALOS)) + '.webp';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';

    vaiven.appendChild(img);
    petalo.appendChild(vaiven);
    return petalo;
  }

  function lluviaDePetalos() {
    if (petalosListos || reduced || !capaPetalos) return;
    petalosListos = true;

    // En movil menos piezas: cada una es una capa compuesta aparte.
    var total = window.innerWidth < 640 ? 18 : 24;
    var lote = document.createDocumentFragment();
    for (var i = 0; i < total; i++) lote.appendChild(crearPetalo(i, total));
    capaPetalos.appendChild(lote);

    // La capa entra con su propio desvanecido para que no aparezca de golpe sobre la
    // portada recien revelada.
    window.requestAnimationFrame(function () {
      capaPetalos.classList.add('is-active');
    });

    document.addEventListener('visibilitychange', function () {
      capaPetalos.classList.toggle('is-paused', document.hidden);
    });
  }

  /* ---------- 5. Confirmación personalizada ---------- */

  // Cada invitación recibe su propio enlace con los datos de su pase:
  //
  //     .../wedding-invitation/?g=Familia%20Mart%C3%ADnez&n=4&w=573235942476
  //
  //     g  nombre del pase («Familia Martínez», «Carolina»); se pinta tal cual
  //     n  cuántas personas cubre la invitación
  //     w  número de WhatsApp al que se responde (solo dígitos, con indicativo)
  //
  // A propósito no hay una lista de invitados en el repo: el sitio es público, así que
  // cualquier archivo con los nombres quedaría a la vista de todos. Con los datos en la
  // URL cada quien solo ve el suyo y no hay nada que mantener sincronizado.
  // `scripts/enlaces.py` genera los enlaces desde un CSV que no se versiona.
  //
  // El pase lo fija el enlace, no el invitado: no hay campo de «¿cuántos van?», así que
  // nadie puede sumar acompañantes. Quiénes son esas N personas se resuelve en el chat:
  // el mensaje de «Aceptar invitación» deja una línea pedida por favor para que el
  // invitado escriba los nombres antes de enviarlo. Sin parámetros el saludo y el pase
  // quedan ocultos y los dos botones mandan el mensaje genérico.

  var TELEFONO = '573235942476';   // respaldo si el enlace no trae `?w=`; el número de wa.link/dgonhr
  var MAX_NOMBRE = 60;             // topes defensivos: la URL la puede editar cualquiera
  var MAX_PERSONAS = 30;

  // Fecha límite para confirmar. El valor por defecto vive aquí y no en el HTML: cambiarlo
  // una sola vez actualiza todos los enlaces ya repartidos. `?f=AAAA-MM-DD` lo pisa solo
  // para ese enlace, por si a alguien se le invita tarde y se le da otro plazo.
  var LIMITE = '2026-09-30';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var rsvpConfirmar = document.getElementById('rsvp-confirm');
  var rsvpRechazar = document.getElementById('rsvp-decline');
  var rsvpSaludo = document.getElementById('rsvp-greeting');
  var rsvpPase = document.getElementById('rsvp-pass');
  var rsvpPista = document.getElementById('rsvp-hint');

  function parametro(clave) {
    try {
      return new URLSearchParams(window.location.search).get(clave);
    } catch (e) {
      return null;
    }
  }

  // El nombre se pinta con textContent y viaja codificado al mensaje, pero un salto de
  // línea partiría el texto de WhatsApp: se quitan los caracteres de control.
  function nombreDelPase() {
    var crudo = parametro('g');
    if (!crudo) return '';
    crudo = crudo.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    return crudo.slice(0, MAX_NOMBRE);
  }

  // Cuántas personas cubre la invitación. Sin `?n=` (o con basura) no se afirma ningún
  // tamaño: la frase del pase simplemente no se escribe.
  function personasDelPase() {
    var crudo = parametro('n');
    if (!crudo || !/^\d{1,3}$/.test(crudo.trim())) return 0;
    var n = parseInt(crudo, 10);
    return n >= 1 && n <= MAX_PERSONAS ? n : 0;
  }

  // El número al que se responde. Se valida a dígitos con largo de teléfono
  // internacional; cualquier otra cosa cae al de siempre, nunca a un enlace roto.
  function telefonoDelEnlace() {
    var crudo = parametro('w');
    if (!crudo) return TELEFONO;
    crudo = crudo.replace(/\D/g, '');
    return /^\d{8,15}$/.test(crudo) ? crudo : TELEFONO;
  }

  function personas(n) {
    return n + (n === 1 ? ' persona' : ' personas');
  }

  function enlaceWhatsapp(telefono, texto) {
    return 'https://wa.me/' + telefono + '?text=' + encodeURIComponent(texto);
  }

  // Sin emoji a propósito. WhatsApp los destroza al entregarle el texto a la app y llegan
  // al chat como rombos con interrogante. Pasó con los tres emoji del mensaje original de
  // wa.link —fuera del BMP, un par suplente en UTF-16 cada uno— y también con un corazón
  // del BMP, así que no es cuestión de elegir mejor el carácter: no hay emoji que aguante
  // ese paso. Las tildes y los «¡» sí llegan bien.
  //
  // El mensaje de aceptación termina con una línea en blanco pedida por favor: la
  // invitación ya no conoce los nombres de quienes van —el enlace solo trae el del pase—,
  // así que los escribe el invitado en el chat antes de enviar.
  function mensajeAceptar(pase, cuantos) {
    var plural = cuantos !== 1;
    var texto = '¡Hola!';
    if (pase) texto += ' ' + (plural ? 'Somos ' : 'Soy ') + pase + '.';
    texto += plural
      ? ' ¡Con mucho gusto confirmamos nuestra asistencia a su boda!'
      : ' ¡Con mucho gusto confirmo mi asistencia a su boda!';

    if (cuantos) {
      texto += '\n\n' + (plural ? 'Nuestra' : 'Mi') + ' invitación es válida para ' + personas(cuantos) + '.';
    }
    if (plural) {
      // Un salto si ya se escribió la línea del pase, dos si el mensaje venía de corrido.
      texto += (cuantos ? '\n' : '\n\n') + 'Por favor, escribe aquí los nombres de quienes asistirán:\n';
    }
    return texto;
  }

  function mensajeRechazar(pase, cuantos) {
    var plural = cuantos !== 1;
    var texto = '¡Hola!';
    if (pase) texto += ' ' + (plural ? 'Somos ' : 'Soy ') + pase + '.';
    texto += plural
      ? ' Lamentamos mucho avisarles que no podremos acompañarlos en su boda. ¡Les deseamos lo mejor y que sea un día hermoso!'
      : ' Lamento mucho avisarles que no podré acompañarlos en su boda. ¡Les deseo lo mejor y que sea un día hermoso!';
    return texto;
  }

  // El texto del HTML es el respaldo: si la fecha no llega o viene mal escrita se queda el
  // que esté escrito ahí, nunca un hueco ni un «Invalid Date».
  function fechaLimite() {
    var salida = document.getElementById('rsvp-deadline');
    if (!salida) return;

    var param = parametro('f');
    var crudo = param ? param.trim() : LIMITE;

    var partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(crudo);
    if (!partes) return;

    var anio = +partes[1], mes = +partes[2], dia = +partes[3];
    // Se arma en UTC y se compara de vuelta: así caen las fechas que no existen (31 de
    // febrero) y los meses fuera de rango, que Date corregiría en silencio.
    var d = new Date(Date.UTC(anio, mes - 1, dia));
    if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return;

    // El año solo se escribe si no es el de la boda: «30 de septiembre» se lee mejor.
    var texto = dia + ' de ' + MESES[mes - 1];
    if (anio !== new Date(objetivo).getFullYear()) texto += ' de ' + anio;
    salida.textContent = texto;
  }

  function confirmacion() {
    if (!rsvpConfirmar || !rsvpRechazar) return;

    var pase = nombreDelPase();
    var cuantos = personasDelPase();
    var telefono = telefonoDelEnlace();
    var plural = cuantos !== 1;   // sin `?n=` se habla en plural: no se sabe cuántos son

    if (pase && rsvpSaludo) {
      // textContent y nunca innerHTML: el nombre viene de la URL y la edita cualquiera.
      rsvpSaludo.textContent = !plural
        ? pase + ', tenemos un lugar reservado para ti.'
        : cuantos
          ? pase + ', tenemos ' + cuantos + ' lugares reservados para ustedes.'
          : pase + ', tenemos un lugar reservado para ustedes.';
      rsvpSaludo.hidden = false;
    }

    if (cuantos && rsvpPase) {
      // Sin punto final: la línea va en versalitas y ahí el punto se lee como suciedad.
      rsvpPase.textContent = 'Invitación válida para ' + personas(cuantos);
      rsvpPase.hidden = false;
    }

    // Con más de una persona el mensaje sale con la línea de nombres por completar: el
    // aviso lo anuncia antes de salir a WhatsApp.
    if (rsvpPista && plural) {
      rsvpPista.textContent = 'Se abre WhatsApp: escribe ahí los nombres de quienes asistirán y envía el mensaje.';
    }

    rsvpConfirmar.href = enlaceWhatsapp(telefono, mensajeAceptar(pase, cuantos));
    rsvpRechazar.href = enlaceWhatsapp(telefono, mensajeRechazar(pase, cuantos));
    rsvpRechazar.textContent = plural ? 'No podremos asistir' : 'No podré asistir';
  }

  fechaLimite();
  confirmacion();

  // Si no hay botón de apertura, no bloquear la página.
  if (!envelope) {
    body.classList.remove('is-sealed');
    body.classList.add('is-open');
    revelar();
    lluviaDePetalos();
  }
})();
