const path = require('path');
// Carga variables de entorno: primero desde la raíz (.env) y luego desde ./backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { ensureAdminUser } = require('./seedAdmin');

// Conectar a la base de datos, garantizar usuario administrador y restaurar sesiones activas
connectDB().then(async () => {
  try {
    await ensureAdminUser();
  } catch (err) {
    console.error('⚠️ Error verificando usuario administrador inicial:', err.message);
  }
  const { autoReconnectBaileysBranches } = require('./services/baileysService');
  setTimeout(() => {
    autoReconnectBaileysBranches();
  }, 2000);
});

const app = express();

// Confiar en el proxy inverso (Nginx / Cloudflare Tunnel) para obtener la IP real en rate-limiting
app.set('trust proxy', 1);

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
