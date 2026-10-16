const path = require('path');
// Carga variables de entorno: primero desde la raíz (.env) y luego desde ./backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');

// Conectar a la base de datos y restaurar sesiones activas
connectDB().then(() => {
  const { autoReconnectBranches } = require('./services/whatsappWebService');
  setTimeout(() => {
    autoReconnectBranches();
  }, 2000);
});

const app = express();

app.get('/ping', (req, res) => res.send('pong'));

// Middlewares de Seguridad
app.use(helmet()); // Cabeceras de seguridad
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Parsear JSON
app.use(mongoSanitize({ replaceWith: '_' })); // Prevenir inyección NoSQL

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/branch', require('./routes/branch'));
app.use('/api/order', require('./routes/order'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/gateway', require('./routes/gateway'));

const PORT = process.env.PORT || 4050;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
});
