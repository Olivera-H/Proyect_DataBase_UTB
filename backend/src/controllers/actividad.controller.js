const pool = require('../config/db');

// GET /api/actividades?id_semillero= - lista actividades de un semillero
async function listarActividades(req, res) {
  const idSemillero = req.usuario.nombre_rol === 'Admin_Sistema'
    ? req.query.id_semillero
    : req.usuario.id_semillero_liderado;

  if (!idSemillero) return res.status(400).json({ mensaje: 'Debe indicar un semillero.' });

  const [filas] = await pool.query(
    'SELECT * FROM actividades WHERE id_semillero = ? ORDER BY fecha_actividad DESC',
    [idSemillero]
  );
  res.json(filas);
}

// POST /api/actividades - el Profesor Líder registra una actividad de su semillero
async function crearActividad(req, res) {
  const { titulo, descripcion, tipo, fecha_actividad, id_proyecto } = req.body;
  const idSemillero = req.usuario.id_semillero_liderado;

  if (!idSemillero) return res.status(403).json({ mensaje: 'Su usuario no tiene un semillero asignado como líder.' });
  if (!titulo || !fecha_actividad) {
    return res.status(400).json({ mensaje: 'El título y la fecha de la actividad son obligatorios.' });
  }

  const [resultado] = await pool.query(
    `INSERT INTO actividades (id_semillero, id_proyecto, titulo, descripcion, tipo, fecha_actividad)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idSemillero, id_proyecto || null, titulo, descripcion || null, tipo || 'reunion', fecha_actividad]
  );
  res.status(201).json({ id_actividad: resultado.insertId, titulo });
}

// POST /api/actividades/:id/asistencia - registra asistencia masiva de integrantes
// Cuerpo esperado: { registros: [{ id_usuario, asistio, observacion }, ...] }
async function registrarAsistencia(req, res) {
  const { id } = req.params;
  const { registros } = req.body;

  if (!Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ mensaje: 'Debe enviar al menos un registro de asistencia.' });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    for (const registro of registros) {
      await conexion.query(
        `INSERT INTO asistencia (id_actividad, id_usuario, asistio, observacion)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE asistio = VALUES(asistio), observacion = VALUES(observacion)`,
        [id, registro.id_usuario, Boolean(registro.asistio), registro.observacion || null]
      );
    }
    await conexion.commit();
    res.json({ mensaje: 'Asistencia registrada correctamente.' });
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { listarActividades, crearActividad, registrarAsistencia };
