require('dotenv').config();
const express = require('express');
// Debe importarse justo después de "express": envuelve las rutas para que
// cualquier error dentro de una función async (por ejemplo, una consulta SQL
// fallida) se envíe automáticamente al manejador de errores, sin necesidad
// de escribir try/catch en cada controlador.
require('express-async-errors');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const semilleroRoutes = require('./routes/semillero.routes');
const proyectoRoutes = require('./routes/proyecto.routes');
const actividadRoutes = require('./routes/actividad.routes');
const productoRoutes = require('./routes/producto.routes');
const reporteRoutes = require('./routes/reporte.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Ping simple para verificar que la API está viva
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', servicio: 'API Semilleros UTB' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/semillero', semilleroRoutes);
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/actividades', actividadRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/reportes', reporteRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

// Manejador de errores centralizado: cualquier error no controlado
// en un controlador (por ejemplo, una consulta SQL fallida) termina aquí.
app.use((error, req, res, next) => {
  console.error('Error no controlado:', error);
  res.status(500).json({ mensaje: 'Ocurrió un error interno en el servidor.' });
});

module.exports = app;
