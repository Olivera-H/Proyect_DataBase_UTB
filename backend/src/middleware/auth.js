// Middlewares de seguridad:
//   - autenticar: valida el token JWT enviado en el header Authorization.
//   - autorizar:  restringe una ruta a uno o varios roles específicos (RBAC).
//   - soloSuLiderazgo: para rutas de Profesor Líder, asegura que el semillero
//     que intenta administrar sea efectivamente el que él lidera.

require('dotenv').config();
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ mensaje: 'No se proporcionó un token de autenticación.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, payload) => {
    if (error) {
      return res.status(403).json({ mensaje: 'El token es inválido o ha expirado.' });
    }
    // payload contiene: id_usuario, nombre, nombre_rol, id_semillero_liderado
    req.usuario = payload;
    next();
  });
}

function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.nombre_rol)) {
      return res.status(403).json({
        mensaje: 'No tiene permisos suficientes para acceder a este recurso.'
      });
    }
    next();
  };
}

// Verifica que el Profesor Líder autenticado sea el dueño del semillero
// indicado en req.params.id_semillero (o el que trae el propio payload).
// El Admin_Sistema siempre puede pasar, ya que tiene alcance global.
function soloSuLiderazgo(req, res, next) {
  if (req.usuario.nombre_rol === 'Admin_Sistema') return next();

  const idSemilleroSolicitado = Number(req.params.id_semillero || req.body.id_semillero);
  if (!req.usuario.id_semillero_liderado) {
    return res.status(403).json({ mensaje: 'Su usuario no tiene un semillero asignado como líder.' });
  }
  if (idSemilleroSolicitado && idSemilleroSolicitado !== req.usuario.id_semillero_liderado) {
    return res.status(403).json({ mensaje: 'Solo puede administrar el semillero que usted lidera.' });
  }
  next();
}

module.exports = { autenticar, autorizar, soloSuLiderazgo };
