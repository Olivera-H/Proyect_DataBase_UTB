const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middleware/auth');
const producto = require('../controllers/producto.controller');

router.use(autenticar);

router.get('/', autorizar('Admin_Sistema', 'Profesor_Lider'), producto.listarProductos);
router.post('/', autorizar('Profesor_Lider'), producto.crearProducto);
router.put('/:id/validar', autorizar('Profesor_Lider'), producto.validarProducto);

module.exports = router;
