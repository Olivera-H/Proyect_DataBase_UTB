const pool = require('../config/db');

// GET /api/reportes/globales - Admin de Sistema: métricas de todos los semilleros
// Consume directamente la vista vista_resumen_semilleros creada en la base de datos.
async function reportesGlobales(req, res) {
  const [semilleros] = await pool.query('SELECT * FROM vista_resumen_semilleros ORDER BY semillero');

  const [[totales]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM semillero WHERE estado = 'activo')            AS semilleros_activos,
      (SELECT COUNT(*) FROM usuario WHERE activo = TRUE)                  AS usuarios_activos,
      (SELECT COUNT(*) FROM miembros_semillero WHERE estado_solicitud = 'pendiente') AS solicitudes_pendientes,
      (SELECT COUNT(*) FROM proyecto_investigacion WHERE estado = 'en_curso')        AS proyectos_en_curso,
      (SELECT COUNT(*) FROM productos_academicos WHERE validado = TRUE)   AS productos_validados
  `);

  res.json({ totales, semilleros });
}

// GET /api/reportes/mi-semillero - Profesor Líder: reporte de su propio semillero
async function reporteMiSemillero(req, res) {
  const idSemillero = req.usuario.id_semillero_liderado;
  if (!idSemillero) return res.status(403).json({ mensaje: 'Su usuario no tiene un semillero asignado como líder.' });

  const [[resumen]] = await pool.query('SELECT * FROM vista_resumen_semilleros WHERE id_semillero = ?', [idSemillero]);
  res.json(resumen || null);
}

module.exports = { reportesGlobales, reporteMiSemillero };
