let usuarioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
  usuarioActual = Sesion.exigirRol('Admin_Sistema');
  if (!usuarioActual) return;

  document.getElementById('nombre-usuario').textContent = usuarioActual.nombre;
  document.getElementById('boton-salir').addEventListener('click', () => Sesion.cerrar());

  configurarPestanas();
  configurarFormularios();

  await Promise.all([
    cargarResumenGlobal(),
    cargarFacultades(),
    cargarUsuarios(),
    cargarSemilleros()
  ]);
});

// ---------------------------------------------------------------------------
// Navegación por pestañas (todo vive en una sola página, sin recargar)
// ---------------------------------------------------------------------------
function configurarPestanas() {
  const botones = document.querySelectorAll('[data-pestana]');
  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      botones.forEach((b) => b.classList.remove('bg-institucional-700', 'dark:bg-dorado-500', 'text-white', 'dark:text-institucional-950'));
      boton.classList.add('bg-institucional-700', 'dark:bg-dorado-500', 'text-white', 'dark:text-institucional-950');

      document.querySelectorAll('[data-panel]').forEach((panel) => panel.classList.add('hidden'));
      document.getElementById(`panel-${boton.dataset.pestana}`).classList.remove('hidden');
    });
  });
}

// ---------------------------------------------------------------------------
// Resumen global (consume la vista SQL vista_resumen_semilleros vía /reportes/globales)
// ---------------------------------------------------------------------------
async function cargarResumenGlobal() {
  try {
    const datos = await apiFetch('/reportes/globales');
    const t = datos.totales;

    document.getElementById('kpi-semilleros').textContent = t.semilleros_activos;
    document.getElementById('kpi-usuarios').textContent = t.usuarios_activos;
    document.getElementById('kpi-pendientes').textContent = t.solicitudes_pendientes;
    document.getElementById('kpi-proyectos').textContent = t.proyectos_en_curso;
    document.getElementById('kpi-productos').textContent = t.productos_validados;

    const cuerpo = document.getElementById('tabla-resumen-semilleros');
    cuerpo.innerHTML = datos.semilleros.map((s) => `
      <tr>
        <td class="py-2.5 pr-4 font-medium">${s.semillero}</td>
        <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${s.facultad}</td>
        <td class="py-2.5 pr-4">${s.docente_lider}</td>
        <td class="py-2.5 pr-4 text-center">${s.num_miembros_activos}</td>
        <td class="py-2.5 pr-4 text-center">${s.proyectos_activos}/${s.proyectos_totales}</td>
        <td class="py-2.5 pr-4 text-center">${s.productos_validados}/${s.productos_totales}</td>
        <td class="py-2.5">${badgeEstado(s.estado)}</td>
      </tr>
    `).join('') || filaVacia(7);
  } catch (error) {
    console.error(error);
  }
}

function badgeEstado(estado) {
  const esActivo = estado === 'activo';
  const clases = esActivo
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
    : 'bg-institucional-100 text-institucional-500 dark:bg-institucional-800 dark:text-institucional-400';
  return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${clases}">${esActivo ? 'Activo' : 'Inactivo'}</span>`;
}

function filaVacia(colSpan) {
  return `<tr><td colspan="${colSpan}" class="py-6 text-center text-institucional-400 dark:text-institucional-500">Sin registros todavía.</td></tr>`;
}

// ---------------------------------------------------------------------------
// Facultades y programas (para poblar los formularios de creación)
// ---------------------------------------------------------------------------
async function cargarFacultades() {
  const facultades = await apiFetch('/admin/facultades');
  const cuerpo = document.getElementById('tabla-facultades');
  cuerpo.innerHTML = facultades.map((f) => `
    <tr><td class="py-2 pr-4">${f.nombre}</td><td class="py-2">${f.codigo}</td></tr>
  `).join('') || filaVacia(2);

  const opciones = facultades.map((f) => `<option value="${f.id_facultad}">${f.nombre}</option>`).join('');
  document.getElementById('select-facultad-semillero').innerHTML = opciones;
  document.getElementById('select-facultad-programa').innerHTML = opciones;
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
async function cargarUsuarios() {
  const usuarios = await apiFetch('/admin/usuarios');

  const cuerpo = document.getElementById('tabla-usuarios');
  cuerpo.innerHTML = usuarios.map((u) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${u.nombre} ${u.apellido}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${u.email}</td>
      <td class="py-2.5 pr-4">${rolLegible(u.nombre_rol)}</td>
      <td class="py-2.5 pr-4">${u.programa || '—'}</td>
      <td class="py-2.5 pr-4">${badgeEstado(u.activo ? 'activo' : 'inactivo')}</td>
      <td class="py-2.5 text-right">
        <button data-id="${u.id_usuario}" data-activo="${u.activo ? 1 : 0}"
          class="boton-alternar-usuario text-xs font-medium text-institucional-500 dark:text-dorado-400 hover:underline">
          ${u.activo ? 'Desactivar' : 'Activar'}
        </button>
      </td>
    </tr>
  `).join('') || filaVacia(6);

  document.querySelectorAll('.boton-alternar-usuario').forEach((boton) => {
    boton.addEventListener('click', async () => {
      await apiFetch(`/admin/usuarios/${boton.dataset.id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ activo: boton.dataset.activo === '0' })
      });
      cargarUsuarios();
    });
  });

  // Docentes líderes disponibles para asignar a un semillero
  const lideres = usuarios.filter((u) => u.nombre_rol === 'Profesor_Lider' && u.activo);
  document.getElementById('select-lider-semillero').innerHTML =
    lideres.map((l) => `<option value="${l.id_usuario}">${l.nombre} ${l.apellido}</option>`).join('')
    || '<option value="">No hay docentes líderes registrados</option>';
}

function rolLegible(rol) {
  return { Admin_Sistema: 'Admin. de Sistema', Profesor_Lider: 'Profesor Líder', Estudiante: 'Estudiante' }[rol] || rol;
}

// ---------------------------------------------------------------------------
// Semilleros
// ---------------------------------------------------------------------------
async function cargarSemilleros() {
  const semilleros = await apiFetch('/admin/semilleros');
  const cuerpo = document.getElementById('tabla-semilleros');
  cuerpo.innerHTML = semilleros.map((s) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${s.nombre}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${s.facultad}</td>
      <td class="py-2.5 pr-4">${s.docente_lider}</td>
      <td class="py-2.5 pr-4 text-center">${s.num_miembros_activos}</td>
      <td class="py-2.5">${badgeEstado(s.estado)}</td>
    </tr>
  `).join('') || filaVacia(5);
}

// ---------------------------------------------------------------------------
// Formularios de creación
// ---------------------------------------------------------------------------
function configurarFormularios() {
  manejarFormulario('form-facultad', '/admin/facultades', () => ({
    nombre: valor('facultad-nombre'), codigo: valor('facultad-codigo')
  }), async () => { await cargarFacultades(); });

  manejarFormulario('form-programa', '/admin/programas', () => ({
    nombre: valor('programa-nombre'),
    codigo: valor('programa-codigo'),
    id_facultad: valor('select-facultad-programa')
  }), async () => {});

  manejarFormulario('form-usuario', '/admin/usuarios', () => ({
    nombre: valor('usuario-nombre'),
    apellido: valor('usuario-apellido'),
    email: valor('usuario-email'),
    password: valor('usuario-password'),
    nombre_rol: valor('usuario-rol'),
    codigo_institucional: valor('usuario-codigo') || null
  }), async () => { await cargarUsuarios(); });

  manejarFormulario('form-semillero', '/admin/semilleros', () => ({
    nombre: valor('semillero-nombre'),
    descripcion: valor('semillero-descripcion'),
    id_facultad: valor('select-facultad-semillero'),
    id_docente_lider: valor('select-lider-semillero')
  }), async () => { await cargarSemilleros(); await cargarResumenGlobal(); });
}

function valor(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function manejarFormulario(idFormulario, endpoint, construirCuerpo, alTerminar) {
  const formulario = document.getElementById(idFormulario);
  const aviso = formulario.querySelector('[data-aviso]');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (aviso) aviso.classList.add('hidden');
    try {
      await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(construirCuerpo()) });
      formulario.reset();
      if (aviso) mostrarAviso(aviso, 'Guardado correctamente.', 'exito');
      await alTerminar();
    } catch (error) {
      if (aviso) mostrarAviso(aviso, error.message, 'error');
    }
  });
}
