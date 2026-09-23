// Funciones exclusivas del Administrador de Sistema (alcance global):
// gestión de facultades/programas, usuarios y creación/asignación de semilleros.

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Facultades y programas
// ---------------------------------------------------------------------------
async function listarFacultades(req, res) {
  const [filas] = await pool.query('SELECT * FROM facultad ORDER BY nombre');
  res.json(filas);
}

async function crearFacultad(req, res) {
  const { nombre, codigo } = req.body;
  if (!nombre || !codigo) {
    return res.status(400).json({ mensaje: 'Nombre y código de la facultad son obligatorios.' });
  }
  try {
    const [resultado] = await pool.query(
      'INSERT INTO facultad (nombre, codigo) VALUES (?, ?)', [nombre, codigo]
    );
    res.status(201).json({ id_facultad: resultado.insertId, nombre, codigo });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe una facultad con ese nombre o código.' });
    }
    throw error;
  }
}

async function listarProgramas(req, res) {
  const [filas] = await pool.query(
    `SELECT p.*, f.nombre AS facultad
       FROM programa p JOIN facultad f ON f.id_facultad = p.id_facultad
      ORDER BY f.nombre, p.nombre`
  );
  res.json(filas);
}

async function crearPrograma(req, res) {
  const { nombre, codigo, id_facultad } = req.body;
  if (!nombre || !codigo || !id_facultad) {
    return res.status(400).json({ mensaje: 'Nombre, código y facultad son obligatorios.' });
  }
  const [resultado] = await pool.query(
    'INSERT INTO programa (nombre, codigo, id_facultad) VALUES (?, ?, ?)',
    [nombre, codigo, id_facultad]
  );
  res.status(201).json({ id_programa: resultado.insertId, nombre, codigo, id_facultad });
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
async function listarUsuarios(req, res) {
  const [filas] = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.codigo_institucional,
            u.activo, u.fecha_registro, r.nombre_rol, p.nombre AS programa
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       LEFT JOIN programa p ON p.id_programa = u.id_programa
      ORDER BY u.fecha_registro DESC`
  );
  res.json(filas);
}

// Crea un usuario (Admin de Sistema, Profesor Líder o Estudiante).
// La contraseña se recibe en texto plano solo en esta petición y se
// almacena siempre como hash con bcrypt; nunca se guarda ni se reenvía en claro.
async function crearUsuario(req, res) {
  const { nombre, apellido, email, password, nombre_rol, id_programa, codigo_institucional } = req.body;
  if (!nombre || !apellido || !email || !password || !nombre_rol) {
    return res.status(400).json({ mensaje: 'Nombre, apellido, email, contraseña y rol son obligatorios.' });
  }

  const [roles] = await pool.query('SELECT id_rol FROM rol WHERE nombre_rol = ?', [nombre_rol]);
  if (roles.length === 0) {
    return res.status(400).json({ mensaje: 'El rol indicado no es válido.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [resultado] = await pool.query(
      `INSERT INTO usuario (nombre, apellido, email, password_hash, codigo_institucional, id_rol, id_programa)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, hash, codigo_institucional || null, roles[0].id_rol, id_programa || null]
    );
    res.status(201).json({ id_usuario: resultado.insertId, nombre, apellido, email, nombre_rol });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un usuario con ese email o código institucional.' });
    }
    throw error;
  }
}

// Activa o desactiva un usuario (no se elimina físicamente, para conservar el historial).
async function actualizarEstadoUsuario(req, res) {
  const { id } = req.params;
  const { activo } = req.body;
  await pool.query('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [Boolean(activo), id]);
  res.json({ mensaje: 'Estado del usuario actualizado correctamente.' });
}

// ---------------------------------------------------------------------------
// Semilleros (creación y asignación de docente líder)
// ---------------------------------------------------------------------------
async function listarSemilleros(req, res) {
  const [filas] = await pool.query(
    `SELECT s.*, f.nombre AS facultad, CONCAT(u.nombre, ' ', u.apellido) AS docente_lider
       FROM semillero s
       JOIN facultad f ON f.id_facultad = s.id_facultad
       JOIN usuario u ON u.id_usuario = s.id_docente_lider
      ORDER BY s.nombre`
  );
  res.json(filas);
}

// POST /api/admin/semilleros - ruta exclusiva del Admin de Sistema
async function crearSemillero(req, res) {
  const { nombre, descripcion, id_facultad, id_docente_lider } = req.body;
  if (!nombre || !id_facultad || !id_docente_lider) {
    return res.status(400).json({ mensaje: 'Nombre, facultad y docente líder son obligatorios.' });
  }

  // El docente asignado debe existir y tener el rol Profesor_Lider.
  const [docentes] = await pool.query(
    `SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ? AND r.nombre_rol = 'Profesor_Lider'`,
    [id_docente_lider]
  );
  if (docentes.length === 0) {
    return res.status(400).json({ mensaje: 'El docente indicado no existe o no tiene el rol de Profesor Líder.' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO semillero (nombre, descripcion, id_facultad, id_docente_lider) VALUES (?, ?, ?, ?)',
      [nombre, descripcion || null, id_facultad, id_docente_lider]
    );
    res.status(201).json({ id_semillero: resultado.insertId, nombre });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'Ya existe un semillero con ese nombre.' });
    }
    throw error;
  }
}

// PUT /api/admin/semilleros/:id/lider - reasignar el docente líder de un semillero
async function asignarLider(req, res) {
  const { id } = req.params;
  const { id_docente_lider } = req.body;

  const [docentes] = await pool.query(
    `SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ? AND r.nombre_rol = 'Profesor_Lider'`,
    [id_docente_lider]
  );
  if (docentes.length === 0) {
    return res.status(400).json({ mensaje: 'El docente indicado no existe o no tiene el rol de Profesor Líder.' });
  }

  await pool.query('UPDATE semillero SET id_docente_lider = ? WHERE id_semillero = ?', [id_docente_lider, id]);
  res.json({ mensaje: 'Docente líder actualizado correctamente.' });
}

module.exports = {
  listarFacultades, crearFacultad,
  listarProgramas, crearPrograma,
  listarUsuarios, crearUsuario, actualizarEstadoUsuario,
  listarSemilleros, crearSemillero, asignarLider
};
