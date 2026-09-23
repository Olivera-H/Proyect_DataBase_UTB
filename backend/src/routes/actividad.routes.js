const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const actividad = require('../controllers/actividad.controller');

router.use(autenticar);

router.get('/', autorizar('Admin_Sistema', 'Profesor_Lider'), actividad.listarActividades);
router.post('/', autorizar('Profesor_Lider'), actividad.crearActividad);
router.post('/:id/asistencia', autorizar('Profesor_Lider'), actividad.registrarAsistencia);

module.exports = router;
