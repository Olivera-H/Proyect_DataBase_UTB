require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/auth/login
// Autentica al usuario y devuelve un JWT con su rol, para que el frontend
// pueda decidir a qué dashboard redirigir y qué acciones mostrar.
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'El email y la contraseña son obligatorios.' });
    }

    const [filas] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.activo,
              r.nombre_rol
         FROM usuario u
         JOIN rol r ON r.id_rol = u.id_rol
        WHERE u.email = ?`,
      [email]
    );

    if (filas.length === 0) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const usuario = filas[0];

    if (!usuario.activo) {
      return res.status(403).json({ mensaje: 'Este usuario está desactivado. Contacte al administrador del sistema.' });
    }

    const claveValida = await bcrypt.compare(password, usuario.password_hash);
    if (!claveValida) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    // Si es Profesor Líder, se busca el semillero que lidera para
    // incluirlo en el token y simplificar las validaciones de RBAC.
    let idSemilleroLiderado = null;
    if (usuario.nombre_rol === 'Profesor_Lider') {
      const [semilleros] = await pool.query(
        'SELECT id_semillero FROM semillero WHERE id_docente_lider = ? LIMIT 1',
        [usuario.id_usuario]
      );
      if (semilleros.length > 0) idSemilleroLiderado = semilleros[0].id_semillero;
    }

    const payload = {
      id_usuario: usuario.id_usuario,
      nombre: `${usuario.nombre} ${usuario.apellido}`,
      email: usuario.email,
      nombre_rol: usuario.nombre_rol,
      id_semillero_liderado: idSemilleroLiderado
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    res.json({ token, usuario: payload });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno al iniciar sesión.' });
  }
}

module.exports = { login };
