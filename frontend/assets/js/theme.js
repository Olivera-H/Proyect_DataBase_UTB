// Modo oscuro / claro dinámico.
// - Se aplica ANTES de pintar la página (se incluye en el <head>) para evitar
//   parpadeos de color al cargar.
// - Se guarda la preferencia del usuario en localStorage("tema-semilleros-utb").
// - Si el usuario nunca ha elegido, se respeta prefers-color-scheme del sistema.
// - El botón con id="boton-tema" alterna el modo y actualiza su ícono/texto.
(function () {
  const CLAVE_TEMA = 'tema-semilleros-utb';
  const raiz = document.documentElement;

  function temaPreferidoDelSistema() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  function aplicarTema(tema) {
    if (tema === 'oscuro') {
      raiz.classList.add('dark');
    } else {
      raiz.classList.remove('dark');
    }
    raiz.setAttribute('data-tema', tema);
    localStorage.setItem(CLAVE_TEMA, tema);
    sincronizarBoton(tema);
  }

  function sincronizarBoton(tema) {
    const boton = document.getElementById('boton-tema');
    if (!boton) return;
    boton.setAttribute('aria-pressed', tema === 'oscuro' ? 'true' : 'false');
    boton.setAttribute('aria-label', tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    const icono = boton.querySelector('[data-icono-tema]');
    if (icono) icono.textContent = tema === 'oscuro' ? '☀️' : '🌙';
    const texto = boton.querySelector('[data-texto-tema]');
    if (texto) texto.textContent = tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro';
  }

  // Aplicación inmediata (antes del DOMContentLoaded) para evitar parpadeo.
  const temaGuardado = localStorage.getItem(CLAVE_TEMA);
  aplicarTema(temaGuardado || temaPreferidoDelSistema());

  // Si el usuario nunca ha elegido manualmente, seguir el cambio del sistema en vivo.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (evento) => {
    if (!localStorage.getItem(CLAVE_TEMA)) {
      aplicarTema(evento.matches ? 'oscuro' : 'claro');
    }
  });

  window.alternarTema = function () {
    const temaActual = raiz.classList.contains('dark') ? 'oscuro' : 'claro';
    aplicarTema(temaActual === 'oscuro' ? 'claro' : 'oscuro');
  };

  document.addEventListener('DOMContentLoaded', () => {
    sincronizarBoton(raiz.classList.contains('dark') ? 'oscuro' : 'claro');
    const boton = document.getElementById('boton-tema');
    if (boton) boton.addEventListener('click', window.alternarTema);
  });
})();
