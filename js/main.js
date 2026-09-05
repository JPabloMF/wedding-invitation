/* Nuestra Boda — Juan Pablo & Juliana */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Apertura del sobre ---------- */

  var body = document.body;
  var envelope = document.getElementById('envelope');
  var scene = document.getElementById('envelope-scene');
  var invitation = document.getElementById('invitation');
  var opened = false;

  function abrir() {
    if (opened) return;
    opened = true;
    body.classList.add('is-open');
    body.classList.remove('is-sealed');

    window.setTimeout(function () {
      if (scene) scene.style.display = 'none';
      window.scrollTo(0, 0);
      if (invitation) {
        invitation.setAttribute('tabindex', '-1');
        invitation.focus({ preventScroll: true });
      }
      revelar();
    }, reduced ? 60 : 2200);
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

  // Si alguien llega con el sobre ya abierto (recarga con hash), no bloquear.
  if (!envelope) {
    body.classList.remove('is-sealed');
    body.classList.add('is-open');
    revelar();
  }
})();
