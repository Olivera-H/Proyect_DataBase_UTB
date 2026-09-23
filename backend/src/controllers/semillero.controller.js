// Funciones del Profesor Líder sobre SU semillero: ver integrantes,
// aprobar/rechazar solicitudes, y funciones del Estudiante para solicitar ingreso.

const pool = require('../config/db');

// GET /api/semillero/mis-integrantes - Profesor Líder ve solicitudes e integrantes de su semillero
async function misIntegrantes(req, res) {
  const idSemillero = req.usuario.id_semillero_liderado;
  if (!idSemillero) {
    return res.status(403).json({ mensaje: 'Su usuario no tiene un semillero asignado como líder.' });
  }

  const [filas] = await pool.query(
    `SELECT m.id_miembro, m.estado_solicitud, m.rol_interno, m.fecha_solicitud, m.fecha_inicio, m.fecha_fin,
            u.id_usuario, u.nombre, u.apellido, u.email, u.codigo_institucional
       FROM miembros_semillero m
       JOIN usuario u ON u.id_usuario = m.id_usuario
      WHERE m.id_semillero = ?
      ORDER BY FIELD(m.estado_solicitud, 'pendiente', 'aprobado', 'rechazado', 'finalizado'), m.fecha_solicitud DESC`,
    [idSemillero]
  );
  res.json(filas);
}

// POST /api/semillero/solicitudes - un Estudiante solicita ingresar a un semillero
async function solicitarIngreso(req, res) {
  const { id_semillero } = req.body;
  const idUsuario = req.usuario.id_usuario;

  if (!id_semillero) {
    return res.status(400).json({ mensaje: 'Debe indicar a qué semillero desea ingresar.' });
  }

  try {
    await pool.query(
      'INSERT INTO miembros_semillero (id_usuario, id_semillero) VALUES (?, ?)',
      [idUsuario, id_semillero]
    );
    res.status(201).json({ mensaje: 'Solicitud enviada. El docente líder la revisará pronto.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya tiene una solicitud registrada para este semillero.' });
    }
    throw error;
  }
}

// PUT /api/semillero/solicitudes/:id/aprobar
// Delega toda la validación de negocio (dueño del semillero, tope de 2 semilleros
// activos, estado de la solicitud) al procedimiento almacenado sp_aprobar_ingreso_estudiante.
async function aprobarSolicitud(req, res) {
  const { id } = req.params;
  const idProfesor = req.usuario.id_usuario;

  const conexion = await pool.getConnection();
  try {
    await conexion.query('SET @resultado = NULL');
    await conexion.query('CALL sp_aprobar_ingreso_estudiante(?, ?, @resultado)', [id, idProfesor]);
    const [[fila]] = await conexion.query('SELECT @resultado AS resultado');

    if (fila.resultado && fila.resultado.startsWith('OK')) {
      return res.json({ mensaje: fila.resultado });
    }
    return res.status(400).json({ mensaje: fila.resultado || 'No se pudo procesar la solicitud.' });
  } finally {
    conexion.release();
  }
}

// PUT /api/semillero/solicitudes/:id/rechazar
async function rechazarSolicitud(req, res) {
  const { id } = req.params;
  const idSemilleroLider = req.usuario.id_semillero_liderado;

  const [filas] = await pool.query(
    'SELECT id_semillero, estado_solicitud FROM miembros_semillero WHERE id_miembro = ?',
    [id]
  );
  if (filas.length === 0) return res.status(404).json({ mensaje: 'La solicitud no existe.' });
  if (filas[0].id_semillero !== idSemilleroLider) {
    return res.status(403).json({ mensaje: 'Solo puede gestionar solicitudes de su propio semillero.' });
  }
  if (filas[0].estado_solicitud !== 'pendiente') {
    return res.status(400).json({ mensaje: 'Esta solicitud ya fue procesada previamente.' });
  }

  await pool.query("UPDATE miembros_semillero SET estado_solicitud = 'rechazado' WHERE id_miembro = ?", [id]);
  res.json({ mensaje: 'Solicitud rechazada.' });
}

module.exports = { misIntegrantes, solicitarIngreso, aprobarSolicitud, rechazarSolicitud };
