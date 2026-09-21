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

  // Si no hay botón de apertura, no bloquear la página.
  if (!envelope) {
    body.classList.remove('is-sealed');
    body.classList.add('is-open');
    revelar();
    lluviaDePetalos();
  }
})();
