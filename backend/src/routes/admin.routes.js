const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const admin = require('../controllers/admin.controller');

// Todas las rutas de este módulo son exclusivas del Admin de Sistema.
router.use(autenticar, autorizar('Admin_Sistema'));

router.get('/facultades', admin.listarFacultades);
router.post('/facultades', admin.crearFacultad);

router.get('/programas', admin.listarProgramas);
router.post('/programas', admin.crearPrograma);

router.get('/usuarios', admin.listarUsuarios);
router.post('/usuarios', admin.crearUsuario);
router.put('/usuarios/:id/estado', admin.actualizarEstadoUsuario);

router.get('/semilleros', admin.listarSemilleros);
router.post('/semilleros', admin.crearSemillero);
router.put('/semilleros/:id/lider', admin.asignarLider);

module.exports = router;
