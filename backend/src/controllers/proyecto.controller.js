const pool = require('../config/db');

// GET /api/proyectos - lista los proyectos del semillero que lidera el usuario
// (o de cualquier semillero si es Admin_Sistema, vía ?id_semillero=)
async function listarProyectos(req, res) {
  const idSemillero = req.usuario.nombre_rol === 'Admin_Sistema'
    ? req.query.id_semillero
    : req.usuario.id_semillero_liderado;

  if (!idSemillero) {
    return res.status(400).json({ mensaje: 'Debe indicar un semillero.' });
  }

  const [filas] = await pool.query(
    'SELECT * FROM proyecto_investigacion WHERE id_semillero = ? ORDER BY fecha_inicio DESC',
    [idSemillero]
  );
  res.json(filas);
}

// POST /api/proyectos - el Profesor Líder crea un proyecto para su semillero
async function crearProyecto(req, res) {
  const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
  const idSemillero = req.usuario.id_semillero_liderado;

  if (!idSemillero) {
    return res.status(403).json({ mensaje: 'Su usuario no tiene un semillero asignado como líder.' });
  }
  if (!titulo || !fecha_inicio) {
    return res.status(400).json({ mensaje: 'El título y la fecha de inicio son obligatorios.' });
  }

  const [resultado] = await pool.query(
    `INSERT INTO proyecto_investigacion (id_semillero, titulo, descripcion, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, ?, ?)`,
    [idSemillero, titulo, descripcion || null, fecha_inicio, fecha_fin || null]
  );
  res.status(201).json({ id_proyecto: resultado.insertId, titulo });
}

// PUT /api/proyectos/:id/estado - actualizar el estado de avance del proyecto
async function actualizarEstadoProyecto(req, res) {
  const { id } = req.params;
  const { estado } = req.body;
  const estadosValidos = ['planeacion', 'en_curso', 'finalizado', 'cancelado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ mensaje: 'Estado no válido.' });
  }

  const [proyectos] = await pool.query(
    'SELECT id_semillero FROM proyecto_investigacion WHERE id_proyecto = ?', [id]
  );
  if (proyectos.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado.' });
  if (req.usuario.nombre_rol !== 'Admin_Sistema' && proyectos[0].id_semillero !== req.usuario.id_semillero_liderado) {
    return res.status(403).json({ mensaje: 'Solo puede modificar proyectos de su propio semillero.' });
  }

  await pool.query('UPDATE proyecto_investigacion SET estado = ? WHERE id_proyecto = ?', [estado, id]);
  res.json({ mensaje: 'Estado del proyecto actualizado.' });
}

module.exports = { listarProyectos, crearProyecto, actualizarEstadoProyecto };
