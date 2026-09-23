document.addEventListener('DOMContentLoaded', () => {
  // Si ya hay una sesión activa, redirigir directo al dashboard correspondiente.
  const usuario = Sesion.usuario();
  if (Sesion.token() && usuario) {
    window.location.href = usuario.nombre_rol === 'Admin_Sistema' ? 'admin.html' : 'lider.html';
    return;
  }

  const formulario = document.getElementById('form-login');
  const aviso = document.getElementById('aviso-login');
  const botonIngresar = document.getElementById('boton-ingresar');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.classList.add('hidden');
    botonIngresar.disabled = true;
    botonIngresar.textContent = 'Ingresando…';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const datos = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      Sesion.guardar(datos.token, datos.usuario);

      if (datos.usuario.nombre_rol === 'Admin_Sistema') {
        window.location.href = 'admin.html';
      } else if (datos.usuario.nombre_rol === 'Profesor_Lider') {
        window.location.href = 'lider.html';
      } else {
        mostrarAviso(aviso, 'Este panel es solo para administradores y docentes líderes.', 'error');
      }
    } catch (error) {
      mostrarAviso(aviso, error.message, 'error');
    } finally {
      botonIngresar.disabled = false;
      botonIngresar.textContent = 'Ingresar';
    }
  });
});
