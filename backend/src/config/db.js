// Configuración del pool de conexiones a MySQL usando mysql2/promise.
// Un pool reutiliza conexiones en lugar de abrir una nueva por cada consulta,
// lo cual es la práctica recomendada para una API con múltiples usuarios.

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'semilleros_utb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Devuelve las columnas DATE/DATETIME como texto simple en vez de objetos Date,
  // lo cual facilita enviarlas directamente al frontend en formato JSON.
  dateStrings: true
});

module.exports = pool;
