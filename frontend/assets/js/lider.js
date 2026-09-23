let usuarioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
  usuarioActual = Sesion.exigirRol('Profesor_Lider');
  if (!usuarioActual) return;

  document.getElementById('nombre-usuario').textContent = usuarioActual.nombre;
  document.getElementById('boton-salir').addEventListener('click', () => Sesion.cerrar());

  configurarPestanas();
  configurarFormularios();

  await Promise.all([
    cargarResumenSemillero(),
    cargarIntegrantes(),
    cargarProyectos(),
    cargarActividades(),
    cargarProductos()
  ]);
});

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

function filaVacia(colSpan) {
  return `<tr><td colspan="${colSpan}" class="py-6 text-center text-institucional-400 dark:text-institucional-500">Sin registros todavía.</td></tr>`;
}

// ---------------------------------------------------------------------------
// Resumen del semillero
// ---------------------------------------------------------------------------
async function cargarResumenSemillero() {
  const resumen = await apiFetch('/reportes/mi-semillero');
  if (!resumen) return;
  document.getElementById('titulo-semillero').textContent = resumen.semillero;
  document.getElementById('kpi-integrantes').textContent = resumen.num_miembros_activos;
  document.getElementById('kpi-proyectos-activos').textContent = `${resumen.proyectos_activos}/${resumen.proyectos_totales}`;
  document.getElementById('kpi-productos-validados').textContent = `${resumen.productos_validados}/${resumen.productos_totales}`;
}

// ---------------------------------------------------------------------------
// Integrantes y solicitudes de ingreso
// ---------------------------------------------------------------------------
async function cargarIntegrantes() {
  const integrantes = await apiFetch('/semillero/mis-integrantes');

  const pendientes = integrantes.filter((i) => i.estado_solicitud === 'pendiente');
  const cuerpoPendientes = document.getElementById('tabla-solicitudes');
  document.getElementById('contador-pendientes').textContent = pendientes.length;
  cuerpoPendientes.innerHTML = pendientes.map((i) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${i.nombre} ${i.apellido}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${i.codigo_institucional || '—'}</td>
      <td class="py-2.5 pr-4">${formatearFecha(i.fecha_solicitud)}</td>
      <td class="py-2.5 text-right space-x-3">
        <button data-id="${i.id_miembro}" class="boton-aprobar text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Aprobar</button>
        <button data-id="${i.id_miembro}" class="boton-rechazar text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Rechazar</button>
      </td>
    </tr>
  `).join('') || filaVacia(4);

  document.querySelectorAll('.boton-aprobar').forEach((boton) => {
    boton.addEventListener('click', async () => {
      try {
        const resultado = await apiFetch(`/semillero/solicitudes/${boton.dataset.id}/aprobar`, { method: 'PUT' });
        mostrarAviso(document.getElementById('aviso-solicitudes'), resultado.mensaje, 'exito');
      } catch (error) {
        mostrarAviso(document.getElementById('aviso-solicitudes'), error.message, 'error');
      }
      await Promise.all([cargarIntegrantes(), cargarResumenSemillero()]);
    });
  });
  document.querySelectorAll('.boton-rechazar').forEach((boton) => {
    boton.addEventListener('click', async () => {
      await apiFetch(`/semillero/solicitudes/${boton.dataset.id}/rechazar`, { method: 'PUT' });
      await cargarIntegrantes();
    });
  });

  const activos = integrantes.filter((i) => i.estado_solicitud === 'aprobado');
  document.getElementById('tabla-integrantes').innerHTML = activos.map((i) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${i.nombre} ${i.apellido}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${i.email}</td>
      <td class="py-2.5 pr-4">${i.rol_interno}</td>
      <td class="py-2.5">${formatearFecha(i.fecha_inicio)}</td>
    </tr>
  `).join('') || filaVacia(4);

  // Los selects de "asistencia" y "usuario que registra" usan a los integrantes activos.
  document.getElementById('select-usuario-asistencia').innerHTML =
    activos.map((i) => `<option value="${i.id_usuario}">${i.nombre} ${i.apellido}</option>`).join('')
    || '<option value="">Sin integrantes activos</option>';
}

// ---------------------------------------------------------------------------
// Proyectos de investigación
// ---------------------------------------------------------------------------
async function cargarProyectos() {
  const proyectos = await apiFetch('/proyectos');
  document.getElementById('tabla-proyectos').innerHTML = proyectos.map((p) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${p.titulo}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${formatearFecha(p.fecha_inicio)}</td>
      <td class="py-2.5 pr-4">
        <select data-id="${p.id_proyecto}" class="select-estado-proyecto text-xs rounded-md border border-institucional-200 dark:border-institucional-700 bg-white dark:bg-institucional-900 px-2 py-1">
          ${['planeacion', 'en_curso', 'finalizado', 'cancelado'].map((e) =>
            `<option value="${e}" ${e === p.estado ? 'selected' : ''}>${etiquetaEstadoProyecto(e)}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `).join('') || filaVacia(3);

  document.querySelectorAll('.select-estado-proyecto').forEach((select) => {
    select.addEventListener('change', async () => {
      await apiFetch(`/proyectos/${select.dataset.id}/estado`, {
        method: 'PUT', body: JSON.stringify({ estado: select.value })
      });
      await cargarResumenSemillero();
    });
  });

  // Selects de proyecto para los formularios de actividades y productos académicos
  const opciones = proyectos.map((p) => `<option value="${p.id_proyecto}">${p.titulo}</option>`).join('');
  document.getElementById('select-proyecto-actividad').innerHTML = `<option value="">(sin proyecto asociado)</option>${opciones}`;
  document.getElementById('select-proyecto-producto').innerHTML = opciones || '<option value="">Cree primero un proyecto</option>';
}

function etiquetaEstadoProyecto(estado) {
  return { planeacion: 'En planeación', en_curso: 'En curso', finalizado: 'Finalizado', cancelado: 'Cancelado' }[estado];
}

// ---------------------------------------------------------------------------
// Actividades y asistencia
// ---------------------------------------------------------------------------
async function cargarActividades() {
  const actividades = await apiFetch('/actividades');
  document.getElementById('tabla-actividades').innerHTML = actividades.map((a) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${a.titulo}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${etiquetaTipoActividad(a.tipo)}</td>
      <td class="py-2.5 pr-4">${formatearFecha(a.fecha_actividad)}</td>
      <td class="py-2.5">
        <button data-id="${a.id_actividad}" class="boton-marcar-asistencia text-xs font-medium text-institucional-500 dark:text-dorado-400 hover:underline">Marcar asistencia</button>
      </td>
    </tr>
  `).join('') || filaVacia(4);

  document.querySelectorAll('.boton-marcar-asistencia').forEach((boton) => {
    boton.addEventListener('click', () => {
      document.getElementById('id-actividad-asistencia').value = boton.dataset.id;
      document.getElementById('form-asistencia').classList.remove('hidden');
      document.getElementById('form-asistencia').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function etiquetaTipoActividad(tipo) {
  return { reunion: 'Reunión', taller: 'Taller', capacitacion: 'Capacitación', otro: 'Otro' }[tipo] || tipo;
}

// ---------------------------------------------------------------------------
// Productos académicos
// ---------------------------------------------------------------------------
async function cargarProductos() {
  const productos = await apiFetch('/productos');
  document.getElementById('tabla-productos').innerHTML = productos.map((p) => `
    <tr>
      <td class="py-2.5 pr-4 font-medium">${p.titulo}</td>
      <td class="py-2.5 pr-4 text-institucional-500 dark:text-institucional-300">${etiquetaTipoProducto(p.tipo)}</td>
      <td class="py-2.5 pr-4">${p.proyecto}</td>
      <td class="py-2.5">
        <button data-id="${p.id_producto}" data-validado="${p.validado ? 1 : 0}"
          class="boton-alternar-validacion text-xs font-medium ${p.validado ? 'text-emerald-600 dark:text-emerald-400' : 'text-institucional-400 dark:text-institucional-500'} hover:underline">
          ${p.validado ? 'Validado ✓' : 'Marcar como validado'}
        </button>
      </td>
    </tr>
  `).join('') || filaVacia(4);

  document.querySelectorAll('.boton-alternar-validacion').forEach((boton) => {
    boton.addEventListener('click', async () => {
      await apiFetch(`/productos/${boton.dataset.id}/validar`, {
        method: 'PUT', body: JSON.stringify({ validado: boton.dataset.validado === '0' })
      });
      await Promise.all([cargarProductos(), cargarResumenSemillero()]);
    });
  });
}

function etiquetaTipoProducto(tipo) {
  return { articulo: 'Artículo', ponencia: 'Ponencia', prototipo: 'Prototipo', otro: 'Otro' }[tipo] || tipo;
}

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------
function configurarFormularios() {
  manejarFormulario('form-proyecto', '/proyectos', () => ({
    titulo: valor('proyecto-titulo'),
    descripcion: valor('proyecto-descripcion'),
    fecha_inicio: valor('proyecto-fecha-inicio')
  }), cargarProyectos);

  manejarFormulario('form-actividad', '/actividades', () => ({
    titulo: valor('actividad-titulo'),
    tipo: valor('actividad-tipo'),
    fecha_actividad: valor('actividad-fecha'),
    id_proyecto: valor('select-proyecto-actividad') || null
  }), cargarActividades);

  manejarFormulario('form-producto', '/productos', () => ({
    id_proyecto: valor('select-proyecto-producto'),
    tipo: valor('producto-tipo'),
    titulo: valor('producto-titulo'),
    descripcion: valor('producto-descripcion')
  }), cargarProductos);

  const formularioAsistencia = document.getElementById('form-asistencia');
  formularioAsistencia.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const idActividad = document.getElementById('id-actividad-asistencia').value;
    const idUsuario = valor('select-usuario-asistencia');
    const asistio = document.getElementById('asistencia-asistio').checked;
    const observacion = valor('asistencia-observacion');

    const aviso = formularioAsistencia.querySelector('[data-aviso]');
    try {
      await apiFetch(`/actividades/${idActividad}/asistencia`, {
        method: 'POST',
        body: JSON.stringify({ registros: [{ id_usuario: idUsuario, asistio, observacion }] })
      });
      mostrarAviso(aviso, 'Asistencia registrada.', 'exito');
      formularioAsistencia.reset();
    } catch (error) {
      mostrarAviso(aviso, error.message, 'error');
    }
  });

  document.getElementById('boton-cerrar-asistencia').addEventListener('click', () => {
    document.getElementById('form-asistencia').classList.add('hidden');
  });
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
