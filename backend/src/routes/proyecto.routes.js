const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const proyecto = require('../controllers/proyecto.controller');

router.use(autenticar);

router.get('/', autorizar('Admin_Sistema', 'Profesor_Lider'), proyecto.listarProyectos);
router.post('/', autorizar('Profesor_Lider'), proyecto.crearProyecto);
router.put('/:id/estado', autorizar('Admin_Sistema', 'Profesor_Lider'), proyecto.actualizarEstadoProyecto);

module.exports = router;
