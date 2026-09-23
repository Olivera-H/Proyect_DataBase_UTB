// Cliente HTTP mínimo para hablar con la API del backend.
// Ajusta API_BASE si tu backend corre en otro host/puerto.
const API_BASE = 'http://localhost:4000/api';

const Sesion = {
  guardar(token, usuario) {
    localStorage.setItem('semilleros_token', token);
    localStorage.setItem('semilleros_usuario', JSON.stringify(usuario));
  },
  token() {
    return localStorage.getItem('semilleros_token');
  },
  usuario() {
    const datos = localStorage.getItem('semilleros_usuario');
    return datos ? JSON.parse(datos) : null;
  },
  cerrar() {
    localStorage.removeItem('semilleros_token');
    localStorage.removeItem('semilleros_usuario');
    window.location.href = 'index.html';
  },
  // Protege una página: si no hay sesión o el rol no coincide, redirige al login.
  exigirRol(rolEsperado) {
    const usuario = this.usuario();
    if (!this.token() || !usuario || usuario.nombre_rol !== rolEsperado) {
      window.location.href = 'index.html';
      return null;
    }
    return usuario;
  }
};

async function apiFetch(endpoint, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };
  const token = Sesion.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}${endpoint}`, { ...opciones, headers });
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. Verifique que el backend esté corriendo.');
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401 || respuesta.status === 403) {
    if (respuesta.status === 401) {
      Sesion.cerrar();
      return;
    }
  }
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || `Error ${respuesta.status} al comunicarse con el servidor.`);
  }
  return datos;
}

// Pequeño helper para mostrar mensajes de éxito/error consistentes en cualquier página.
function mostrarAviso(elemento, mensaje, tipo = 'error') {
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.classList.remove('hidden', 'text-red-600', 'dark:text-red-400', 'text-emerald-600', 'dark:text-emerald-400');
  elemento.classList.add(tipo === 'error' ? 'text-red-600' : 'text-emerald-600', tipo === 'error' ? 'dark:text-red-400' : 'dark:text-emerald-400');
  elemento.classList.remove('hidden');
}

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}
