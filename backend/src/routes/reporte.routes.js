const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const reporte = require('../controllers/reporte.controller');

router.use(autenticar);

// GET /api/reportes/globales - consume la vista SQL para el panel del Admin de Sistema
router.get('/globales', autorizar('Admin_Sistema'), reporte.reportesGlobales);

// GET /api/reportes/mi-semillero - reporte del Profesor Líder sobre su propio semillero
router.get('/mi-semillero', autorizar('Profesor_Lider'), reporte.reporteMiSemillero);

module.exports = router;
