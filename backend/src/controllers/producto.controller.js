const pool = require('../config/db');

// GET /api/productos?id_semillero= - lista productos académicos de un semillero
async function listarProductos(req, res) {
  const idSemillero = req.usuario.nombre_rol === 'Admin_Sistema'
    ? req.query.id_semillero
    : req.usuario.id_semillero_liderado;

  if (!idSemillero) return res.status(400).json({ mensaje: 'Debe indicar un semillero.' });

  const [filas] = await pool.query(
    `SELECT pa.*, pr.titulo AS proyecto
       FROM productos_academicos pa
       JOIN proyecto_investigacion pr ON pr.id_proyecto = pa.id_proyecto
      WHERE pr.id_semillero = ?
      ORDER BY pa.fecha_registro DESC`,
    [idSemillero]
  );
  res.json(filas);
}

// POST /api/productos - el Profesor Líder registra un producto académico
async function crearProducto(req, res) {
  const { id_proyecto, tipo, titulo, descripcion } = req.body;
  if (!id_proyecto || !tipo || !titulo) {
    return res.status(400).json({ mensaje: 'Proyecto, tipo y título son obligatorios.' });
  }

  // Verifica que el proyecto pertenezca al semillero que lidera el usuario.
  const [proyectos] = await pool.query(
    'SELECT id_semillero FROM proyecto_investigacion WHERE id_proyecto = ?', [id_proyecto]
  );
  if (proyectos.length === 0) return res.status(404).json({ mensaje: 'El proyecto indicado no existe.' });
  if (proyectos[0].id_semillero !== req.usuario.id_semillero_liderado) {
    return res.status(403).json({ mensaje: 'Solo puede registrar productos de proyectos de su propio semillero.' });
  }

  const [resultado] = await pool.query(
    `INSERT INTO productos_academicos (id_proyecto, tipo, titulo, descripcion, id_usuario_registra)
     VALUES (?, ?, ?, ?, ?)`,
    [id_proyecto, tipo, titulo, descripcion || null, req.usuario.id_usuario]
  );
  res.status(201).json({ id_producto: resultado.insertId, titulo });
}

// PUT /api/productos/:id/validar - el Profesor Líder valida o invalida un producto
async function validarProducto(req, res) {
  const { id } = req.params;
  const { validado } = req.body;

  const [productos] = await pool.query(
    `SELECT pr.id_semillero FROM productos_academicos pa
       JOIN proyecto_investigacion pr ON pr.id_proyecto = pa.id_proyecto
      WHERE pa.id_producto = ?`,
    [id]
  );
  if (productos.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
  if (productos[0].id_semillero !== req.usuario.id_semillero_liderado) {
    return res.status(403).json({ mensaje: 'Solo puede validar productos de su propio semillero.' });
  }

  await pool.query('UPDATE productos_academicos SET validado = ? WHERE id_producto = ?', [Boolean(validado), id]);
  res.json({ mensaje: 'Estado de validación actualizado.' });
}

module.exports = { listarProductos, crearProducto, validarProducto };
