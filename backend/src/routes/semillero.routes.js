const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const semillero = require('../controllers/semillero.controller');

router.use(autenticar);

// Profesor Líder: ver y gestionar integrantes de SU semillero
router.get('/mis-integrantes', autorizar('Profesor_Lider'), semillero.misIntegrantes);
router.put('/solicitudes/:id/aprobar', autorizar('Profesor_Lider'), semillero.aprobarSolicitud);
router.put('/solicitudes/:id/rechazar', autorizar('Profesor_Lider'), semillero.rechazarSolicitud);

// Estudiante: solicitar ingreso a un semillero
router.post('/solicitudes', autorizar('Estudiante'), semillero.solicitarIngreso);

module.exports = router;
